/**
 * app.js - Módulo Principal
 * Orquesta todos los módulos y gestiona el flujo de la aplicación
 */

const App = {
  /**
   * Inicializar aplicación
   */
  async init() {
    console.log('🚀 Inicializando aplicación...');
    
    try {
      // Inicializar Supabase
      if (!initSupabase()) {
        throw new Error('Error inicializando Supabase');
      }

      // Inicializar UI
      UI.init();

      // Configurar listeners de autenticación
      Auth.onAuthStateChange(async (event, session, user) => {
        console.log('🔵 Auth state changed:', event, user?.role);
        
        if (event === 'SIGNED_IN' && user) {
          try {
            console.log('✅ Usuario autenticado:', user.email);
            await UI.showApp();
            Utils.hideLoader();
            Utils.showToast(`¡Bienvenido ${user.name}!`, 'success');
          } catch (error) {
            console.error('❌ Error mostrando app:', error);
            Utils.hideLoader();
            Utils.showToast('Error al cargar la aplicación', 'error');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 Usuario deslogueado');
          UI.showAuthScreen();
          Utils.hideLoader();
          Utils.showToast('Sesión cerrada', 'success');
        }
      });

      // Intentar restaurar sesión
      const isAuthenticated = await Auth.init();
      
      if (isAuthenticated) {
        console.log('✅ Sesión restaurada');
        UI.showApp();
      } else {
        console.log('ℹ️ No hay sesión activa');
        UI.showAuthScreen();
      }

      // Configurar formularios de autenticación
      this.setupAuthForms();

      // Configurar formularios de admin
      this.setupAdminForms();

      console.log('✅ Aplicación inicializada correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando aplicación:', error);
      Utils.showToast('Error al inicializar la aplicación', 'error');
    }
  },

  /**
   * Configurar formularios de autenticación
   */
  setupAuthForms() {
    // Toggle entre login y registro
    const toggleBtn = document.getElementById('toggleAuthMode');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authTitle = document.getElementById('authTitle');
    const authToggleText = document.getElementById('authToggleText');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (loginForm.classList.contains('hidden')) {
          // Mostrar login
          loginForm.classList.remove('hidden');
          registerForm.classList.add('hidden');
          authTitle.textContent = 'Iniciar Sesión';
          authToggleText.innerHTML = '¿No tienes cuenta? <span id="toggleAuthMode" style="color: var(--primary); cursor: pointer; font-weight: 600;">Regístrate</span>';
        } else {
          // Mostrar registro
          loginForm.classList.add('hidden');
          registerForm.classList.remove('hidden');
          authTitle.textContent = 'Crear Cuenta';
          authToggleText.innerHTML = '¿Ya tienes cuenta? <span id="toggleAuthMode" style="color: var(--primary); cursor: pointer; font-weight: 600;">Inicia Sesión</span>';
        }
        
        // Re-attach listener al nuevo elemento
        setTimeout(() => {
          const newToggle = document.getElementById('toggleAuthMode');
          if (newToggle) {
            newToggle.addEventListener('click', arguments.callee);
          }
        }, 0);
      });
    }

    // Formulario de login
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin(e);
      });
    }

    // Formulario de registro
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleRegister(e);
      });
    }

    // Botones de Google
    const btnLoginGoogle = document.getElementById('btnLoginGoogle');
    const btnRegisterGoogle = document.getElementById('btnRegisterGoogle');

    if (btnLoginGoogle) {
      btnLoginGoogle.addEventListener('click', async () => {
        await this.handleGoogleLogin();
      });
    }

    if (btnRegisterGoogle) {
      btnRegisterGoogle.addEventListener('click', async () => {
        await this.handleGoogleLogin();
      });
    }
  },

  /**
   * Manejar login
   */
  async handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      Utils.showToast('Completa todos los campos', 'warning');
      return;
    }

    if (!Utils.isValidEmail(email)) {
      Utils.showToast('Email inválido', 'warning');
      return;
    }

    try {
      Utils.showLoader();
      console.log('🔵 Intentando login...');
      
      await Auth.login(email, password);
      
      console.log('✅ Login exitoso, esperando carga de perfil...');
      // NO llamar a UI.showApp() aquí
      // El evento SIGNED_IN lo hará automáticamente
      
    } catch (error) {
      console.error('❌ Login error:', error);
      Utils.hideLoader();
      Utils.showToast('Credenciales incorrectas', 'error');
    }
    // NO poner hideLoader() aquí, se hará cuando showApp termine
  },

  /**
   * Manejar registro
   */
  async handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (!name || !email || !password) {
      Utils.showToast('Completa todos los campos', 'warning');
      return;
    }

    if (!Utils.isValidEmail(email)) {
      Utils.showToast('Email inválido', 'warning');
      return;
    }

    if (password.length < 6) {
      Utils.showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }

    try {
      Utils.showLoader();
      console.log('🔵 Registrando usuario...');
      
      const result = await Auth.register(email, password, name);
      
      console.log('✅ Registro exitoso:', result);
      
      // Verificar si necesita confirmación de email
      if (result.user && !result.session) {
        // Email de confirmación enviado
        Utils.showToast('Cuenta creada. Revisa tu email para confirmar.', 'success');
        console.log('📧 Email de confirmación enviado');
        
        // Cambiar a login
        setTimeout(() => {
          document.getElementById('toggleAuthMode')?.click();
        }, 100);
      } else if (result.session) {
        // Auto-login (confirmación desactivada)
        console.log('✅ Auto-login después de registro');
        Utils.showToast('¡Cuenta creada y sesión iniciada!', 'success');
        // El evento SIGNED_IN manejará el resto
      }
      
    } catch (error) {
      console.error('❌ Register error:', error);
      
      if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
        Utils.showToast('Este email ya está registrado', 'error');
      } else if (error.message?.includes('Email rate limit')) {
        Utils.showToast('Demasiados intentos. Espera unos minutos.', 'error');
      } else {
        Utils.showToast('Error al crear cuenta: ' + error.message, 'error');
      }
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Manejar login con Google
   */
  async handleGoogleLogin() {
    try {
      Utils.showLoader();
      await Auth.loginWithGoogle();
      // La redirección es automática, el loader se mantendrá visible
    } catch (error) {
      console.error('Google login error:', error);
      Utils.showToast('Error al iniciar sesión con Google', 'error');
      Utils.hideLoader();
    }
  },

  /**
   * Configurar formularios de admin
   */
  setupAdminForms() {
    // Formulario de álbum
    const formAlbum = document.getElementById('formAlbum');
    if (formAlbum) {
      formAlbum.addEventListener('submit', (e) => AdminUI.saveAlbum(e));
    }

    // Formulario de categoría
    const formCategory = document.getElementById('formCategory');
    if (formCategory) {
      formCategory.addEventListener('submit', (e) => AdminUI.saveCategory(e));
    }

    // Formulario de cromo
    const formCard = document.getElementById('formCard');
    if (formCard) {
      formCard.addEventListener('submit', (e) => AdminUI.saveCard(e));
    }

    // Formulario de importación
    const formImport = document.getElementById('formImport');
    if (formImport) {
      formImport.addEventListener('submit', (e) => AdminUI.processImport(e));
    }
  }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
