/**
 * user-ui.js - Interfaz de Usuario REFACTORIZADA
 * Sistema unificado y consistente de eventos
 */

const UserUI = {
  currentCollectionId: null,
  currentAlbumId: null, // Necesario para sincronización
  currentCards: [],
  currentCategories: [],
  viewMode: 'album',
  filters: { search: '', category: '', status: '' },

  /**
   * Mostrar dashboard de usuario
   */
  async showDashboard() {
    try {
      Utils.showLoader();
      
      // Desuscribirse de sincronización en tiempo real al salir de colección
      if (RealtimeSync.isActive()) {
        RealtimeSync.unsubscribeAll();
      }
      
      // Resetear estado de grupos
      CardGroups.reset();
      
      Utils.showView('viewUserDashboard');
      
      const [stats, collections, albums] = await Promise.all([
        API.getUserStats(),
        API.getUserCollections(),
        API.getAlbums()
      ]);
      
      this.renderUserStats(stats);
      this.renderMyCollections(collections);
      this.renderAvailableAlbums(albums, collections);
      this.setupDashboardListeners();
      
    } catch (error) {
      console.error('Error loading user dashboard:', error);
      Utils.showToast('Error al cargar dashboard', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Renderizar estadísticas de usuario
   */
  renderUserStats(stats) {
    const container = document.getElementById('userStatsContainer');
    if (!container || !stats) return;

    const avgProgress = stats.total_collections > 0 
      ? Math.round((stats.total_cards_owned / (stats.total_cards_available || 1)) * 100)
      : 0;

    container.innerHTML = `
      <div class="stats-dashboard">
        <div class="stat-box">
          <i data-lucide="book-open" class="stat-icon"></i>
          <div class="stat-content">
            <span class="stat-value">${stats.total_collections || 0}</span>
            <span class="stat-label">Álbumes</span>
          </div>
        </div>

        <div class="stat-box">
          <i data-lucide="layers" class="stat-icon"></i>
          <div class="stat-content">
            <span class="stat-value">${stats.total_cards_owned || 0}</span>
            <span class="stat-label">Cromos Totales</span>
          </div>
        </div>

        <div class="stat-box">
          <i data-lucide="trending-up" class="stat-icon"></i>
          <div class="stat-content">
            <span class="stat-value">${avgProgress}%</span>
            <span class="stat-label">Progreso Medio</span>
          </div>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar mis colecciones
   */
  renderMyCollections(collections) {
    const container = document.getElementById('myCollectionsList');
    if (!container) return;

    if (collections.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <p>No tienes colecciones aún. Únete a un álbum para empezar.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = collections.map(col => `
      <div class="collection-card" data-id="${col.id}">
        <div class="collection-header" style="background: ${col.album.color};">
          <h4>${Utils.escapeHtml(col.album.name)}</h4>
          <button class="btn-icon btn-leave-collection" 
                  data-collection-id="${col.id}" 
                  data-album-name="${Utils.escapeHtml(col.album.name)}"
                  title="Desunirse de este álbum">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="collection-body">
          <div class="collection-info">
            <span><i data-lucide="calendar"></i> ${Utils.formatDateShort(col.joined_at)}</span>
          </div>
          <div class="collection-actions">
            <button class="btn btn-primary btn-open-collection" data-collection-id="${col.id}">
              <i data-lucide="folder-open"></i>
              Ver Colección
            </button>
          </div>
        </div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar álbumes disponibles
   */
  renderAvailableAlbums(albums, collections) {
    const container = document.getElementById('availableAlbumsList');
    if (!container) return;

    const collectionAlbumIds = new Set(collections.map(c => c.album_id));
    const availableAlbums = albums.filter(a => !collectionAlbumIds.has(a.id));

    if (availableAlbums.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <p>Ya estás en todos los álbumes disponibles.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = availableAlbums.map(album => `
      <div class="album-card" data-id="${album.id}">
        <div class="album-header" style="background: ${album.color};">
          <h4>${Utils.escapeHtml(album.name)}</h4>
        </div>
        <div class="album-body">
          <p>${Utils.escapeHtml(album.description || 'Descripción no disponible')}</p>
          <button class="btn btn-primary btn-join-album" data-album-id="${album.id}">
            <i data-lucide="plus-circle"></i>
            Unirse
          </button>
        </div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Setup listeners del dashboard (DELEGACIÓN DE EVENTOS)
   */
  setupDashboardListeners() {
    const myCollectionsList = document.getElementById('myCollectionsList');
    const availableAlbumsList = document.getElementById('availableAlbumsList');

    if (myCollectionsList) {
      const newList = myCollectionsList.cloneNode(true);
      myCollectionsList.replaceWith(newList);
      
      newList.addEventListener('click', async (e) => {
        // Botón abrir colección
        const btnOpen = e.target.closest('.btn-open-collection');
        if (btnOpen) {
          const collectionId = btnOpen.dataset.collectionId;
          await this.openCollection(collectionId);
          return;
        }

        // Botón desunirse
        const btnLeave = e.target.closest('.btn-leave-collection');
        if (btnLeave) {
          const collectionId = btnLeave.dataset.collectionId;
          const albumName = btnLeave.dataset.albumName;
          await this.leaveCollection(collectionId, albumName);
          return;
        }
      });
    }

    if (availableAlbumsList) {
      const newList = availableAlbumsList.cloneNode(true);
      availableAlbumsList.replaceWith(newList);
      
      newList.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-join-album');
        if (btn) {
          const albumId = btn.dataset.albumId;
          await this.joinAlbum(albumId);
        }
      });
    }
  },

  /**
   * Unirse a un álbum
   */
  async joinAlbum(albumId) {
    try {
      Utils.showLoader();
      await API.joinCollection(albumId);
      Utils.showToast('Te has unido al álbum', 'success');
      await this.showDashboard();
    } catch (error) {
      console.error('Error joining album:', error);
      Utils.showToast('Error al unirse al álbum', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Desunirse de un álbum
   */
  async leaveCollection(collectionId, albumName) {
    if (!Utils.confirm(`¿Desunirse de "${albumName}"? Se perderá todo tu progreso en este álbum.`)) {
      return;
    }

    try {
      Utils.showLoader();
      await API.leaveCollection(collectionId);
      Utils.showToast('Te has desunido del álbum', 'success');
      await this.showDashboard();
    } catch (error) {
      console.error('Error leaving collection:', error);
      Utils.showToast('Error al desunirse del álbum', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Abrir colección
   */
  async openCollection(collectionId) {
    try {
      Utils.showLoader();
      this.currentCollectionId = collectionId;
      
      const collection = await API.getCollection(collectionId);
      this.currentAlbumId = collection.album_id;
      
      const [cards, categories, stats] = await Promise.all([
        API.getUserCards(collectionId),
        API.getCategories(collection.album_id),
        API.getCollectionStats(collectionId)
      ]);
      
      this.currentCards = cards;
      this.currentCategories = categories;
      
      // Setear color del álbum
      const albumColor = collection.album.color || '#ED8936';
      document.documentElement.style.setProperty('--album-color', albumColor);
      
      // Mostrar vista
      Utils.showView('viewCollection');
      
      // Renderizar
      document.getElementById('collectionTitle').textContent = collection.album.name;
      UI.renderStats(stats, '#collectionStats');
      this.renderFilters();
      this.renderCards();
      
      // Setup listeners
      this.setupCollectionListeners();
      
      // 🔔 ACTIVAR SINCRONIZACIÓN EN TIEMPO REAL
      console.log('🔔 Activando sincronización en tiempo real para álbum:', collection.album_id);
      await RealtimeSync.subscribeToAlbum(collection.album_id, async () => {
        // Callback que se ejecuta cuando hay cambios
        await this.reloadCollectionDataSilently();
      });
      
      console.log('✅ Sincronización en tiempo real activa');
      
    } catch (error) {
      console.error('Error opening collection:', error);
      Utils.showToast('Error al abrir colección', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Renderizar filtros
   */
  renderFilters() {
    const container = document.getElementById('collectionFilters');
    if (!container) return;

    container.innerHTML = `
      <div class="filters-bar">
        <input 
          type="text" 
          id="filterSearch" 
          class="filter-input" 
          placeholder="Buscar por número o nombre..."
          value="${this.filters.search}">
        
        <select id="filterCategory" class="filter-select">
          <option value="">Todas las categorías</option>
          ${this.currentCategories.map(cat => `
            <option value="${cat.id}" ${this.filters.category === cat.id ? 'selected' : ''}>
              ${Utils.escapeHtml(cat.name)}
            </option>
          `).join('')}
        </select>
        
        <select id="filterStatus" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="tengo" ${this.filters.status === 'tengo' ? 'selected' : ''}>Lo tengo</option>
          <option value="falta" ${this.filters.status === 'falta' ? 'selected' : ''}>Me falta</option>
          <option value="cambiado" ${this.filters.status === 'cambiado' ? 'selected' : ''}>Cambiado</option>
        </select>
        
        <button id="btnReloadData" class="btn btn-secondary" title="Recargar datos del álbum">
          <i data-lucide="refresh-cw"></i>
          Actualizar
        </button>
        
        <button id="btnClearFilters" class="btn btn-secondary">
          <i data-lucide="x"></i>
          Limpiar
        </button>
        
        <button id="btnToggleView" class="btn btn-secondary">
          <i data-lucide="${this.viewMode === 'album' ? 'list' : 'grid'}"></i>
          ${this.viewMode === 'album' ? 'Vista Lista' : 'Vista Álbum'}
        </button>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar cromos con agrupaciones
   */
  renderCards() {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    // Aplicar filtros
    let filtered = [...this.currentCards];

    if (this.filters.search) {
      const s = this.filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.number.toLowerCase().includes(s) ||
        c.playerName.toLowerCase().includes(s)
      );
    }

    if (this.filters.category) {
      filtered = filtered.filter(c => c.categoryId === this.filters.category);
    }

    if (this.filters.status) {
      filtered = filtered.filter(c => c.status === this.filters.status);
    }

    // Agrupar cromos
    const groups = CardGroups.group(filtered, this.currentCategories);

    if (groups.length === 0) {
      container.innerHTML = '<div class="empty-state"><i data-lucide="inbox"></i><p>No hay cromos que mostrar</p></div>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // Renderizar con el modo de vista actual
    container.innerHTML = CardGroups.render(groups, (card) => this.renderCard(card), this.viewMode);

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar un cromo (vista álbum)
   */
  renderCard(card) {
    return `
      <div class="card-album-item status-${card.status}" data-id="${card.id}">
        <div class="album-side-btn left ${card.status === 'falta' ? 'active' : ''}" 
             data-card-action="status" data-card-id="${card.id}" data-status="falta">✗</div>
        
        <div class="album-card-content">
          <div class="album-card-number">${Utils.escapeHtml(card.number)}</div>
          <div class="album-card-name">${Utils.escapeHtml(card.playerName)}</div>
          <div class="album-card-team">${Utils.escapeHtml(card.team || '')}</div>
          ${card.category ? `
            <div class="album-card-category" style="color: ${card.category.color}">
              ${Utils.escapeHtml(card.category.name)}
            </div>
          ` : ''}
          
          <div class="album-bottom-controls">
            <button class="album-mini-btn ${card.status === 'cambiado' ? 'active' : ''}"
                    data-card-action="status" data-card-id="${card.id}" data-status="cambiado">⇄</button>
            <input type="number" class="mini-duplicates-input" 
                   value="${card.duplicates_count || 0}" min="0" 
                   data-card-action="duplicates" data-card-id="${card.id}"
                   ${card.status !== 'tengo' ? 'disabled' : ''}
                   placeholder="0">
          </div>
        </div>
        
        <div class="album-side-btn right ${card.status === 'tengo' ? 'active' : ''}" 
             data-card-action="status" data-card-id="${card.id}" data-status="tengo">✓</div>
      </div>
    `;
  },

  /**
   * Setup listeners de colección (SISTEMA UNIFICADO)
   */
  setupCollectionListeners() {
    // Botón volver
    const btnBack = document.getElementById('btnBackToDashboard');
    if (btnBack) {
      const newBtn = btnBack.cloneNode(true);
      btnBack.replaceWith(newBtn);
      newBtn.addEventListener('click', () => this.showDashboard());
    }

    // Botón mostrar faltantes
    const btnShowMissing = document.getElementById('btnShowMissing');
    if (btnShowMissing) {
      const newBtn = btnShowMissing.cloneNode(true);
      btnShowMissing.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        CardsLists.openMissingCardsModal(this.currentCards, this.currentCategories);
      });
    }

    // Botón mostrar repetidos
    const btnShowDuplicates = document.getElementById('btnShowDuplicates');
    if (btnShowDuplicates) {
      const newBtn = btnShowDuplicates.cloneNode(true);
      btnShowDuplicates.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        CardsLists.openDuplicateCardsModal(this.currentCards, this.currentCategories);
      });
    }

    // Botón recargar datos
    const btnReload = document.getElementById('btnReloadData');
    if (btnReload) {
      const newBtn = btnReload.cloneNode(true);
      btnReload.replaceWith(newBtn);
      newBtn.addEventListener('click', async () => {
        await this.reloadCollectionData();
      });
    }

    // Filtro de búsqueda con debounce
    const filterSearch = document.getElementById('filterSearch');
    if (filterSearch) {
      const newSearch = filterSearch.cloneNode(true);
      filterSearch.replaceWith(newSearch);
      newSearch.addEventListener('input', Utils.debounce((e) => {
        this.filters.search = e.target.value;
        this.renderCards();
      }, 300));
    }

    // Filtro de categoría
    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) {
      const newFilter = filterCategory.cloneNode(true);
      filterCategory.replaceWith(newFilter);
      newFilter.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.renderCards();
      });
    }

    // Filtro de estado
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
      const newFilter = filterStatus.cloneNode(true);
      filterStatus.replaceWith(newFilter);
      newFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.renderCards();
      });
    }

    // Botón limpiar filtros
    const btnClearFilters = document.getElementById('btnClearFilters');
    if (btnClearFilters) {
      const newBtn = btnClearFilters.cloneNode(true);
      btnClearFilters.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        this.filters = { search: '', category: '', status: '' };
        this.renderFilters();
        this.renderCards();
        this.setupCollectionListeners();
      });
    }

    // Botón cambiar vista
    const btnToggleView = document.getElementById('btnToggleView');
    if (btnToggleView) {
      const newBtn = btnToggleView.cloneNode(true);
      btnToggleView.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        this.viewMode = this.viewMode === 'album' ? 'list' : 'album';
        this.renderFilters();
        this.renderCards();
        this.setupCollectionListeners();
      });
    }

    // DELEGACIÓN: Eventos de cromos y grupos
    this.setupCardsContainerListeners();
  },

  /**
   * Recargar datos de la colección actual (silenciosamente, en background)
   * Usado por sincronización en tiempo real
   */
  async reloadCollectionDataSilently() {
    if (!this.currentCollectionId) return;

    try {
      console.log('🔄 Recargando datos en background...');
      
      const collection = await API.getCollection(this.currentCollectionId);
      
      const [cards, categories, stats] = await Promise.all([
        API.getUserCards(this.currentCollectionId),
        API.getCategories(collection.album_id),
        API.getCollectionStats(this.currentCollectionId)
      ]);
      
      this.currentCards = cards;
      this.currentCategories = categories;
      
      // Actualizar UI sin mostrar loader
      UI.renderStats(stats, '#collectionStats');
      this.renderCards();
      
      console.log('✅ Datos actualizados en background');
      
    } catch (error) {
      console.error('❌ Error recargando datos en background:', error);
      // No mostrar error al usuario, es una actualización silenciosa
    }
  },

  /**
   * Recargar datos de la colección actual
   */
  async reloadCollectionData() {
    if (!this.currentCollectionId) return;

    try {
      Utils.showLoader();
      
      const collection = await API.getCollection(this.currentCollectionId);
      
      const [cards, categories, stats] = await Promise.all([
        API.getUserCards(this.currentCollectionId),
        API.getCategories(collection.album_id),
        API.getCollectionStats(this.currentCollectionId)
      ]);
      
      this.currentCards = cards;
      this.currentCategories = categories;
      
      // Actualizar UI
      UI.renderStats(stats, '#collectionStats');
      this.renderFilters();
      this.renderCards();
      this.setupCollectionListeners();
      
      Utils.showToast('Datos actualizados', 'success');
      
    } catch (error) {
      console.error('Error reloading collection:', error);
      Utils.showToast('Error al actualizar datos', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Setup listeners del contenedor de cromos (DELEGACIÓN UNIFICADA)
   */
  setupCardsContainerListeners() {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    // Remover listeners anteriores
    const newContainer = container.cloneNode(true);
    container.replaceWith(newContainer);

    // ÚNICO LISTENER para clicks
    newContainer.addEventListener('click', async (e) => {
      // 1. ACCIONES DE GRUPOS
      const groupAction = e.target.closest('[data-group-action]');
      if (groupAction) {
        e.preventDefault();
        const action = groupAction.dataset.groupAction;
        const groupKey = groupAction.dataset.groupKey;

        if (action === 'toggle' && groupKey) {
          CardGroups.toggle(groupKey);
          this.renderCards();
          this.setupCardsContainerListeners();
        } else if (action === 'expand-all') {
          const allKeys = Array.from(document.querySelectorAll('[data-group-key]'))
            .map(el => el.dataset.groupKey)
            .filter(Boolean);
          CardGroups.expandAll(allKeys);
          this.renderCards();
          this.setupCardsContainerListeners();
        } else if (action === 'collapse-all') {
          CardGroups.collapseAll();
          this.renderCards();
          this.setupCardsContainerListeners();
        }
        return;
      }

      // 2. ACCIONES DE CROMOS (cambio de estado)
      const cardAction = e.target.closest('[data-card-action="status"]');
      if (cardAction) {
        e.stopPropagation();
        const cardId = cardAction.dataset.cardId;
        const status = cardAction.dataset.status;
        await this.updateCardStatus(cardId, status);
        return;
      }
    });

    // ÚNICO LISTENER para cambios (duplicados)
    newContainer.addEventListener('change', async (e) => {
      const duplicatesInput = e.target.closest('[data-card-action="duplicates"]');
      if (duplicatesInput) {
        const cardId = duplicatesInput.dataset.cardId;
        const count = parseInt(duplicatesInput.value) || 0;
        await this.updateCardDuplicates(cardId, count);
      }
    });
  },

  /**
   * Actualizar estado de cromo (OPTIMISTA - UX rápida)
   */
  async updateCardStatus(cardId, status) {
    // Encontrar el cromo
    const card = this.currentCards.find(c => c.id === cardId);
    if (!card) return;

    // Guardar estado anterior por si hay error
    const previousStatus = card.status;
    const previousDuplicates = card.duplicates_count;

    try {
      // 1. ACTUALIZACIÓN OPTIMISTA - Cambiar inmediatamente en la UI
      card.status = status;
      
      // Si cambia a no-tengo, resetear duplicados
      if (status !== 'tengo') {
        card.duplicates_count = 0;
      }
      
      // Renderizar inmediatamente (el usuario ve el cambio al instante)
      this.renderCards();
      this.setupCardsContainerListeners();
      
      // 2. SINCRONIZAR CON BD - En segundo plano
      const updateData = { status };
      if (status !== 'tengo') {
        updateData.duplicates_count = 0;
      }
      
      await API.updateUserCard(cardId, updateData);
      
      // 3. ACTUALIZAR ESTADÍSTICAS - Sin bloquear UI
      const stats = await API.getCollectionStats(this.currentCollectionId);
      UI.renderStats(stats, '#collectionStats');
      
    } catch (error) {
      console.error('Error updating card status:', error);
      
      // ROLLBACK - Restaurar estado anterior si falla
      card.status = previousStatus;
      card.duplicates_count = previousDuplicates;
      
      this.renderCards();
      this.setupCardsContainerListeners();
      
      Utils.showToast('Error al actualizar. Se restauró el estado anterior.', 'error');
    }
  },

  /**
   * Actualizar duplicados de cromo
   */
  async updateCardDuplicates(cardId, count) {
    try {
      await API.updateUserCard(cardId, { duplicates_count: count });
      
      const card = this.currentCards.find(c => c.id === cardId);
      if (card) {
        card.duplicates_count = count;
      }
      
      const stats = await API.getCollectionStats(this.currentCollectionId);
      UI.renderStats(stats, '#collectionStats');
      
    } catch (error) {
      console.error('Error updating duplicates:', error);
      Utils.showToast('Error al actualizar duplicados', 'error');
    }
  }
};
