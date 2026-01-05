/**
 * ui.js - Módulo de Interfaz de Usuario
 * Gestiona la UI común (no específica de admin o usuario)
 */

const UI = {
  currentView: null,

  /**
   * Inicializar UI
   */
  init() {
    this.setupEventListeners();
    this.setupModals();
    Utils.initDarkMode();
    Utils.updateDarkModeIcon();
  },

  /**
   * Configurar event listeners globales
   */
  setupEventListeners() {
    // Botón de logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.handleLogout());
    }

    // Botón de modo oscuro
    const btnToggleDarkMode = document.getElementById('btnToggleDarkMode');
    if (btnToggleDarkMode) {
      btnToggleDarkMode.addEventListener('click', () => Utils.toggleDarkMode());
    }

    // Botones de cerrar modal
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.target.getAttribute('data-close');
        Utils.closeModal(modalId);
      });
    });

    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          Utils.closeModal(modal.id);
        }
      });
    });
  },

  /**
   * Configurar modales
   */
  setupModals() {
    // Prevenir cierre accidental de modales con formularios
    document.querySelectorAll('.modal-content').forEach(content => {
      content.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });
  },

  /**
   * Mostrar pantalla de login/registro
   */
  showAuthScreen() {
    Utils.showView('viewAuth');
    this.hideAppHeader();
  },

  /**
   * Mostrar aplicación principal
   */
  async showApp() {
    try {
      console.log('🎯 Mostrando aplicación...');
      
      const user = Auth.getCurrentUser();
      console.log('Usuario actual:', user);
      
      if (!user) {
        console.error('❌ No hay usuario actual');
        this.showAuthScreen();
        return;
      }
      
      console.log('✅ Usuario encontrado:', user.email, 'Role:', user.role);
      
      this.showAppHeader();
      this.updateUserInfo();
      
      // Mostrar vista según el rol
      if (Auth.isAdmin()) {
        console.log('👑 Cargando dashboard de administrador...');
        await AdminUI.showDashboard();
      } else {
        console.log('👤 Cargando dashboard de usuario...');
        await UserUI.showDashboard();
      }
      
      console.log('✅ App cargada correctamente');
    } catch (error) {
      console.error('❌ Error en showApp:', error);
      throw error;
    }
  },

  /**
   * Mostrar header de la app
   */
  showAppHeader() {
    const header = document.querySelector('.app-header');
    if (header) header.style.display = 'block';
  },

  /**
   * Ocultar header de la app
   */
  hideAppHeader() {
    const header = document.querySelector('.app-header');
    if (header) header.style.display = 'none';
  },

  /**
   * Actualizar información del usuario en el header
   */
  updateUserInfo() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    // Nombre del usuario
    const userName = document.getElementById('userNameDisplay');
    if (userName) userName.textContent = user.name;

    // Avatar
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      if (user.avatar_url) {
        // Si tiene foto de Google, mostrarla
        avatar.style.backgroundImage = `url(${user.avatar_url})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.textContent = '';
      } else {
        // Si no, mostrar iniciales
        const initials = user.name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        avatar.textContent = initials;
        avatar.style.backgroundImage = 'none';
      }
    }

    // Badge de admin si corresponde
    this.updateAdminBadge();
  },

  /**
   * Actualizar badge de administrador
   */
  updateAdminBadge() {
    let badge = document.getElementById('adminBadge');
    
    if (Auth.isAdmin()) {
      if (!badge) {
        badge = document.createElement('span');
        badge.id = 'adminBadge';
        badge.className = 'admin-badge';
        badge.textContent = 'ADMIN';
        
        const userMenu = document.querySelector('.user-menu');
        if (userMenu) {
          userMenu.insertBefore(badge, userMenu.firstChild);
        }
      }
    } else {
      if (badge) badge.remove();
    }
  },

  /**
   * Manejar logout
   */
  async handleLogout() {
    if (!Utils.confirm('¿Cerrar sesión?')) return;

    try {
      Utils.showLoader();
      console.log('🔵 Cerrando sesión...');
      
      await Auth.logout();
      
      console.log('✅ Sesión cerrada, esperando evento SIGNED_OUT...');
      
      // Limpiar estado
      this.currentView = null;
      
      // NO llamar a showAuthScreen() aquí
      // El evento SIGNED_OUT lo hará automáticamente
      
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      Utils.hideLoader();
      Utils.showToast('Error al cerrar sesión', 'error');
    }
    // NO poner hideLoader() aquí, se hará en el evento
  },

  /**
   * Renderizar lista de álbumes (común para admin y usuario)
   */
  renderAlbumsList(albums, containerSelector, cardRenderer) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    if (albums.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="inbox" style="width: 64px; height: 64px; color: var(--text-secondary);"></i>
          <h3>No hay álbumes disponibles</h3>
          <p>Aún no se han creado álbumes</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = albums.map(album => cardRenderer(album)).join('');
    
    // Reinicializar iconos de Lucide
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Renderizar estadísticas básicas
   */
  renderStats(stats, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container || !stats) return;

    const html = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--bg-tengo);">
            <i data-lucide="check-circle" style="color: var(--success);"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">Tengo</span>
            <span class="stat-value">${stats.cards_owned || 0}</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--bg-falta);">
            <i data-lucide="x-circle" style="color: var(--danger);"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">Faltan</span>
            <span class="stat-value">${stats.cards_missing || 0}</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--bg-cambiado);">
            <i data-lucide="repeat" style="color: var(--accent);"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">Repetidos</span>
            <span class="stat-value">${stats.total_duplicates || 0}</span>
          </div>
        </div>
        
        <div class="stat-card stat-progress">
          <div class="stat-info">
            <span class="stat-label">Progreso</span>
            <span class="stat-value">${stats.completion_percentage || 0}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${stats.completion_percentage || 0}%"></div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Renderizar mensaje de error
   */
  showError(message, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    container.innerHTML = `
      <div class="error-state">
        <i data-lucide="alert-circle" style="width: 64px; height: 64px; color: var(--danger);"></i>
        <h3>Error</h3>
        <p>${Utils.escapeHtml(message)}</p>
      </div>
    `;
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Renderizar estado vacío
   */
  showEmptyState(icon, title, message, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="${icon}" style="width: 64px; height: 64px; color: var(--text-secondary);"></i>
        <h3>${Utils.escapeHtml(title)}</h3>
        <p>${Utils.escapeHtml(message)}</p>
      </div>
    `;
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
};
