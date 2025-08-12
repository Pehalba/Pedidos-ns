# 📦 Consolidador de Pedidos

Sistema web vanilla para gerenciamento de pedidos com frete PADRÃO, desenvolvido em HTML, CSS e JavaScript (ES Modules).

## 🚀 **ACESSO ONLINE**

**🌐 Site em produção:** [https://pehalba.github.io/Pedidos-ns/](https://pehalba.github.io/Pedidos-ns/)

## 📋 **Funcionalidades**

- ✅ **Dashboard de Lotes**: Visualização e gerenciamento de lotes de pedidos
- ✅ **CRUD de Pedidos**: Criar, editar, excluir e visualizar pedidos
- ✅ **Gestão de Lotes**: Criar, editar, excluir lotes e associar pedidos
- ✅ **Importação CSV**: Importar dados da Nuvem Shop via arquivo CSV
- ✅ **Sistema de Rastreio**: Adicionar códigos de rastreio aos lotes
- ✅ **Impressão**: Picking List e Etiquetas Internas
- ✅ **Persistência**: Dados salvos no localStorage do navegador
- ✅ **Responsivo**: Interface adaptável para diferentes dispositivos

## 🏗️ **Estrutura do Projeto**

```
Pedidos- Nuvem/
├── index.html              # Redirecionamento para GitHub Pages
├── .nojekyll              # Configuração GitHub Pages
├── README.md              # Documentação
├── INSTALACAO.md          # Instruções de instalação
├── exemplo_importacao.csv # Exemplo de CSV para importação
├── src/                   # Código fonte principal
│   ├── index.html         # Página principal
│   ├── css/               # Estilos CSS
│   │   ├── index.css      # Estilos principais
│   │   ├── main.css       # Layout principal
│   │   ├── header.css     # Cabeçalho
│   │   ├── content.css    # Conteúdo
│   │   ├── popup.css      # Modais
│   │   └── ...            # Outros estilos
│   └── js/                # JavaScript (ES Modules)
│       ├── index.js       # Entrada principal
│       ├── Store.js       # Gerenciamento de dados
│       ├── UI.js          # Interface do usuário
│       ├── Order.js       # Gestão de pedidos
│       ├── Batch.js       # Gestão de lotes
│       ├── CsvImport.js   # Importação CSV
│       ├── Filters.js     # Filtros e busca
│       ├── Printing.js    # Impressão
│       └── Utils.js       # Utilitários
└── vendor/                # Dependências externas
    ├── normalize.css      # Reset CSS
    ├── fonts.css          # Fontes do sistema
    └── papaparse.min.js   # Parser CSV
```

## 🛠️ **Tecnologias Utilizadas**

- **HTML5**: Estrutura semântica
- **CSS3**: Estilos com metodologia BEM
- **JavaScript ES6+**: Módulos ES6, localStorage, APIs modernas
- **PapaParse**: Biblioteca para parsing de CSV
- **GitHub Pages**: Hospedagem gratuita

## 📦 **Instalação Local**

### Pré-requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Servidor local (Python, Node.js, Live Server, etc.)

### Passos

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/Pehalba/Pedidos-ns.git
   cd Pedidos-ns
   ```

2. **Inicie um servidor local:**

   ```bash
   # Com Python 3
   python -m http.server 8000

   # Com Python 2
   python -m SimpleHTTPServer 8000

   # Com Node.js (se tiver live-server instalado)
   npx live-server
   ```

3. **Acesse no navegador:**
   ```
   http://localhost:8000/src/index.html
   ```

## 🎯 **Como Usar**

### 1. **Dashboard de Lotes**

- Visualize todos os lotes criados
- Clique em "Novo Lote" para criar um novo lote
- Use os cards de status para filtrar lotes
- Acesse detalhes, edite ou exclua lotes

### 2. **Gerenciar Pedidos**

- Navegue para a aba "Pedidos"
- Crie novos pedidos manualmente
- Use filtros para buscar pedidos específicos
- Edite ou exclua pedidos existentes

### 3. **Importar CSV**

- Navegue para "Importar CSV"
- Selecione um arquivo CSV da Nuvem Shop
- Mapeie as colunas corretamente
- Confirme a importação

### 4. **Criar Lotes**

- Clique em "Novo Lote"
- Preencha o nome do lote (obrigatório)
- Adicione código de rastreio (opcional)
- Selecione pedidos PADRÃO e PAGOS
- Salve o lote

### 5. **Gerenciar Status**

- Altere o status dos lotes: CRIADO → A_CAMINHO → RECEBIDO → SEPARADO
- Adicione códigos de rastreio quando disponíveis
- Visualize detalhes completos dos lotes

### 6. **Imprimir**

- No detalhe do lote, use "Imprimir Picking List"
- Ou "Imprimir Etiquetas Internas"
- Os documentos são otimizados para impressão

## 🔧 **Configurações**

### **Dados de Demonstração**

O sistema inclui dados de exemplo:

- 10 pedidos PADRÃO (IDs 100-109)
- 4 pedidos EXPRESSO (IDs 200-203)
- 1 lote de demonstração com 6 pedidos

### **Persistência**

- Dados salvos automaticamente no localStorage
- Chave: `consolidador:v1`
- Migração automática de dados antigos

### **Atalhos de Teclado**

- `/` - Focar na busca (na tela de detalhes do lote)

## 📊 **Regras de Negócio**

### **Pedidos**

- Apenas pedidos PADRÃO podem ser adicionados a lotes
- Pedidos EXPRESSO são automaticamente removidos de lotes
- InternalTag é gerada automaticamente: `slug(produto)-id`

### **Lotes**

- Código gerado automaticamente: `LOTE-YYYYMMDD-N`
- Status segue fluxo: CRIADO → A_CAMINHO → RECEBIDO → SEPARADO
- Rastreio é opcional e pode ser adicionado posteriormente

### **Associações**

- Excluir lote desassocia pedidos (não os exclui)
- Excluir pedido o remove do lote
- Mudança para EXPRESSO remove automaticamente do lote

## 🚀 **Deploy no GitHub Pages**

O projeto está configurado para GitHub Pages:

1. **Arquivo de redirecionamento:** `index.html` na raiz
2. **Configuração Jekyll:** `.nojekyll` para desabilitar processamento
3. **URL de produção:** `https://pehalba.github.io/Pedidos-ns/`

### **Para fazer deploy:**

```bash
git add .
git commit -m "Atualização do sistema"
git push origin main
```

## 📝 **Formato CSV para Importação**

Exemplo de estrutura do CSV da Nuvem Shop:

```csv
ID do Pedido,Nome do Cliente,Nome do Produto,Tamanho,SKU,Tipo de Frete,Status do Pagamento
100,João Silva,Brasil 24/25,M,BRA-M-24,PADRÃO,PAGO
101,Maria Santos,Real 23/24,L,REA-L-23,PADRÃO,PAGO
```

## 🤝 **Contribuição**

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 **Autor**

**Pedro Alba**

- GitHub: [@Pehalba](https://github.com/Pehalba)
- Projeto: [Consolidador de Pedidos](https://github.com/Pehalba/Pedidos-ns)

## 🆘 **Suporte**

Se encontrar algum problema ou tiver dúvidas:

1. Verifique se está usando um navegador moderno
2. Limpe o localStorage se houver problemas de dados
3. Abra uma issue no GitHub com detalhes do problema

---

**⭐ Se este projeto foi útil, considere dar uma estrela no repositório!**
