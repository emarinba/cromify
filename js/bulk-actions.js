/**
 * bulk-actions.js - Acciones Masivas para Admin
 * Cambio masivo de categorías y otras operaciones en lote
 */

const BulkActions = {
  currentAlbumId: null,
  currentCategories: [],

  /**
   * Abrir modal de cambio masivo de categoría
   */
  openBulkCategoryModal(albumId, categories) {
    this.currentAlbumId = albumId;
    this.currentCategories = categories;

    // Poblar select de categorías
    const select = document.getElementById('bulkCategorySelect');
    select.innerHTML = '<option value="">Selecciona una categoría</option>' +
      categories.map(cat => `
        <option value="${cat.id}">${Utils.escapeHtml(cat.name)}</option>
      `).join('');

    // Limpiar campos
    document.getElementById('bulkFromNumber').value = '';
    document.getElementById('bulkToNumber').value = '';
    
    Utils.openModal('modalBulkCategory');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Procesar cambio masivo de categoría
   */
  async processBulkCategoryChange(e) {
    e.preventDefault();

    const fromNumber = document.getElementById('bulkFromNumber').value.trim();
    const toNumber = document.getElementById('bulkToNumber').value.trim();
    const categoryId = document.getElementById('bulkCategorySelect').value;

    if (!fromNumber || !toNumber || !categoryId) {
      Utils.showToast('Completa todos los campos', 'warning');
      return;
    }

    const category = this.currentCategories.find(c => c.id === categoryId);
    if (!category) {
      Utils.showToast('Categoría no encontrada', 'error');
      return;
    }

    const confirmMsg = `¿Cambiar categoría de cromos ${fromNumber} al ${toNumber} a "${category.name}"?`;
    if (!Utils.confirm(confirmMsg)) {
      return;
    }

    try {
      Utils.showLoader();

      // Obtener cromos en el rango
      const cards = await API.getMasterCards(this.currentAlbumId);
      const cardsInRange = cards.filter(card => {
        const num = this.normalizeNumber(card.number);
        const from = this.normalizeNumber(fromNumber);
        const to = this.normalizeNumber(toNumber);
        return num >= from && num <= to;
      });

      if (cardsInRange.length === 0) {
        Utils.showToast('No se encontraron cromos en ese rango', 'warning');
        return;
      }

      // Actualizar cada cromo
      const promises = cardsInRange.map(card =>
        API.updateMasterCard(card.id, { category_id: categoryId })
      );

      await Promise.all(promises);

      Utils.showToast(`${cardsInRange.length} cromos actualizados`, 'success');
      Utils.closeModal('modalBulkCategory');

      // Recargar vista si estamos en admin
      if (window.AdminUI && window.AdminUI.currentAlbumId) {
        await window.AdminUI.openAlbumManager(window.AdminUI.currentAlbumId);
      }

    } catch (error) {
      console.error('Error en cambio masivo:', error);
      Utils.showToast('Error al aplicar cambios', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Normalizar número de cromo para comparación
   * Convierte "10", "010", "10A" a un valor comparable
   */
  normalizeNumber(number) {
    // Extraer solo dígitos
    const digits = number.match(/\d+/);
    if (!digits) return 0;
    return parseInt(digits[0], 10);
  },

  /**
   * Setup listeners para el modal
   */
  setupListeners() {
    const form = document.getElementById('formBulkCategory');
    if (form) {
      const newForm = form.cloneNode(true);
      form.replaceWith(newForm);
      
      newForm.addEventListener('submit', (e) => this.processBulkCategoryChange(e));
    }
  }
};

// Setup inicial
document.addEventListener('DOMContentLoaded', () => {
  BulkActions.setupListeners();
});
