export class Utils {
  constructor() {
    // Inicialização se necessário
  }

  // Geração de tags internas
  generateInternalTag(productName, orderId) {
    const slug = productName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return `${slug}-${orderId}`;
  }

  // Formatação de datas
  formatDate(date, format = "pt-BR") {
    if (!date) return "";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    return d.toLocaleDateString(format);
  }

  formatDateTime(date, format = "pt-BR") {
    if (!date) return "";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    return d.toLocaleString(format);
  }

  formatRelativeTime(date) {
    if (!date) return "";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays} dias atrás`;

    return this.formatDate(d);
  }

  // Operações de clipboard
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        window.app.ui.showToast(
          "Copiado para a área de transferência",
          "success"
        );
      } else {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
          window.app.ui.showToast(
            "Copiado para a área de transferência",
            "success"
          );
        } else {
          window.app.ui.showToast("Erro ao copiar", "error");
        }
      }
    } catch (error) {
      console.error("Erro ao copiar:", error);
      window.app.ui.showToast("Erro ao copiar", "error");
    }
  }

  // Debounce e throttle
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Geração de IDs únicos
  generateId(prefix = "") {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `${prefix}${timestamp}${randomStr}`;
  }

  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  // Validação
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  }

  isValidCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, "");

    if (cpf.length !== 11) return false;

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Validar primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;

    // Validar segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  // Sanitização de HTML
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  sanitizeHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html;

    // Remover scripts
    const scripts = div.querySelectorAll("script");
    scripts.forEach((script) => script.remove());

    // Remover event handlers
    const elements = div.querySelectorAll("*");
    elements.forEach((element) => {
      const attrs = element.attributes;
      for (let i = attrs.length - 1; i >= 0; i--) {
        const attr = attrs[i];
        if (attr.name.startsWith("on")) {
          element.removeAttribute(attr.name);
        }
      }
    });

    return div.innerHTML;
  }

  // Formatação de números e moeda
  formatCurrency(value, currency = "BRL", locale = "pt-BR") {
    if (typeof value !== "number" || isNaN(value)) return "R$ 0,00";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(value);
  }

  formatNumber(value, locale = "pt-BR", options = {}) {
    if (typeof value !== "number" || isNaN(value)) return "0";

    return new Intl.NumberFormat(locale, options).format(value);
  }

  parseCurrency(value) {
    if (typeof value === "number") return value;

    const cleaned = value
      .toString()
      .replace(/[^\d,.-]/g, "")
      .replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Helpers para status
  getStatusColor(status) {
    const colors = {
      CRIADO: "#6b7280",
      A_CAMINHO: "#f59e0b",
      RECEBIDO: "#3b82f6",
      SEPARADO: "#10b981",
      PADRAO: "#3b82f6",
      EXPRESSO: "#f59e0b",
      PAGO: "#10b981",
      AGUARDANDO: "#f59e0b",
      CANCELADO: "#ef4444",
    };
    return colors[status] || "#6b7280";
  }

  getStatusText(status) {
    const texts = {
      CRIADO: "Criado",
      A_CAMINHO: "A Caminho",
      RECEBIDO: "Recebido",
      SEPARADO: "Separado",
      PADRAO: "Padrão",
      EXPRESSO: "Expresso",
      PAGO: "Pago",
      AGUARDANDO: "Aguardando",
      CANCELADO: "Cancelado",
    };
    return texts[status] || status;
  }

  // Agrupamento e ordenação
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || "Sem valor";
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {});
  }

  sortBy(array, key, order = "asc") {
    return [...array].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];

      // Converter para string para comparação
      aValue = aValue?.toString().toLowerCase() || "";
      bValue = bValue?.toString().toLowerCase() || "";

      if (order === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }

  filterBy(array, key, value) {
    return array.filter((item) => {
      if (typeof value === "function") {
        return value(item[key]);
      }
      return item[key] === value;
    });
  }

  // Manipulação de arrays
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  unique(array, key = null) {
    if (key) {
      const seen = new Set();
      return array.filter((item) => {
        const value = item[key];
        if (seen.has(value)) {
          return false;
        }
        seen.add(value);
        return true;
      });
    } else {
      return [...new Set(array)];
    }
  }

  // Manipulação de objetos
  deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map((item) => this.deepClone(item));
    if (typeof obj === "object") {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  pick(obj, keys) {
    const picked = {};
    keys.forEach((key) => {
      if (obj.hasOwnProperty(key)) {
        picked[key] = obj[key];
      }
    });
    return picked;
  }

  omit(obj, keys) {
    const omitted = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && !keys.includes(key)) {
        omitted[key] = obj[key];
      }
    }
    return omitted;
  }

  // Manipulação de strings
  truncate(str, length = 50, suffix = "...") {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Manipulação de URLs
  getQueryParams(url = window.location.href) {
    const params = {};
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  setQueryParams(params) {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  // Manipulação de arquivos
  downloadFile(content, filename, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  // Utilitários de data
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  addYears(date, years) {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  isToday(date) {
    const today = new Date();
    const d = new Date(date);
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }

  isYesterday(date) {
    const yesterday = this.addDays(new Date(), -1);
    const d = new Date(date);
    return (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    );
  }

  // Utilitários de localStorage
  setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Erro ao salvar no localStorage:", error);
      return false;
    }
  }

  getLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("Erro ao ler do localStorage:", error);
      return defaultValue;
    }
  }

  removeLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Erro ao remover do localStorage:", error);
      return false;
    }
  }

  clearLocalStorage() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Erro ao limpar localStorage:", error);
      return false;
    }
  }

  // Utilitários de sessão
  setSessionStorage(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Erro ao salvar no sessionStorage:", error);
      return false;
    }
  }

  getSessionStorage(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("Erro ao ler do sessionStorage:", error);
      return defaultValue;
    }
  }

  removeSessionStorage(key) {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Erro ao remover do sessionStorage:", error);
      return false;
    }
  }

  clearSessionStorage() {
    try {
      sessionStorage.clear();
      return true;
    } catch (error) {
      console.error("Erro ao limpar sessionStorage:", error);
      return false;
    }
  }
}
