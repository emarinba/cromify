/**
 * utils.js - Módulo de Utilidades
 * Funciones helper, formateo, validaciones, etc.
 */

const Utils = {
  /**
   * Mostrar loader
   */
  showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.remove('hidden');
  },

  /**
   * Ocultar loader
   */
  hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  },

  /**
   * Mostrar toast/notificación
   */
  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    // Limpiar cualquier timeout anterior
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // Mostrar con animación
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Ocultar después de 3 segundos
    this.toastTimeout = setTimeout(() => {
      toast.classList.add('hiding');
      
      // Remover clases después de la animación
      setTimeout(() => {
        toast.classList.remove('show', 'hiding');
      }, 300);
    }, 3000);
  },

  /**
   * Abrir modal
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  /**
   * Cerrar modal
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  /**
   * Mostrar vista
   */
  showView(viewId) {
    // Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });

    // Mostrar vista solicitada
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');
  },

  /**
   * Formatear fecha
   */
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * Formatear fecha corta
   */
  formatDateShort(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  },

  /**
   * Convertir hex a RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 16, g: 185, b: 129 };
  },

  /**
   * Ordenar cromos por número
   */
  sortCards(cards) {
    return [...cards].sort((a, b) => {
      // Extraer números de los cromos
      const aMatch = a.number.match(/(\d+)([a-zA-Z]*)/);
      const bMatch = b.number.match(/(\d+)([a-zA-Z]*)/);
      
      // Si ambos tienen números
      if (aMatch && bMatch) {
        const aNum = parseInt(aMatch[1]);
        const bNum = parseInt(bMatch[1]);
        
        // Comparar por número primero
        if (aNum !== bNum) {
          return aNum - bNum;
        }
        
        // Si los números son iguales, comparar sufijos (bis, a, b, etc)
        const aSuffix = aMatch[2] || '';
        const bSuffix = bMatch[2] || '';
        return aSuffix.localeCompare(bSuffix);
      }
      
      // Si solo A tiene número, A va primero
      if (aMatch && !bMatch) return -1;
      
      // Si solo B tiene número, B va primero
      if (!aMatch && bMatch) return 1;
      
      // Si ninguno tiene número (solo letras), ordenar alfabéticamente
      return a.number.localeCompare(b.number);
    });
  },

  /**
   * Obtener siguiente número de cromo
   */
  getNextCardNumber(cards) {
    if (!cards || cards.length === 0) return '1';
    
    const numbers = cards
      .map(c => parseInt(c.number))
      .filter(n => !isNaN(n));
    
    if (numbers.length === 0) return '1';
    
    return (Math.max(...numbers) + 1).toString();
  },

  /**
   * Validar email
   */
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  /**
   * Escapar HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Capitalizar nombre (Primera letra mayúscula de cada palabra)
   */
  capitalizeName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  /**
   * Calcular porcentaje de progreso
   */
  calculateProgress(owned, total) {
    if (total === 0) return 0;
    return Math.round((owned / total) * 100);
  },

  /**
   * Generar color aleatorio
   */
  randomColor() {
    const colors = [
      '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', 
      '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  /**
   * Debounce para búsquedas
   */
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
  },

  /**
   * Parsear números de cromos (para bulk operations)
   */
  parseCardNumbers(input) {
    const numbers = [];
    const parts = input.split(',').map(p => p.trim());
    
    parts.forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            numbers.push(i);
          }
        }
      } else {
        const num = parseInt(part);
        if (!isNaN(num)) {
          numbers.push(num);
        }
      }
    });
    
    return [...new Set(numbers)].sort((a, b) => a - b);
  },

  /**
   * Copiar al portapapeles
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copiado al portapapeles', 'success');
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      this.showToast('Error al copiar', 'error');
      return false;
    }
  },

  /**
   * Confirmar acción
   */
  confirm(message) {
    return window.confirm(message);
  },

  /**
   * Inicializar modo oscuro
   */
  initDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      document.body.classList.add('dark-mode');
    }
  },

  /**
   * Alternar modo oscuro
   */
  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    // Actualizar icono
    this.updateDarkModeIcon();
  },

  /**
   * Actualizar icono de modo oscuro
   */
  updateDarkModeIcon() {
    const icon = document.getElementById('iconDarkMode');
    if (!icon) return;
    
    const isDark = document.body.classList.contains('dark-mode');
    icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Formatear número con separadores de miles
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
};
