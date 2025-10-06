export class UI {
  constructor() {
    this.currentFilters = {
      search: "",
      shipping: "",
      payment: "",
      status: "",
    };
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById("modal-overlay");
    if (modal && overlay) {
      modal.classList.add("modal--show");
      overlay.classList.add("modal-overlay--show");
      document.body.style.overflow = "hidden";
    }
  }

  hideModal(modalId) {
    console.log("hideModal chamado com modalId:", modalId);
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById("modal-overlay");
    console.log("Modal encontrado:", modal);
    console.log("Overlay encontrado:", overlay);

    if (modal && overlay) {
      console.log("Removendo classes de visibilidade...");
      modal.classList.remove("modal--show");
      overlay.classList.remove("modal-overlay--show");
      document.body.style.overflow = "";
      console.log(
        "Classes removidas. Modal visível:",
        modal.classList.contains("modal--show")
      );
      console.log(
        "Overlay visível:",
        overlay.classList.contains("modal-overlay--show")
      );
    } else {
      console.error("Modal ou overlay não encontrado");
    }
  }

  hideAllModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.classList.remove("modal--show");
    });
    document
      .getElementById("modal-overlay")
      ?.classList.remove("modal-overlay--show");
    document.body.style.overflow = "";
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;

    const container =
      document.getElementById("toast-container") || document.body;
    container.appendChild(toast);

    // Animar entrada
    setTimeout(() => {
      toast.classList.add("toast--show");
    }, 100);

    // Remover após 3 segundos
    setTimeout(() => {
      toast.classList.remove("toast--show");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  renderBatchesList(batches, store = null) {
    const container = document.getElementById("batches-list");
    if (!container) return;

    if (batches.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Nenhum lote encontrado</p>
          <button class="btn btn--primary" data-requires-auth onclick="window.app.batch.openCreateModal()">
            Criar primeiro lote
          </button>
        </div>
      `;
      return;
    }

    // Ordenar lotes por data de criação (mais recentes primeiro)
    const sortedBatches = batches.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.createdAt || b.updatedAt || 0);
      return dateB - dateA; // Ordem decrescente (mais recente primeiro)
    });

    const batchesHtml = sortedBatches
      .map(
        (batch) => `
        <div class="batch-card" data-batch-code="${batch.code}">
          <div class="batch-card__header">
            <h3 class="batch-card__title">${batch.name}</h3>
            <p class="batch-card__code">${batch.code}</p>
          </div>
          
          <div class="batch-card__tracking">
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
              <button class="btn btn--small" onclick="window.app.batch.addTracking('${batch.code}')">
                Adicionar rastreio
              </button>
            `
            }
          </div>
          
          <div class="batch-card__status">
            <span class="status-badge status-badge--${batch.status.toLowerCase()}">
              ${this.getStatusText(batch.status)}
            </span>
          </div>
          
          <div class="batch-card__destination">
            <button class="destination-btn destination-btn--${
              batch.destination || "pedro"
            }" 
                    onclick="window.app.batch.toggleDestination('${
                      batch.code
                    }')">
              📦 ${batch.destination === "edu" ? "Edu" : "Pedro"}
            </button>
            <span class="shipping-badge shipping-badge--${
              batch.isShipped ? "shipped" : "not-shipped"
            }">
              ${batch.isShipped ? "📦 Enviado" : "⏳ Não Enviado"}
            </span>
            ${
              batch.supplierId
                ? `
              <span class="supplier-badge">
                🏢 ${this.getSupplierName(batch.supplierId)}
              </span>
            `
                : ""
            }
          </div>
          
          <div class="batch-card__orders">
            <span>${batch.orderIds.length} pedidos</span>
                         <div class="batch-card__orders-list">
               ${this.renderBatchOrdersPreview(
                 batch.orderIds,
                 store || window.app?.store
               )}
             </div>
          </div>
          
          <div class="batch-card__actions">
            <button class="btn btn--small" onclick="window.app.batch.openDetailModal('${
              batch.code
            }')">
              Ver detalhes
            </button>
            <button class="btn btn--small" data-requires-auth onclick="window.app.batch.openEditModal('${
              batch.code
            }')">
              Editar
            </button>
            <button class="btn btn--small btn--danger" data-requires-auth onclick="window.app.batch.deleteBatch('${
              batch.code
            }')">
              Excluir
            </button>
          </div>
        </div>
      `
      )
      .join("");

    container.innerHTML = batchesHtml;
  }

  renderOrdersList(orders) {
    const container = document.getElementById("orders-list");
    if (!container) return;

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Nenhum pedido encontrado</p>
          <button class="btn btn--primary" data-requires-auth onclick="window.app.order.openCreateModal()">
            Criar primeiro pedido
          </button>
        </div>
      `;
      return;
    }

    // Ordenar pedidos por data de criação (mais recentes primeiro)
    const sortedOrders = orders.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.createdAt || b.updatedAt || 0);
      return dateB - dateA; // Ordem decrescente (mais recente primeiro)
    });

    const ordersHtml = sortedOrders
      .map(
        (order) => `
        <div class="order-card" data-order-id="${order.id}">
          <div class="order-card__header">
            <h3 class="order-card__id">#${order.id}</h3>
            <span class="shipping-badge shipping-badge--${order.shippingType.toLowerCase()}">
              ${order.shippingType}
            </span>
          </div>
          
          <div class="order-card__content">
            <p class="order-card__product">${order.productName}</p>
            <p class="order-card__customer">${order.customerName}</p>
            ${
              order.size
                ? `<p class="order-card__size">Tamanho: ${order.size}</p>`
                : ""
            }
            ${
              order.sku
                ? `<p class="order-card__sku">SKU: ${order.sku}</p>`
                : ""
            }
          </div>
          
          <div class="order-card__status">
            <span class="payment-badge payment-badge--${order.paymentStatus.toLowerCase()}">
              ${this.getPaymentText(order.paymentStatus)}
            </span>
          </div>
          
          ${
            order.batchCode
              ? `
            <div class="order-card__batch">
              <span>Lote: ${order.batchCode}</span>
            </div>
          `
              : ""
          }
          
          <div class="order-card__actions">
            <button class="btn btn--small" data-requires-auth onclick="window.app.order.openEditModal('${
              order.id
            }')">
              Editar
            </button>
            <button class="btn btn--small btn--danger" data-requires-auth onclick="window.app.order.deleteOrder('${
              order.id
            }')">
              Excluir
            </button>
          </div>
        </div>
      `
      )
      .join("");

    container.innerHTML = ordersHtml;
  }

  renderExpressOrdersList(allOrders) {
    const container = document.getElementById("express-orders-list");
    const countContainer = document.getElementById("express-count");
    if (!container || !countContainer) return;

    // Filtrar apenas pedidos EXPRESSO
    const expressOrders = allOrders.filter(
      (order) => order.shippingType === "EXPRESSO"
    );

    // Atualizar contador
    countContainer.textContent = expressOrders.length;

    if (expressOrders.length === 0) {
      container.innerHTML = `
        <div class="express-empty-state">
          <p>🎉 Nenhum pedido expresso no momento!</p>
          <p>Quando houver pedidos com frete expresso, eles aparecerão aqui para atenção prioritária.</p>
        </div>
      `;
      return;
    }

    // Ordenar pedidos expresso por data de criação (mais recentes primeiro)
    const sortedExpressOrders = expressOrders.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.createdAt || b.updatedAt || 0);
      return dateB - dateA;
    });

    const expressOrdersHtml = sortedExpressOrders
      .map(
        (order) => `
        <div class="express-order-card" data-order-id="${order.id}">
          <div class="express-order-card__header">
            <h3 class="express-order-card__id">#${order.id}</h3>
            <span class="express-order-card__priority">🚀 Expresso</span>
          </div>
          
          <div class="express-order-card__content">
            <p class="express-order-card__product">${order.productName}</p>
            <p class="express-order-card__customer">${order.customerName}</p>
          </div>
          
          <div class="express-order-card__details">
            ${
              order.size
                ? `<span class="express-order-card__detail">📏 ${order.size}</span>`
                : ""
            }
            ${
              order.sku
                ? `<span class="express-order-card__detail">🏷️ ${order.sku}</span>`
                : ""
            }
            ${
              order.batchCode
                ? `<span class="express-order-card__detail">📦 Lote: ${order.batchCode}</span>`
                : ""
            }
          </div>
          
          <div class="express-order-card__status">
            <span class="express-order-card__payment">
              ${this.getPaymentText(order.paymentStatus)}
            </span>
          </div>
          
                         <div class="express-order-card__actions">
                 <button class="btn btn--small" data-requires-auth onclick="window.app.order.openEditModal('${
                   order.id
                 }')">
                   ✏️ Editar
                 </button>
                 <button class="btn btn--small btn--danger" data-requires-auth onclick="window.app.order.deleteOrder('${
                   order.id
                 }')">
                   🗑️ Excluir
                 </button>
               </div>
        </div>
      `
      )
      .join("");

    container.innerHTML = expressOrdersHtml;
  }

  renderImportPreview(data, mapping) {
    const container = document.getElementById("import-preview");
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML =
        '<p class="text-muted">Nenhum dado para visualizar</p>';
      return;
    }

    const previewData = data.slice(0, 5); // Mostrar apenas os primeiros 5 registros

    const html = `
      <div class="import-preview-header">
        <h3>Preview dos dados (${data.length} registros)</h3>
        <p>Mostrando os primeiros 5 registros</p>
      </div>
      
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Produto</th>
            <th>Tamanho</th>
            <th>SKU</th>
            <th>Frete</th>
            <th>Pagamento</th>
          </tr>
        </thead>
        <tbody>
          ${previewData
            .map(
              (row) => `
            <tr>
              <td>${row[mapping.orderId] || ""}</td>
              <td>${row[mapping.customerName] || ""}</td>
              <td>${row[mapping.productName] || ""}</td>
              <td>${row[mapping.size] || ""}</td>
              <td>${row[mapping.sku] || ""}</td>
              <td>${row[mapping.shippingType] || ""}</td>
              <td>${row[mapping.paymentStatus] || ""}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <div class="import-actions">
        <button class="btn btn--primary" onclick="window.app.csvImport.confirmImport()">
          Confirmar Importação
        </button>
        <button class="btn btn--secondary" onclick="window.app.csvImport.cancelImport()">
          Cancelar
        </button>
      </div>
    `;

    container.innerHTML = html;
  }

  renderColumnMapping(data, onMappingChange) {
    const container = document.getElementById("column-mapping");
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-muted">Nenhum dado para mapear</p>';
      return;
    }

    const sampleRow = data[0];
    const columns = Object.keys(sampleRow);
    const requiredFields = [
      "orderId",
      "customerName",
      "productName",
      "shippingType",
      "paymentStatus",
    ];
    const optionalFields = ["size", "sku", "notes"];

    const html = `
      <div class="mapping-form">
        <h3>Mapeamento de Colunas</h3>
        <p>Selecione qual coluna do CSV corresponde a cada campo do sistema:</p>
        
        <div class="mapping-grid">
          ${requiredFields
            .map(
              (field) => `
            <div class="mapping-field">
              <label for="mapping-${field}">${this.getFieldLabel(
                field
              )} *</label>
              <select id="mapping-${field}" onchange="window.app.csvImport.updateMapping('${field}', this.value)">
                <option value="">Selecione...</option>
                ${columns
                  .map(
                    (col) => `
                  <option value="${col}">${col}</option>
                `
                  )
                  .join("")}
              </select>
            </div>
          `
            )
            .join("")}
          
          ${optionalFields
            .map(
              (field) => `
            <div class="mapping-field">
              <label for="mapping-${field}">${this.getFieldLabel(field)}</label>
              <select id="mapping-${field}" onchange="window.app.csvImport.updateMapping('${field}', this.value)">
                <option value="">Selecione...</option>
                ${columns
                  .map(
                    (col) => `
                  <option value="${col}">${col}</option>
                `
                  )
                  .join("")}
              </select>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  getStatusText(status) {
    const statusMap = {
      CRIADO: "Criado",
      A_CAMINHO: "A Caminho",
      RECEBIDO: "Recebido",
      SEPARADO: "Separado",
    };
    return statusMap[status] || status;
  }

  getPaymentText(payment) {
    const paymentMap = {
      PAGO: "Pago",
      AGUARDANDO: "Aguardando",
      CANCELADO: "Cancelado",
    };
    return paymentMap[payment] || payment;
  }

  getFieldLabel(field) {
    const fieldMap = {
      orderId: "ID do Pedido",
      customerName: "Nome do Cliente",
      productName: "Nome do Produto",
      size: "Tamanho",
      sku: "SKU",
      shippingType: "Tipo de Frete",
      paymentStatus: "Status do Pagamento",
      notes: "Notas",
    };
    return fieldMap[field] || field;
  }

  updateFilters(filters) {
    this.currentFilters = { ...this.currentFilters, ...filters };
  }

  clearFilters() {
    this.currentFilters = {
      search: "",
      shipping: "",
      payment: "",
      status: "",
    };

    // Limpar campos de filtro na interface
    const searchInput = document.getElementById("order-search");
    if (searchInput) searchInput.value = "";

    const shippingFilter = document.getElementById("shipping-filter");
    if (shippingFilter) shippingFilter.value = "";

    const paymentFilter = document.getElementById("payment-filter");
    if (paymentFilter) paymentFilter.value = "";
  }

  renderBatchOrdersPreview(orderIds, store) {
    if (!orderIds || orderIds.length === 0) {
      return '<p class="no-orders">Nenhum pedido no lote</p>';
    }

    // Verificar se o store está disponível
    if (!store || typeof store.getOrder !== "function") {
      return '<p class="no-orders">Carregando...</p>';
    }

    // Buscar os pedidos no store
    const orders = orderIds
      .map((orderId) => store.getOrder(orderId))
      .filter(Boolean);

    if (orders.length === 0) {
      return '<p class="no-orders">Pedidos não encontrados</p>';
    }

    // Mostrar apenas os primeiros 8 pedidos para não sobrecarregar o card
    const previewOrders = orders.slice(0, 8);
    const hasMore = orders.length > 8;

    const ordersHtml = previewOrders
      .map(
        (order) => `
        <div class="order-preview-item">
          <span class="order-preview-id">#${order.id}</span>
          <span class="order-preview-product">${order.productName}</span>
        </div>
      `
      )
      .join("");

    let html = ordersHtml;

    if (hasMore) {
      const remaining = orders.length - 8;
      html += `
        <div class="order-preview-more">
          <span>+${remaining} mais</span>
        </div>
      `;
    }

    return html;
  }

  getSupplierName(supplierId) {
    if (!window.app || !window.app.store) return "Fornecedor não encontrado";
    const supplier = window.app.store.getSupplier(supplierId);
    return supplier ? supplier.name : "Fornecedor não encontrado";
  }
}
