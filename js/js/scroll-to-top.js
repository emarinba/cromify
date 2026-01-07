/**
 * scroll-to-top.js - Botón flotante para volver arriba
 */

const ScrollToTop = {
  button: null,
  
  /**
   * Inicializar botón
   */
  init() {
    // Crear botón si no existe
    if (!this.button) {
      this.button = document.createElement('button');
      this.button.id = 'scrollToTopBtn';
      this.button.className = 'scroll-to-top-btn';
      this.button.innerHTML = '<i data-lucide="arrow-up"></i>';
      this.button.title = 'Volver arriba';
      this.button.setAttribute('aria-label', 'Volver arriba');
      document.body.appendChild(this.button);
      
      // Event listener
      this.button.addEventListener('click', () => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
      
      // Inicializar icono
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
    
    // Listener de scroll
    window.addEventListener('scroll', () => this.handleScroll());
    
    // Check inicial
    this.handleScroll();
    
    console.log('✅ Scroll to top inicializado');
  },
  
  /**
   * Manejar scroll
   */
  handleScroll() {
    if (!this.button) return;
    
    // Mostrar botón si scroll > 300px
    if (window.scrollY > 300) {
      this.button.classList.add('visible');
    } else {
      this.button.classList.remove('visible');
    }
  },
  
  /**
   * Destruir (si es necesario)
   */
  destroy() {
    if (this.button) {
      this.button.remove();
      this.button = null;
    }
  }
};

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ScrollToTop.init());
} else {
  ScrollToTop.init();
}
