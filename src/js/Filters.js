export class Filters {
  constructor() {
    this.currentFilters = {
      search: "",
      shippingType: "",
      paymentStatus: "",
    };
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Busca de pedidos
    document.getElementById("order-search")?.addEventListener("input", (e) => {
      this.updateSearchFilter(e.target.value);
    });

    // Filtro por tipo de frete
    document
      .getElementById("shipping-filter")
      ?.addEventListener("change", (e) => {
        this.updateShippingFilter(e.target.value);
      });

    // Filtro por status de pagamento
    document
      .getElementById("payment-filter")
      ?.addEventListener("change", (e) => {
        this.updatePaymentFilter(e.target.value);
      });
  }

  updateSearchFilter(value) {
    this.currentFilters.search = value.trim();
    this.applyFilters();
  }

  updateShippingFilter(value) {
    this.currentFilters.shippingType = value;
    this.applyFilters();
  }

  updatePaymentFilter(value) {
    this.currentFilters.paymentStatus = value;
    this.applyFilters();
  }

  applyFilters() {
    if (!window.app || !window.app.store) return;

    const orders = window.app.store.searchOrders(this.currentFilters.search, {
      shippingType: this.currentFilters.shippingType,
      paymentStatus: this.currentFilters.paymentStatus,
    });

    window.app.ui.renderOrdersList(orders);
  }

  clearFilters() {
    this.currentFilters = {
      search: "",
      shippingType: "",
      paymentStatus: "",
    };

    // Limpar campos de input
    const searchInput = document.getElementById("order-search");
    if (searchInput) searchInput.value = "";

    const shippingSelect = document.getElementById("shipping-filter");
    if (shippingSelect) shippingSelect.value = "";

    const paymentSelect = document.getElementById("payment-filter");
    if (paymentSelect) paymentSelect.value = "";

    this.applyFilters();
  }

  getCurrentFilters() {
    return { ...this.currentFilters };
  }

  setFilters(filters) {
    this.currentFilters = { ...this.currentFilters, ...filters };
    this.applyFilters();
  }

  // Métodos para filtros específicos
  filterByShippingType(shippingType) {
    this.currentFilters.shippingType = shippingType;
    this.applyFilters();
  }

  filterByPaymentStatus(paymentStatus) {
    this.currentFilters.paymentStatus = paymentStatus;
    this.applyFilters();
  }

  filterBySearch(query) {
    this.currentFilters.search = query.trim();
    this.applyFilters();
  }

  // Métodos para filtros de lotes
  filterBatchesByStatus(status) {
    if (!window.app || !window.app.store) return;

    const batches = status
      ? window.app.store.getBatches().filter((batch) => batch.status === status)
      : window.app.store.getBatches();

    window.app.ui.renderBatchesList(batches);
  }

  filterBatchOrders(query) {
    if (!window.app || !window.app.batch || !window.app.batch.currentBatchCode) return;

    const batch = window.app.store.getBatch(window.app.batch.currentBatchCode);
    if (!batch) return;

    const orders = batch.orderIds
      .map((id) => window.app.store.getOrder(id))
      .filter(Boolean);

    if (query) {
      const searchTerm = query.toLowerCase();
      const filteredOrders = orders.filter(
        (order) =>
          order.id.toLowerCase().includes(searchTerm) ||
          order.productName.toLowerCase().includes(searchTerm) ||
          order.customerName.toLowerCase().includes(searchTerm)
      );

      // Atualizar a tabela de pedidos no modal de detalhes
      const container = document.getElementById("batch-detail-content");
      if (container) {
        const html = `
          <div class="batch-detail-header">
            <h2>${batch.name}</h2>
            <p class="batch-code">${batch.code}</p>
            <div class="batch-tracking">
              ${batch.inboundTracking ? `
                <a href="https://pacotevicio.app/?code=${batch.inboundTracking}" target="_blank" class="tracking-code tracking-link">
              ${batch.inboundTracking}
            </a>
                <button class="btn btn--small" onclick="navigator.clipboard.writeText('${batch.inboundTracking}')">
                  Copiar
                </button>
              ` : `
                <span class="no-tracking">Sem rastreio</span>
                <button class="btn btn--small" onclick="window.app.batch.addTracking('${batch.code}')">
                  Adicionar rastreio
                </button>
              `}
            </div>
            <div class="batch-status">
              <select id="batch-detail-status" onchange="window.app.batch.updateBatchStatus(this.value)">
                <option value="CRIADO" ${batch.status === "CRIADO" ? "selected" : ""}>Criado</option>
                <option value="A_CAMINHO" ${batch.status === "A_CAMINHO" ? "selected" : ""}>A Caminho</option>
                <option value="RECEBIDO" ${batch.status === "RECEBIDO" ? "selected" : ""}>Recebido</option>
                <option value="SEPARADO" ${batch.status === "SEPARADO" ? "selected" : ""}>Separado</option>
              </select>
            </div>
            ${batch.notes ? `<p class="batch-notes">${batch.notes}</p>` : ""}
          </div>

          <div class="batch-detail-search">
            <input
              type="text"
              id="batch-detail-search"
              placeholder="Buscar por número do pedido ou produto (/)"
              value="${query}"
              oninput="window.app.filters.filterBatchOrders(this.value)"
            />
          </div>

          <div class="batch-detail-actions">
            <button class="btn btn--primary" onclick="window.app.printing.printPickingList('${batch.code}')">
              Imprimir Picking List
            </button>
            <button class="btn btn--secondary" onclick="window.app.printing.printInternalLabels('${batch.code}')">
              Imprimir Etiquetas Internas
            </button>
          </div>

          <div class="batch-orders">
            <h3>Pedidos do Lote (${filteredOrders.length})</h3>
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
                ${filteredOrders
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
    }
  }

  // Métodos para busca avançada
  searchOrdersAdvanced(query, options = {}) {
    if (!window.app || !window.app.store) return [];

    const {
      includeBatchInfo = false,
      includeInternalTags = false,
      caseSensitive = false,
    } = options;

    let orders = window.app.store.getOrders();

    if (query) {
      const searchTerm = caseSensitive ? query : query.toLowerCase();

      orders = orders.filter((order) => {
        const searchableFields = [
          order.id,
          order.customerName,
          order.productName,
          order.size,
          order.sku,
        ];

        if (includeBatchInfo && order.batchCode) {
          searchableFields.push(order.batchCode);
        }

        if (includeInternalTags && order.internalTag) {
          searchableFields.push(order.internalTag);
        }

        return searchableFields.some((field) => {
          const fieldStr = caseSensitive ? field : field.toLowerCase();
          return fieldStr.includes(searchTerm);
        });
      });
    }

    return orders;
  }

  // Métodos para filtros combinados
  filterOrdersCombined(filters) {
    if (!window.app || !window.app.store) return [];

    let orders = window.app.store.getOrders();

    // Filtro por busca
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      orders = orders.filter(
        (order) =>
          order.id.toLowerCase().includes(searchTerm) ||
          order.customerName.toLowerCase().includes(searchTerm) ||
          order.productName.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por tipo de frete
    if (filters.shippingType) {
      orders = orders.filter(
        (order) => order.shippingType === filters.shippingType
      );
    }

    // Filtro por status de pagamento
    if (filters.paymentStatus) {
      orders = orders.filter(
        (order) => order.paymentStatus === filters.paymentStatus
      );
    }

    // Filtro por lote
    if (filters.batchCode) {
      orders = orders.filter((order) => order.batchCode === filters.batchCode);
    }

    // Filtro por status de lote
    if (filters.batchStatus) {
      const batches = window.app.store
        .getBatches()
        .filter((batch) => batch.status === filters.batchStatus);
      const batchCodes = batches.map((batch) => batch.code);
      orders = orders.filter((order) => batchCodes.includes(order.batchCode));
    }

    return orders;
  }

  // Métodos para ordenação
  sortOrders(orders, sortBy = "id", sortOrder = "asc") {
    const sortedOrders = [...orders];

    sortedOrders.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Converter para string para comparação
      aValue = aValue?.toString().toLowerCase() || "";
      bValue = bValue?.toString().toLowerCase() || "";

      if (sortOrder === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return sortedOrders;
  }

  // Métodos para agrupamento
  groupOrdersByField(orders, field) {
    const groups = {};

    orders.forEach((order) => {
      const value = order[field] || "Sem valor";
      if (!groups[value]) {
        groups[value] = [];
      }
      groups[value].push(order);
    });

    return groups;
  }

  groupOrdersByProduct(orders) {
    return this.groupOrdersByField(orders, "productName");
  }

  groupOrdersByShippingType(orders) {
    return this.groupOrdersByField(orders, "shippingType");
  }

  groupOrdersByPaymentStatus(orders) {
    return this.groupOrdersByField(orders, "paymentStatus");
  }

  groupOrdersByBatch(orders) {
    return this.groupOrdersByField(orders, "batchCode");
  }

  // Métodos para estatísticas de filtros
  getFilterStats() {
    if (!window.app || !window.app.store) return {};

    const orders = window.app.store.getOrders();
    const batches = window.app.store.getBatches();

    const stats = {
      total: {
        orders: orders.length,
        batches: batches.length,
      },
      shipping: {
        padrao: orders.filter((o) => o.shippingType === "PADRAO").length,
        expresso: orders.filter((o) => o.shippingType === "EXPRESSO").length,
      },
      payment: {
        pago: orders.filter((o) => o.paymentStatus === "PAGO").length,
        aguardando: orders.filter((o) => o.paymentStatus === "AGUARDANDO")
          .length,
        cancelado: orders.filter((o) => o.paymentStatus === "CANCELADO").length,
      },
      batch: {
        criado: batches.filter((b) => b.status === "CRIADO").length,
        aCaminho: batches.filter((b) => b.status === "A_CAMINHO").length,
        recebido: batches.filter((b) => b.status === "RECEBIDO").length,
        separado: batches.filter((b) => b.status === "SEPARADO").length,
      },
      association: {
        emLote: orders.filter((o) => o.batchCode).length,
        semLote: orders.filter((o) => !o.batchCode).length,
      },
    };

    return stats;
  }

  // Métodos para exportação de filtros
  exportFilteredOrders(format = "csv") {
    const orders = this.filterOrdersCombined(this.currentFilters);

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
      `pedidos_filtrados_${new Date().toISOString().split("T")[0]}.csv`
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
      `pedidos_filtrados_${new Date().toISOString().split("T")[0]}.json`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
