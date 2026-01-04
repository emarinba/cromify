/**
 * admin-ui.js - Interfaz de Administrador
 * Gestión de álbumes maestros, cromos y categorías
 */

const AdminUI = {
  currentAlbumId: null,
  currentCards: [],
  currentCategories: [],

  /**
   * Mostrar dashboard de admin
   */
  async showDashboard() {
    try {
      Utils.showLoader();
      Utils.showView('viewAdminDashboard');
      
      const albums = await API.getAlbums();
      this.renderAdminAlbumsList(albums);
      
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
      Utils.showToast('Error al cargar dashboard', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Renderizar lista de álbumes para admin
   */
  renderAdminAlbumsList(albums) {
    UI.renderAlbumsList(albums, '#adminAlbumsGrid', (album) => {
      return `
        <div class="album-card admin-album-card" data-id="${album.id}">
          <div class="album-card-header" style="background: ${album.color};">
            <h3>${Utils.escapeHtml(album.name)}</h3>
            <div class="album-actions">
              <button class="btn-icon btn-edit-album" data-id="${album.id}" title="Editar">
                <i data-lucide="edit-2"></i>
              </button>
              <button class="btn-icon btn-delete-album" data-id="${album.id}" title="Eliminar">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
          <div class="album-card-body">
            <div class="album-info">
              ${album.season ? `<span><i data-lucide="calendar"></i> ${Utils.escapeHtml(album.season)}</span>` : ''}
              ${album.competition ? `<span><i data-lucide="trophy"></i> ${Utils.escapeHtml(album.competition)}</span>` : ''}
            </div>
            <button class="btn btn-primary btn-manage-album" data-id="${album.id}">
              <i data-lucide="settings"></i>
              Gestionar Cromos
            </button>
          </div>
        </div>
      `;
    });

    this.setupAdminAlbumsListeners();
  },

  /**
   * Configurar listeners de la lista de álbumes admin
   */
  setupAdminAlbumsListeners() {
    // Botón crear álbum
    const btnNew = document.getElementById('btnNewAlbum');
    if (btnNew) {
      btnNew.replaceWith(btnNew.cloneNode(true));
      document.getElementById('btnNewAlbum').addEventListener('click', () => {
        this.openAlbumModal();
      });
    }

    // Botones de editar
    document.querySelectorAll('.btn-edit-album').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const albumId = btn.dataset.id;
        this.openAlbumModal(albumId);
      });
    });

    // Botones de eliminar
    document.querySelectorAll('.btn-delete-album').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const albumId = btn.dataset.id;
        await this.deleteAlbum(albumId);
      });
    });

    // Botones de gestionar
    document.querySelectorAll('.btn-manage-album').forEach(btn => {
      btn.addEventListener('click', () => {
        const albumId = btn.dataset.id;
        this.openAlbumManager(albumId);
      });
    });
  },

  /**
   * Abrir modal de álbum (crear/editar)
   */
  async openAlbumModal(albumId = null) {
    const modal = document.getElementById('modalAlbum');
    const form = document.getElementById('formAlbum');
    const title = document.getElementById('modalAlbumTitle');
    
    if (albumId) {
      // Editar
      try {
        Utils.showLoader();
        const album = await API.getAlbum(albumId);
        
        title.textContent = 'Editar Álbum';
        document.getElementById('albumName').value = album.name;
        document.getElementById('albumSeason').value = album.season || '';
        document.getElementById('albumCompetition').value = album.competition || '';
        document.getElementById('albumColor').value = album.color || '#10B981';
        
        form.dataset.albumId = albumId;
      } catch (error) {
        Utils.showToast('Error al cargar álbum', 'error');
        return;
      } finally {
        Utils.hideLoader();
      }
    } else {
      // Crear
      title.textContent = 'Nuevo Álbum';
      form.reset();
      form.dataset.albumId = '';
      document.getElementById('albumColor').value = Utils.randomColor();
    }

    Utils.openModal('modalAlbum');
  },

  /**
   * Guardar álbum
   */
  async saveAlbum(e) {
    e.preventDefault();
    
    const form = e.target;
    const albumId = form.dataset.albumId;
    
    const albumData = {
      name: document.getElementById('albumName').value.trim(),
      season: document.getElementById('albumSeason').value.trim(),
      competition: document.getElementById('albumCompetition').value.trim(),
      color: document.getElementById('albumColor').value
    };

    try {
      Utils.showLoader();
      
      if (albumId) {
        await API.updateAlbum(albumId, albumData);
        Utils.showToast('Álbum actualizado', 'success');
      } else {
        const newAlbum = await API.createAlbum(albumData);
        // Crear categoría básica automáticamente
        await API.createCategory(newAlbum.id, {
          name: 'Básica',
          color: '#10B981',
          is_basic: true
        });
        Utils.showToast('Álbum creado', 'success');
      }
      
      Utils.closeModal('modalAlbum');
      this.showDashboard();
      
    } catch (error) {
      console.error('Error saving album:', error);
      Utils.showToast('Error al guardar álbum', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Eliminar álbum
   */
  async deleteAlbum(albumId) {
    if (!Utils.confirm('¿Eliminar este álbum? Se eliminarán todos los cromos y colecciones de usuarios.')) {
      return;
    }

    try {
      Utils.showLoader();
      await API.deleteAlbum(albumId);
      Utils.showToast('Álbum eliminado', 'success');
      this.showDashboard();
    } catch (error) {
      console.error('Error deleting album:', error);
      Utils.showToast('Error al eliminar álbum', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Abrir gestor de álbum (cromos y categorías)
   */
  async openAlbumManager(albumId) {
    try {
      Utils.showLoader();
      this.currentAlbumId = albumId;
      
      // Cargar álbum, cromos y categorías
      const [album, cards, categories] = await Promise.all([
        API.getAlbum(albumId),
        API.getMasterCards(albumId),
        API.getCategories(albumId)
      ]);
      
      this.currentCards = cards;
      this.currentCategories = categories;
      
      // Mostrar vista
      Utils.showView('viewAlbumManager');
      
      // Renderizar
      document.getElementById('albumManagerTitle').textContent = album.name;
      this.renderCategories();
      this.renderMasterCards();
      this.setupAlbumManagerListeners();
      
    } catch (error) {
      console.error('Error opening album manager:', error);
      Utils.showToast('Error al abrir gestor', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Renderizar categorías
   */
  renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;

    if (this.currentCategories.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay categorías</p>';
      return;
    }

    container.innerHTML = this.currentCategories.map(cat => `
      <div class="category-item" data-id="${cat.id}">
        <span class="category-color" style="background: ${cat.color};"></span>
        <span class="category-name">${Utils.escapeHtml(cat.name)}</span>
        ${!cat.is_basic ? `
          <button class="btn-icon btn-delete-category" data-id="${cat.id}">
            <i data-lucide="x"></i>
          </button>
        ` : ''}
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar cromos maestros
   */
  renderMasterCards() {
    const container = document.getElementById('masterCardsList');
    if (!container) return;

    if (this.currentCards.length === 0) {
      UI.showEmptyState('inbox', 'Sin cromos', 'Añade cromos a este álbum', '#masterCardsList');
      return;
    }

    const sortedCards = Utils.sortCards(this.currentCards);
    
    container.innerHTML = `
      <div class="cards-grid-compact">
        ${sortedCards.map(card => `
          <div class="card-item-compact" data-id="${card.id}">
            <div class="card-number">${Utils.escapeHtml(card.number)}</div>
            <div class="card-info">
              <div class="card-name">${Utils.escapeHtml(card.player_name)}</div>
              <div class="card-meta">${Utils.escapeHtml(card.team || '')}</div>
            </div>
            <div class="card-actions">
              <button class="btn-icon btn-edit-card" data-id="${card.id}">
                <i data-lucide="edit-2"></i>
              </button>
              <button class="btn-icon btn-delete-card" data-id="${card.id}">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Configurar listeners del gestor de álbum
   */
  setupAlbumManagerListeners() {
    // Botón volver
    const btnBack = document.getElementById('btnBackToAlbums');
    if (btnBack) {
      btnBack.replaceWith(btnBack.cloneNode(true));
      document.getElementById('btnBackToAlbums').addEventListener('click', () => {
        this.showDashboard();
      });
    }

    // Botón nueva categoría
    const btnNewCat = document.getElementById('btnNewCategory');
    if (btnNewCat) {
      btnNewCat.replaceWith(btnNewCat.cloneNode(true));
      document.getElementById('btnNewCategory').addEventListener('click', () => {
        this.openCategoryModal();
      });
    }

    // Botón nuevo cromo
    const btnNewCard = document.getElementById('btnNewCard');
    if (btnNewCard) {
      btnNewCard.replaceWith(btnNewCard.cloneNode(true));
      document.getElementById('btnNewCard').addEventListener('click', () => {
        this.openCardModal();
      });
    }

    // Botón importar
    const btnImport = document.getElementById('btnImportCards');
    if (btnImport) {
      btnImport.replaceWith(btnImport.cloneNode(true));
      document.getElementById('btnImportCards').addEventListener('click', () => {
        Utils.openModal('modalImport');
      });
    }

    // Eliminar categoría
    document.querySelectorAll('.btn-delete-category').forEach(btn => {
      btn.addEventListener('click', async () => {
        const catId = btn.dataset.id;
        await this.deleteCategory(catId);
      });
    });

    // Editar cromo
    document.querySelectorAll('.btn-edit-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const cardId = btn.dataset.id;
        this.openCardModal(cardId);
      });
    });

    // Eliminar cromo
    document.querySelectorAll('.btn-delete-card').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cardId = btn.dataset.id;
        await this.deleteCard(cardId);
      });
    });
  },

  /**
   * Abrir modal de categoría
   */
  openCategoryModal() {
    const form = document.getElementById('formCategory');
    form.reset();
    document.getElementById('categoryColor').value = Utils.randomColor();
    Utils.openModal('modalCategory');
  },

  /**
   * Guardar categoría
   */
  async saveCategory(e) {
    e.preventDefault();
    
    const categoryData = {
      name: document.getElementById('categoryName').value.trim(),
      color: document.getElementById('categoryColor').value
    };

    try {
      Utils.showLoader();
      await API.createCategory(this.currentAlbumId, categoryData);
      Utils.closeModal('modalCategory');
      Utils.showToast('Categoría creada', 'success');
      
      // Recargar categorías
      this.currentCategories = await API.getCategories(this.currentAlbumId);
      this.renderCategories();
      
    } catch (error) {
      console.error('Error saving category:', error);
      Utils.showToast('Error al guardar categoría', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Eliminar categoría
   */
  async deleteCategory(categoryId) {
    if (!Utils.confirm('¿Eliminar esta categoría?')) return;

    try {
      Utils.showLoader();
      await API.deleteCategory(categoryId);
      Utils.showToast('Categoría eliminada', 'success');
      
      this.currentCategories = await API.getCategories(this.currentAlbumId);
      this.renderCategories();
      
    } catch (error) {
      console.error('Error deleting category:', error);
      Utils.showToast('Error al eliminar categoría', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Abrir modal de cromo
   */
  async openCardModal(cardId = null) {
    const modal = document.getElementById('modalCard');
    const form = document.getElementById('formCard');
    const title = document.getElementById('modalCardTitle');
    
    // Llenar selector de categorías
    const categorySelect = document.getElementById('cardCategory');
    categorySelect.innerHTML = this.currentCategories.map(cat => 
      `<option value="${cat.id}">${Utils.escapeHtml(cat.name)}</option>`
    ).join('');

    if (cardId) {
      // Editar
      const card = this.currentCards.find(c => c.id === cardId);
      if (!card) return;

      title.textContent = 'Editar Cromo';
      document.getElementById('cardNumber').value = card.number;
      document.getElementById('cardPlayer').value = card.player_name;
      document.getElementById('cardTeam').value = card.team || '';
      document.getElementById('cardCategory').value = card.category_id || '';
      
      form.dataset.cardId = cardId;
    } else {
      // Crear
      title.textContent = 'Nuevo Cromo';
      form.reset();
      form.dataset.cardId = '';
      document.getElementById('cardNumber').value = Utils.getNextCardNumber(this.currentCards);
    }

    Utils.openModal('modalCard');
  },

  /**
   * Guardar cromo
   */
  async saveCard(e) {
    e.preventDefault();
    
    const form = e.target;
    const cardId = form.dataset.cardId;
    
    const cardData = {
      album_id: this.currentAlbumId,
      number: document.getElementById('cardNumber').value.trim(),
      player_name: document.getElementById('cardPlayer').value.trim(),
      team: document.getElementById('cardTeam').value.trim(),
      category_id: document.getElementById('cardCategory').value || null
    };

    try {
      Utils.showLoader();
      
      if (cardId) {
        await API.updateMasterCard(cardId, cardData);
        Utils.showToast('Cromo actualizado', 'success');
      } else {
        await API.createMasterCard(cardData);
        Utils.showToast('Cromo creado', 'success');
      }
      
      Utils.closeModal('modalCard');
      
      // Recargar cromos
      this.currentCards = await API.getMasterCards(this.currentAlbumId);
      this.renderMasterCards();
      this.setupAlbumManagerListeners();
      
    } catch (error) {
      console.error('Error saving card:', error);
      Utils.showToast('Error al guardar cromo', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Eliminar cromo
   */
  async deleteCard(cardId) {
    if (!Utils.confirm('¿Eliminar este cromo?')) return;

    try {
      Utils.showLoader();
      await API.deleteMasterCard(cardId);
      Utils.showToast('Cromo eliminado', 'success');
      
      this.currentCards = await API.getMasterCards(this.currentAlbumId);
      this.renderMasterCards();
      this.setupAlbumManagerListeners();
      
    } catch (error) {
      console.error('Error deleting card:', error);
      Utils.showToast('Error al eliminar cromo', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Procesar importación de cromos
   */
  async processImport(e) {
    e.preventDefault();
    
    const format = document.getElementById('importFormat').value;
    const file = document.getElementById('importFile').files[0];
    const text = document.getElementById('importText').value;
    
    let content = text;
    if (file) {
      content = await file.text();
    }
    
    if (!content) {
      Utils.showToast('Proporciona un archivo o texto', 'warning');
      return;
    }

    try {
      Utils.showLoader();
      
      let cards = [];
      
      if (format === 'csv') {
        const lines = content.split('\n').filter(l => l.trim());
        if (lines[0].includes('number') || lines[0].includes('número')) {
          lines.shift(); // Quitar header
        }
        
        const basicCategory = this.currentCategories.find(c => c.is_basic);
        
        cards = lines.map(line => {
          const parts = line.split(',').map(p => p.trim());
          return {
            number: parts[0],
            player_name: parts[1],
            team: parts[2] || '',
            category_id: parts[3] || (basicCategory ? basicCategory.id : null)
          };
        }).filter(c => c.number && c.player_name);
      }
      
      if (cards.length === 0) {
        Utils.showToast('No se encontraron cromos válidos', 'warning');
        return;
      }
      
      await API.importMasterCards(this.currentAlbumId, cards);
      Utils.showToast(`${cards.length} cromos importados`, 'success');
      Utils.closeModal('modalImport');
      
      // Recargar
      this.currentCards = await API.getMasterCards(this.currentAlbumId);
      this.renderMasterCards();
      this.setupAlbumManagerListeners();
      
    } catch (error) {
      console.error('Error importing:', error);
      Utils.showToast('Error al importar: ' + error.message, 'error');
    } finally {
      Utils.hideLoader();
    }
  }
};
