export class Supplier {
  constructor(store) {
    this.store = store;
    this.currentSupplierId = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Event listeners para modais de fornecedores
    document.addEventListener("click", (e) => {
      if (e.target.id === "manage-suppliers-btn") {
        this.openSuppliersModal();
      }

      if (e.target.id === "add-supplier-btn") {
        this.openSupplierFormModal();
      }

      if (
        e.target.id === "supplier-cancel" ||
        e.target.id === "supplier-form-close"
      ) {
        this.closeSupplierFormModal();
      }

      if (e.target.id === "suppliers-modal-close") {
        this.closeSuppliersModal();
      }

      if (e.target.classList.contains("edit-supplier")) {
        const supplierId = e.target.dataset.supplierId;
        this.editSupplier(supplierId);
      }

      if (e.target.classList.contains("delete-supplier")) {
        const supplierId = e.target.dataset.supplierId;
        this.deleteSupplier(supplierId);
      }
    });

    // Event listener para o formulário de fornecedor
    const form = document.getElementById("supplier-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveSupplier();
      });
    }
  }

  openSuppliersModal() {
    this.renderSuppliersList();
    window.app.ui.showModal("suppliers-modal");
  }

  closeSuppliersModal() {
    window.app.ui.hideModal("suppliers-modal");
  }

  openSupplierFormModal(supplierId = null) {
    this.currentSupplierId = supplierId;
    const title = document.getElementById("supplier-form-title");
    const form = document.getElementById("supplier-form");

    if (supplierId) {
      // Editando fornecedor existente
      const supplier = this.store.getSupplier(supplierId);
      if (supplier) {
        title.textContent = "Editar Fornecedor";
        this.loadFormData(supplier);
      }
    } else {
      // Criando novo fornecedor
      title.textContent = "Novo Fornecedor";
      form.reset();
    }

    window.app.ui.showModal("supplier-form-modal");
  }

  closeSupplierFormModal() {
    window.app.ui.hideModal("supplier-form-modal");
    this.currentSupplierId = null;
  }

  loadFormData(supplier) {
    document.getElementById("supplier-name").value = supplier.name || "";
    document.getElementById("supplier-contact").value = supplier.contact || "";
    document.getElementById("supplier-email").value = supplier.email || "";
    document.getElementById("supplier-phone").value = supplier.phone || "";
    document.getElementById("supplier-address").value = supplier.address || "";
    document.getElementById("supplier-favorite").checked =
      supplier.isFavorite || false;
  }

  async saveSupplier() {
    const formData = {
      name: document.getElementById("supplier-name").value.trim(),
      contact: document.getElementById("supplier-contact").value.trim(),
      email: document.getElementById("supplier-email").value.trim(),
      phone: document.getElementById("supplier-phone").value.trim(),
      address: document.getElementById("supplier-address").value.trim(),
      isFavorite: document.getElementById("supplier-favorite").checked,
    };

    if (!formData.name) {
      window.app.ui.showToast("Nome do fornecedor é obrigatório", "error");
      return;
    }

    try {
      if (this.currentSupplierId) {
        await this.store.updateSupplier(this.currentSupplierId, formData);
        window.app.ui.showToast("Fornecedor atualizado com sucesso", "success");
      } else {
        await this.store.addSupplier(formData);
        window.app.ui.showToast("Fornecedor adicionado com sucesso", "success");
      }

      this.closeSupplierFormModal();
      this.renderSuppliersList();
      this.updateOrderSupplierSelect();
    } catch (error) {
      console.error("Erro ao salvar fornecedor:", error);
      window.app.ui.showToast("Erro ao salvar fornecedor", "error");
    }
  }

  async deleteSupplier(supplierId) {
    const supplier = this.store.getSupplier(supplierId);
    if (!supplier) return;

    if (
      confirm(`Tem certeza que deseja excluir o fornecedor "${supplier.name}"?`)
    ) {
      try {
        await this.store.deleteSupplier(supplierId);
        window.app.ui.showToast("Fornecedor excluído com sucesso", "success");
        this.renderSuppliersList();
        this.updateOrderSupplierSelect();
      } catch (error) {
        console.error("Erro ao excluir fornecedor:", error);
        window.app.ui.showToast("Erro ao excluir fornecedor", "error");
      }
    }
  }

  editSupplier(supplierId) {
    this.openSupplierFormModal(supplierId);
  }

  renderSuppliersList() {
    const container = document.getElementById("suppliers-list");
    if (!container) return;

    const suppliers = this.store.getSuppliers();

    if (suppliers.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 40px; color: #6b7280;">
          <p>Nenhum fornecedor cadastrado</p>
          <p style="font-size: 14px; margin-top: 8px;">Clique em "Adicionar Fornecedor" para começar</p>
        </div>
      `;
      return;
    }

    const suppliersHtml = suppliers
      .map(
        (supplier) => `
        <div class="supplier-item">
          <div class="supplier-info">
            <div class="supplier-name">
              ${supplier.name}
              ${
                supplier.isFavorite
                  ? '<span class="supplier-favorite">⭐ Favorito</span>'
                  : ""
              }
            </div>
            ${
              supplier.contact
                ? `<div class="supplier-details">Contato: ${supplier.contact}</div>`
                : ""
            }
            ${
              supplier.email
                ? `<div class="supplier-details">Email: ${supplier.email}</div>`
                : ""
            }
            ${
              supplier.phone
                ? `<div class="supplier-details">Telefone: ${supplier.phone}</div>`
                : ""
            }
            ${
              supplier.address
                ? `<div class="supplier-details">Endereço: ${supplier.address}</div>`
                : ""
            }
          </div>
          <div class="supplier-actions">
            <button class="btn btn--small btn--secondary edit-supplier" data-supplier-id="${
              supplier.id
            }">
              Editar
            </button>
            <button class="btn btn--small btn--danger delete-supplier" data-supplier-id="${
              supplier.id
            }">
              Excluir
            </button>
          </div>
        </div>
      `
      )
      .join("");

    container.innerHTML = suppliersHtml;
  }

  updateOrderSupplierSelect() {
    const select = document.getElementById("order-supplier");
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

  getSupplierName(supplierId) {
    const supplier = this.store.getSupplier(supplierId);
    return supplier ? supplier.name : "Fornecedor não encontrado";
  }
}
