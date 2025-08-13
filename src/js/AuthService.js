export class AuthService {
  constructor() {
    this.isAuthenticated = false;
    this.credentials = {
      username: "admin",
      password: "123456"
    };
    this.loadAuthState();
  }

  // Carregar estado de autenticação do localStorage
  loadAuthState() {
    const authState = localStorage.getItem('consolidador:auth');
    if (authState) {
      this.isAuthenticated = JSON.parse(authState);
    }
  }

  // Salvar estado de autenticação no localStorage
  saveAuthState() {
    localStorage.setItem('consolidador:auth', JSON.stringify(this.isAuthenticated));
  }

  // Fazer login
  login(username, password) {
    if (username === this.credentials.username && password === this.credentials.password) {
      this.isAuthenticated = true;
      this.saveAuthState();
      return true;
    }
    return false;
  }

  // Fazer logout
  logout() {
    this.isAuthenticated = false;
    this.saveAuthState();
  }

  // Verificar se está autenticado
  checkAuth() {
    return this.isAuthenticated;
  }

  // Atualizar interface baseado no estado de autenticação
  updateUI() {
    const authBtn = document.getElementById('auth-btn');
    const requiresAuthElements = document.querySelectorAll('[data-requires-auth]');
    const viewOnlyElements = document.querySelectorAll('[data-view-only]');

    if (this.isAuthenticated) {
      // Usuário logado
      if (authBtn) {
        authBtn.textContent = 'Sair';
        authBtn.className = 'btn btn--secondary btn--danger';
      }
      
      // Mostrar elementos que requerem autenticação
      requiresAuthElements.forEach(el => {
        el.style.display = '';
      });
      
      // Esconder avisos de modo visualização
      viewOnlyElements.forEach(el => {
        el.style.display = 'none';
      });
    } else {
      // Usuário não logado
      if (authBtn) {
        authBtn.textContent = 'Entrar';
        authBtn.className = 'btn btn--secondary';
      }
      
      // Esconder elementos que requerem autenticação
      requiresAuthElements.forEach(el => {
        el.style.display = 'none';
      });
      
      // Mostrar avisos de modo visualização
      viewOnlyElements.forEach(el => {
        el.style.display = 'block';
      });
    }
  }

  // Mostrar modal de login
  showLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.style.display = 'block';
      document.getElementById('login-username').focus();
    }
  }

  // Esconder modal de login
  hideLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.style.display = 'none';
      document.getElementById('login-form').reset();
      document.getElementById('login-error').style.display = 'none';
    }
  }

  // Processar tentativa de login
  handleLoginAttempt() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');

    if (this.login(username, password)) {
      this.hideLoginModal();
      this.updateUI();
      this.showToast('Login realizado com sucesso!', 'success');
    } else {
      errorElement.textContent = 'Usuário ou senha incorretos';
      errorElement.style.display = 'block';
    }
  }

  // Mostrar toast de notificação
  showToast(message, type = 'info') {
    // Criar toast simples
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#333'};
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 100);
    
    // Remover após 3 segundos
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
}
