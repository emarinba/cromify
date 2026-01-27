/**
 * =====================================================================
 * AUTH.JS - Sistema de autenticación (ACTUALIZADO PARA REDISEÑO)
 * =====================================================================
 */

const AUTH = {
  
  /**
   * Inicializar sistema de autenticación
   */
  async initialize() {
    console.log('🔐 Inicializando sistema de autenticación...');
    
    try {
      // Verificar si hay sesión activa
      const { user, error } = await window.SupabaseAPI.auth.getCurrentUser();
      
      if (error) {
        console.error('Error al verificar sesión:', error);
        this.showLogin();
        return;
      }
      
      if (user) {
        console.log('✅ Usuario autenticado:', user.email);
        await this.showApp(user);
      } else {
        console.log('⚠️ No hay sesión activa');
        this.showLogin();
      }
      
      // Escuchar cambios de autenticación
      this.listenAuthChanges();
      
    } catch (error) {
      console.error('❌ Error al inicializar autenticación:', error);
      this.showLogin();
    }
  },
  
  /**
   * Mostrar pantalla de login
   */
  showLogin() {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    
    if (authScreen) authScreen.classList.remove('hidden');
    if (appScreen) appScreen.classList.add('hidden');
    if (loginView) loginView.classList.remove('hidden');
    if (registerView) registerView.classList.add('hidden');
    
    // Limpiar errores
    this.hideError('login-error');
  },
  
  /**
   * Mostrar pantalla de registro
   */
  showRegister(event) {
    if (event) event.preventDefault();
    
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    
    if (loginView) loginView.classList.add('hidden');
    if (registerView) registerView.classList.remove('hidden');
    
    // Limpiar errores
    this.hideError('register-error');
    this.hideError('register-success');
  },
  
  /**
   * Mostrar aplicación principal
   */
  async showApp(user) {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    
    if (authScreen) authScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
    
    // Inicializar aplicación
    if (typeof GolfApp !== 'undefined') {
      await GolfApp.initialize();
    }
  },
  
  /**
   * Manejar login
   */
  async handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    // Validación básica
    if (!email || !password) {
      this.showError('login-error', 'Por favor completa todos los campos');
      return;
    }
    
    // Deshabilitar botón
    const btn = document.getElementById('login-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Iniciando sesión...';
    
    try {
      const { user, error } = await window.SupabaseAPI.auth.signIn(email, password);
      
      if (error) {
        throw new Error(error);
      }
      
      if (!user) {
        throw new Error('Error al iniciar sesión');
      }
      
      console.log('✅ Login exitoso');
      
      // Mostrar aplicación
      await this.showApp(user);
      
    } catch (error) {
      console.error('Error en login:', error);
      
      // Mensajes de error más amigables
      let errorMessage = 'Error al iniciar sesión';
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email o contraseña incorrectos';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Por favor verifica tu email antes de iniciar sesión';
      } else if (error.message.includes('network')) {
        errorMessage = 'Error de conexión. Verifica tu internet';
      }
      
      this.showError('login-error', errorMessage);
      
      // Restaurar botón
      btn.disabled = false;
      btn.textContent = originalText;
    }
  },
  
  /**
   * Manejar registro
   */
  async handleRegister(event) {
    event.preventDefault();
    
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    
    // Limpiar mensajes anteriores
    this.hideError('register-error');
    this.hideError('register-success');
    
    // Validaciones
    if (!email || !password || !passwordConfirm) {
      this.showError('register-error', 'Por favor completa todos los campos');
      return;
    }
    
    if (!this.isValidEmail(email)) {
      this.showError('register-error', 'Email inválido');
      return;
    }
    
    if (password.length < 6) {
      this.showError('register-error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (password !== passwordConfirm) {
      this.showError('register-error', 'Las contraseñas no coinciden');
      return;
    }
    
    // Deshabilitar botón
    const btn = document.getElementById('register-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Creando cuenta...';
    
    try {
      const { user, error } = await window.SupabaseAPI.auth.signUp(email, password);
      
      if (error) {
        throw new Error(error);
      }
      
      console.log('✅ Registro exitoso');
      
      // Mostrar mensaje de éxito
      this.showSuccess(
        'register-success', 
        '✅ Cuenta creada correctamente. Por favor verifica tu email para activar tu cuenta.'
      );
      
      // Limpiar formulario
      document.getElementById('register-form').reset();
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        this.showLogin();
      }, 3000);
      
    } catch (error) {
      console.error('Error en registro:', error);
      
      let errorMessage = 'Error al crear la cuenta';
      
      if (error.message.includes('already registered')) {
        errorMessage = 'Este email ya está registrado';
      } else if (error.message.includes('network')) {
        errorMessage = 'Error de conexión. Verifica tu internet';
      }
      
      this.showError('register-error', errorMessage);
      
      // Restaurar botón
      btn.disabled = false;
      btn.textContent = originalText;
    }
  },
  
  /**
   * Escuchar cambios en el estado de autenticación
   */
  listenAuthChanges() {
    window.SupabaseAPI.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        await this.showApp(session.user);
      } else if (event === 'SIGNED_OUT') {
        this.showLogin();
      }
    });
  },
  
  /**
   * Mostrar error
   */
  showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  },
  
  /**
   * Ocultar error
   */
  hideError(elementId) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.classList.add('hidden');
      errorEl.textContent = '';
    }
  },
  
  /**
   * Mostrar mensaje de éxito
   */
  showSuccess(elementId, message) {
    const successEl = document.getElementById(elementId);
    if (successEl) {
      successEl.textContent = message;
      successEl.classList.remove('hidden');
    }
  },
  
  /**
   * Validar email
   */
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
};

// Exportar al ámbito global
window.AUTH = AUTH;

console.log('✅ Auth.js (rediseño) cargado');
