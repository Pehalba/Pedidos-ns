import { FirebaseService } from "./FirebaseService.js";

export class Store {
  constructor() {
    this.storageKey = "consolidador:v1";
    this.orders = [];
    this.batches = [];
    this.nextBatchNumber = 1;
    this.firebase = new FirebaseService();
    this.isLoaded = false;
    this.integrityCheckRunning = false;
    this.ordersUnsubscribe = null;

    // Listener global para detectar erros de cota do Firebase
    this.setupFirebaseErrorListener();
  }

  startOrdersRealtime() {
    if (this.ordersUnsubscribe) {
      try {
        this.ordersUnsubscribe();
      } catch (e) {}
      this.ordersUnsubscribe = null;
    }
    if (
      !this.firebase ||
      !this.firebase.isInitialized ||
      this.firebase.quotaExceeded
    ) {
      return;
    }
    this.ordersUnsubscribe = this.firebase.onOrdersSnapshot((orders) => {
      // Merge não destrutivo com localStorage, mantendo updatedAt mais recente
      const localOrders = this.orders || [];
      const localById = new Map(localOrders.map((o) => [String(o.id), o]));
      const merged = orders.map((remote) => {
        const id = String(remote.id || remote.docId || "");
        const local = localById.get(id);
        if (!local) return remote;
        const ru = new Date(remote.updatedAt || 0).getTime();
        const lu = new Date(local.updatedAt || 0).getTime();
        return ru >= lu ? remote : local;
      });
      // incluir locais que não existem no remoto
      localOrders.forEach((o) => {
        if (!merged.find((m) => String(m.id) === String(o.id))) merged.push(o);
      });
      this.orders = merged.sort((a, b) => Number(b.id) - Number(a.id));
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          orders: this.orders,
          batches: this.batches,
        })
      );
      // atualizar UI se estiver na planilha
      if (window.app?.currentView === "sheet" && window.app.renderOrdersSheet) {
        window.app.renderOrdersSheet();
      }
    });
  }

  setupFirebaseErrorListener() {
    // Interceptar erros do console para detectar quota exceeded
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(" ");
      if (
        message.includes("resource-exhausted") ||
        message.includes("Quota exceeded")
      ) {
        console.warn(
          "🔥 Erro de cota detectado globalmente, desabilitando Firebase"
        );
        this.firebase.quotaExceeded = true;
        this.showQuotaExceededNotification();
      }
      originalError.apply(console, args);
    };
  }

  showQuotaExceededNotification() {
    // Mostrar notificação para o usuário
    if (window.app && window.app.ui) {
      window.app.ui.showToast(
        "⚠️ Cota do Firebase excedida. Trabalhando offline - dados serão sincronizados quando a cota renovar.",
        "warning"
      );
    }
  }

  async checkQuotaRenewal() {
    // Se a cota estava excedida, tentar uma operação simples para ver se renovou
    if (this.firebase.quotaExceeded) {
      console.log("🔄 Verificando se a cota do Firebase renovou...");
      try {
        // Tentar uma operação simples para testar a cota (usar getSuppliers que é menor)
        await this.firebase.getSuppliers();
        console.log("✅ Cota do Firebase renovada! Reabilitando Firebase");
        this.firebase.quotaExceeded = false;

        // Sincronizar dados pendentes
        await this.syncPendingData();
      } catch (error) {
        console.log("❌ Cota ainda excedida, mantendo Firebase desabilitado");
      }
    }
  }

  async syncPendingData() {
    console.log("🔄 Sincronizando dados pendentes...");

    // Sincronizar lotes pendentes
    const pendingBatches = this.batches.filter((batch) => batch.pendingSync);
    for (const batch of pendingBatches) {
      try {
        await this.firebase.updateBatch(batch.code, batch);
        batch.pendingSync = false;
        console.log(`✅ Lote ${batch.code} sincronizado`);
      } catch (error) {
        console.error(`❌ Erro ao sincronizar lote ${batch.code}:`, error);
      }
    }

    // Sincronizar pedidos pendentes
    const pendingOrders = this.orders.filter((order) => order.pendingSync);
    for (const order of pendingOrders) {
      try {
        await this.firebase.updateOrder(order.id, order);
        order.pendingSync = false;
        console.log(`✅ Pedido ${order.id} sincronizado`);
      } catch (error) {
        console.error(`❌ Erro ao sincronizar pedido ${order.id}:`, error);
      }
    }

    // Salvar alterações
    await this.saveData();
    console.log("✅ Sincronização de dados pendentes concluída");
  }

  showLoading() {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.classList.remove("hidden");
    }
  }

  hideLoading() {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.classList.add("hidden");
    }
  }

  async loadData() {
    try {
      this.showLoading();

      // Verificar se a cota renovou
      await this.checkQuotaRenewal();

      // 1) Carregar do localStorage primeiro (fonte da verdade imediata)
      console.log("Carregando dados do localStorage...");
      const localRaw = localStorage.getItem(this.storageKey);
      const localParsed = localRaw ? JSON.parse(localRaw) : {};
      const localOrders = localParsed.orders || [];
      const localBatches = localParsed.batches || [];
      const localSuppliers = localParsed.suppliers || [];

      // Setar dados locais imediatamente
      this.orders = localOrders;
      this.batches = localBatches;
      this.suppliers = localSuppliers;

      // Migração: se um lote não tiver name, definir name = code
      this.batches.forEach((batch) => {
        if (!batch.name) {
          batch.name = batch.code;
        }
      });

      // Calcular próximo número de lote
      this.calculateNextBatchNumber();

      // Atualizar lotes antigos que têm rastreio mas não estão marcados como enviados
      await this.updateOldBatchesShippingStatus();

      // 2) Se Firebase disponível, buscar e mesclar (sem sobrescrever locais)
      if (this.firebase.isInitialized) {
        try {
          console.log("Buscando dados do Firebase para merge...");

          // Buscar dados do Firebase individualmente para tratar erros de cota
          let remoteOrders = [];
          let remoteBatches = [];
          let remoteSuppliers = [];

          try {
            remoteOrders = await this.firebase.getOrders();
          } catch (error) {
            if (error.code === "resource-exhausted") {
              console.warn("Cota excedida ao buscar pedidos do Firebase");
              this.firebase.quotaExceeded = true;
            } else {
              console.error("Erro ao buscar pedidos do Firebase:", error);
            }
          }

          try {
            remoteBatches = await this.firebase.getBatches();
          } catch (error) {
            if (error.code === "resource-exhausted") {
              console.warn("Cota excedida ao buscar lotes do Firebase");
              this.firebase.quotaExceeded = true;
            } else {
              console.error("Erro ao buscar lotes do Firebase:", error);
            }
          }

          try {
            remoteSuppliers = await this.firebase.getSuppliers();
          } catch (error) {
            if (error.code === "resource-exhausted") {
              console.warn("Cota excedida ao buscar fornecedores do Firebase");
              this.firebase.quotaExceeded = true;
            } else {
              console.error("Erro ao buscar fornecedores do Firebase:", error);
            }
          }

          const mergeCollections = (localArr, remoteArr, key) => {
            const map = new Map();
            const getTs = (obj) =>
              Date.parse(obj.updatedAt || obj.createdAt || 0) || 0;
            localArr.forEach((item) => map.set(item[key], item));
            remoteArr.forEach((r) => {
              const id = r[key];
              if (!map.has(id)) {
                map.set(id, r);
              } else {
                const l = map.get(id);
                map.set(
                  getTs(r) > getTs(l) ? r : l,
                  getTs(r) > getTs(l) ? undefined : undefined
                );
                // The above line is incorrect Map API usage; fix by direct set
              }
            });
            // Fix merge: re-run with proper overwrite logic
            const finalMap = new Map();
            localArr.forEach((l) => finalMap.set(l[key], l));
            remoteArr.forEach((r) => {
              const existing = finalMap.get(r[key]);
              if (!existing) {
                finalMap.set(r[key], r);
              } else {
                const getTs2 = (o) =>
                  Date.parse(o.updatedAt || o.createdAt || 0) || 0;
                finalMap.set(
                  r[key],
                  getTs2(r) > getTs2(existing) ? r : existing
                );
              }
            });
            return Array.from(finalMap.values());
          };

          const beforeOrders = this.orders.length;
          const beforeBatches = this.batches.length;

          // Construir merge que respeita deletados no remoto: manter locais só se pendingSync=true
          const remoteById = new Map(
            (remoteOrders || []).map((r) => [r.id, r])
          );
          const keptLocal = this.orders.filter(
            (l) => !remoteById.has(l.id) && l.pendingSync === true
          );
          const mergedOrders = [...(remoteOrders || []), ...keptLocal];

          this.orders = mergeCollections(mergedOrders, [], "id");
          this.batches = mergeCollections(
            this.batches,
            remoteBatches || [],
            "code"
          );
          this.suppliers = mergeCollections(
            this.suppliers,
            remoteSuppliers || [],
            "id"
          );

          console.log(
            `Merge concluído: ${beforeOrders} → ${this.orders.length} pedidos, ${beforeBatches} → ${this.batches.length} lotes`
          );
          console.log(
            "Pedidos locais:",
            this.orders.map((o) => ({ id: o.id, updatedAt: o.updatedAt }))
          );
          console.log(
            "Pedidos remotos:",
            (remoteOrders || []).map((o) => ({
              id: o.id,
              updatedAt: o.updatedAt,
            }))
          );

          // Recalcular número de lote após merge
          this.calculateNextBatchNumber();

          // Persistir merge no localStorage
          await this.saveData();
        } catch (e) {
          console.warn(
            "Falha ao mesclar com Firebase, mantendo dados locais:",
            e
          );
        }
      }

      this.isLoaded = true;
      console.log("Dados prontos:", {
        orders: this.orders.length,
        batches: this.batches.length,
      });
      this.hideLoading();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      if (error.code === "resource-exhausted") {
        console.warn("Cota do Firebase excedida durante carregamento");
        this.firebase.quotaExceeded = true;
      }
      this.orders = [];
      this.batches = [];
      this.isLoaded = true;
      this.hideLoading();
    }
  }

  async saveData() {
    try {
      // Salvar no localStorage como backup
      const data = {
        orders: this.orders,
        batches: this.batches,
        suppliers: this.suppliers || [],
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      // NÃO sobrescrever localStorage com dados do Firebase aqui.
      // A sincronização com Firebase é feita em background por syncToFirebaseInBackground.
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
    }
  }

  calculateNextBatchNumber() {
    if (this.batches.length === 0) {
      this.nextBatchNumber = 1;
      return;
    }

    const today = new Date();
    const todayStr =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0");

    const todayBatches = this.batches.filter((batch) =>
      batch.code.startsWith(`LOTE-${todayStr}-`)
    );

    if (todayBatches.length === 0) {
      this.nextBatchNumber = 1;
    } else {
      const numbers = todayBatches.map((batch) => {
        const parts = batch.code.split("-");
        return parseInt(parts[parts.length - 1]) || 0;
      });
      this.nextBatchNumber = Math.max(...numbers) + 1;
    }
  }

  generateBatchCode() {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0");

    return `LOTE-${dateStr}-${this.nextBatchNumber}`;
  }

  getOrders() {
    return [...this.orders];
  }

  getOrder(id) {
    return this.orders.find((order) => order.id === id);
  }

  // Verificar se Firebase deve ser usado (sem cota excedida)
  shouldUseFirebase() {
    return this.firebase.isInitialized && !this.firebase.quotaExceeded;
  }

  // Sincronizar com Firebase em background (DESABILITADO para economizar leituras)
  async syncToFirebaseInBackground() {
    console.log(
      "🔄 Sincronização em background desabilitada para economizar leituras do Firebase"
    );
    console.log("💡 Use a sincronização manual quando necessário");
    return;
  }

  async addOrder(orderData) {
    console.log("=== INÍCIO addOrder ===");
    console.log("Dados do pedido:", orderData);

    const now = new Date().toISOString();
    const order = {
      id: orderData.id,
      customerName: orderData.customerName,
      productName: orderData.productName,
      size: orderData.size || "",
      sku: orderData.sku || "",
      shippingType: orderData.shippingType,
      paymentStatus: orderData.paymentStatus,
      internalTag: orderData.internalTag || "",
      batchCode: orderData.batchCode || "",
      notes: orderData.notes || "",
      createdAt: now,
      updatedAt: now,
      pendingSync: true,
    };

    console.log("Pedido criado:", order);
    this.orders.push(order);
    console.log("Pedido adicionado ao array local");

    // SEMPRE salvar no localStorage primeiro (principal)
    console.log("Salvando no localStorage...");
    await this.saveData();
    console.log("Dados salvos no localStorage");

    // Tentar enviar imediatamente para o Firebase (sem bloquear a UI)
    if (this.firebase.isInitialized && !this.firebase.quotaExceeded) {
      try {
        console.log(
          `Enviando pedido ${order.id} imediatamente para Firebase...`
        );
        const addedId = await this.firebase.addOrder(order);
        if (addedId) {
          console.log(
            `✅ Pedido ${order.id} enviado para Firebase com sucesso`
          );
          // limpar pendingSync e salvar
          const idx = this.orders.findIndex((o) => o.id === order.id);
          if (idx !== -1) {
            this.orders[idx].pendingSync = false;
            await this.saveData();
          }
        } else {
          console.warn(
            `❌ Falha ao adicionar pedido ${order.id} no Firebase agora; ficará para o background`
          );
        }
      } catch (err) {
        console.warn(
          `❌ Erro ao adicionar pedido ${order.id} no Firebase agora; ficará para o background`,
          err
        );
      }
    } else {
      console.log(
        `⚠️ Firebase não disponível para pedido ${order.id} (inicializado: ${this.firebase.isInitialized}, cota excedida: ${this.firebase.quotaExceeded})`
      );
    }

    // Sincronizar tudo em background (robustez)
    // Sincronização em background desabilitada para economizar leituras

    console.log("=== FIM addOrder ===");
    return order;
  }

  async updateOrder(id, orderData) {
    console.log("=== INÍCIO updateOrder ===");
    console.log("ID do pedido:", id);
    console.log("Dados do pedido:", orderData);

    const orderIndex = this.orders.findIndex((order) => order.id === id);
    console.log("Índice do pedido encontrado:", orderIndex);

    if (orderIndex === -1) {
      console.error("Pedido não encontrado:", id);
      return null;
    }

    const oldOrder = this.orders[orderIndex];
    console.log("Pedido antigo:", oldOrder);

    const newOrder = {
      ...oldOrder,
      ...orderData,
      id: oldOrder.id, // Não permitir mudança de ID
      updatedAt: new Date().toISOString(),
      pendingSync: true,
    };
    console.log("Novo pedido:", newOrder);

    // Se mudou para EXPRESSO e estava em um lote, desassociar
    if (newOrder.shippingType === "EXPRESSO" && oldOrder.batchCode) {
      console.log("Pedido mudou para EXPRESSO, removendo do lote");
      this.removeOrderFromBatch(oldOrder.id, oldOrder.batchCode);
      delete newOrder.batchCode;
      delete newOrder.internalTag;
    }

    this.orders[orderIndex] = newOrder;
    console.log("Pedido atualizado no array local");

    // SEMPRE salvar no localStorage primeiro (principal)
    console.log("Salvando no localStorage...");
    await this.saveData();
    console.log("Dados salvos no localStorage");

    // Tentar atualizar imediatamente no Firebase; se falhar, tenta adicionar; senão deixa para o background
    if (this.firebase.isInitialized && !this.firebase.quotaExceeded) {
      try {
        const ok = await this.firebase.updateOrder(id, newOrder);
        if (!ok) {
          await this.firebase.addOrder(newOrder);
        }
        // limpar pendingSync e salvar
        const idx = this.orders.findIndex((o) => o.id === id);
        if (idx !== -1) {
          this.orders[idx].pendingSync = false;
          await this.saveData();
        }
      } catch (err) {
        console.warn(
          "Falha ao atualizar/adicionar pedido no Firebase agora; ficará para o background",
          err
        );
      }
    }

    // Sincronizar em background
    // Sincronização em background desabilitada para economizar leituras

    console.log("=== FIM updateOrder ===");
    return newOrder;
  }

  async deleteOrder(id) {
    console.log("=== INÍCIO deleteOrder ===");
    console.log("ID do pedido:", id);

    const order = this.getOrder(id);
    if (!order) {
      console.error("Pedido não encontrado:", id);
      return false;
    }
    console.log("Pedido encontrado:", order);

    // Se estava em um lote, remover do lote
    if (order.batchCode) {
      console.log("Pedido estava em lote, removendo do lote:", order.batchCode);
      this.removeOrderFromBatch(id, order.batchCode);
    }

    this.orders = this.orders.filter((order) => order.id !== id);
    console.log("Pedido removido do array local");

    // SEMPRE salvar no localStorage primeiro (principal)
    console.log("Salvando no localStorage...");
    await this.saveData();
    console.log("Dados salvos no localStorage");

    // Tentar deletar imediatamente no Firebase
    if (this.firebase.isInitialized && !this.firebase.quotaExceeded) {
      try {
        console.log(`🗑️ Deletando pedido ${id} imediatamente do Firebase...`);
        const deleted = await this.firebase.deleteOrder(id);
        if (deleted) {
          console.log(`✅ Pedido ${id} deletado do Firebase com sucesso`);
        } else {
          console.warn(
            `❌ Falha ao deletar pedido ${id} do Firebase agora; ficará para o background`
          );
        }
      } catch (err) {
        console.warn(
          `❌ Erro ao deletar pedido ${id} do Firebase agora; ficará para o background`,
          err
        );
      }
    } else {
      console.log(
        `⚠️ Firebase não disponível para deletar pedido ${id} (inicializado: ${this.firebase.isInitialized}, cota excedida: ${this.firebase.quotaExceeded})`
      );
    }

    // Sincronizar em background
    // Sincronização em background desabilitada para economizar leituras
    console.log("=== FIM deleteOrder ===");
    return true;
  }

  getBatches() {
    return [...this.batches];
  }

  getBatch(code) {
    return this.batches.find((batch) => batch.code === code);
  }

  async addBatch(batchData) {
    const code = this.generateBatchCode();
    const now = new Date().toISOString();
    const batch = {
      code,
      name: batchData.name,
      inboundTracking: batchData.inboundTracking || "",
      status: batchData.status || "CRIADO",
      notes: batchData.notes || "",
      orderIds: batchData.orderIds || [],
      isShipped: batchData.isShipped || false, // Novo campo para status de envio
      isReceived: batchData.isReceived || false, // Campo para status de recebimento
      isAbnormal: batchData.isAbnormal || false, // Campo para status anormal
      supplierId: batchData.supplierId || "", // Campo para fornecedor
      createdAt: now,
      updatedAt: now,
    };

    this.batches.push(batch);
    this.nextBatchNumber++;

    // Marcar como pendente de sincronização se cota excedida
    if (this.firebase.quotaExceeded) {
      batch.pendingSync = true;
      console.log("📝 Novo lote marcado como pendente de sincronização");
    }

    // Salvar no Firebase se disponível e cota não excedida
    if (this.firebase.isInitialized && !this.firebase.quotaExceeded) {
      const result = await this.firebase.addBatch(batch);
      if (result.success) {
        console.log("✅ Lote criado no Firebase");
      } else {
        if (result.error === "quota-exceeded") {
          console.warn("Cota do Firebase excedida, marcando como pendente");
          batch.pendingSync = true;
          this.firebase.quotaExceeded = true;
        } else {
          console.error("Erro ao criar lote no Firebase:", result.error);
        }
      }
    } else if (this.firebase.quotaExceeded) {
      console.log("Cota excedida, salvando apenas no localStorage");
    }

    await this.saveData();

    // Associar pedidos ao lote
    if (batch.orderIds.length > 0) {
      this.associateOrdersToBatch(batch.orderIds, code);
    }

    return batch;
  }

  async updateBatch(code, batchData) {
    console.log("=== INÍCIO updateBatch ===");
    console.log("Código do lote:", code);
    console.log("Dados do lote:", batchData);

    const batchIndex = this.batches.findIndex((batch) => batch.code === code);
    console.log("Índice do lote encontrado:", batchIndex);

    if (batchIndex === -1) {
      console.error("Lote não encontrado:", code);
      return null;
    }

    const oldBatch = this.batches[batchIndex];
    console.log("Lote antigo:", oldBatch);

    const newBatch = {
      ...oldBatch,
      ...batchData,
      code: oldBatch.code, // Não permitir mudança de código
      updatedAt: new Date().toISOString(),
    };
    console.log("Novo lote:", newBatch);

    // Se mudaram os pedidos, atualizar associações
    console.log("Verificando mudanças de pedidos...");
    console.log("Pedidos antigos:", oldBatch.orderIds);
    console.log("Pedidos novos:", newBatch.orderIds);

    // Verificar se os pedidos mudaram de forma mais robusta
    const oldOrderIds = oldBatch.orderIds || [];
    const newOrderIds = newBatch.orderIds || [];
    const pedidosMudaram = 
      oldOrderIds.length !== newOrderIds.length ||
      !oldOrderIds.every(id => newOrderIds.includes(id)) ||
      !newOrderIds.every(id => oldOrderIds.includes(id));
    console.log("Pedidos mudaram?", pedidosMudaram);
    console.log("Comparação detalhada:");
    console.log("- Antigos:", oldOrderIds);
    console.log("- Novos:", newOrderIds);
    console.log("- Tamanhos iguais:", oldOrderIds.length === newOrderIds.length);
    console.log("- Todos antigos estão nos novos:", oldOrderIds.every(id => newOrderIds.includes(id)));
    console.log("- Todos novos estão nos antigos:", newOrderIds.every(id => oldOrderIds.includes(id)));

    if (pedidosMudaram) {
      console.log("Pedidos mudaram, atualizando associações...");
      // Remover associações antigas
      const removedOrderIds = oldOrderIds.filter(
        (id) => !newOrderIds.includes(id)
      );
      console.log("Pedidos a serem removidos:", removedOrderIds);

      // Atualizar pedidos removidos localmente
      console.log("Removendo pedidos do lote localmente...");
      removedOrderIds.forEach((orderId) => {
        const order = this.getOrder(orderId);
        if (order) {
          delete order.batchCode;
          delete order.internalTag;
          console.log(`Pedido ${orderId} removido do lote`);
        }
      });

      // Atualizar pedidos removidos no Firebase
      console.log("Verificando condições para atualização no Firebase:");
      console.log("- Firebase inicializado:", this.firebase.isInitialized);
      console.log("- Pedidos removidos:", removedOrderIds.length);
      console.log("- Cota excedida:", this.firebase.quotaExceeded);

      // Pular atualização no Firebase se cota excedida ou se já houve erro de cota
      if (this.firebase.quotaExceeded) {
        console.log(
          "Cota do Firebase excedida, pulando atualização de pedidos removidos"
        );
      } else if (this.firebase.isInitialized && removedOrderIds.length > 0) {
        console.log("Atualizando pedidos removidos no Firebase...");
        for (const orderId of removedOrderIds) {
          // Verificar cota antes de cada operação
          console.log(
            `Verificando cota antes de atualizar pedido ${orderId}:`,
            this.firebase.quotaExceeded
          );
          if (this.firebase.quotaExceeded) {
            console.log("Cota excedida, parando atualizações de pedidos");
            break;
          }

          // Verificação adicional: se já houve erro de cota, parar imediatamente
          if (this.firebase.quotaExceeded) {
            console.log(
              "🔥 Cota detectada durante verificação, parando imediatamente"
            );
            break;
          }

          const order = this.getOrder(orderId);
          if (order) {
            const result = await this.firebase.updateOrder(orderId, order);
            console.log(
              `Resultado da atualização do pedido ${orderId}:`,
              result
            );

            if (!result.success) {
              if (result.error === "quota-exceeded") {
                console.warn("Cota do Firebase excedida, parando atualizações");
                this.firebase.quotaExceeded = true;
                console.log("Flag quotaExceeded definida como true");
                break;
              } else {
                console.error(
                  `Erro ao atualizar pedido ${orderId}:`,
                  result.error
                );
              }
            }

            // Verificar se a flag foi definida pelo FirebaseService
            if (this.firebase.quotaExceeded) {
              console.log(
                "Flag quotaExceeded detectada após updateOrder, parando"
              );
              break;
            }
          }
        }
        console.log(
          `Pedidos removidos do lote ${code} atualizados no Firebase`
        );
      } else {
        console.log(
          "Pulando atualização no Firebase (não inicializado ou sem pedidos removidos)"
        );
      }

      // Adicionar novas associações
      const newOrderIdsToAdd = newOrderIds.filter(id => !oldOrderIds.includes(id));
      if (newOrderIdsToAdd.length > 0) {
        console.log("Associando novos pedidos ao lote:", newOrderIdsToAdd);
        await this.associateOrdersToBatch(newOrderIdsToAdd, code);
        console.log("Novos pedidos associados com sucesso");
      } else {
        console.log("Nenhum pedido novo para associar");
      }
    } else {
      console.log("Pedidos não mudaram, pulando atualização de associações");
    }

    this.batches[batchIndex] = newBatch;
    console.log("Lote atualizado no array local");

    // Marcar como pendente de sincronização se cota excedida
    if (this.firebase.quotaExceeded) {
      newBatch.pendingSync = true;
      console.log("📝 Lote marcado como pendente de sincronização");
    }

    // Salvar no Firebase se disponível e cota não excedida
    if (this.firebase.isInitialized && !this.firebase.quotaExceeded) {
      console.log("Tentando salvar no Firebase...");
      try {
        await this.firebase.updateBatch(code, newBatch);
        console.log("Lote salvo no Firebase com sucesso");
      } catch (error) {
        if (error.code === "resource-exhausted") {
          console.warn("Cota do Firebase excedida, usando apenas localStorage");
          this.firebase.quotaExceeded = true;
        } else {
          console.error("Erro ao atualizar lote no Firebase:", error);
        }
      }
    } else if (this.firebase.quotaExceeded) {
      console.log("Cota do Firebase excedida, salvando apenas no localStorage");
    } else {
      console.log("Firebase não inicializado, pulando salvamento no Firebase");
    }

    console.log("Salvando no localStorage...");
    await this.saveData();
    console.log("Dados salvos no localStorage");
    console.log("=== FIM updateBatch ===");
    return newBatch;
  }

  async deleteBatch(code) {
    const batch = this.getBatch(code);
    if (!batch) return false;

    // Desassociar todos os pedidos do lote
    const orderIdsToUpdate = [...batch.orderIds]; // Copiar array

    orderIdsToUpdate.forEach((orderId) => {
      const order = this.getOrder(orderId);
      if (order) {
        delete order.batchCode;
        delete order.internalTag;
      }
    });

    // Atualizar pedidos desassociados no Firebase
    if (this.firebase.isInitialized && orderIdsToUpdate.length > 0) {
      try {
        for (const orderId of orderIdsToUpdate) {
          const order = this.getOrder(orderId);
          if (order) {
            await this.firebase.updateOrder(orderId, order);
          }
        }
        console.log(
          `Pedidos desassociados do lote ${code} atualizados no Firebase`
        );
      } catch (error) {
        console.error(
          "Erro ao atualizar pedidos desassociados no Firebase:",
          error
        );
      }
    }

    this.batches = this.batches.filter((batch) => batch.code !== code);

    // Deletar do Firebase se disponível
    if (this.firebase.isInitialized && !this.firebase.quotaExceeded) {
      try {
        console.log(`🗑️ Deletando lote ${code} imediatamente do Firebase...`);
        const deleted = await this.firebase.deleteBatch(code);
        if (deleted) {
          console.log(`✅ Lote ${code} deletado do Firebase com sucesso`);
        } else {
          console.warn(
            `❌ Falha ao deletar lote ${code} do Firebase agora; ficará para o background`
          );
        }
      } catch (err) {
        console.warn(
          `❌ Erro ao deletar lote ${code} do Firebase agora; ficará para o background`,
          err
        );
      }
    } else {
      console.log(
        `⚠️ Firebase não disponível para deletar lote ${code} (inicializado: ${this.firebase.isInitialized}, cota excedida: ${this.firebase.quotaExceeded})`
      );
    }

    await this.saveData();
    return true;
  }

  updateBatchStatus(code, status) {
    const batch = this.getBatch(code);
    if (!batch) return null;

    batch.status = status;
    batch.updatedAt = new Date().toISOString();
    this.saveData();
    return batch;
  }

  addBatchTracking(code, tracking) {
    const batch = this.getBatch(code);
    if (!batch) return null;

    batch.inboundTracking = tracking;
    batch.updatedAt = new Date().toISOString();
    this.saveData();
    return batch;
  }

  async updateBatchTracking(code, tracking) {
    const batch = this.getBatch(code);
    if (!batch) return null;

    batch.inboundTracking = tracking;
    batch.updatedAt = new Date().toISOString();

    // Se adicionou rastreio, marcar como enviado automaticamente
    if (tracking && tracking.trim() !== "") {
      batch.isShipped = true;
      batch.isReceived = false; // Reset para "Enviado" quando adiciona rastreio
      batch.isAbnormal = false; // Reset para "Enviado" quando adiciona rastreio
    } else {
      // Se removeu rastreio, voltar para "Não Enviado"
      batch.isShipped = false;
      batch.isReceived = false;
      batch.isAbnormal = false;
    }

    // Salvar no Firebase se disponível
    if (this.firebase.isInitialized) {
      await this.firebase.updateBatch(code, batch);
    }

    await this.saveData();
    return batch;
  }

  async updateBatchNotes(code, notes) {
    const batch = this.getBatch(code);
    if (!batch) return null;

    batch.notes = notes;
    batch.updatedAt = new Date().toISOString();

    // Se adicionou notas, marcar como enviado automaticamente
    if (notes && notes.trim() !== "") {
      batch.isShipped = true;
    }

    // Salvar no Firebase se disponível
    if (this.firebase.isInitialized) {
      await this.firebase.updateBatch(code, batch);
    }

    await this.saveData();
    return batch;
  }

  async toggleBatchReceived(code) {
    const batch = this.getBatch(code);
    if (!batch) return null;

    // Só permite alternar se já foi enviado (tem rastreio)
    if (!batch.isShipped) {
      console.warn(
        "Não é possível alterar status de recebimento: lote não foi enviado"
      );
      return null;
    }

    // Ciclo: Enviado -> Recebido -> Anormal -> Enviado
    if (!batch.isReceived && !batch.isAbnormal) {
      // De Enviado para Recebido
      batch.isReceived = true;
      batch.isAbnormal = false;
    } else if (batch.isReceived && !batch.isAbnormal) {
      // De Recebido para Anormal
      batch.isReceived = false;
      batch.isAbnormal = true;
    } else if (!batch.isReceived && batch.isAbnormal) {
      // De Anormal para Enviado
      batch.isReceived = false;
      batch.isAbnormal = false;
    }

    batch.updatedAt = new Date().toISOString();

    // Salvar no Firebase se disponível
    if (this.firebase.isInitialized) {
      await this.firebase.updateBatch(code, batch);
    }

    await this.saveData();
    return batch;
  }

  async associateOrdersToBatch(orderIds, batchCode) {
    console.log("=== INÍCIO associateOrdersToBatch ===");
    console.log("OrderIds:", orderIds);
    console.log("BatchCode:", batchCode);

    const batch = this.getBatch(batchCode);
    if (!batch) {
      console.error("Lote não encontrado para associação:", batchCode);
      return;
    }

    console.log("Atualizando pedidos localmente...");
    // Atualizar pedidos localmente
    orderIds.forEach((orderId) => {
      const order = this.getOrder(orderId);
      if (order && order.shippingType === "PADRAO") {
        // Remover pedido de lote anterior se existir
        if (order.batchCode && order.batchCode !== batchCode) {
          const previousBatch = this.getBatch(order.batchCode);
          if (previousBatch) {
            previousBatch.orderIds = previousBatch.orderIds.filter(
              (id) => id !== orderId
            );
            console.log(
              `Pedido ${orderId} removido do lote anterior ${order.batchCode}`
            );
          }
        }

        order.batchCode = batchCode;
        order.internalTag = this.generateInternalTag(
          order.productName,
          order.id
        );
        console.log(`Pedido ${orderId} associado ao lote ${batchCode}`);
      } else {
        console.log(
          `Pedido ${orderId} não pode ser associado (tipo: ${order?.shippingType})`
        );
      }
    });

    // Atualizar a lista de orderIds do lote
    const existingOrderIds = batch.orderIds || [];
    const newOrderIds = orderIds.filter(id => !existingOrderIds.includes(id));
    batch.orderIds = [...existingOrderIds, ...newOrderIds];
    console.log(`Lote ${batchCode} agora tem ${batch.orderIds.length} pedidos:`, batch.orderIds);

    // Salvar alterações no Firebase
    if (this.firebase.isInitialized && !this.firebase.quotaExceeded) {
      console.log("Tentando salvar pedidos no Firebase...");
      // Atualizar cada pedido no Firebase
      for (const orderId of orderIds) {
        // Verificar cota antes de cada operação
        if (this.firebase.quotaExceeded) {
          console.log("Cota excedida, parando atualizações de pedidos");
          break;
        }

        const order = this.getOrder(orderId);
        if (order) {
          const result = await this.firebase.updateOrder(orderId, order);
          console.log(`Resultado da atualização do pedido ${orderId}:`, result);

          if (!result.success) {
            if (result.error === "quota-exceeded") {
              console.warn("Cota do Firebase excedida, parando atualizações");
              this.firebase.quotaExceeded = true;
              break;
            } else {
              console.error(
                `Erro ao atualizar pedido ${orderId}:`,
                result.error
              );
            }
          }
        }
      }
      console.log(
        `Pedidos associados ao lote ${batchCode} atualizados no Firebase`
      );
    } else {
      console.log("Firebase não disponível ou cota excedida, pulando Firebase");
    }

    console.log("Salvando associações no localStorage...");
    await this.saveData();
    console.log("=== FIM associateOrdersToBatch ===");
  }

  removeOrderFromBatch(orderId, batchCode) {
    const batch = this.getBatch(batchCode);
    if (!batch) return;

    batch.orderIds = batch.orderIds.filter((id) => id !== orderId);
    this.saveData();
  }

  generateInternalTag(productName, orderId) {
    const slug = productName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return `${slug}-${orderId}`;
  }

  getAvailableOrders() {
    console.log("=== DEBUG getAvailableOrders ===");
    console.log("Total de pedidos:", this.orders.length);

    // Debug: verificar todos os pedidos e seus batchCodes
    this.orders.forEach((order) => {
      if (order.shippingType === "PADRAO" && order.paymentStatus === "PAGO") {
        console.log(
          `Pedido ${order.id}: batchCode = "${
            order.batchCode
          }" (tipo: ${typeof order.batchCode})`
        );
      }
    });

    const available = this.orders.filter(
      (order) =>
        order.shippingType === "PADRAO" &&
        order.paymentStatus === "PAGO" &&
        !order.batchCode
    );

    // Debug: verificar pedidos com batchCode
    const ordersWithBatch = this.orders.filter((order) => order.batchCode);
    if (ordersWithBatch.length > 0) {
      console.log(
        "Pedidos já em lotes:",
        ordersWithBatch.map((o) => ({ id: o.id, batchCode: o.batchCode }))
      );
    }

    console.log(
      `Pedidos disponíveis para lotes: ${available.length} de ${this.orders.length}`
    );
    console.log(
      "Pedidos disponíveis:",
      available.map((o) => o.id)
    );
    console.log("=== FIM DEBUG getAvailableOrders ===");

    return available;
  }

  // Método para forçar sincronização e recarregar dados
  async forceSyncAndReload() {
    console.log("Forçando sincronização e recarregamento de dados...");

    // Limpar dados locais
    this.orders = [];
    this.batches = [];
    this.isLoaded = false;

    // Recarregar dados
    await this.loadData();

    console.log("Sincronização concluída. Dados recarregados:", {
      orders: this.orders.length,
      batches: this.batches.length,
    });
  }

  // Método para verificar integridade dos dados
  checkDataIntegrity() {
    // Evitar múltiplas verificações simultâneas
    if (this.integrityCheckRunning) {
      console.log("Verificação de integridade já em andamento, pulando...");
      return;
    }

    this.integrityCheckRunning = true;
    console.log("=== VERIFICAÇÃO DE INTEGRIDADE ===");

    let errorsFound = 0;

    // Verificar se todos os pedidos em lotes têm batchCode correto
    this.batches.forEach((batch) => {
      console.log(`Lote ${batch.code}: ${batch.orderIds.length} pedidos`);

      batch.orderIds.forEach((orderId) => {
        const order = this.getOrder(orderId);
        if (!order) {
          console.error(`ERRO: Pedido ${orderId} não encontrado!`);
          errorsFound++;
        } else if (order.batchCode !== batch.code) {
          console.error(
            `ERRO: Pedido ${orderId} está no lote ${batch.code} mas tem batchCode = "${order.batchCode}"`
          );
          errorsFound++;
        }
      });
    });

    // Verificar se pedidos com batchCode estão realmente em lotes
    const ordersWithBatch = this.orders.filter((order) => order.batchCode);
    ordersWithBatch.forEach((order) => {
      const batch = this.getBatch(order.batchCode);
      if (!batch) {
        console.error(
          `ERRO: Pedido ${order.id} tem batchCode "${order.batchCode}" mas lote não existe!`
        );
        errorsFound++;
      } else if (!batch.orderIds.includes(order.id)) {
        console.error(
          `ERRO: Pedido ${order.id} tem batchCode "${order.batchCode}" mas não está na lista do lote!`
        );
        errorsFound++;
      }
    });

    console.log(
      `=== FIM VERIFICAÇÃO DE INTEGRIDADE - ${errorsFound} erros encontrados ===`
    );

    // Se há erros, apenas logar (não executar reparo automático para economizar leituras)
    if (errorsFound > 0) {
      console.log(
        "⚠️ Inconsistências detectadas! Reparo automático desabilitado para economizar leituras do Firebase."
      );
      console.log(
        "💡 Para reparar, use a opção manual no menu de administração."
      );
    }
  }

  // Método para reparar integridade dos dados
  async repairDataIntegrity() {
    console.log("=== INICIANDO REPARO DE INTEGRIDADE ===");

    let repairsMade = 0;

    // 1. Limpar batchCode de todos os pedidos primeiro
    this.orders.forEach((order) => {
      if (order.batchCode) {
        delete order.batchCode;
        delete order.internalTag;
        repairsMade++;
      }
    });

    // 2. Reassociar pedidos aos lotes baseado nas listas dos lotes
    this.batches.forEach((batch) => {
      batch.orderIds.forEach((orderId) => {
        const order = this.getOrder(orderId);
        if (order) {
          order.batchCode = batch.code;
          order.internalTag = this.generateInternalTag(
            order.productName,
            order.id
          );
          repairsMade++;
        }
      });
    });

    // 3. Remover pedidos inexistentes das listas dos lotes
    this.batches.forEach((batch) => {
      const validOrderIds = batch.orderIds.filter((orderId) =>
        this.getOrder(orderId)
      );
      if (validOrderIds.length !== batch.orderIds.length) {
        console.log(
          `Lote ${batch.code}: removendo ${
            batch.orderIds.length - validOrderIds.length
          } pedidos inexistentes`
        );
        batch.orderIds = validOrderIds;
        repairsMade++;
      }
    });

    console.log(
      `=== REPARO CONCLUÍDO - ${repairsMade} correções realizadas ===`
    );

    // 4. Salvar as correções
    if (repairsMade > 0) {
      console.log("Salvando correções...");

      // Salvar no localStorage primeiro (sempre funciona)
      await this.saveData();
      console.log("Correções salvas no localStorage!");

      // Tentar salvar no Firebase se disponível e não exceder cota
      if (this.firebase.isInitialized && !this.firebase.quotaExceeded) {
        try {
          // Atualizar apenas pedidos modificados no Firebase
          for (const order of this.orders) {
            if (order.pendingSync) {
              await this.firebase.updateOrder(order.id, order);
            }
          }

          // Atualizar apenas lotes modificados no Firebase
          for (const batch of this.batches) {
            if (batch.pendingSync) {
              await this.firebase.updateBatch(batch.code, batch);
            }
          }

          console.log("Correções salvas no Firebase com sucesso!");
        } catch (error) {
          console.error("Erro ao salvar correções no Firebase:", error);
          if (error.code === "resource-exhausted") {
            this.firebase.quotaExceeded = true;
            console.log(
              "Cota do Firebase excedida, continuando apenas com localStorage"
            );
          }
        }
      } else if (this.firebase.quotaExceeded) {
        console.log(
          "Cota do Firebase excedida, salvando apenas no localStorage"
        );
      }
    }

    // Resetar flag
    this.integrityCheckRunning = false;
  }

  getOrdersInBatch(batchCode) {
    const batch = this.getBatch(batchCode);
    if (!batch) return [];

    return batch.orderIds
      .map((orderId) => this.getOrder(orderId))
      .filter((order) => order !== undefined);
  }

  // Métodos para gerenciar status de envio dos lotes
  async updateBatchShippingStatus(code, isShipped) {
    const batch = this.getBatch(code);
    if (!batch) return null;

    batch.isShipped = isShipped;
    batch.updatedAt = new Date().toISOString();

    // Salvar no Firebase se disponível
    if (this.firebase.isInitialized) {
      await this.firebase.updateBatch(code, batch);
    }

    await this.saveData();
    return batch;
  }

  // Métodos para gerenciar fornecedores
  getSuppliers() {
    return this.suppliers || [];
  }

  getSupplier(id) {
    return this.suppliers?.find((supplier) => supplier.id === id);
  }

  getFavoriteSupplier() {
    return this.suppliers?.find((supplier) => supplier.isFavorite) || null;
  }

  async addSupplier(supplierData) {
    if (!this.suppliers) {
      this.suppliers = [];
    }

    const supplier = {
      id: `supplier_${Date.now()}`,
      name: supplierData.name,
      contact: supplierData.contact || "",
      email: supplierData.email || "",
      phone: supplierData.phone || "",
      address: supplierData.address || "",
      isFavorite: supplierData.isFavorite || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Se este fornecedor for marcado como favorito, desmarcar os outros
    if (supplier.isFavorite) {
      this.suppliers.forEach((s) => (s.isFavorite = false));
    }

    this.suppliers.push(supplier);

    // Salvar no Firebase se disponível
    if (this.firebase.isInitialized) {
      try {
        await this.firebase.addSupplier(supplier);
      } catch (error) {
        console.error("Erro ao salvar fornecedor no Firebase:", error);
      }
    }

    await this.saveData();
    return supplier;
  }

  async updateSupplier(id, supplierData) {
    if (!this.suppliers) return null;

    const supplierIndex = this.suppliers.findIndex((s) => s.id === id);
    if (supplierIndex === -1) return null;

    const updatedSupplier = {
      ...this.suppliers[supplierIndex],
      ...supplierData,
      id: this.suppliers[supplierIndex].id, // Não permitir mudança de ID
      updatedAt: new Date().toISOString(),
    };

    // Se este fornecedor for marcado como favorito, desmarcar os outros
    if (updatedSupplier.isFavorite) {
      this.suppliers.forEach((s) => {
        if (s.id !== id) s.isFavorite = false;
      });
    }

    this.suppliers[supplierIndex] = updatedSupplier;

    // Salvar no Firebase se disponível
    if (this.firebase.isInitialized) {
      try {
        await this.firebase.updateSupplier(id, updatedSupplier);
      } catch (error) {
        console.error("Erro ao atualizar fornecedor no Firebase:", error);
      }
    }

    await this.saveData();
    return updatedSupplier;
  }

  async deleteSupplier(id) {
    if (!this.suppliers) return false;

    const supplier = this.suppliers.find((s) => s.id === id);
    this.suppliers = this.suppliers.filter((s) => s.id !== id);

    // Salvar no Firebase se disponível
    if (this.firebase.isInitialized && supplier) {
      try {
        await this.firebase.deleteSupplier(id);
      } catch (error) {
        console.error("Erro ao excluir fornecedor no Firebase:", error);
      }
    }

    await this.saveData();
    return true;
  }

  // Método para atualizar lotes antigos que têm rastreio mas não estão marcados como enviados
  async updateOldBatchesShippingStatus() {
    console.log("=== ATUALIZANDO STATUS DE ENVIO DE LOTES ANTIGOS ===");

    let updatedBatches = 0;
    const batchesToUpdate = [];

    // Verificar todos os lotes
    this.batches.forEach((batch) => {
      // Se o lote tem rastreio ou notas mas não está marcado como enviado
      const hasTracking =
        batch.inboundTracking && batch.inboundTracking.trim() !== "";
      const hasNotes = batch.notes && batch.notes.trim() !== "";

      if ((hasTracking || hasNotes) && !batch.isShipped) {
        console.log(
          `Atualizando lote ${batch.code}: tem rastreio/notas mas não está marcado como enviado`
        );
        batch.isShipped = true;
        batch.isReceived = batch.isReceived || false; // Garantir que o campo existe
        batch.isAbnormal = batch.isAbnormal || false; // Garantir que o campo existe
        batch.updatedAt = new Date().toISOString();
        batchesToUpdate.push(batch);
        updatedBatches++;
      }
    });

    if (updatedBatches > 0) {
      console.log(`Atualizando ${updatedBatches} lotes antigos...`);

      // Salvar no Firebase se disponível
      if (this.firebase.isInitialized) {
        try {
          for (const batch of batchesToUpdate) {
            await this.firebase.updateBatch(batch.code, batch);
          }
          console.log("Lotes antigos atualizados no Firebase com sucesso!");
        } catch (error) {
          console.error("Erro ao atualizar lotes antigos no Firebase:", error);
        }
      }

      // Salvar no localStorage
      await this.saveData();
      console.log("Lotes antigos atualizados no localStorage!");
    } else {
      console.log("Nenhum lote antigo precisa ser atualizado.");
    }

    console.log("=== FIM ATUALIZAÇÃO DE LOTES ANTIGOS ===");
  }

  searchOrders(query, filters = {}) {
    let filtered = this.orders;

    // Filtro por busca
    if (query) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(searchTerm) ||
          order.productName.toLowerCase().includes(searchTerm) ||
          order.customerName.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por tipo de frete
    if (filters.shippingType) {
      filtered = filtered.filter(
        (order) => order.shippingType === filters.shippingType
      );
    }

    // Filtro por status de pagamento
    if (filters.paymentStatus) {
      filtered = filtered.filter(
        (order) => order.paymentStatus === filters.paymentStatus
      );
    }

    return filtered;
  }

  searchOrdersInBatch(batchCode, query) {
    const orders = this.getOrdersInBatch(batchCode);
    if (!query) return orders;

    const searchTerm = query.toLowerCase();
    return orders.filter(
      (order) =>
        order.id.toLowerCase().includes(searchTerm) ||
        order.productName.toLowerCase().includes(searchTerm) ||
        order.customerName.toLowerCase().includes(searchTerm) ||
        order.internalTag.toLowerCase().includes(searchTerm)
    );
  }
}
