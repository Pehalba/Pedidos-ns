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
      case "import":
        this.renderImport();
        break;
    }
  }

  renderDashboard() {
    const batches = this.store.getBatches();
    const orders = this.store.getOrders();

    this.ui.renderBatchesList(batches, this.store);
    this.ui.renderExpressOrdersList(orders);
    this.updateStatusCounts();

    // Reaplicar autenticação após renderizar novos elementos
    this.auth.updateUI();
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

      return batchOrders.some((order) =>
        order.productName.toLowerCase().includes(searchTerm)
      );
    });

    this.ui.renderBatchesList(filteredBatches, this.store);
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
      const textToCopy = messageText.textContent
        .replace(/\s+/g, " ")
        .trim();

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
