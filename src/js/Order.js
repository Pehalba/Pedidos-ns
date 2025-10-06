export class Order {
  constructor(store) {
    this.store = store;
    this.currentOrderId = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Modal de pedido
    document
      .getElementById("order-modal-close")
      ?.addEventListener("click", () => {
        this.closeModal();
      });

    document
      .getElementById("order-modal-cancel")
      ?.addEventListener("click", () => {
        this.closeModal();
      });

    // Formulário de pedido
    document.getElementById("order-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveOrder();
    });

    // Fechar modal ao clicar no overlay
    document.getElementById("modal-overlay")?.addEventListener("click", () => {
      this.closeModal();
    });

    // Fechar modal com ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeModal();
      }
    });
  }

  openCreateModal() {
    this.currentOrderId = null;
    this.resetForm();
    document.getElementById("order-modal-title").textContent = "Novo Pedido";
    this.showModal();
  }

  openEditModal(orderId) {
    const order = this.store.getOrder(orderId);
    if (!order) {
      window.app.ui.showToast("Pedido não encontrado", "error");
      return;
    }

    this.currentOrderId = orderId;
    this.populateForm(order);
    document.getElementById("order-modal-title").textContent = "Editar Pedido";
    this.showModal();
  }

  resetForm() {
    const form = document.getElementById("order-form");
    if (form) {
      form.reset();
    }
  }

  populateForm(order) {
    document.getElementById("order-id").value = order.id;
    document.getElementById("order-customer").value = order.customerName;
    document.getElementById("order-product").value = order.productName;
    document.getElementById("order-size").value = order.size || "";
    document.getElementById("order-sku").value = order.sku || "";
    document.getElementById("order-shipping").value = order.shippingType;
    document.getElementById("order-payment").value = order.paymentStatus;
    document.getElementById("order-notes").value = order.notes || "";
  }

  async saveOrder() {
    const formData = this.getFormData();

    if (!this.validateForm(formData)) {
      return;
    }

    try {
      if (this.currentOrderId) {
        // Atualizar pedido existente
        const updatedOrder = await this.store.updateOrder(
          this.currentOrderId,
          formData
        );
        if (updatedOrder) {
          window.app.ui.showToast("Pedido atualizado com sucesso", "success");
          this.closeModal();
          window.app.renderOrders();
        } else {
          window.app.ui.showToast("Erro ao atualizar pedido", "error");
        }
      } else {
        // Criar novo pedido
        const newOrder = await this.store.addOrder(formData);
        if (newOrder) {
          window.app.ui.showToast("Pedido criado com sucesso", "success");
          this.closeModal();
          window.app.renderOrders();
        } else {
          window.app.ui.showToast("Erro ao criar pedido", "error");
        }
      }
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      window.app.ui.showToast("Erro ao salvar pedido", "error");
    }
  }

  getFormData() {
    return {
      id: document.getElementById("order-id").value.trim(),
      customerName: document.getElementById("order-customer").value.trim(),
      productName: document.getElementById("order-product").value.trim(),
      size: document.getElementById("order-size").value.trim(),
      sku: document.getElementById("order-sku").value.trim(),
      shippingType: document.getElementById("order-shipping").value,
      paymentStatus: document.getElementById("order-payment").value,
      notes: document.getElementById("order-notes").value.trim(),
    };
  }

  validateForm(data) {
    if (!data.id) {
      window.app.ui.showToast("ID do pedido é obrigatório", "error");
      return false;
    }

    if (!data.productName) {
      window.app.ui.showToast("Nome do produto é obrigatório", "error");
      return false;
    }

    if (!data.shippingType) {
      window.app.ui.showToast("Tipo de frete é obrigatório", "error");
      return false;
    }

    if (!data.paymentStatus) {
      window.app.ui.showToast("Status do pagamento é obrigatório", "error");
      return false;
    }

    // Verificar se o ID já existe (apenas para novos pedidos)
    if (!this.currentOrderId) {
      const existingOrder = this.store.getOrder(data.id);
      if (existingOrder) {
        window.app.ui.showToast("Já existe um pedido com este ID", "error");
        return false;
      }
    }

    return true;
  }

  async deleteOrder(orderId) {
    if (!confirm("Tem certeza que deseja excluir este pedido?")) {
      return;
    }

    try {
      const success = await this.store.deleteOrder(orderId);
      if (success) {
        window.app.ui.showToast("Pedido excluído com sucesso", "success");
        window.app.renderOrders();
        window.app.renderDashboard();
      } else {
        window.app.ui.showToast("Erro ao excluir pedido", "error");
      }
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      window.app.ui.showToast("Erro ao excluir pedido", "error");
    }
  }

  showModal() {
    window.app.ui.showModal("order-modal");
  }

  closeModal() {
    window.app.ui.hideModal("order-modal");
    this.currentOrderId = null;
  }

  // Métodos para integração com lotes
  getOrdersForBatch() {
    return this.store.getAvailableOrders();
  }

  async updateOrderShippingType(orderId, newShippingType) {
    const order = this.store.getOrder(orderId);
    if (!order) return false;

    // Se mudou para EXPRESSO e estava em um lote, desassociar
    if (newShippingType === "EXPRESSO" && order.batchCode) {
      this.store.removeOrderFromBatch(orderId, order.batchCode);
    }

    return await this.store.updateOrder(orderId, {
      shippingType: newShippingType,
    });
  }

  // Métodos para busca e filtros
  searchOrders(query) {
    return this.store.searchOrders(query, window.app.ui.getCurrentFilters());
  }

  filterOrders(filters) {
    window.app.ui.updateFilters(filters);
    const orders = this.store.searchOrders("", filters);
    window.app.ui.renderOrdersList(orders);
  }

  // Métodos para estatísticas
  getOrderStats() {
    const orders = this.store.getOrders();
    const stats = {
      total: orders.length,
      padrao: orders.filter((o) => o.shippingType === "PADRAO").length,
      expresso: orders.filter((o) => o.shippingType === "EXPRESSO").length,
      pago: orders.filter((o) => o.paymentStatus === "PAGO").length,
      aguardando: orders.filter((o) => o.paymentStatus === "AGUARDANDO").length,
      cancelado: orders.filter((o) => o.paymentStatus === "CANCELADO").length,
      emLote: orders.filter((o) => o.batchCode).length,
      semLote: orders.filter((o) => !o.batchCode).length,
    };

    return stats;
  }

  // Métodos para exportação
  exportOrders(format = "csv") {
    const orders = this.store.getOrders();

    if (format === "csv") {
      return this.exportToCSV(orders);
    } else if (format === "json") {
      return this.exportToJSON(orders);
    }
  }

  exportToCSV(orders) {
    const headers = [
      "ID",
      "Cliente",
      "Produto",
      "Tamanho",
      "SKU",
      "Tipo de Frete",
      "Status do Pagamento",
      "Lote",
      "Tag Interna",
      "Notas",
    ];

    const csvContent = [
      headers.join(","),
      ...orders.map((order) =>
        [
          order.id,
          `"${order.customerName}"`,
          `"${order.productName}"`,
          order.size || "",
          order.sku || "",
          order.shippingType,
          order.paymentStatus,
          order.batchCode || "",
          order.internalTag || "",
          `"${order.notes || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `pedidos_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToJSON(orders) {
    const dataStr = JSON.stringify(orders, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `pedidos_${new Date().toISOString().split("T")[0]}.json`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Métodos para validação de dados
  validateOrderData(data) {
    const errors = [];

    if (!data.id || data.id.trim() === "") {
      errors.push("ID do pedido é obrigatório");
    }

    // Nome do cliente é opcional

    if (!data.productName || data.productName.trim() === "") {
      errors.push("Nome do produto é obrigatório");
    }

    if (!["PADRAO", "EXPRESSO"].includes(data.shippingType)) {
      errors.push("Tipo de frete deve ser PADRAO ou EXPRESSO");
    }

    if (!["PAGO", "AGUARDANDO", "CANCELADO"].includes(data.paymentStatus)) {
      errors.push("Status do pagamento deve ser PAGO, AGUARDANDO ou CANCELADO");
    }

    return errors;
  }

  // Métodos para normalização de dados
  normalizeOrderData(data) {
    return {
      id: data.id?.toString().trim(),
      customerName: data.customerName?.trim() || "Cliente não informado",
      productName: data.productName?.trim(),
      size: data.size?.trim() || "",
      sku: data.sku?.trim() || "",
      shippingType: data.shippingType?.toUpperCase() || "PADRAO",
      paymentStatus: data.paymentStatus?.toUpperCase() || "AGUARDANDO",
      notes: data.notes?.trim() || "",
    };
  }
}
