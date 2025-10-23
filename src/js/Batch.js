export class Batch {
  constructor(store) {
    this.store = store;
    this.currentBatchCode = null;
    this.selectedOrderIds = [];
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Event listeners para seleção de pedidos
    document.addEventListener("change", (e) => {
      if (e.target.classList.contains("order-checkbox")) {
        const orderId = e.target.value;
        if (e.target.checked) {
          this.selectedOrderIds.push(orderId);
        } else {
          this.selectedOrderIds = this.selectedOrderIds.filter(
            (id) => id !== orderId
          );
        }
        this.updateSelectedOrdersDisplay();
      }
    });

    // Event listener para remoção de pedidos selecionados
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-selected-order")) {
        const orderId = e.target.dataset.orderId;
        this.removeSelectedOrder(orderId);
      }

      if (e.target.id === "clear-all-selected") {
        this.clearAllSelectedOrders();
      }

      if (e.target.id === "manage-batch-suppliers-btn") {
        if (window.app.supplier) {
          window.app.supplier.openSuppliersModal();
        }
      }
    });

    // Event listener para o overlay (fechar modal ao clicar fora)
    const overlay = document.getElementById("modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", () => {
        this.closeModal();
      });
    }
  }

  setupModalEventListeners() {
    // Configurar botão salvar
    const saveBtn = document.getElementById("batch-modal-save");
    if (saveBtn) {
      // Remover listeners antigos
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

      // Adicionar novo listener
      newSaveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.saveBatch();
      });
    }

    // Event listeners para mudança de status
    const statusSelect = document.getElementById("batch-status");
    if (statusSelect) {
      statusSelect.addEventListener("change", (e) => {
        this.updateBatchStatus(e.target.value);
      });
    }

    // Event listeners para tracking
    const trackingInput = document.getElementById("batch-tracking");
    if (trackingInput) {
      trackingInput.addEventListener("input", (e) => {
        this.updateBatchTracking(e.target.value);
      });
    }
  }

  openCreateModal() {
    this.currentBatchCode = null;
    this.selectedOrderIds = [];
    this.resetForm();
    this.loadAvailableOrders();

    const titleElement = document.getElementById("batch-modal-title");
    if (titleElement) {
      titleElement.textContent = "Novo Lote";
    }

    // Carregar fornecedores
    this.updateBatchSupplierSelect();

    this.updateSelectedOrdersDisplay(); // Atualizar exibição das seleções
    this.showModal();
    this.setupModalEventListeners();
  }

  openEditModal(batchCode) {
    this.currentBatchCode = batchCode;
    const batch = this.store.getBatch(batchCode);
    if (!batch) return;

    this.selectedOrderIds = [...batch.orderIds];
    this.loadFormData(batch);
    this.loadAvailableOrders();

    const titleElement = document.getElementById("batch-modal-title");
    if (titleElement) {
      titleElement.textContent = "Editar Lote";
    }

    // Carregar fornecedores
    this.updateBatchSupplierSelect();

    this.updateSelectedOrdersDisplay(); // Atualizar exibição das seleções
    this.showModal();
    this.setupModalEventListeners();
  }

  openDetailModal(batchCode) {
    const batch = this.store.getBatch(batchCode);
    if (!batch) return;

    this.currentBatchCode = batchCode;
    this.renderBatchDetail(batch);
    this.showModal("batch-detail-modal");
  }

  resetForm() {
    const form = document.getElementById("batch-form");
    if (form) {
      form.reset();
    }

    // Limpar campos específicos
    const codeInput = document.getElementById("batch-code");
    if (codeInput) {
      codeInput.value = "";
    }

    const trackingInput = document.getElementById("batch-tracking");
    if (trackingInput) {
      trackingInput.value = "";
    }

    const notesInput = document.getElementById("batch-notes");
    if (notesInput) {
      notesInput.value = "";
    }

    // Limpar seleção de pedidos
    this.selectedOrderIds = [];
    this.renderAvailableOrders([]);
  }

  loadFormData(batch) {
    const nameInput = document.getElementById("batch-name");
    if (nameInput) {
      nameInput.value = batch.name || "";
    }

    const codeInput = document.getElementById("batch-code");
    if (codeInput) {
      codeInput.value = batch.code || "";
    }

    const trackingInput = document.getElementById("batch-tracking");
    if (trackingInput) {
      trackingInput.value = batch.inboundTracking || "";
    }

    const notesInput = document.getElementById("batch-notes");
    if (notesInput) {
      notesInput.value = batch.notes || "";
    }

    const supplierInput = document.getElementById("batch-supplier");
    if (supplierInput) {
      supplierInput.value = batch.supplierId || "";
    }

    const statusSelect = document.getElementById("batch-status");
    if (statusSelect) {
      statusSelect.value = batch.status || "CRIADO";
    }
  }

  loadAvailableOrders() {
    // Carregar pedidos disponíveis sem verificação de integridade para evitar travamentos
    const allOrders = this.store.getOrders();
    console.log("Total de pedidos:", allOrders.length);
    
    // Debug: verificar pedidos com batchCode
    const ordersWithBatch = allOrders.filter(o => o.batchCode && o.batchCode.trim() !== "");
    console.log("Pedidos com batchCode:", ordersWithBatch.map(o => ({ id: o.id, batchCode: o.batchCode })));

    const availableOrders = allOrders.filter((order) => {
      // Verificar se o pedido já está em algum lote
      const hasBatchCode = order.batchCode && order.batchCode.trim() !== "";
      
      // Se estamos editando um lote, permitir pedidos que já estão neste lote
      if (this.currentBatchCode && order.batchCode === this.currentBatchCode) {
        console.log(
          `Incluindo pedido ${order.id} que já está no lote ${this.currentBatchCode}`
        );
        return true;
      }
      
      // Se o pedido já está em outro lote, não está disponível
      if (hasBatchCode && order.batchCode !== this.currentBatchCode) {
        console.log(
          `Excluindo pedido ${order.id} que já está no lote ${order.batchCode}`
        );
        return false;
      }

      // Verificar critérios básicos
      const isEligible =
        order.shippingType === "PADRAO" &&
        order.paymentStatus === "PAGO" &&
        !hasBatchCode; // Não deve ter batchCode

      return isEligible;
    });

    console.log("Pedidos disponíveis para lote:", availableOrders.length);
    console.log("Pedidos disponíveis:", availableOrders);
    
    // Debug adicional: verificar se há pedidos duplicados
    const availableIds = availableOrders.map(o => o.id);
    const duplicateIds = availableIds.filter((id, index) => availableIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      console.warn("Pedidos duplicados encontrados:", duplicateIds);
    }

    this.renderAvailableOrders(availableOrders);
  }

  renderAvailableOrders(orders) {
    const container = document.getElementById("available-orders");
    console.log("Container available-orders:", container);

    if (!container) {
      console.error("Container available-orders não encontrado!");
      return;
    }

    console.log("Renderizando pedidos:", orders.length);

    if (orders.length === 0) {
      container.innerHTML =
        '<p class="text-muted">Nenhum pedido disponível</p>';
      console.log("Nenhum pedido disponível - mostrando mensagem");
      return;
    }

    const ordersHtml = orders
      .map(
        (order) => `
        <div class="order-item">
          <label class="checkbox-label">
            <input
              type="checkbox"
              class="order-checkbox"
              value="${order.id}"
              ${this.selectedOrderIds.includes(order.id) ? "checked" : ""}
            />
            <span class="checkbox-custom"></span>
            <div class="order-info">
              <strong>#${order.id}</strong> - ${order.productName}
              <br>
              <small>${order.customerName} - ${order.size || "N/A"}</small>
            </div>
          </label>
        </div>
      `
      )
      .join("");

    container.innerHTML = ordersHtml;
    this.updateSelectedOrdersDisplay();
  }

  updateSelectedOrdersDisplay() {
    const section = document.getElementById("selected-orders-section");
    const count = document.getElementById("selected-count");
    const list = document.getElementById("selected-orders-list");

    if (!section || !count || !list) return;

    if (this.selectedOrderIds.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    count.textContent = this.selectedOrderIds.length;

    // Buscar informações dos pedidos selecionados
    const selectedOrders = this.selectedOrderIds
      .map((id) => this.store.getOrder(id))
      .filter(Boolean);

    const ordersHtml = selectedOrders
      .map(
        (order) => `
        <div class="selected-order-item">
          <div class="order-info">
            <strong>#${order.id}</strong> - ${order.productName}
            <br>
            <small>${order.customerName} - ${order.size || "N/A"}</small>
          </div>
          <button 
            type="button" 
            class="remove-btn remove-selected-order" 
            data-order-id="${order.id}"
            title="Remover pedido"
          >
            ×
          </button>
        </div>
      `
      )
      .join("");

    list.innerHTML = ordersHtml;
  }

  removeSelectedOrder(orderId) {
    // Remover da lista de selecionados
    this.selectedOrderIds = this.selectedOrderIds.filter(
      (id) => id !== orderId
    );

    // Desmarcar o checkbox correspondente
    const checkbox = document.querySelector(`input[value="${orderId}"]`);
    if (checkbox) {
      checkbox.checked = false;
    }

    // Atualizar a exibição
    this.updateSelectedOrdersDisplay();
  }

  clearAllSelectedOrders() {
    // Limpar lista de selecionados
    this.selectedOrderIds = [];

    // Desmarcar todos os checkboxes
    const checkboxes = document.querySelectorAll(".order-checkbox");
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    // Atualizar a exibição
    this.updateSelectedOrdersDisplay();
  }

  updateBatchSupplierSelect() {
    const select = document.getElementById("batch-supplier");
    if (!select) return;

    const suppliers = this.store.getSuppliers();
    const favoriteSupplier = this.store.getFavoriteSupplier();

    // Limpar opções existentes (exceto a primeira)
    select.innerHTML = '<option value="">Selecionar fornecedor...</option>';

    // Adicionar fornecedores
    suppliers.forEach((supplier) => {
      const option = document.createElement("option");
      option.value = supplier.id;
      option.textContent = supplier.name;
      if (supplier.isFavorite) {
        option.textContent += " ⭐";
        option.selected = true; // Selecionar o favorito por padrão
      }
      select.appendChild(option);
    });
  }

  async saveBatch() {
    console.log("saveBatch chamado");

    const nameInput = document.getElementById("batch-name");
    const trackingInput = document.getElementById("batch-tracking");
    const notesInput = document.getElementById("batch-notes");

    console.log("Inputs encontrados:", {
      nameInput,
      trackingInput,
      notesInput,
    });

    if (!nameInput || !nameInput.value.trim()) {
      this.showToast("Nome do lote é obrigatório", "error");
      return;
    }

    const batchData = {
      name: nameInput.value.trim(),
      inboundTracking: trackingInput ? trackingInput.value.trim() : "",
      notes: notesInput ? notesInput.value.trim() : "",
      supplierId: document.getElementById("batch-supplier").value || "",
      orderIds: this.selectedOrderIds,
    };

    console.log("Dados do lote:", batchData);
    console.log("currentBatchCode:", this.currentBatchCode);

    try {
      if (this.currentBatchCode) {
        // Editar lote existente
        console.log("Editando lote existente");
        console.log(
          "Chamando store.updateBatch com:",
          this.currentBatchCode,
          batchData
        );
        const result = await this.store.updateBatch(
          this.currentBatchCode,
          batchData
        );
        console.log("Resultado do updateBatch:", result);
        this.showToast("Lote atualizado com sucesso", "success");
      } else {
        // Criar novo lote
        console.log("Criando novo lote");
        const newBatch = await this.store.addBatch(batchData);
        console.log("Novo lote criado:", newBatch);
        this.showToast("Lote criado com sucesso", "success");
      }

      console.log("Fechando modal e renderizando dashboard");
      this.closeModal();
      window.app.renderDashboard();
      console.log("Processo de salvamento concluído");
    } catch (error) {
      console.error("Erro ao salvar lote:", error);
      this.showToast("Erro ao salvar lote", "error");
    }
  }

  async deleteBatch(batchCode = null) {
    const codeToDelete = batchCode || this.currentBatchCode;
    if (!codeToDelete) {
      console.error("Nenhum código de lote fornecido para exclusão");
      return;
    }

    if (confirm("Tem certeza que deseja excluir este lote?")) {
      try {
        await this.store.deleteBatch(codeToDelete);
        this.showToast("Lote excluído com sucesso", "success");

        // Se estamos em um modal, fechar
        if (this.currentBatchCode) {
          this.closeModal();
        }

        window.app.renderDashboard();
      } catch (error) {
        console.error("Erro ao excluir lote:", error);
        this.showToast("Erro ao excluir lote", "error");
      }
    }
  }

  updateBatchStatus(status) {
    if (!this.currentBatchCode) return;

    this.store.updateBatchStatus(this.currentBatchCode, status);
    this.showToast("Status atualizado com sucesso", "success");
  }

  async updateBatchTracking(tracking) {
    if (!this.currentBatchCode) return;
    if (!this.store || typeof this.store.updateBatchTracking !== "function") {
      console.error("Store ou método updateBatchTracking não disponível");
      return;
    }

    try {
      await this.store.updateBatchTracking(this.currentBatchCode, tracking);
    } catch (error) {
      console.error("Erro ao atualizar rastreio:", error);
    }
  }

  async addTracking(batchCode) {
    const tracking = prompt("Digite o código de rastreio:");
    if (!tracking) return;

    if (!this.store || typeof this.store.updateBatchTracking !== "function") {
      console.error("Store ou método updateBatchTracking não disponível");
      return;
    }

    try {
      await this.store.updateBatchTracking(batchCode, tracking.trim());
      this.showToast("Código de rastreio adicionado", "success");
      window.app.renderDashboard();
    } catch (error) {
      console.error("Erro ao adicionar rastreio:", error);
      this.showToast("Erro ao adicionar rastreio", "error");
    }
  }

  async toggleDestination(batchCode) {
    if (!this.store) {
      console.error("Store não disponível");
      return;
    }

    try {
      const batch = this.store.getBatch(batchCode);
      if (!batch) {
        this.showToast("Lote não encontrado", "error");
        return;
      }

      // Alternar entre 'pedro', 'edu' e 'rodrigo'
      let newDestination;
      if (batch.destination === "pedro") {
        newDestination = "edu";
      } else if (batch.destination === "edu") {
        newDestination = "rodrigo";
      } else {
        newDestination = "pedro";
      }

      // Atualizar o lote com o novo destino
      await this.store.updateBatch(batchCode, {
        ...batch,
        destination: newDestination,
        updatedAt: new Date().toISOString(),
      });

      const destinationName =
        newDestination === "edu"
          ? "Edu"
          : newDestination === "rodrigo"
          ? "Rodrigo"
          : "Pedro";
      this.showToast(`Destino alterado para ${destinationName}`, "success");

      // Recarregar o dashboard para mostrar a mudança
      window.app.renderDashboard();
    } catch (error) {
      console.error("Erro ao alterar destino:", error);
      this.showToast("Erro ao alterar destino", "error");
    }
  }

  async toggleShippingStatus(batchCode) {
    if (!this.store) {
      console.error("Store não disponível");
      return;
    }

    try {
      const batch = this.store.getBatch(batchCode);
      if (!batch) {
        this.showToast("Lote não encontrado", "error");
        return;
      }

      // Verificar se o lote foi enviado (tem rastreio)
      if (!batch.isShipped) {
        this.showToast("Adicione um código de rastreio primeiro", "error");
        return;
      }

      // Alternar status de recebimento
      await this.store.toggleBatchReceived(batchCode);

      // Atualizar UI
      window.app.renderDashboard();

      let newStatus = "Enviado";
      if (batch.isReceived) newStatus = "Recebido";
      else if (batch.isAbnormal) newStatus = "Status Anormal";

      this.showToast(`Status alterado para ${newStatus}`, "success");
    } catch (error) {
      console.error("Erro ao alterar status de envio:", error);
      this.showToast("Erro ao alterar status de envio", "error");
    }
  }

  renderBatchDetail(batch) {
    const container = document.getElementById("batch-detail-content");
    if (!container) return;

    const orders = batch.orderIds
      .map((id) => this.store.getOrder(id))
      .filter(Boolean);

    const html = `
      <div class="batch-detail-header">
        <h2>${batch.name}</h2>
        <p class="batch-code">${batch.code}</p>
        <div class="batch-tracking">
          ${
            batch.inboundTracking
              ? `
            <a href="https://pacotevicio.app/?code=${batch.inboundTracking}" target="_blank" class="tracking-code tracking-link">
              ${batch.inboundTracking}
            </a>
            <button class="btn btn--small" onclick="navigator.clipboard.writeText('${batch.inboundTracking}')">
              Copiar
            </button>
          `
              : `
            <span class="no-tracking">Sem rastreio</span>
            <button class="btn btn--small" onclick="this.showTrackingInput()">
              Adicionar rastreio
            </button>
          `
          }
        </div>
        <div class="batch-status">
          <select id="batch-detail-status" onchange="window.app.batch.updateBatchStatus(this.value)">
            <option value="CRIADO" ${
              batch.status === "CRIADO" ? "selected" : ""
            }>Criado</option>
            <option value="A_CAMINHO" ${
              batch.status === "A_CAMINHO" ? "selected" : ""
            }>A Caminho</option>
            <option value="RECEBIDO" ${
              batch.status === "RECEBIDO" ? "selected" : ""
            }>Recebido</option>
            <option value="SEPARADO" ${
              batch.status === "SEPARADO" ? "selected" : ""
            }>Separado</option>
          </select>
        </div>
        ${batch.notes ? `<p class="batch-notes">${batch.notes}</p>` : ""}
      </div>

      <div class="batch-detail-search">
        <input
          type="text"
          id="batch-detail-search"
          placeholder="Buscar por número do pedido ou produto (/)"
          oninput="window.app.filters.filterBatchOrders(this.value)"
        />
      </div>

      <div class="batch-detail-actions">
        <button class="btn btn--primary" onclick="window.app.printing.printPickingList('${
          batch.code
        }')">
          Imprimir Picking List
        </button>
        <button class="btn btn--secondary" onclick="window.app.printing.printInternalLabels('${
          batch.code
        }')">
          Imprimir Etiquetas Internas
        </button>
      </div>

      <div class="batch-orders">
        <h3>Pedidos do Lote (${orders.length})</h3>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Produto</th>
              <th>Tamanho</th>
              <th>Cliente</th>
              <th>Tag Interna</th>
            </tr>
          </thead>
          <tbody>
            ${orders
              .map(
                (order) => `
              <tr>
                <td>${order.id}</td>
                <td>${order.productName}</td>
                <td>${order.size || "N/A"}</td>
                <td>${order.customerName}</td>
                <td>${order.internalTag || "N/A"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }

  showModal(modalId = "batch-modal") {
    window.app.ui.showModal(modalId);
  }

  closeModal(modalId = "batch-modal") {
    window.app.ui.hideModal(modalId);
  }

  showToast(message, type = "info") {
    window.app.ui.showToast(message, type);
  }
}
