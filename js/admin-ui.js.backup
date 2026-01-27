/**
 * admin-ui.js - Interfaz de Administrador MEJORADA
 * Ahora con agrupaciones igual que el usuario
 */

const AdminUI = {
  currentAlbumId: null,
  currentCards: [],
  currentCategories: [],
  viewMode: 'album',

  /**
   * Mostrar dashboard de admin
   */
  async showDashboard() {
    try {
      Utils.showLoader();
      Utils.showView('viewAdminDashboard');
      
      const albums = await API.getAlbums();
      this.renderAdminAlbumsList(albums);
      this.setupDashboardButtons();
      
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
      Utils.showToast('Error al cargar dashboard', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Configurar botones del dashboard
   */
  setupDashboardButtons() {
    const btnAnalytics = document.getElementById('btnViewAnalytics');
    if (btnAnalytics) {
      const newBtn = btnAnalytics.cloneNode(true);
      btnAnalytics.replaceWith(newBtn);
      newBtn.addEventListener('click', () => AnalyticsUI.showAnalyticsDashboard());
    }
  },

  /**
   * Renderizar lista de álbumes para admin
   */
  renderAdminAlbumsList(albums) {
    UI.renderAlbumsList(albums, '#adminAlbumsGrid', (album) => {
      const albumColor = album.category?.color || album.color || '#ED8936';
      return `
        <div class="album-card admin-album-card" data-id="${album.id}" style="--album-color: ${albumColor};">
          <h3>${Utils.escapeHtml(album.name)}</h3>
          <div class="album-info">
            ${album.season ? `<span><i data-lucide="calendar"></i> ${Utils.escapeHtml(album.season)}</span>` : ''}
            ${album.competition ? `<span><i data-lucide="trophy"></i> ${Utils.escapeHtml(album.competition)}</span>` : ''}
          </div>
          <div class="album-actions">
            <button class="btn btn-primary btn-manage-album" data-album-id="${album.id}">
              <i data-lucide="settings"></i>
              Gestionar Cromos
            </button>
            <button class="btn-icon btn-edit-album" data-album-id="${album.id}" title="Editar">
              <i data-lucide="edit-2"></i>
            </button>
            <button class="btn-icon btn-delete-album" data-album-id="${album.id}" title="Eliminar">
              <i data-lucide="trash-2"></i>
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
    const btnNew = document.getElementById('btnNewAlbum');
    if (btnNew) {
      const newBtn = btnNew.cloneNode(true);
      btnNew.replaceWith(newBtn);
      newBtn.addEventListener('click', () => this.openAlbumModal());
    }

    document.querySelectorAll('.btn-edit-album').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openAlbumModal(btn.dataset.albumId);
      });
    });

    document.querySelectorAll('.btn-delete-album').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.deleteAlbum(btn.dataset.albumId);
      });
    });

    document.querySelectorAll('.btn-manage-album').forEach(btn => {
      btn.addEventListener('click', () => this.openAlbumManager(btn.dataset.albumId));
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
   * Abrir gestor de álbum (cromos y categorías) - CON AGRUPACIONES
   */
  async openAlbumManager(albumId) {
    try {
      Utils.showLoader();
      this.currentAlbumId = albumId;
      
      const [album, cards, categories] = await Promise.all([
        API.getAlbum(albumId),
        API.getMasterCards(albumId),
        API.getCategories(albumId)
      ]);
      
      this.currentCards = cards;
      this.currentCategories = categories;
      
      // Setear color del álbum
      const albumColor = album.color || '#ED8936';
      document.documentElement.style.setProperty('--album-color', albumColor);
      
      Utils.showView('viewAlbumManager');
      
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
          <button class="btn-icon btn-delete-category" data-category-id="${cat.id}">
            <i data-lucide="x"></i>
          </button>
        ` : ''}
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar cromos maestros CON AGRUPACIONES (igual que usuario)
   */
  renderMasterCards() {
    const container = document.getElementById('masterCardsList');
    if (!container) return;

    if (this.currentCards.length === 0) {
      UI.showEmptyState('inbox', 'Sin cromos', 'Añade cromos a este álbum', '#masterCardsList');
      return;
    }

    // Convertir master_cards a formato compatible con CardGroups
    const cardsForGrouping = this.currentCards.map(card => ({
      id: card.id,
      number: card.number,
      playerName: card.player_name,
      team: card.team,
      categoryId: card.category_id,
      category: card.category,
      status: 'admin' // Los cromos maestros no tienen estado
    }));

    // Agrupar igual que en usuario
    const groups = CardGroups.group(cardsForGrouping, this.currentCategories);

    if (groups.length === 0) {
      container.innerHTML = '<div class="empty-state"><i data-lucide="inbox"></i><p>No hay cromos</p></div>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // Renderizar con sistema de grupos (vista álbum siempre para admin)
    container.innerHTML = CardGroups.render(groups, (card) => this.renderMasterCard(card), this.viewMode);

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar un cromo maestro individual
   */
  renderMasterCard(card) {
    return `
      <div class="card-admin-item" data-id="${card.id}">
        <div class="card-admin-number">${Utils.escapeHtml(card.number)}</div>
        <div class="card-admin-content">
          <div class="card-admin-name">${Utils.escapeHtml(card.playerName)}</div>
          <div class="card-admin-team">${Utils.escapeHtml(card.team || '')}</div>
          ${card.category ? `
            <div class="card-admin-category" style="color: ${card.category.color}">
              ${Utils.escapeHtml(card.category.name)}
            </div>
          ` : ''}
        </div>
        <div class="card-admin-actions">
          <button class="btn-icon-small btn-edit-card" data-card-id="${card.id}" title="Editar">
            <i data-lucide="edit-2"></i>
          </button>
          <button class="btn-icon-small btn-delete-card" data-card-id="${card.id}" title="Eliminar">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Configurar listeners del gestor de álbum
   */
  setupAlbumManagerListeners() {
    const btnBack = document.getElementById('btnBackToAlbums');
    if (btnBack) {
      const newBtn = btnBack.cloneNode(true);
      btnBack.replaceWith(newBtn);
      newBtn.addEventListener('click', () => this.showDashboard());
    }

    const btnNewCat = document.getElementById('btnNewCategory');
    if (btnNewCat) {
      const newBtn = btnNewCat.cloneNode(true);
      btnNewCat.replaceWith(newBtn);
      newBtn.addEventListener('click', () => this.openCategoryModal());
    }

    const btnNewCard = document.getElementById('btnNewCard');
    if (btnNewCard) {
      const newBtn = btnNewCard.cloneNode(true);
      btnNewCard.replaceWith(newBtn);
      newBtn.addEventListener('click', () => this.openCardModal());
    }

    const btnImport = document.getElementById('btnImportCards');
    if (btnImport) {
      const newBtn = btnImport.cloneNode(true);
      btnImport.replaceWith(newBtn);
      newBtn.addEventListener('click', () => Utils.openModal('modalImport'));
    }

    // Botón cambio masivo de categorías
    const btnBulkCategory = document.getElementById('btnBulkCategory');
    if (btnBulkCategory) {
      const newBtn = btnBulkCategory.cloneNode(true);
      btnBulkCategory.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        BulkActions.openBulkCategoryModal(this.currentAlbumId, this.currentCategories);
      });
    }

    // Botón cambiar vista (opcional para admin)
    const btnToggleView = document.getElementById('btnToggleViewAdmin');
    if (btnToggleView) {
      const newBtn = btnToggleView.cloneNode(true);
      btnToggleView.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        this.viewMode = this.viewMode === 'album' ? 'list' : 'album';
        this.renderMasterCards();
        this.setupAlbumManagerListeners();
      });
    }

    document.querySelectorAll('.btn-delete-category').forEach(btn => {
      btn.addEventListener('click', async () => {
        await this.deleteCategory(btn.dataset.categoryId);
      });
    });

    // DELEGACIÓN: Eventos de grupos y cromos
    this.setupMasterCardsListeners();
  },

  /**
   * Setup listeners del contenedor de cromos maestros (DELEGACIÓN)
   */
  setupMasterCardsListeners() {
    const container = document.getElementById('masterCardsList');
    if (!container) return;

    const newContainer = container.cloneNode(true);
    container.replaceWith(newContainer);

    newContainer.addEventListener('click', async (e) => {
      // Acciones de grupos
      const groupAction = e.target.closest('[data-group-action]');
      if (groupAction) {
        e.preventDefault();
        const action = groupAction.dataset.groupAction;
        const groupKey = groupAction.dataset.groupKey;

        if (action === 'toggle' && groupKey) {
          CardGroups.toggle(groupKey);
          this.renderMasterCards();
          this.setupMasterCardsListeners();
        } else if (action === 'expand-all') {
          const allKeys = Array.from(document.querySelectorAll('[data-group-key]'))
            .map(el => el.dataset.groupKey)
            .filter(Boolean);
          CardGroups.expandAll(allKeys);
          this.renderMasterCards();
          this.setupMasterCardsListeners();
        } else if (action === 'collapse-all') {
          CardGroups.collapseAll();
          this.renderMasterCards();
          this.setupMasterCardsListeners();
        }
        return;
      }

      // Editar cromo
      const editBtn = e.target.closest('.btn-edit-card');
      if (editBtn) {
        this.openCardModal(editBtn.dataset.cardId);
        return;
      }

      // Eliminar cromo
      const deleteBtn = e.target.closest('.btn-delete-card');
      if (deleteBtn) {
        await this.deleteCard(deleteBtn.dataset.cardId);
        return;
      }
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
      
      this.currentCategories = await API.getCategories(this.currentAlbumId);
      this.renderCategories();
      this.renderMasterCards();
      this.setupAlbumManagerListeners();
      
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
      this.renderMasterCards();
      this.setupAlbumManagerListeners();
      
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
    
    const categorySelect = document.getElementById('cardCategory');
    categorySelect.innerHTML = this.currentCategories.map(cat => 
      `<option value="${cat.id}">${Utils.escapeHtml(cat.name)}</option>`
    ).join('');

    if (cardId) {
      const card = this.currentCards.find(c => c.id === cardId);
      if (!card) return;

      title.textContent = 'Editar Cromo';
      document.getElementById('cardNumber').value = card.number;
      document.getElementById('cardPlayer').value = card.player_name;
      document.getElementById('cardTeam').value = card.team || '';
      document.getElementById('cardCategory').value = card.category_id || '';
      
      form.dataset.cardId = cardId;
    } else {
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
          lines.shift();
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
