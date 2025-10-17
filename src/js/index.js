import { Store } from "./Store.js";
import { UI } from "./UI.js";
import { Order } from "./Order.js";
import { Batch } from "./Batch.js";
import { CsvImport } from "./CsvImport.js";
import { Filters } from "./Filters.js";
import { Printing } from "./Printing.js";
import { Utils } from "./Utils.js";
import { AuthService } from "./AuthService.js";
import { Supplier } from "./Supplier.js";

class App {
  constructor() {
    this.store = new Store();
    this.ui = new UI();
    this.order = new Order(this.store);
    this.batch = new Batch(this.store);
    this.csvImport = new CsvImport(this.store);
    this.filters = new Filters();
    this.printing = new Printing();
    this.utils = new Utils();
    this.auth = new AuthService();
    this.supplier = new Supplier(this.store);

    this.currentView = "dashboard";
    this.init();
  }

  async init() {
    // Carregar dados do localStorage/Firebase
    await this.store.loadData();
    this.store.startOrdersRealtime();

    // Configurar event listeners
    this.setupEventListeners();

    // Renderizar view inicial
    this.showView("dashboard");

    // Atualizar contadores
    this.updateStatusCounts();

    // Inicializar UI de autenticação
    this.auth.updateUI();
  }

  setupEventListeners() {
    // Navegação
    document.querySelectorAll(".header__nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const view = e.target.dataset.view;
        this.showView(view);
      });
    });

    // Autenticação
    const authBtn = document.getElementById("auth-btn");
    if (authBtn) {
      authBtn.addEventListener("click", () => {
        if (this.auth.checkAuth()) {
          this.auth.logout();
          this.auth.updateUI();
          this.auth.showToast("Logout realizado com sucesso!", "success");
        } else {
          this.auth.showLoginModal();
        }
      });
    }

    // Dashboard
    const newBatchBtn = document.getElementById("new-batch-btn");
    if (newBatchBtn) {
      newBatchBtn.addEventListener("click", () => {
        this.batch.openCreateModal();
      });
    }

    // Orders
    const newOrderBtn = document.getElementById("new-order-btn");
    if (newOrderBtn) {
      newOrderBtn.addEventListener("click", () => {
        this.order.openCreateModal();
      });
    }

    // Import
    const importBtn = document.getElementById("import-btn");
    if (importBtn) {
      importBtn.addEventListener("click", () => {
        this.csvImport.importFile();
      });
    }

    // Dados de Demonstração
    const createDemoBtn = document.getElementById("create-demo-btn");
    if (createDemoBtn) {
      createDemoBtn.addEventListener("click", () => {
        if (
          confirm("Isso irá criar dados de demonstração. Deseja continuar?")
        ) {
          this.createDemoData();
          this.ui.showToast(
            "Dados de demonstração criados com sucesso!",
            "success"
          );
          this.renderDashboard();
        }
      });
    }

    // Backup e Restauração
    const exportDataBtn = document.getElementById("export-data-btn");
    if (exportDataBtn) {
      exportDataBtn.addEventListener("click", () => {
        this.exportData();
      });
    }

    const importDataBtn = document.getElementById("import-data-btn");
    const backupFileInput = document.getElementById("backup-file");
    if (importDataBtn) {
      importDataBtn.addEventListener("click", () => {
        backupFileInput.click();
      });
    }

    if (backupFileInput) {
      backupFileInput.addEventListener("change", (e) => {
        this.importData(e.target.files[0]);
      });
    }

    // Status cards
    document.querySelectorAll(".status-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const status = e.currentTarget.dataset.status;
        this.filterByStatus(status);
      });
    });

    // Filtros de pedidos
    const orderSearch = document.getElementById("order-search");
    if (orderSearch) {
      orderSearch.addEventListener("input", (e) => {
        this.filters.filterOrders(e.target.value);
      });
    }

    const shippingFilter = document.getElementById("shipping-filter");
    if (shippingFilter) {
      shippingFilter.addEventListener("change", (e) => {
        this.filters.filterByShipping(e.target.value);
      });
    }

    const paymentFilter = document.getElementById("payment-filter");
    if (paymentFilter) {
      paymentFilter.addEventListener("change", (e) => {
        this.filters.filterByPayment(e.target.value);
      });
    }

    // Busca do dashboard
    const dashboardSearch = document.getElementById("dashboard-search");
    if (dashboardSearch) {
      dashboardSearch.addEventListener("input", (e) => {
        this.searchDashboard(e.target.value);
      });
    }

    // Filtros do dashboard
    const shippingSelect = document.getElementById("filter-shipping-status");
    const supplierSelect = document.getElementById("filter-supplier");
    const destinationSelect = document.getElementById("filter-destination");

    if (shippingSelect) {
      shippingSelect.addEventListener("change", () => this.filterDashboard());
    }
    if (destinationSelect) {
      destinationSelect.addEventListener("change", () =>
        this.filterDashboard()
      );
    }
    if (supplierSelect) {
      this.populateSuppliersFilter();
      supplierSelect.addEventListener("change", () => this.filterDashboard());
    }

    // Botão de copiar mensagem do cliente
    const copyMessageBtn = document.getElementById("copy-message-btn");
    if (copyMessageBtn) {
      copyMessageBtn.addEventListener("click", () => {
        this.copyCustomerMessage();
      });
    }

    // Atalho de busca no detalhe do lote
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && this.currentView === "batch-detail") {
        e.preventDefault();
        const searchInput = document.getElementById("batch-detail-search");
        if (searchInput) {
          searchInput.focus();
        }
      }
    });
  }

  showView(viewName) {
    // Remover active de todas as views
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.remove("active");
    });

    // Remover active de todos os botões de navegação
    document.querySelectorAll(".header__nav-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Ativar view selecionada
    const viewElement = document.getElementById(`${viewName}-view`);
    if (viewElement) {
      viewElement.classList.add("active");
    }

    // Ativar botão de navegação correspondente
    const navBtn = document.querySelector(`[data-view="${viewName}"]`);
    if (navBtn) {
      navBtn.classList.add("active");
    }

    this.currentView = viewName;

    // Renderizar conteúdo específico da view
    switch (viewName) {
      case "dashboard":
        this.renderDashboard();
        break;
      case "orders":
        this.renderOrders();
        break;
      case "sheet":
        this.renderOrdersSheet();
        break;
      case "import":
        this.renderImport();
        break;
    }
  }

  renderDashboard() {
    const batches = this.store.getBatches();

    this.ui.renderBatchesList(batches, this.store);
    this.updateStatusCounts();

    // Reaplicar autenticação após renderizar novos elementos
    this.auth.updateUI();
  }

  renderOrdersSheet() {
    const body = document.getElementById("orders-sheet-body");
    const total = document.getElementById("sheet-total");
    const searchInput = document.getElementById("sheet-search");
    const freightFilter = document.getElementById("sheet-freight-filter");
    if (!body) return;

    const allOrders = [...this.store.getOrders()].sort((a, b) => {
      const idA = parseInt(String(a.id || "0"), 10);
      const idB = parseInt(String(b.id || "0"), 10);
      return idB - idA; // decrescente
    });

    const query = (searchInput?.value || "").toLowerCase().trim();
    const freight = freightFilter?.value || "";

    const filtered = allOrders.filter((o) => {
      if (query) {
        const matchesName = (o.customerName || "")
          .toLowerCase()
          .includes(query);
        const matchesId = String(o.id || "").includes(query);
        if (!matchesName && !matchesId) return false;
      }
      if (!freight) return true;
      if (o.batchCode) return freight === "PADRAO"; // em lote conta como padrão
      return (o.shippingType || "PADRAO").toUpperCase() === freight;
    });

    // Garantir ordenação decrescente por ID numérico após filtros
    const sortedFiltered = filtered.sort((a, b) => {
      const idA = parseInt(String(a.id || "0"), 10);
      const idB = parseInt(String(b.id || "0"), 10);
      return idB - idA; // decrescente
    });

    // Debug: verificar ordenação
    console.log("IDs ordenados:", sortedFiltered.slice(0, 5).map(o => o.id));

    total && (total.textContent = String(sortedFiltered.length));

    const rows = sortedFiltered
      .map((o) => {
        const supplierStatus = o.supplierStatus || "Aguardando processamento";
        const shippingStatus =
          o.shippingStatus || (o.batchCode ? "enviado" : "não enviado");
        const freightLabel = o.batchCode
          ? `padrão - ${this.getBatchNameFromCode(o.batchCode)}`
          : (o.shippingType || "padrão").toLowerCase();
        const created = o.createdAt ? new Date(o.createdAt) : null;
        const createdStr = created
          ? `${String(created.getDate()).padStart(2, "0")}/${String(
              created.getMonth() + 1
            ).padStart(2, "0")}/${created.getFullYear()}`
          : "";
        const wa = o.customerWhatsapp
          ? `https://wa.me/55${o.customerWhatsapp}`
          : "";
        return `
          <tr data-order-id="${o.id}">
            <td>#${String(o.id).padStart(3, "0")}</td>
            <td>${o.productName || ""}</td>
            <td class="status-cell status-supplier">
              <select class="supplier-status-select" onchange="window.app.updateSupplierStatus('${
                o.id
              }', this)">
                ${["Aguardando processamento", "Pago", "Encaminhado", "Enviado"]
                  .map(
                    (s) =>
                      `<option ${
                        s === supplierStatus ? "selected" : ""
                      }>${s}</option>`
                  )
                  .join("")}
              </select>
            </td>
            <td class="status-cell status-shipping">
              <select class="shipping-status-select" onchange="window.app.updateShippingStatus('${
                o.id
              }', this)">
                ${["não enviado", "enviado", "alfandegado"]
                  .map(
                    (s) =>
                      `<option ${
                        s === shippingStatus ? "selected" : ""
                      }>${s}</option>`
                  )
                  .join("")}
              </select>
            </td>
            <td>${freightLabel}</td>
            <td>${o.customerName || ""}</td>
            <td>${
              wa
                ? `<a href="${wa}" target="_blank">${o.customerWhatsapp}</a>`
                : o.customerWhatsapp || ""
            }</td>
            <td>${createdStr}</td>
          </tr>
        `;
      })
      .join("");

    body.innerHTML = rows;

    // bind controls
    if (searchInput && !searchInput._bound) {
      searchInput._bound = true;
      searchInput.addEventListener("input", () => this.renderOrdersSheet());
    }
    if (freightFilter && !freightFilter._bound) {
      freightFilter._bound = true;
      freightFilter.addEventListener("change", () => this.renderOrdersSheet());
    }

    const exportBtn = document.getElementById("sheet-export");
    if (exportBtn && !exportBtn._bound) {
      exportBtn._bound = true;
      exportBtn.addEventListener("click", () => this.exportSheetCSV());
    }

    // aplicar classes de cor nos selects
    this.applyStatusSelectStyles();

    // aplicar automações baseadas no lote
    this.applyAutoStatusesFromBatch(sortedFiltered);
  }

  getBatchNameFromCode(code) {
    const batch = this.store.getBatches().find((b) => b.code === code);
    return batch ? batch.name || batch.code : code;
  }

  applyStatusSelectStyles() {
    const supplierSelects = document.querySelectorAll(
      ".supplier-status-select"
    );
    supplierSelects.forEach((sel) => {
      sel.classList.remove(
        "supplier--aguardando",
        "supplier--pago",
        "supplier--encaminhado",
        "supplier--enviado"
      );
      const val = sel.value.toLowerCase();
      if (val.startsWith("aguard")) sel.classList.add("supplier--aguardando");
      else if (val === "pago") sel.classList.add("supplier--pago");
      else if (val === "encaminhado")
        sel.classList.add("supplier--encaminhado");
      else if (val === "enviado") sel.classList.add("supplier--enviado");
    });
    const shippingSelects = document.querySelectorAll(
      ".shipping-status-select"
    );
    shippingSelects.forEach((sel) => {
      sel.classList.remove(
        "shipping--nao-enviado",
        "shipping--enviado",
        "shipping--alfandegado"
      );
      const val = sel.value.toLowerCase();
      if (val === "não enviado" || val === "nao enviado")
        sel.classList.add("shipping--nao-enviado");
      else if (val === "enviado") sel.classList.add("shipping--enviado");
      else if (val === "alfandegado")
        sel.classList.add("shipping--alfandegado");
      // also bind change once
      if (!sel._colorBound) {
        sel._colorBound = true;
        sel.addEventListener("change", () => this.applyStatusSelectStyles());
      }
    });
  }

  async applyAutoStatusesFromBatch(ordersList) {
    const orders = ordersList || this.store.getOrders();
    const batches = this.store.getBatches();
    const byCode = new Map(batches.map((b) => [b.code, b]));
    for (const o of orders) {
      if (!o.batchCode) continue;
      const batch = byCode.get(o.batchCode);
      if (!batch) continue;
      if (batch.isShipped && !batch.isReceived && !batch.isAbnormal) {
        const needSupplier = o.supplierStatus !== "Enviado";
        const needShipping =
          (o.shippingStatus || "não enviado").toLowerCase() !== "enviado";
        if (needSupplier || needShipping) {
          const updates = {};
          if (needSupplier) updates.supplierStatus = "Enviado";
          if (needShipping) updates.shippingStatus = "enviado";
          updates.updatedAt = new Date().toISOString();
          // update local and remote
          Object.assign(o, updates);
          this.store.saveData();
          await this.store.firebase.updateOrder(String(o.id), updates);
        }
      }
    }
    // re-render to reflect possible changes
    if (this.currentView === "sheet") this.renderOrdersSheet();
  }

  async updateSupplierStatus(orderId, selectEl) {
    const value = selectEl.value;
    const order = this.store.getOrder(orderId);
    const prev = order?.supplierStatus;
    order.supplierStatus = value;
    this.store.saveData();
    const res = await this.store.firebase.updateOrder(orderId, {
      supplierStatus: value,
      updatedAt: new Date().toISOString(),
    });
    if (!res?.success) {
      order.supplierStatus = prev;
      this.store.saveData();
      this.ui.showToast("Falha ao salvar status do fornecedor", "error");
      this.renderOrdersSheet();
    }
  }

  async updateShippingStatus(orderId, selectEl) {
    const value = selectEl.value;
    const order = this.store.getOrder(orderId);
    const prev = order?.shippingStatus;
    order.shippingStatus = value;
    this.store.saveData();
    const res = await this.store.firebase.updateOrder(orderId, {
      shippingStatus: value,
      updatedAt: new Date().toISOString(),
    });
    if (!res?.success) {
      order.shippingStatus = prev;
      this.store.saveData();
      this.ui.showToast("Falha ao salvar status de envio", "error");
      this.renderOrdersSheet();
    }
  }

  exportSheetCSV() {
    const body = document.getElementById("orders-sheet-body");
    if (!body) return;
    const rows = [...body.querySelectorAll("tr")].map((tr) =>
      [...tr.children].map((td) => td.textContent.replace(/\s+/g, " ").trim())
    );
    const header = [
      "Pedido",
      "Produto",
      "Status no fornecedor",
      "Status de envio",
      "Frete",
      "Nome do cliente",
      "WhatsApp",
      "Data do pedido",
    ];
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planilha-pedidos-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  renderOrders() {
    const orders = this.store.getOrders();
    this.ui.renderOrdersList(orders);

    // Reaplicar autenticação após renderizar novos elementos
    this.auth.updateUI();
  }

  renderImport() {
    // Limpar preview
    document.getElementById("import-preview").innerHTML = "";
  }

  updateStatusCounts() {
    const batches = this.store.getBatches();
    const statusCounts = {
      CRIADO: 0,
      A_CAMINHO: 0,
      RECEBIDO: 0,
      SEPARADO: 0,
    };

    batches.forEach((batch) => {
      statusCounts[batch.status]++;
    });

    // Atualizar contadores nos cards
    Object.entries(statusCounts).forEach(([status, count]) => {
      const card = document.querySelector(`[data-status="${status}"]`);
      if (card) {
        const countElement = card.querySelector(".status-card__count");
        if (countElement) {
          countElement.textContent = count;
        }
      }
    });
  }

  filterByStatus(status) {
    const batches = this.store
      .getBatches()
      .filter((batch) => batch.status === status);
    this.ui.renderBatchesList(batches, this.store);
  }

  searchDashboard(query) {
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
      // Se não há termo de busca, mostrar todos os lotes
      this.renderDashboard();
      return;
    }

    const allBatches = this.store.getBatches();
    const filteredBatches = allBatches.filter((batch) => {
      // Buscar pelo nome do lote
      if (batch.name.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Buscar pelos produtos dentro do lote
      const batchOrders = batch.orderIds
        .map((orderId) => this.store.getOrder(orderId))
        .filter(Boolean);

      if (
        batchOrders.some((order) =>
          (order.productName || "").toLowerCase().includes(searchTerm)
        )
      )
        return true;

      // Novo: Buscar por número do pedido que retorna o lote
      if (batchOrders.some((order) => ("" + order.id).includes(searchTerm)))
        return true;

      return false;
    });

    this.ui.renderBatchesList(filteredBatches, this.store);
  }

  populateSuppliersFilter() {
    const supplierSelect = document.getElementById("filter-supplier");
    if (!supplierSelect) return;
    const suppliers = this.store.getSuppliers
      ? this.store.getSuppliers()
      : this.store.suppliers || [];
    const current = supplierSelect.value;
    supplierSelect.innerHTML =
      '<option value="">Fornecedor (Todos)</option>' +
      suppliers
        .map((s) => `<option value="${s.id}">${s.name}</option>`)
        .join("");
    if ([...supplierSelect.options].some((o) => o.value === current)) {
      supplierSelect.value = current;
    }
  }

  filterDashboard() {
    const statusSel = document.getElementById("filter-shipping-status");
    const supplierSel = document.getElementById("filter-supplier");
    const destinationSel = document.getElementById("filter-destination");
    const searchInput = document.getElementById("dashboard-search");

    const statusVal = statusSel ? statusSel.value : "";
    const supplierVal = supplierSel ? supplierSel.value : "";
    const destinationVal = destinationSel ? destinationSel.value : "";
    const query = (searchInput ? searchInput.value : "").toLowerCase().trim();

    let batches = this.store.getBatches();

    if (statusVal) {
      if (statusVal === "NOT_SHIPPED") {
        batches = batches.filter((b) => !b.isShipped);
      } else if (statusVal === "SHIPPED") {
        batches = batches.filter(
          (b) => b.isShipped && !b.isReceived && !b.isAbnormal
        );
      } else if (statusVal === "RECEIVED") {
        batches = batches.filter((b) => b.isReceived);
      } else if (statusVal === "ABNORMAL") {
        batches = batches.filter((b) => b.isAbnormal);
      }
    }

    if (destinationVal) {
      batches = batches.filter(
        (b) => (b.destination || "pedro") === destinationVal
      );
    }

    if (supplierVal) {
      batches = batches.filter((b) => (b.supplierId || "") === supplierVal);
    }

    if (query) {
      batches = batches.filter((batch) => {
        if (batch.name && batch.name.toLowerCase().includes(query)) return true;
        const batchOrders = (batch.orderIds || [])
          .map((orderId) => this.store.getOrder(orderId))
          .filter(Boolean);
        if (
          batchOrders.some((o) =>
            (o.productName || "").toLowerCase().includes(query)
          )
        )
          return true;
        if (batchOrders.some((o) => ("" + o.id).includes(query))) return true;
        return false;
      });
    }

    this.ui.renderBatchesList(batches, this.store);
  }

  createDemoData() {
    // Criar pedidos de demonstração
    const demoOrders = [
      // Pedidos PADRÃO
      {
        id: "100",
        customerName: "João Silva",
        productName: "Brasil 24/25",
        size: "M",
        sku: "BRA-M-24",
        shippingType: "PADRAO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "101",
        customerName: "Maria Santos",
        productName: "Brasil 24/25",
        size: "L",
        sku: "BRA-L-24",
        shippingType: "PADRAO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "102",
        customerName: "Pedro Costa",
        productName: "Real 23/24",
        size: "P",
        sku: "REA-P-23",
        shippingType: "PADRAO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "103",
        customerName: "Ana Oliveira",
        productName: "Real 23/24",
        size: "M",
        sku: "REA-M-23",
        shippingType: "PADRAO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "104",
        customerName: "Carlos Ferreira",
        productName: "PSG 24/25",
        size: "G",
        sku: "PSG-G-24",
        shippingType: "PADRAO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "105",
        customerName: "Lucia Martins",
        productName: "PSG 24/25",
        size: "M",
        sku: "PSG-M-24",
        shippingType: "PADRAO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "106",
        customerName: "Roberto Lima",
        productName: "Brasil 24/25",
        size: "G",
        sku: "BRA-G-24",
        shippingType: "PADRAO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "107",
        customerName: "Fernanda Rocha",
        productName: "Real 23/24",
        size: "L",
        sku: "REA-L-23",
        shippingType: "PADRAO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "108",
        customerName: "Ricardo Alves",
        productName: "PSG 24/25",
        size: "P",
        sku: "PSG-P-24",
        shippingType: "PADRAO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "109",
        customerName: "Patricia Souza",
        productName: "Brasil 24/25",
        size: "L",
        sku: "BRA-L-24",
        shippingType: "PADRAO",
        paymentStatus: "PAGO",
        notes: "",
      },

      // Pedidos EXPRESSO
      {
        id: "200",
        customerName: "Marcos Dias",
        productName: "Brasil 24/25",
        size: "M",
        sku: "BRA-M-24",
        shippingType: "EXPRESSO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "201",
        customerName: "Juliana Costa",
        productName: "Real 23/24",
        size: "G",
        sku: "REA-G-23",
        shippingType: "EXPRESSO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "202",
        customerName: "Thiago Santos",
        productName: "PSG 24/25",
        size: "M",
        sku: "PSG-M-24",
        shippingType: "EXPRESSO",
        paymentStatus: "PAGO",
        notes: "",
      },
      {
        id: "203",
        customerName: "Camila Lima",
        productName: "Brasil 24/25",
        size: "P",
        sku: "BRA-P-24",
        shippingType: "EXPRESSO",
        paymentStatus: "PAGO",
        notes: "",
      },
    ];

    demoOrders.forEach((orderData) => {
      this.store.addOrder(orderData);
    });

    // Criar lote de demonstração
    const demoBatch = {
      name: "Lote de Demonstração",
      inboundTracking: "BR123456789BR",
      notes: "Lote criado para demonstração do sistema",
      status: "A_CAMINHO",
      orderIds: ["100", "101", "102", "103", "104", "105"],
    };

    this.store.addBatch(demoBatch);

    // Gerar internalTags para os pedidos do lote
    const batch = this.store.getBatches()[0];
    batch.orderIds.forEach((orderId) => {
      const order = this.store.getOrder(orderId);
      if (order) {
        order.internalTag = this.utils.generateInternalTag(
          order.productName,
          order.id
        );
        order.batchCode = batch.code;
      }
    });

    this.store.saveData();
  }

  exportData() {
    try {
      const data = {
        orders: this.store.getOrders(),
        batches: this.store.getBatches(),
        exportDate: new Date().toISOString(),
        version: "1.0",
      };

      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pedidos-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      this.ui.showToast("Dados exportados com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      this.ui.showToast("Erro ao exportar dados", "error");
    }
  }

  importData(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.orders || !data.batches) {
          throw new Error("Arquivo inválido");
        }

        if (
          confirm(
            "Isso irá substituir todos os dados atuais. Deseja continuar?"
          )
        ) {
          // Limpar dados atuais
          localStorage.removeItem("orders");
          localStorage.removeItem("batches");

          // Carregar novos dados
          localStorage.setItem("orders", JSON.stringify(data.orders));
          localStorage.setItem("batches", JSON.stringify(data.batches));

          // Recarregar dados no store
          this.store.loadData();

          // Atualizar interface
          this.renderDashboard();
          this.updateStatusCounts();

          this.ui.showToast("Dados importados com sucesso!", "success");
        }
      } catch (error) {
        console.error("Erro ao importar dados:", error);
        this.ui.showToast(
          "Erro ao importar dados. Verifique se o arquivo é válido.",
          "error"
        );
      }
    };

    reader.readAsText(file);
  }

  copyCustomerMessage() {
    const messageText = document.getElementById("customer-message-text");
    const copyBtn = document.getElementById("copy-message-btn");

    if (messageText && copyBtn) {
      // Normalizar quebras e múltiplos espaços para uma única linha
      const textToCopy = messageText.textContent.replace(/\s+/g, " ").trim();

      // Usar a API moderna de clipboard
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(textToCopy)
          .then(() => {
            this.showCopySuccess(copyBtn);
          })
          .catch(() => {
            this.fallbackCopyTextToClipboard(textToCopy, copyBtn);
          });
      } else {
        this.fallbackCopyTextToClipboard(textToCopy, copyBtn);
      }
    }
  }

  showCopySuccess(copyBtn) {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "✅ Copiado!";
    copyBtn.classList.add("copied");

    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove("copied");
    }, 2000);
  }

  fallbackCopyTextToClipboard(text, copyBtn) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        this.showCopySuccess(copyBtn);
      } else {
        this.ui.showToast("Erro ao copiar texto", "error");
      }
    } catch (err) {
      this.ui.showToast("Erro ao copiar texto", "error");
    }

    document.body.removeChild(textArea);
  }
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});
