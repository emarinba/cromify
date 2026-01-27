/**
 * =====================================================================
 * APP.JS - Aplicación principal
 * ===================================================================== */

const GolfApp = {
  
  currentView: 'dashboard',
  currentUser: null,
  
  /**
   * Inicializar aplicación
   */
  async initialize() {
    console.log('⛳ Inicializando Golf Tracker...');
    
    // Verificar autenticación
    const { user } = await window.SupabaseAPI.auth.getCurrentUser();
    
    if (!user) {
      console.warn('⚠️ Usuario no autenticado');
      AUTH.showLogin();
      return;
    }
    
    this.currentUser = user;
    console.log('✅ Usuario autenticado:', user.email);
    
    // Actualizar UI de usuario
    const emailEl = document.getElementById('user-email');
    if (emailEl) emailEl.textContent = user.email;
    
    // Inicializar vistas
    await this.initializeViews();
    
    // Navegar a dashboard
    this.navigate('dashboard');
    
    console.log('✅ Aplicación inicializada');
  },
  
  /**
   * Inicializar todas las vistas
   */
  async initializeViews() {
    await DashboardView.initialize();
    await CoursesView.initialize();
    await GameView.initialize();
  },
  
  /**
   * Navegar entre vistas
   */
  navigate(viewName) {
    console.log('🧭 Navegando a:', viewName);
    
    // Ocultar todas las vistas
    document.querySelectorAll('.view-container').forEach(view => {
      view.classList.remove('active');
    });
    
    // Mostrar vista seleccionada
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active');
    }
    
    // Actualizar navegación
    this.updateNavigation(viewName);
    
    // Actualizar estado
    this.currentView = viewName;
    
    // CRÍTICO: Resetear GameView SOLO si navegamos a 'game' SIN estar en modo edición
    // La edición se marca ANTES de navegar, por eso comprobamos aquí
    if (viewName === 'game') {
      // Si NO hay editingGameId, es una NUEVA partida -> resetear
      if (!GameView.editingGameId) {
        GameView.reset();
      }
      // Si SÍ hay editingGameId, ya se cargó con loadGameForEdit() -> no resetear
    }
    
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  
  /**
   * Actualizar estado de navegación
   */
  updateNavigation(viewName) {
    // Navegación móvil
    document.querySelectorAll('.mobile-nav-item:not(.mobile-nav-fab)').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      }
    });
    
    // Navegación desktop (header)
    document.querySelectorAll('.header-nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      }
    });
  },
  
  /**
   * Abrir modal
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },
  
  /**
   * Cerrar modal
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },
  
  /**
   * Cerrar sesión
   */
  async logout() {
    const confirmed = await Utils.confirm('¿Seguro que quieres cerrar sesión?');
    
    if (!confirmed) return;
    
    try {
      const { error } = await window.SupabaseAPI.auth.signOut();
      
      if (error) {
        throw new Error(error);
      }
      
      console.log('✅ Sesión cerrada');
      
      // Limpiar estado
      this.currentUser = null;
      this.currentView = 'dashboard';
      
      // Mostrar pantalla de login
      AUTH.showLogin();
      
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      Utils.showToast('Error al cerrar sesión', 'error');
    }
  }
};

// =====================================================================
// INICIALIZACIÓN AL CARGAR EL DOM
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM cargado');
  
  // Esperar a que Supabase esté disponible
  const checkSupabase = setInterval(() => {
    if (window.SupabaseAPI && window.AUTH) {
      clearInterval(checkSupabase);
      console.log('✅ Supabase API y AUTH disponibles');
      
      // Inicializar autenticación
      AUTH.initialize();
    }
  }, 100);
  
  // Timeout de seguridad
  setTimeout(() => {
    clearInterval(checkSupabase);
    if (!window.SupabaseAPI) {
      console.error('❌ Error: Supabase no se cargó');
      alert('Error al cargar la aplicación. Por favor recarga la página.');
    }
  }, 5000);
});

// Exportar al ámbito global
window.GolfApp = GolfApp;

console.log('✅ App.js cargado');
