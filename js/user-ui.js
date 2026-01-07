/**
 * user-ui.js - Interfaz de Usuario (CON DELEGACIÓN DE EVENTOS)
 * Sistema robusto que sobrevive a re-renders
 */

const UserUI = {
  currentCollectionId: null,
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
        </div>
        <div class="collection-body">
          <div class="collection-info">
            <span><i data-lucide="calendar"></i> ${Utils.formatDateShort(col.joined_at)}</span>
          </div>
          <button class="btn btn-primary btn-open-collection" data-id="${col.id}">
            <i data-lucide="folder-open"></i>
            Ver Colección
          </button>
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
    // Remover listeners anteriores
    const myCollectionsList = document.getElementById('myCollectionsList');
    const availableAlbumsList = document.getElementById('availableAlbumsList');

    // DELEGACIÓN: Un solo listener en el contenedor padre
    if (myCollectionsList) {
      myCollectionsList.replaceWith(myCollectionsList.cloneNode(true));
      const newMyCollections = document.getElementById('myCollectionsList');
      
      newMyCollections.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-open-collection');
        if (btn) {
          const collectionId = btn.dataset.id;
          await this.openCollection(collectionId);
        }
      });
    }

    // DELEGACIÓN: Álbumes disponibles
    if (availableAlbumsList) {
      availableAlbumsList.replaceWith(availableAlbumsList.cloneNode(true));
      const newAvailableAlbums = document.getElementById('availableAlbumsList');
      
      newAvailableAlbums.addEventListener('click', async (e) => {
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
      await API.joinAlbum(albumId);
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
   * Abrir colección
   */
  async openCollection(collectionId) {
    try {
      Utils.showLoader();
      this.currentCollectionId = collectionId;
      
      // Cargar datos
      const collection = await API.getCollection(collectionId);
      
      const [cards, categories, stats] = await Promise.all([
        API.getUserCards(collectionId),
        API.getCategories(collection.album_id),
        API.getCollectionStats(collectionId)
      ]);
      
      this.currentCards = cards;
      this.currentCategories = categories;
      
      // Setear el color del álbum
      const albumColor = collection.album.color || '#ED8936';
      document.documentElement.style.setProperty('--album-color', albumColor);
      
      // Mostrar vista
      Utils.showView('viewCollection');
      
      // Renderizar
      document.getElementById('collectionTitle').textContent = collection.album.name;
      UI.renderStats(stats, '#collectionStats');
      this.renderFilters();
      this.renderCards();
      
      // Setup listeners de grupos UNA VEZ
      CardGroups.listen('cardsContainer', () => this.renderCards());
      
      // Setup listeners de cromos EN EL MISMO CONTENEDOR
      const cardsContainer = document.getElementById('cardsContainer');
      
      cardsContainer.addEventListener('click', async (e) => {
        const statusBtn = e.target.closest('[data-status]');
        if (statusBtn) {
          e.stopPropagation();
          const cardId = statusBtn.dataset.cardId;
          const status = statusBtn.dataset.status;
          await this.updateCardStatus(cardId, status);
        }
      });

      cardsContainer.addEventListener('change', async (e) => {
        const input = e.target.closest('.mini-duplicates-input, .duplicates-input');
        if (input) {
          const cardId = input.dataset.cardId;
          const count = parseInt(e.target.value) || 0;
          await this.updateCardDuplicates(cardId, count);
        }
      });

      this.setupCollectionListeners();
      
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
        
        <button id="btnClearFilters" class="btn btn-secondary">
          <i data-lucide="x"></i>
          Limpiar
        </button>
        
        <button id="btnToggleView" class="btn btn-secondary">
          <i data-lucide="${this.viewMode === 'album' ? 'list' : 'grid'}"></i>
          ${this.viewMode === 'album' ? 'Lista' : 'Álbum'}
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

    // Agrupar
    const groups = CardGroups.group(filtered, this.currentCategories);

    // Renderizar
    if (groups.length === 0) {
      UI.showEmptyState('inbox', 'Sin resultados', 'No hay cromos', '#cardsContainer');
      return;
    }

    container.innerHTML = CardGroups.render(groups, card => this.renderCard(card));

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar un cromo (sin vista específica)
   */
  renderCard(card) {
    return `
      <div class="card-album-item status-${card.status}" data-id="${card.id}">
        <div class="album-side-btn left ${card.status === 'falta' ? 'active' : ''}" 
             data-card-id="${card.id}" data-status="falta">✗</div>
        
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
                    data-card-id="${card.id}" data-status="cambiado">⇄</button>
            <input type="number" class="mini-duplicates-input" 
                   value="${card.duplicates_count || 0}" min="0" 
                   data-card-id="${card.id}"
                   ${card.status !== 'tengo' ? 'disabled' : ''}
                   placeholder="0">
          </div>
        </div>
        
        <div class="album-side-btn right ${card.status === 'tengo' ? 'active' : ''}" 
             data-card-id="${card.id}" data-status="tengo">✓</div>
      </div>
    `;
  },

  /**
   * Setup listeners de colección (DELEGACIÓN DE EVENTOS)
   */
  setupCollectionListeners() {
    // Botón volver
    const btnBack = document.getElementById('btnBackToDashboard');
    if (btnBack) {
      btnBack.replaceWith(btnBack.cloneNode(true));
      document.getElementById('btnBackToDashboard').addEventListener('click', () => {
        this.showDashboard();
      });
    }

    // Filtros con debounce
    const filterSearch = document.getElementById('filterSearch');
    if (filterSearch) {
      filterSearch.replaceWith(filterSearch.cloneNode(true));
      document.getElementById('filterSearch').addEventListener('input', Utils.debounce((e) => {
        this.filters.search = e.target.value;
        this.renderCards();
      }, 300));
    }

    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) {
      filterCategory.replaceWith(filterCategory.cloneNode(true));
      document.getElementById('filterCategory').addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.renderCards();
      });
    }

    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
      filterStatus.replaceWith(filterStatus.cloneNode(true));
      document.getElementById('filterStatus').addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.renderCards();
      });
    }

    const btnClearFilters = document.getElementById('btnClearFilters');
    if (btnClearFilters) {
      btnClearFilters.replaceWith(btnClearFilters.cloneNode(true));
      document.getElementById('btnClearFilters').addEventListener('click', () => {
        this.filters = { search: '', category: '', status: '' };
        this.renderFilters();
        this.renderCards();
        this.setupCollectionListeners();
      });
    }

    const btnToggleView = document.getElementById('btnToggleView');
    if (btnToggleView) {
      btnToggleView.replaceWith(btnToggleView.cloneNode(true));
      document.getElementById('btnToggleView').addEventListener('click', () => {
        this.viewMode = this.viewMode === 'album' ? 'list' : 'album';
        this.renderFilters();
        this.renderCards();
        this.setupCollectionListeners();
      });
    }

    // DELEGACIÓN DE EVENTOS: Contenedor de cromos
    this.setupCardListenersDelegation();
  },

  /**
   * Setup listeners de cromos con DELEGACIÓN
   * Un solo listener en el contenedor padre
   */
  setupCardListenersDelegation() {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    // Remover listener anterior
    container.replaceWith(container.cloneNode(true));
    const newContainer = document.getElementById('cardsContainer');

    // DELEGACIÓN: Un solo listener para TODO
    newContainer.addEventListener('click', async (e) => {
      // Grupos: Toggle individual
      const toggleGroup = e.target.closest('[data-action="toggle-group"]');
      if (toggleGroup) {
        e.preventDefault();
        const groupKey = toggleGroup.dataset.group;
        CardGrouping.toggleGroup(groupKey);
        this.renderCards();
        return;
      }

      // Grupos: Expandir todos
      const expandAll = e.target.closest('[data-action="expand-all"]');
      if (expandAll) {
        e.preventDefault();
        const allGroups = newContainer.querySelectorAll('[data-group]');
        const groupKeys = Array.from(allGroups).map(g => g.dataset.group).filter(Boolean);
        CardGrouping.expandAll(groupKeys);
        this.renderCards();
        return;
      }

      // Grupos: Colapsar todos
      const collapseAll = e.target.closest('[data-action="collapse-all"]');
      if (collapseAll) {
        e.preventDefault();
        CardGrouping.collapseAll();
        this.renderCards();
        return;
      }

      // Botones de estado
      const statusBtn = e.target.closest('[data-status]');
      if (statusBtn) {
        e.stopPropagation();
        const cardId = statusBtn.dataset.cardId;
        const status = statusBtn.dataset.status;
        await this.updateCardStatus(cardId, status);
        return;
      }
    });

    // Inputs de duplicados
    newContainer.addEventListener('change', async (e) => {
      const input = e.target.closest('.mini-duplicates-input, .duplicates-input');
      if (input) {
        const cardId = input.dataset.cardId;
        const count = parseInt(e.target.value) || 0;
        await this.updateCardDuplicates(cardId, count);
        return;
      }
    });
  },

  /**
   * Actualizar estado de cromo
   */
  async updateCardStatus(cardId, status) {
    try {
      // Actualizar en BD
      await API.updateUserCard(cardId, { status });
      
      // Actualizar en estado local
      const card = this.currentCards.find(c => c.id === cardId);
      if (card) {
        card.status = status;
        
        // Si cambia a "falta" o "cambiado", resetear duplicados
        if (status !== 'tengo') {
          card.duplicates_count = 0;
          await API.updateUserCard(cardId, { duplicates_count: 0 });
        }
      }
      
      // Re-renderizar
      this.renderCards();
      
      // Actualizar estadísticas
      const stats = await API.getCollectionStats(this.currentCollectionId);
      UI.renderStats(stats, '#collectionStats');
      
    } catch (error) {
      console.error('Error updating card status:', error);
      Utils.showToast('Error al actualizar', 'error');
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
      
      // Actualizar estadísticas
      const stats = await API.getCollectionStats(this.currentCollectionId);
      UI.renderStats(stats, '#collectionStats');
      
    } catch (error) {
      console.error('Error updating duplicates:', error);
      Utils.showToast('Error al actualizar duplicados', 'error');
    }
  }
};
