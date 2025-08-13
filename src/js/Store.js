import { FirebaseService } from "./FirebaseService.js";

export class Store {
  constructor() {
    this.storageKey = "consolidador:v1";
    this.orders = [];
    this.batches = [];
    this.nextBatchNumber = 1;
    this.firebase = new FirebaseService();
  }

  async loadData() {
    try {
      // Tentar carregar do Firebase primeiro
      if (this.firebase.isInitialized) {
        const [orders, batches] = await Promise.all([
          this.firebase.getOrders(),
          this.firebase.getBatches()
        ]);
        
        this.orders = orders;
        this.batches = batches;
        
        // Migração: se um lote não tiver name, definir name = code
        this.batches.forEach((batch) => {
          if (!batch.name) {
            batch.name = batch.code;
          }
        });
        
        // Calcular próximo número de lote
        this.calculateNextBatchNumber();
        
        // Salvar no localStorage como backup
        this.saveData();
        
        console.log("Dados carregados do Firebase");
        return;
      }
    } catch (error) {
      console.error("Erro ao carregar do Firebase, usando localStorage:", error);
    }

    // Fallback para localStorage
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.orders = parsed.orders || [];
        this.batches = parsed.batches || [];

        // Migração: se um lote não tiver name, definir name = code
        this.batches.forEach((batch) => {
          if (!batch.name) {
            batch.name = batch.code;
          }
        });

        // Calcular próximo número de lote
        this.calculateNextBatchNumber();
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      this.orders = [];
      this.batches = [];
    }
  }

  async saveData() {
    try {
      // Salvar no localStorage como backup
      const data = {
        orders: this.orders,
        batches: this.batches,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      
      // Sincronizar com Firebase se disponível
      if (this.firebase.isInitialized) {
        await this.firebase.syncToLocalStorage();
      }
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

  async addOrder(orderData) {
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
      createdAt: new Date().toISOString(),
    };

    this.orders.push(order);
    
    // Salvar no Firebase se disponível
    if (this.firebase.isInitialized) {
      await this.firebase.addOrder(order);
    }
    
    await this.saveData();
    return order;
  }

  updateOrder(id, orderData) {
    const orderIndex = this.orders.findIndex((order) => order.id === id);
    if (orderIndex === -1) return null;

    const oldOrder = this.orders[orderIndex];
    const newOrder = {
      ...oldOrder,
      ...orderData,
      id: oldOrder.id, // Não permitir mudança de ID
      updatedAt: new Date().toISOString(),
    };

    // Se mudou para EXPRESSO e estava em um lote, desassociar
    if (newOrder.shippingType === "EXPRESSO" && oldOrder.batchCode) {
      this.removeOrderFromBatch(oldOrder.id, oldOrder.batchCode);
      newOrder.batchCode = "";
      newOrder.internalTag = "";
    }

    this.orders[orderIndex] = newOrder;
    this.saveData();
    return newOrder;
  }

  deleteOrder(id) {
    const order = this.getOrder(id);
    if (!order) return false;

    // Se estava em um lote, remover do lote
    if (order.batchCode) {
      this.removeOrderFromBatch(id, order.batchCode);
    }

    this.orders = this.orders.filter((order) => order.id !== id);
    this.saveData();
    return true;
  }

  getBatches() {
    return [...this.batches];
  }

  getBatch(code) {
    return this.batches.find((batch) => batch.code === code);
  }

  addBatch(batchData) {
    const code = this.generateBatchCode();
    const batch = {
      code,
      name: batchData.name,
      inboundTracking: batchData.inboundTracking || "",
      status: batchData.status || "CRIADO",
      notes: batchData.notes || "",
      orderIds: batchData.orderIds || [],
      createdAt: new Date().toISOString(),
    };

    this.batches.push(batch);
    this.nextBatchNumber++;
    this.saveData();

    // Associar pedidos ao lote
    if (batch.orderIds.length > 0) {
      this.associateOrdersToBatch(batch.orderIds, code);
    }

    return batch;
  }

  updateBatch(code, batchData) {
    const batchIndex = this.batches.findIndex((batch) => batch.code === code);
    if (batchIndex === -1) return null;

    const oldBatch = this.batches[batchIndex];
    const newBatch = {
      ...oldBatch,
      ...batchData,
      code: oldBatch.code, // Não permitir mudança de código
      updatedAt: new Date().toISOString(),
    };

    // Se mudaram os pedidos, atualizar associações
    if (
      JSON.stringify(newBatch.orderIds) !== JSON.stringify(oldBatch.orderIds)
    ) {
      // Remover associações antigas
      oldBatch.orderIds.forEach((orderId) => {
        const order = this.getOrder(orderId);
        if (order) {
          order.batchCode = "";
          order.internalTag = "";
        }
      });

      // Adicionar novas associações
      if (newBatch.orderIds.length > 0) {
        this.associateOrdersToBatch(newBatch.orderIds, code);
      }
    }

    this.batches[batchIndex] = newBatch;
    this.saveData();
    return newBatch;
  }

  deleteBatch(code) {
    const batch = this.getBatch(code);
    if (!batch) return false;

    // Desassociar todos os pedidos do lote
    batch.orderIds.forEach((orderId) => {
      const order = this.getOrder(orderId);
      if (order) {
        order.batchCode = "";
        order.internalTag = "";
      }
    });

    this.batches = this.batches.filter((batch) => batch.code !== code);
    this.saveData();
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

  updateBatchTracking(code, tracking) {
    const batch = this.getBatch(code);
    if (!batch) return null;

    batch.inboundTracking = tracking;
    batch.updatedAt = new Date().toISOString();
    this.saveData();
    return batch;
  }

  associateOrdersToBatch(orderIds, batchCode) {
    const batch = this.getBatch(batchCode);
    if (!batch) return;

    orderIds.forEach((orderId) => {
      const order = this.getOrder(orderId);
      if (order && order.shippingType === "PADRAO") {
        order.batchCode = batchCode;
        order.internalTag = this.generateInternalTag(
          order.productName,
          order.id
        );
      }
    });

    this.saveData();
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
    return this.orders.filter(
      (order) =>
        order.shippingType === "PADRAO" &&
        order.paymentStatus === "PAGO" &&
        !order.batchCode
    );
  }

  getOrdersInBatch(batchCode) {
    const batch = this.getBatch(batchCode);
    if (!batch) return [];

    return batch.orderIds
      .map((orderId) => this.getOrder(orderId))
      .filter((order) => order !== undefined);
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
