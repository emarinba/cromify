/**
 * user-ui.js - Interfaz de Usuario Normal
 * Gestión de colecciones personales
 */

const UserUI = {
  currentCollectionId: null,
  currentCards: [],
  currentCategories: [],
  viewMode: 'album', // 'album' o 'list'
  filters: {
    search: '',
    category: '',
    status: ''
  },

  /**
   * Mostrar dashboard de usuario
   */
  async showDashboard() {
    try {
      Utils.showLoader();
      Utils.showView('viewUserDashboard');
      
      const [albums, collections, stats] = await Promise.all([
        API.getAlbums(),
        API.getUserCollections(),
        API.getUserStats()
      ]);
      
      this.renderUserDashboard(albums, collections, stats);
      
    } catch (error) {
      console.error('Error loading user dashboard:', error);
      Utils.showToast('Error al cargar dashboard', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Renderizar dashboard de usuario
   */
  renderUserDashboard(albums, collections, stats) {
    // Estadísticas generales
    this.renderGeneralStats(stats);
    
    // Mis colecciones
    this.renderMyCollections(collections);
    
    // Álbumes disponibles
    this.renderAvailableAlbums(albums, collections);
    
    this.setupDashboardListeners();
  },

  /**
   * Renderizar estadísticas generales
   */
  renderGeneralStats(stats) {
    const container = document.getElementById('userGeneralStats');
    if (!container) return;

    const totalCollections = stats.length;
    const totalOwned = stats.reduce((sum, s) => sum + (s.cards_owned || 0), 0);
    const totalCards = stats.reduce((sum, s) => sum + (s.total_cards || 0), 0);
    const totalDuplicates = stats.reduce((sum, s) => sum + (s.total_duplicates || 0), 0);
    const avgProgress = totalCollections > 0 
      ? Math.round(stats.reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / totalCollections)
      : 0;

    container.innerHTML = `
      <div class="stats-overview">
        <div class="stat-box">
          <i data-lucide="folder" class="stat-icon"></i>
          <div class="stat-content">
            <span class="stat-value">${totalCollections}</span>
            <span class="stat-label">Colecciones</span>
          </div>
        </div>
        <div class="stat-box">
          <i data-lucide="credit-card" class="stat-icon"></i>
          <div class="stat-content">
            <span class="stat-value">${totalOwned}</span>
            <span class="stat-label">Cromos</span>
          </div>
        </div>
        <div class="stat-box">
          <i data-lucide="copy" class="stat-icon"></i>
          <div class="stat-content">
            <span class="stat-value">${totalDuplicates}</span>
            <span class="stat-label">Repetidos</span>
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
          <p>Ya tienes todas las colecciones disponibles.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = availableAlbums.map(album => `
      <div class="album-available-card" data-id="${album.id}">
        <div class="album-header" style="background: ${album.color};">
          <h4>${Utils.escapeHtml(album.name)}</h4>
        </div>
        <div class="album-body">
          <div class="album-info">
            ${album.season ? `<span><i data-lucide="calendar"></i> ${Utils.escapeHtml(album.season)}</span>` : ''}
            ${album.competition ? `<span><i data-lucide="trophy"></i> ${Utils.escapeHtml(album.competition)}</span>` : ''}
          </div>
          <button class="btn btn-accent btn-join-album" data-id="${album.id}">
            <i data-lucide="plus-circle"></i>
            Unirse
          </button>
        </div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Configurar listeners del dashboard
   */
  setupDashboardListeners() {
    // Abrir colección
    document.querySelectorAll('.btn-open-collection').forEach(btn => {
      btn.addEventListener('click', () => {
        const collectionId = btn.dataset.id;
        this.openCollection(collectionId);
      });
    });

    // Unirse a álbum
    document.querySelectorAll('.btn-join-album').forEach(btn => {
      btn.addEventListener('click', async () => {
        const albumId = btn.dataset.id;
        await this.joinAlbum(albumId);
      });
    });
  },

  /**
   * Unirse a un álbum
   */
  async joinAlbum(albumId) {
    if (!Utils.confirm('¿Unirse a este álbum?')) return;

    try {
      Utils.showLoader();
      await API.joinCollection(albumId);
      Utils.showToast('¡Te has unido al álbum!', 'success');
      
      // Recargar dashboard
      this.showDashboard();
      
    } catch (error) {
      console.error('Error joining album:', error);
      Utils.showToast('Error al unirse: ' + error.message, 'error');
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
      const [collection, cards, categories, stats] = await Promise.all([
        API.getCollection(collectionId),
        API.getUserCards(collectionId),
        API.getCategories(collection.album_id),
        API.getCollectionStats(collectionId)
      ]);
      
      this.currentCards = cards;
      this.currentCategories = categories;
      
      // Mostrar vista
      Utils.showView('viewCollection');
      
      // Renderizar
      document.getElementById('collectionTitle').textContent = collection.album.name;
      UI.renderStats(stats, '#collectionStats');
      this.renderFilters();
      this.renderCards();
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
          value="${this.filters.search}"
        >
        
        <select id="filterCategory" class="filter-select">
          <option value="">Todas las categorías</option>
          ${this.currentCategories.map(cat => 
            `<option value="${cat.id}" ${this.filters.category === cat.id ? 'selected' : ''}>
              ${Utils.escapeHtml(cat.name)}
            </option>`
          ).join('')}
        </select>
        
        <select id="filterStatus" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="tengo" ${this.filters.status === 'tengo' ? 'selected' : ''}>Tengo</option>
          <option value="falta" ${this.filters.status === 'falta' ? 'selected' : ''}>Me falta</option>
          <option value="cambiado" ${this.filters.status === 'cambiado' ? 'selected' : ''}>Cambiado</option>
        </select>
        
        <button id="btnClearFilters" class="btn btn-outline">
          <i data-lucide="x"></i>
          Limpiar
        </button>
      </div>
      
      <div class="view-controls">
        <button id="btnToggleView" class="btn btn-outline">
          <i data-lucide="${this.viewMode === 'album' ? 'list' : 'layout-grid'}"></i>
          ${this.viewMode === 'album' ? 'Vista Lista' : 'Vista Álbum'}
        </button>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar cromos
   */
  renderCards() {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    // Aplicar filtros
    let filteredCards = [...this.currentCards];

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filteredCards = filteredCards.filter(c => 
        c.number.toLowerCase().includes(search) ||
        c.playerName.toLowerCase().includes(search)
      );
    }

    if (this.filters.category) {
      filteredCards = filteredCards.filter(c => c.categoryId === this.filters.category);
    }

    if (this.filters.status) {
      filteredCards = filteredCards.filter(c => c.status === this.filters.status);
    }

    // Renderizar según modo
    if (this.viewMode === 'album') {
      this.renderAlbumView(filteredCards, container);
    } else {
      this.renderListView(filteredCards, container);
    }
  },

  /**
   * Renderizar vista álbum
   */
  renderAlbumView(cards, container) {
    if (cards.length === 0) {
      UI.showEmptyState('inbox', 'Sin resultados', 'No hay cromos que coincidan con los filtros', '#cardsContainer');
      return;
    }

    const sortedCards = Utils.sortCards(cards);
    
    container.innerHTML = `
      <div class="cards-album-grid">
        ${sortedCards.map(card => this.renderAlbumCard(card)).join('')}
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar tarjeta de cromo (vista álbum)
   */
  renderAlbumCard(card) {
    return `
      <div class="card-album-item status-${card.status}" data-id="${card.id}">
        <div class="album-side-btn left ${card.status === 'falta' ? 'active' : ''}" 
             data-card-id="${card.id}" data-status="falta">
          ✗
        </div>
        
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
                    data-card-id="${card.id}" data-status="cambiado">
              ⇄
            </button>
            <input type="number" 
                   class="mini-duplicates-input" 
                   value="${card.duplicates_count || 0}" 
                   min="0" 
                   data-card-id="${card.id}"
                   ${card.status !== 'tengo' ? 'disabled' : ''}>
          </div>
        </div>
        
        <div class="album-side-btn right ${card.status === 'tengo' ? 'active' : ''}"
             data-card-id="${card.id}" data-status="tengo">
          ✓
        </div>
      </div>
    `;
  },

  /**
   * Renderizar vista lista
   */
  renderListView(cards, container) {
    if (cards.length === 0) {
      UI.showEmptyState('inbox', 'Sin resultados', 'No hay cromos que coincidan con los filtros', '#cardsContainer');
      return;
    }

    const sortedCards = Utils.sortCards(cards);
    
    container.innerHTML = `
      <div class="cards-list">
        ${sortedCards.map(card => this.renderListCard(card)).join('')}
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar tarjeta de cromo (vista lista)
   */
  renderListCard(card) {
    return `
      <div class="card-list-item-compact status-${card.status}" data-id="${card.id}">
        <div class="card-num">${Utils.escapeHtml(card.number)}</div>
        <div class="card-info">
          <div class="card-name">${Utils.escapeHtml(card.playerName)}</div>
          <div class="card-meta">
            ${Utils.escapeHtml(card.team || '')}
            ${card.category ? ` • <span style="color: ${card.category.color}">■</span> ${Utils.escapeHtml(card.category.name)}` : ''}
          </div>
        </div>
        <div class="card-actions-horizontal">
          <button class="status-btn-horizontal ${card.status === 'falta' ? 'active' : ''}" 
                  data-card-id="${card.id}" data-status="falta" title="No lo tengo">
            ✗
          </button>
          <button class="status-btn-horizontal ${card.status === 'tengo' ? 'active' : ''}" 
                  data-card-id="${card.id}" data-status="tengo" title="Lo tengo">
            ✓
          </button>
          <button class="status-btn-horizontal ${card.status === 'cambiado' ? 'active' : ''}" 
                  data-card-id="${card.id}" data-status="cambiado" title="Cambiado">
            ⇄
          </button>
          <input type="number" 
                 class="duplicates-input" 
                 value="${card.duplicates_count || 0}" 
                 min="0" 
                 data-card-id="${card.id}"
                 ${card.status !== 'tengo' ? 'disabled' : ''}
                 title="Repetidos" 
                 placeholder="0">
        </div>
      </div>
    `;
  },

  /**
   * Configurar listeners de la colección
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

    // Filtros
    const filterSearch = document.getElementById('filterSearch');
    if (filterSearch) {
      filterSearch.addEventListener('input', Utils.debounce((e) => {
        this.filters.search = e.target.value;
        this.renderCards();
        this.setupCardListeners();
      }, 300));
    }

    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) {
      filterCategory.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.renderCards();
        this.setupCardListeners();
      });
    }

    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
      filterStatus.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.renderCards();
        this.setupCardListeners();
      });
    }

    const btnClearFilters = document.getElementById('btnClearFilters');
    if (btnClearFilters) {
      btnClearFilters.addEventListener('click', () => {
        this.filters = { search: '', category: '', status: '' };
        this.renderFilters();
        this.renderCards();
        this.setupCollectionListeners();
        this.setupCardListeners();
      });
    }

    // Toggle vista
    const btnToggleView = document.getElementById('btnToggleView');
    if (btnToggleView) {
      btnToggleView.addEventListener('click', () => {
        this.viewMode = this.viewMode === 'album' ? 'list' : 'album';
        this.renderFilters();
        this.renderCards();
        this.setupCollectionListeners();
        this.setupCardListeners();
      });
    }

    this.setupCardListeners();
  },

  /**
   * Configurar listeners de los cromos
   */
  setupCardListeners() {
    // Botones de estado (vista álbum y lista)
    document.querySelectorAll('[data-status]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const cardId = btn.dataset.cardId;
        const status = btn.dataset.status;
        await this.updateCardStatus(cardId, status);
      });
    });

    // Inputs de duplicados
    document.querySelectorAll('.mini-duplicates-input, .duplicates-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const cardId = input.dataset.cardId;
        const count = parseInt(e.target.value) || 0;
        await this.updateCardDuplicates(cardId, count);
      });
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
      
      // Re-renderizar solo la tarjeta afectada (optimización)
      this.renderCards();
      this.setupCardListeners();
      
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
      Utils.showToast('Error al actualizar repetidos', 'error');
    }
  }
};
