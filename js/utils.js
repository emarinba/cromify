/**
 * =====================================================================
 * UTILS.JS - Funciones de utilidad
 * ===================================================================== */

const Utils = {
  
  /**
   * Calcular puntos scratch y hándicap
   * MANTIENE LA LÓGICA EXACTA DE LA VERSIÓN ANTERIOR
   */
  calculatePoints(par, stars, strokes) {
    if (!strokes || strokes <= 0) {
      return { scr: 0, hcp: 0 };
    }
    
    // Scratch (ignora estrellas)
    const targetSCR = par;
    const diffSCR = targetSCR - strokes;
    const scr = Math.max(0, 2 + diffSCR);
    
    // Hándicap (incluye estrellas)
    const targetHCP = par + (stars || 0);
    const diffHCP = targetHCP - strokes;
    const hcp = Math.max(0, 2 + diffHCP);
    
    return { scr, hcp };
  },
  
  /**
   * Formatear fecha
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    return date.toLocaleDateString('es-ES', options);
  },
  
  /**
   * Formatear fecha corta
   */
  formatDateShort(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    };
    
    return date.toLocaleDateString('es-ES', options);
  },
  
  /**
   * Obtener fecha de hoy en formato YYYY-MM-DD
   */
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  },
  
  /**
   * Generar ID único
   */
  generateId() {
    return crypto.randomUUID();
  },
  
  /**
   * Mostrar toast/notificación
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Estilos inline
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      zIndex: '9999',
      animation: 'slideUp 0.3s ease',
      maxWidth: '90%',
      textAlign: 'center'
    });
    
    // Colores según tipo
    const colors = {
      success: { bg: '#10b981', color: 'white' },
      error: { bg: '#ef4444', color: 'white' },
      warning: { bg: '#f59e0b', color: 'white' },
      info: { bg: '#3b82f6', color: 'white' }
    };
    
    toast.style.backgroundColor = colors[type].bg;
    toast.style.color = colors[type].color;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
  
  /**
   * Confirmar acción
   */
  async confirm(message) {
    return new Promise((resolve) => {
      const result = window.confirm(message);
      resolve(result);
    });
  },
  
  /**
   * Validar email
   */
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },
  
  /**
   * Debounce
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
   * Obtener color según rendimiento
   */
  getPerformanceColor(points, type = 'scr') {
    if (type === 'scr') {
      if (points >= 4) return 'eagle';       // Eagle o mejor
      if (points === 3) return 'birdie';     // Birdie
      if (points === 2) return 'par';        // Par
      if (points === 1) return 'bogey';      // Bogey
      return 'double-bogey';                 // Doble bogey o peor
    }
    
    // Para HCP es similar
    if (points >= 4) return 'eagle';
    if (points === 3) return 'birdie';
    if (points === 2) return 'par';
    if (points === 1) return 'bogey';
    return 'double-bogey';
  },
  
  /**
   * Scroll suave a elemento
   */
  scrollTo(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  },
  
  /**
   * Sanitizar HTML
   */
  sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  },
  
  /**
   * Copiar al portapapeles
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      Utils.showToast('Copiado al portapapeles', 'success');
      return true;
    } catch (err) {
      console.error('Error al copiar:', err);
      Utils.showToast('Error al copiar', 'error');
      return false;
    }
  },
  
  /**
   * Detectar si es móvil
   */
  isMobile() {
    return window.innerWidth < 768;
  },
  
  /**
   * Formatear número con separador de miles
   */
  formatNumber(num) {
    return new Intl.NumberFormat('es-ES').format(num);
  }
};

// Estilos para animaciones de toast
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  @keyframes slideDown {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
  }
`;
document.head.appendChild(style);

// Exportar
window.Utils = Utils;

console.log('✅ Utils cargado');
