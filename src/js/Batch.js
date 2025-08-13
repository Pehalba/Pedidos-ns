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

    const statusSelect = document.getElementById("batch-status");
    if (statusSelect) {
      statusSelect.value = batch.status || "CRIADO";
    }
  }

  loadAvailableOrders() {
    const availableOrders = this.store
      .getOrders()
      .filter(
        (order) =>
          order.shippingType === "PADRAO" &&
          order.paymentStatus === "PAGO" &&
          !order.batchCode
      );

    this.renderAvailableOrders(availableOrders);
  }

  renderAvailableOrders(orders) {
    const container = document.getElementById("available-orders");
    if (!container) return;

    if (orders.length === 0) {
      container.innerHTML =
        '<p class="text-muted">Nenhum pedido disponível</p>';
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
  }

  async saveBatch() {
    console.log("saveBatch chamado");
    
    const nameInput = document.getElementById("batch-name");
    const trackingInput = document.getElementById("batch-tracking");
    const notesInput = document.getElementById("batch-notes");

    console.log("Inputs encontrados:", { nameInput, trackingInput, notesInput });

    if (!nameInput || !nameInput.value.trim()) {
      this.showToast("Nome do lote é obrigatório", "error");
      return;
    }

    const batchData = {
      name: nameInput.value.trim(),
      inboundTracking: trackingInput ? trackingInput.value.trim() : "",
      notes: notesInput ? notesInput.value.trim() : "",
      orderIds: this.selectedOrderIds,
    };

    console.log("Dados do lote:", batchData);
    console.log("currentBatchCode:", this.currentBatchCode);

    try {
      if (this.currentBatchCode) {
        // Editar lote existente
        console.log("Editando lote existente");
        await this.store.updateBatch(this.currentBatchCode, batchData);
        this.showToast("Lote atualizado com sucesso", "success");
      } else {
        // Criar novo lote
        console.log("Criando novo lote");
        const newBatch = await this.store.addBatch(batchData);
        console.log("Novo lote criado:", newBatch);
        this.showToast("Lote criado com sucesso", "success");
      }

      this.closeModal();
      window.app.renderDashboard();
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

  updateBatchTracking(tracking) {
    if (!this.currentBatchCode) return;
    if (!this.store || typeof this.store.updateBatchTracking !== 'function') {
      console.error('Store ou método updateBatchTracking não disponível');
      return;
    }

    this.store.updateBatchTracking(this.currentBatchCode, tracking);
  }

  addTracking(batchCode) {
    const tracking = prompt("Digite o código de rastreio:");
    if (!tracking) return;

    if (!this.store || typeof this.store.updateBatchTracking !== 'function') {
      console.error('Store ou método updateBatchTracking não disponível');
      return;
    }

    this.store.updateBatchTracking(batchCode, tracking.trim());
    this.showToast("Código de rastreio adicionado", "success");
    window.app.renderDashboard();
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
