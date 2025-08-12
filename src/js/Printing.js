export class Printing {
  constructor() {
    this.printWindow = null;
  }

  printPickingList(batchCode) {
    const batch = window.app.store.getBatch(batchCode);
    if (!batch) {
      window.app.ui.showToast("Lote não encontrado", "error");
      return;
    }

    const orders = window.app.store.getOrdersInBatch(batchCode);
    if (orders.length === 0) {
      window.app.ui.showToast("Nenhum pedido no lote para imprimir", "error");
      return;
    }

    // Agrupar pedidos por produto e tamanho
    const groupedOrders = this.groupOrdersForPicking(orders);

    const html = this.generatePickingListHTML(batch, groupedOrders);
    this.printHTML(html, `Picking_List_${batchCode}`);
  }

  printInternalLabels(batchCode) {
    const batch = window.app.store.getBatch(batchCode);
    if (!batch) {
      window.app.ui.showToast("Lote não encontrado", "error");
      return;
    }

    const orders = window.app.store.getOrdersInBatch(batchCode);
    if (orders.length === 0) {
      window.app.ui.showToast("Nenhum pedido no lote para imprimir", "error");
      return;
    }

    const html = this.generateInternalLabelsHTML(batch, orders);
    this.printHTML(html, `Etiquetas_Internas_${batchCode}`);
  }

  groupOrdersForPicking(orders) {
    const groups = {};

    orders.forEach((order) => {
      const key = `${order.productName}-${order.size || "Sem tamanho"}`;
      if (!groups[key]) {
        groups[key] = {
          productName: order.productName,
          size: order.size || "Sem tamanho",
          orders: [],
        };
      }
      groups[key].orders.push(order);
    });

    // Ordenar por nome do produto e tamanho
    return Object.values(groups).sort((a, b) => {
      const productCompare = a.productName.localeCompare(b.productName);
      if (productCompare !== 0) return productCompare;
      return a.size.localeCompare(b.size);
    });
  }

  generatePickingListHTML(batch, groupedOrders) {
    const totalOrders = groupedOrders.reduce(
      (sum, group) => sum + group.orders.length,
      0
    );

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Picking List - ${batch.code}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }
          
          .header h2 {
            margin: 5px 0;
            font-size: 18px;
            color: #666;
          }
          
          .batch-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 14px;
          }
          
          .batch-info div {
            flex: 1;
          }
          
          .summary {
            background: #f5f5f5;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
          }
          
          .summary h3 {
            margin: 0 0 10px 0;
            color: #333;
          }
          
          .summary p {
            margin: 5px 0;
          }
          
          .product-group {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          
          .product-header {
            background: #333;
            color: white;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
          }
          
          .product-header h3 {
            margin: 0;
            font-size: 16px;
          }
          
          .product-header .count {
            font-size: 14px;
            opacity: 0.9;
          }
          
          .orders-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .orders-table th,
          .orders-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          .orders-table th {
            background: #f5f5f5;
            font-weight: bold;
          }
          
          .orders-table tr:nth-child(even) {
            background: #f9f9f9;
          }
          
          .internal-tag {
            font-family: monospace;
            background: #e8f4fd;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          }
          
          .print-button:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">Imprimir</button>
        
        <div class="header">
          <h1>Picking List</h1>
          <h2>${batch.name}</h2>
          <p>Código: ${batch.code}</p>
        </div>
        
        <div class="batch-info">
          <div>
            <strong>Status:</strong> ${this.getStatusText(batch.status)}<br>
            <strong>Total de Pedidos:</strong> ${totalOrders}
          </div>
          <div>
            <strong>Data de Impressão:</strong> ${new Date().toLocaleDateString(
              "pt-BR"
            )}<br>
            <strong>Hora:</strong> ${new Date().toLocaleTimeString("pt-BR")}
          </div>
        </div>
        
        <div class="summary">
          <h3>Resumo por Produto</h3>
          ${groupedOrders
            .map(
              (group) => `
            <p><strong>${group.productName} (${group.size}):</strong> ${
                group.orders.length
              } pedido${group.orders.length !== 1 ? "s" : ""}</p>
          `
            )
            .join("")}
        </div>
        
        ${groupedOrders
          .map(
            (group) => `
          <div class="product-group">
            <div class="product-header">
              <h3>${group.productName} - Tamanho: ${group.size}</h3>
              <div class="count">${group.orders.length} pedido${
              group.orders.length !== 1 ? "s" : ""
            }</div>
            </div>
            
            <table class="orders-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Tag Interna</th>
                  <th>SKU</th>
                </tr>
              </thead>
              <tbody>
                ${group.orders
                  .map(
                    (order) => `
                  <tr>
                    <td><strong>${order.id}</strong></td>
                    <td>${order.customerName}</td>
                    <td><span class="internal-tag">${
                      order.internalTag
                    }</span></td>
                    <td>${order.sku || "-"}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
          )
          .join("")}
        
        <div class="footer">
          <p>Picking List gerada automaticamente pelo Consolidador de Pedidos</p>
          <p>Lote: ${batch.code} | Data: ${new Date().toLocaleDateString(
      "pt-BR"
    )}</p>
        </div>
      </body>
      </html>
    `;
  }

  generateInternalLabelsHTML(batch, orders) {
    const labelsPerPage = 12; // 3x4 grid
    const pages = Math.ceil(orders.length / labelsPerPage);

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Etiquetas Internas - ${batch.code}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
            .page { page-break-after: always; }
            .page:last-child { page-break-after: avoid; }
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px;
            font-size: 10px;
            line-height: 1.2;
          }
          
          .page {
            width: 210mm;
            height: 297mm;
            padding: 10mm;
            box-sizing: border-box;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(4, 1fr);
            gap: 5mm;
          }
          
          .label {
            border: 1px solid #000;
            padding: 8px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: white;
            position: relative;
          }
          
          .label-header {
            text-align: center;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-bottom: 5px;
          }
          
          .internal-tag {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            font-family: monospace;
          }
          
          .order-id {
            font-size: 12px;
            color: #666;
            font-weight: bold;
          }
          
          .label-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          .product-info {
            text-align: center;
            margin-bottom: 5px;
          }
          
          .product-name {
            font-size: 11px;
            font-weight: bold;
            color: #333;
          }
          
          .product-size {
            font-size: 10px;
            color: #666;
          }
          
          .customer-info {
            text-align: center;
            font-size: 9px;
            color: #333;
            word-wrap: break-word;
          }
          
          .batch-info {
            position: absolute;
            bottom: 2px;
            right: 5px;
            font-size: 8px;
            color: #999;
          }
          
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            z-index: 1000;
          }
          
          .print-button:hover {
            background: #0056b3;
          }
          
          .page-header {
            grid-column: 1 / -1;
            text-align: center;
            margin-bottom: 10px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">Imprimir</button>
        
        ${Array.from({ length: pages }, (_, pageIndex) => {
          const startIndex = pageIndex * labelsPerPage;
          const pageOrders = orders.slice(
            startIndex,
            startIndex + labelsPerPage
          );

          return `
            <div class="page">
              <div class="page-header">
                <strong>Etiquetas Internas - ${batch.name}</strong><br>
                ${batch.code} | Página ${pageIndex + 1} de ${pages}
              </div>
              
              ${pageOrders
                .map(
                  (order) => `
                <div class="label">
                  <div class="label-header">
                    <div class="internal-tag">${order.internalTag}</div>
                    <div class="order-id">#${order.id}</div>
                  </div>
                  
                  <div class="label-content">
                    <div class="product-info">
                      <div class="product-name">${order.productName}</div>
                      <div class="product-size">${
                        order.size || "Sem tamanho"
                      }</div>
                    </div>
                    
                    <div class="customer-info">
                      ${order.customerName}
                    </div>
                  </div>
                  
                  <div class="batch-info">
                    ${batch.code}
                  </div>
                </div>
              `
                )
                .join("")}
              
              ${Array.from(
                { length: labelsPerPage - pageOrders.length },
                () => `
                <div class="label" style="border: 1px dashed #ccc; background: #f9f9f9;">
                  <div style="text-align: center; color: #999; font-size: 12px; padding: 20px;">
                    Etiqueta vazia
                  </div>
                </div>
              `
              ).join("")}
            </div>
          `;
        }).join("")}
      </body>
      </html>
    `;
  }

  printHTML(html, title) {
    // Fechar janela anterior se existir
    if (this.printWindow && !this.printWindow.closed) {
      this.printWindow.close();
    }

    // Criar nova janela
    this.printWindow = window.open(
      "",
      "_blank",
      "width=800,height=600,scrollbars=yes,resizable=yes"
    );

    if (!this.printWindow) {
      window.app.ui.showToast(
        "Bloqueador de popup detectado. Permita popups para imprimir.",
        "error"
      );
      return;
    }

    this.printWindow.document.write(html);
    this.printWindow.document.close();

    // Aguardar carregamento e imprimir
    this.printWindow.onload = () => {
      setTimeout(() => {
        this.printWindow.print();
      }, 500);
    };
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

  // Métodos para exportação de relatórios
  exportBatchReport(batchCode, format = "pdf") {
    const batch = window.app.store.getBatch(batchCode);
    if (!batch) {
      window.app.ui.showToast("Lote não encontrado", "error");
      return;
    }

    const orders = window.app.store.getOrdersInBatch(batchCode);
    const reportData = {
      batch,
      orders,
      stats: this.generateBatchStats(batch, orders),
      generatedAt: new Date().toISOString(),
    };

    if (format === "json") {
      this.exportReportToJSON(reportData, batchCode);
    } else if (format === "csv") {
      this.exportReportToCSV(reportData, batchCode);
    }
  }

  generateBatchStats(batch, orders) {
    const groupedByProduct = this.groupOrdersForPicking(orders);

    return {
      totalOrders: orders.length,
      totalProducts: groupedByProduct.length,
      products: groupedByProduct.map((group) => ({
        product: group.productName,
        size: group.size,
        count: group.orders.length,
      })),
      status: batch.status,
      hasTracking: !!batch.inboundTracking,
    };
  }

  exportReportToJSON(data, batchCode) {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `relatorio_lote_${batchCode}_${
        new Date().toISOString().split("T")[0]
      }.json`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportReportToCSV(data, batchCode) {
    const headers = [
      "ID",
      "Cliente",
      "Produto",
      "Tamanho",
      "SKU",
      "Tag Interna",
      "Lote",
      "Status do Lote",
    ];

    const csvContent = [
      headers.join(","),
      ...data.orders.map((order) =>
        [
          order.id,
          `"${order.customerName}"`,
          `"${order.productName}"`,
          order.size || "",
          order.sku || "",
          order.internalTag || "",
          data.batch.code,
          data.batch.status,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `relatorio_lote_${batchCode}_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
