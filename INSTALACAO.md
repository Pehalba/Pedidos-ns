# Guia de Instalação - Consolidador de Pedidos

## 🚀 Instalação Rápida

### Opção 1: Uso Local (Recomendado)

1. **Baixar o projeto**

   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd web_project_around
   ```

2. **Abrir no navegador**

   - Abra o arquivo `src/index.html` em um navegador moderno
   - Ou use um servidor local:

   ```bash
   # Python 3
   python -m http.server 8000

   # Node.js (se tiver instalado)
   npx serve src

   # PHP
   php -S localhost:8000 -t src
   ```

3. **Acessar**
   - Local: `http://localhost:8000`
   - O sistema carregará automaticamente com dados de demonstração

### Opção 2: GitHub Pages

1. **Fazer fork do repositório**
2. **Configurar GitHub Pages**
   - Vá em Settings > Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
3. **Acessar**
   - URL: `https://[SEU_USUARIO].github.io/[NOME_DO_REPO]`

## 📋 Pré-requisitos

### Navegador

- **Chrome**: 80+
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

### Funcionalidades Necessárias

- ES6 Modules
- LocalStorage
- Clipboard API (opcional)
- File API (para importação CSV)

## 🔧 Configuração

### 1. Dados Iniciais

O sistema vem com dados de demonstração:

- **10 pedidos PADRÃO** (IDs 100-109)
- **4 pedidos EXPRESSO** (IDs 200-203)
- **1 lote de demonstração** com 6 pedidos

### 2. Personalização

#### Alterar Dados de Demonstração

Edite o método `createDemoData()` em `src/js/index.js`:

```javascript
createDemoData() {
  // Seus dados personalizados aqui
  const demoOrders = [
    {
      id: "100",
      customerName: "Seu Cliente",
      productName: "Seu Produto",
      // ... outros campos
    }
  ];
  // ...
}
```

#### Configurar Cores e Estilos

Edite as variáveis CSS em `src/css/index.css`:

```css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #6b7280;
  /* ... outras variáveis */
}
```

### 3. Configurações Avançadas

#### Alterar Chave do LocalStorage

Em `src/js/Store.js`:

```javascript
constructor() {
  this.storageKey = "sua-chave-personalizada:v1";
  // ...
}
```

#### Configurar Formato de Código de Lote

Em `src/js/Store.js`:

```javascript
generateBatchCode() {
  // Seu formato personalizado
  return `SEU-PREFIXO-${dateStr}-${this.nextBatchNumber}`;
}
```

## 📁 Estrutura de Arquivos

### Arquivos Essenciais

```
src/
├── index.html          # Página principal
├── js/
│   ├── index.js       # Entrada da aplicação
│   ├── Store.js       # Gerenciamento de dados
│   ├── UI.js          # Interface
│   ├── Order.js       # Pedidos
│   ├── Batch.js       # Lotes
│   ├── CsvImport.js   # Importação
│   ├── Filters.js     # Filtros
│   ├── Printing.js    # Impressão
│   └── Utils.js       # Utilitários
└── css/               # Estilos
```

### Arquivos Opcionais

```
vendor/
├── papaparse.min.js   # Parser CSV
├── normalize.css      # Reset CSS
└── fonts.css          # Fontes

exemplo_importacao.csv  # Exemplo para importação
```

## 🔒 Segurança

### Configurações de Segurança

1. **Sanitização de Dados**

   - Ativada por padrão
   - Remove scripts maliciosos
   - Escapa caracteres especiais

2. **Validação de Entrada**

   - Campos obrigatórios
   - Formato de dados
   - Validação de tipos

3. **LocalStorage**
   - Dados salvos localmente
   - Não há transmissão de dados
   - Backup recomendado

## 📊 Backup e Restauração

### Exportar Dados

```javascript
// No console do navegador
const data = localStorage.getItem("consolidador:v1");
console.log(data);
```

### Importar Dados

```javascript
// No console do navegador
localStorage.setItem("consolidador:v1", JSON.stringify(seusDados));
```

### Backup Automático

Para implementar backup automático, adicione em `src/js/Store.js`:

```javascript
saveData() {
  try {
    const data = {
      orders: this.orders,
      batches: this.batches,
      backupDate: new Date().toISOString()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));

    // Backup adicional
    localStorage.setItem(`${this.storageKey}_backup`, JSON.stringify(data));
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
  }
}
```

## 🚀 Otimizações

### Performance

1. **Minificação** (opcional)

   ```bash
   # Instalar minificador
   npm install -g uglify-js

   # Minificar JS
   uglifyjs src/js/*.js -o scripts/app.min.js
   ```

2. **Compressão CSS** (opcional)

   ```bash
   # Instalar compressor
   npm install -g clean-css-cli

   # Comprimir CSS
   cleancss src/css/*.css -o styles/app.min.css
   ```

### Cache

Para melhor performance, configure cache no servidor:

```apache
# .htaccess (Apache)
<FilesMatch "\.(css|js)$">
  ExpiresActive On
  ExpiresDefault "access plus 1 month"
</FilesMatch>
```

## 🐛 Solução de Problemas

### Problemas Comuns

1. **Erro de Módulos ES6**

   - Use servidor local (não file://)
   - Verifique compatibilidade do navegador

2. **Dados não salvam**

   - Verificar localStorage habilitado
   - Limpar cache do navegador
   - Verificar espaço disponível

3. **Importação CSV falha**

   - Verificar encoding UTF-8
   - Mapear colunas corretamente
   - Verificar formato do arquivo

4. **Impressão não funciona**
   - Permitir popups
   - Verificar configurações de impressora
   - Usar modo de impressão

### Logs de Debug

```javascript
// Ativar logs detalhados
localStorage.setItem("debug", "true");

// Ver logs no console
console.log("Dados:", JSON.parse(localStorage.getItem("consolidador:v1")));
```

## 📞 Suporte

### Recursos de Ajuda

- **README.md**: Documentação completa
- **Console do navegador**: Logs e erros
- **Exemplo CSV**: Formato de importação

### Contato

- Abrir issue no repositório
- Verificar documentação
- Consultar logs do console

---

**Sistema pronto para uso! 🎉**
