export class CsvImport {
  constructor(store) {
    this.store = store;
    this.csvData = null;
    this.mapping = {};
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Botão de importação
    document.getElementById("import-btn")?.addEventListener("click", () => {
      this.importFile();
    });

    // Input de arquivo
    document.getElementById("csv-file")?.addEventListener("change", (e) => {
      this.handleFileSelect(e.target.files[0]);
    });
  }

  handleFileSelect(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      window.app.ui.showToast("Por favor, selecione um arquivo CSV", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.parseCSV(e.target.result);
    };
    reader.readAsText(file);
  }

  parseCSV(content) {
    try {
      // Usar PapaParse se disponível, senão usar parser básico
      if (typeof Papa !== "undefined") {
        Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            this.handleParseResults(results);
          },
          error: (error) => {
            console.error("Erro ao fazer parse do CSV:", error);
            window.app.ui.showToast("Erro ao processar arquivo CSV", "error");
          },
        });
      } else {
        // Parser básico como fallback
        this.parseCSVBasic(content);
      }
    } catch (error) {
      console.error("Erro ao processar CSV:", error);
      window.app.ui.showToast("Erro ao processar arquivo CSV", "error");
    }
  }

  parseCSVBasic(content) {
    const lines = content.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      window.app.ui.showToast(
        "Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados",
        "error"
      );
      return;
    }

    const headers = this.parseCSVLine(lines[0]);
    const data = lines.slice(1).map((line) => {
      const values = this.parseCSVLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      return row;
    });

    this.handleParseResults({ data, meta: { fields: headers } });
  }

  parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  handleParseResults(results) {
    if (results.errors && results.errors.length > 0) {
      console.error("Erros no CSV:", results.errors);
      window.app.ui.showToast("Arquivo CSV contém erros", "error");
      return;
    }

    this.csvData = results.data;
    this.autoMapColumns(results.meta.fields);
    this.showMappingInterface();
  }

  autoMapColumns(headers) {
    const fieldMappings = {
      id: ["id", "order_id", "pedido", "numero", "number"],
      customerName: [
        "customer",
        "cliente",
        "customer_name",
        "nome_cliente",
        "name",
      ],
      productName: [
        "product",
        "produto",
        "product_name",
        "nome_produto",
        "item",
      ],
      size: ["size", "tamanho", "tam"],
      sku: ["sku", "codigo", "code"],
      shippingType: [
        "shipping",
        "frete",
        "shipping_type",
        "tipo_frete",
        "delivery",
      ],
      paymentStatus: [
        "payment",
        "pagamento",
        "payment_status",
        "status_pagamento",
        "status",
      ],
    };

    this.mapping = {};

    headers.forEach((header) => {
      const lowerHeader = header.toLowerCase().trim();

      for (const [field, possibleNames] of Object.entries(fieldMappings)) {
        if (possibleNames.includes(lowerHeader)) {
          this.mapping[field] = header;
          break;
        }
      }
    });
  }

  showMappingInterface() {
    const container = document.getElementById("import-preview");
    if (!container) return;

    const headers = Object.keys(this.csvData[0] || {});

    container.innerHTML = `
      <div class="import-mapping">
        <h3>Mapeamento de Colunas</h3>
        <p>Mapeie as colunas do CSV para os campos do sistema:</p>
        
        <div class="mapping-form">
          ${this.renderMappingFields(headers)}
        </div>
        
        <div class="mapping-preview">
          <h4>Preview dos Dados (primeiras 5 linhas)</h4>
          ${this.renderDataPreview()}
        </div>
        
        <div class="mapping-actions">
          <button class="btn btn--secondary" onclick="window.app.csvImport.resetMapping()">
            Resetar Mapeamento
          </button>
          <button class="btn btn--primary" onclick="window.app.csvImport.executeImport()">
            Importar Dados
          </button>
        </div>
      </div>
    `;
  }

  renderMappingFields(headers) {
    const requiredFields = ["id", "customerName", "productName"];
    const optionalFields = ["size", "sku", "shippingType", "paymentStatus"];

    return `
      <div class="mapping-fields">
        ${requiredFields
          .map((field) => this.renderMappingField(field, headers, true))
          .join("")}
        ${optionalFields
          .map((field) => this.renderMappingField(field, headers, false))
          .join("")}
      </div>
    `;
  }

  renderMappingField(field, headers, required) {
    const fieldLabels = {
      id: "ID do Pedido",
      customerName: "Nome do Cliente",
      productName: "Nome do Produto",
      size: "Tamanho",
      sku: "SKU",
      shippingType: "Tipo de Frete",
      paymentStatus: "Status do Pagamento",
    };

    return `
      <div class="mapping-field">
        <label class="mapping-field__label">
          ${fieldLabels[field]} ${required ? "*" : ""}
        </label>
        <select class="mapping-field__select" onchange="window.app.csvImport.updateMapping('${field}', this.value)">
          <option value="">-- Selecionar coluna --</option>
          ${headers
            .map(
              (header) => `
            <option value="${header}" ${
                this.mapping[field] === header ? "selected" : ""
              }>
              ${header}
            </option>
          `
            )
            .join("")}
        </select>
      </div>
    `;
  }

  renderDataPreview() {
    if (!this.csvData || this.csvData.length === 0) {
      return "<p>Nenhum dado para visualizar</p>";
    }

    const previewData = this.csvData.slice(0, 5);
    const mappedHeaders = Object.values(this.mapping).filter(Boolean);

    if (mappedHeaders.length === 0) {
      return "<p>Mapeie as colunas para ver o preview</p>";
    }

    return `
      <div class="preview-table">
        <table class="table">
          <thead>
            <tr>
              ${mappedHeaders.map((header) => `<th>${header}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${previewData
              .map(
                (row) => `
              <tr>
                ${mappedHeaders
                  .map((header) => `<td>${row[header] || ""}</td>`)
                  .join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  updateMapping(field, column) {
    this.mapping[field] = column;
    this.showMappingInterface();
  }

  resetMapping() {
    this.autoMapColumns(Object.keys(this.csvData[0] || {}));
    this.showMappingInterface();
  }

  executeImport() {
    if (!this.validateMapping()) {
      return;
    }

    const requiredFields = ["id", "customerName", "productName"];
    const missingFields = requiredFields.filter(
      (field) => !this.mapping[field]
    );

    if (missingFields.length > 0) {
      window.app.ui.showToast(
        `Campos obrigatórios não mapeados: ${missingFields.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      const importedCount = 0;
      const skippedCount = 0;
      const errors = [];

      this.csvData.forEach((row, index) => {
        try {
          const orderData = this.normalizeRowData(row);
          const validationErrors = this.validateOrderData(orderData);

          if (validationErrors.length > 0) {
            errors.push(`Linha ${index + 2}: ${validationErrors.join(", ")}`);
            skippedCount++;
            return;
          }

          // Verificar se o pedido já existe
          const existingOrder = this.store.getOrder(orderData.id);
          if (existingOrder) {
            errors.push(`Linha ${index + 2}: Pedido ${orderData.id} já existe`);
            skippedCount++;
            return;
          }

          this.store.addOrder(orderData);
          importedCount++;
        } catch (error) {
          errors.push(`Linha ${index + 2}: ${error.message}`);
          skippedCount++;
        }
      });

      // Mostrar resultado
      let message = `Importação concluída: ${importedCount} pedidos importados`;
      if (skippedCount > 0) {
        message += `, ${skippedCount} pedidos ignorados`;
      }

      window.app.ui.showToast(
        message,
        importedCount > 0 ? "success" : "warning"
      );

      if (errors.length > 0) {
        console.warn("Erros na importação:", errors);
      }

      // Limpar interface
      this.clearImportInterface();

      // Atualizar views
      window.app.renderOrders();
      window.app.renderDashboard();
    } catch (error) {
      console.error("Erro na importação:", error);
      window.app.ui.showToast("Erro durante a importação", "error");
    }
  }

  validateMapping() {
    const requiredFields = ["id", "customerName", "productName"];
    const missingFields = requiredFields.filter(
      (field) => !this.mapping[field]
    );

    if (missingFields.length > 0) {
      window.app.ui.showToast(
        `Campos obrigatórios não mapeados: ${missingFields.join(", ")}`,
        "error"
      );
      return false;
    }

    return true;
  }

  normalizeRowData(row) {
    const normalizeShippingType = (value) => {
      const normalized = value?.toString().toUpperCase().trim();
      if (
        normalized.includes("PADRÃO") ||
        normalized.includes("PADRAO") ||
        normalized.includes("STANDARD")
      ) {
        return "PADRAO";
      }
      if (normalized.includes("EXPRESSO") || normalized.includes("EXPRESS")) {
        return "EXPRESSO";
      }
      return "PADRAO"; // Default
    };

    const normalizePaymentStatus = (value) => {
      const normalized = value?.toString().toUpperCase().trim();
      if (
        normalized.includes("PAGO") ||
        normalized.includes("PAID") ||
        normalized.includes("PAGO")
      ) {
        return "PAGO";
      }
      if (
        normalized.includes("AGUARDANDO") ||
        normalized.includes("PENDING") ||
        normalized.includes("AGUARDANDO")
      ) {
        return "AGUARDANDO";
      }
      if (
        normalized.includes("CANCELADO") ||
        normalized.includes("CANCELLED") ||
        normalized.includes("CANCELADO")
      ) {
        return "CANCELADO";
      }
      return "AGUARDANDO"; // Default
    };

    return {
      id: row[this.mapping.id]?.toString().trim(),
      customerName: row[this.mapping.customerName]?.toString().trim(),
      productName: row[this.mapping.productName]?.toString().trim(),
      size: row[this.mapping.size]?.toString().trim() || "",
      sku: row[this.mapping.sku]?.toString().trim() || "",
      shippingType: normalizeShippingType(row[this.mapping.shippingType]),
      paymentStatus: normalizePaymentStatus(row[this.mapping.paymentStatus]),
      notes: "",
    };
  }

  validateOrderData(data) {
    const errors = [];

    if (!data.id || data.id.trim() === "") {
      errors.push("ID do pedido é obrigatório");
    }

    if (!data.customerName || data.customerName.trim() === "") {
      errors.push("Nome do cliente é obrigatório");
    }

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

  clearImportInterface() {
    this.csvData = null;
    this.mapping = {};

    const container = document.getElementById("import-preview");
    if (container) {
      container.innerHTML = "";
    }

    const fileInput = document.getElementById("csv-file");
    if (fileInput) {
      fileInput.value = "";
    }
  }

  importFile() {
    const fileInput = document.getElementById("csv-file");
    if (fileInput && fileInput.files.length > 0) {
      this.handleFileSelect(fileInput.files[0]);
    } else {
      window.app.ui.showToast(
        "Por favor, selecione um arquivo CSV primeiro",
        "error"
      );
    }
  }
}
