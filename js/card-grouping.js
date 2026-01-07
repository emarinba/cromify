/**
 * card-grouping.js - Sistema de agrupación FUNCIONAL
 * Versión completamente reescrita y probada
 */

const CardGrouping = {
  // Estado de grupos expandidos
  expandedGroups: new Set(),
  
  // Flag para saber si ya inicializamos listeners
  listenersInitialized: false,

  /**
   * Inicializar
   */
  init() {
    this.expandedGroups = new Set();
    this.listenersInitialized = false;
    console.log('🔵 CardGrouping inicializado');
  },

  /**
   * Guardar estado
   */
  saveState() {
    try {
      localStorage.setItem('cromify_expanded_groups', 
        JSON.stringify([...this.expandedGroups])
      );
    } catch (e) {
      console.error('Error guardando estado:', e);
    }
  },

  /**
   * Agrupar cromos
   */
  groupCards(cards, categories) {
    if (!cards || cards.length === 0) return [];

    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
    const basicCategory = categories.find(cat => 
      cat.name.toLowerCase() === 'básica' || 
      cat.name.toLowerCase() === 'basica'
    );

    const groups = new Map();

    cards.forEach(card => {
      const category = categoryMap.get(card.categoryId);
      let groupKey, groupName, groupType, groupColor;

      if (category && category.id === basicCategory?.id) {
        groupKey = `team_${card.team || 'sin_equipo'}`;
        groupName = card.team || 'Sin equipo';
        groupType = 'team';
        groupColor = '#718096';
      } else {
        groupKey = `category_${card.categoryId || 'sin_categoria'}`;
        groupName = category ? category.name : 'Sin categoría';
        groupType = 'category';
        groupColor = category?.color || '#718096';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          name: groupName,
          cards: [],
          type: groupType,
          color: groupColor,
          category: category
        });
      }

      groups.get(groupKey).cards.push(card);
    });

    let groupsArray = Array.from(groups.values());

    groupsArray.sort((a, b) => {
      if (a.type === 'team' && b.type !== 'team') return -1;
      if (a.type !== 'team' && b.type === 'team') return 1;
      return a.name.localeCompare(b.name);
    });

    groupsArray.forEach(group => {
      group.cards = Utils.sortCards(group.cards);
      group.stats = this.calculateGroupStats(group.cards);
    });

    // TODOS expandidos por defecto
    groupsArray.forEach(group => {
      this.expandedGroups.add(group.key);
    });
    this.saveState();

    return groupsArray;
  },

  /**
   * Calcular estadísticas
   */
  calculateGroupStats(cards) {
    const total = cards.length;
    const owned = cards.filter(c => c.status === 'tengo').length;
    const missing = cards.filter(c => c.status === 'falta').length;
    const traded = cards.filter(c => c.status === 'cambiado').length;
    
    return {
      total,
      owned,
      missing,
      traded,
      percentage: total > 0 ? Math.round((owned / total) * 100) : 0
    };
  },

  /**
   * Toggle grupo
   */
  toggleGroup(groupKey) {
    if (this.expandedGroups.has(groupKey)) {
      this.expandedGroups.delete(groupKey);
    } else {
      this.expandedGroups.add(groupKey);
    }
    this.saveState();
  },

  /**
   * Expandir todos
   */
  expandAll(groupKeys) {
    groupKeys.forEach(key => this.expandedGroups.add(key));
    this.saveState();
  },

  /**
   * Colapsar todos
   */
  collapseAll() {
    this.expandedGroups.clear();
    this.saveState();
  },

  /**
   * Verificar si expandido
   */
  isExpanded(groupKey) {
    return this.expandedGroups.has(groupKey);
  },

  /**
   * Renderizar vista álbum con grupos
   */
  renderGroupedAlbumView(groups, cardRenderer) {
    if (groups.length === 0) {
      return `
        <div class="empty-state">
          <i data-lucide="inbox"></i>
          <p>No hay cromos disponibles</p>
        </div>
      `;
    }

    return `
      <div class="groups-controls">
        <button class="btn-text btn-expand-all" type="button">
          <i data-lucide="chevrons-down"></i>
          Expandir todos
        </button>
        <button class="btn-text btn-collapse-all" type="button">
          <i data-lucide="chevrons-up"></i>
          Colapsar todos
        </button>
      </div>

      <div class="cards-groups-container">
        ${groups.map(group => this.renderGroup(group, cardRenderer, 'album')).join('')}
      </div>
    `;
  },

  /**
   * Renderizar vista lista con grupos
   */
  renderGroupedListView(groups, cardRenderer) {
    if (groups.length === 0) {
      return `
        <div class="empty-state">
          <i data-lucide="inbox"></i>
          <p>No hay cromos disponibles</p>
        </div>
      `;
    }

    return `
      <div class="groups-controls">
        <button class="btn-text btn-expand-all" type="button">
          <i data-lucide="chevrons-down"></i>
          Expandir todos
        </button>
        <button class="btn-text btn-collapse-all" type="button">
          <i data-lucide="chevrons-up"></i>
          Colapsar todos
        </button>
      </div>

      <div class="cards-groups-container list-mode">
        ${groups.map(group => this.renderGroup(group, cardRenderer, 'list')).join('')}
      </div>
    `;
  },

  /**
   * Renderizar grupo individual
   */
  renderGroup(group, cardRenderer, viewMode) {
    const isExpanded = this.isExpanded(group.key);
    const chevronIcon = isExpanded ? 'chevron-down' : 'chevron-right';
    const stats = group.stats;

    return `
      <div class="card-group ${isExpanded ? 'expanded' : 'collapsed'}" 
           data-group-key="${group.key}">
        
        <div class="group-header" data-group-key="${group.key}">
          <div class="group-header-content">
            <i data-lucide="${chevronIcon}" class="group-chevron"></i>
            <div class="group-indicator" style="background-color: ${group.color};"></div>
            <h3 class="group-title">${Utils.escapeHtml(group.name)}</h3>
            <div class="group-stats">
              <span class="group-progress">
                <strong>${stats.owned}</strong> / ${stats.total}
              </span>
              <span class="group-percentage">${stats.percentage}%</span>
            </div>
          </div>
        </div>

        <div class="group-content ${isExpanded ? 'show' : 'hide'}">
          ${viewMode === 'album' 
            ? this.renderGroupAlbumContent(group, cardRenderer)
            : this.renderGroupListContent(group, cardRenderer)
          }
        </div>
      </div>
    `;
  },

  /**
   * Renderizar contenido álbum
   */
  renderGroupAlbumContent(group, cardRenderer) {
    return `
      <div class="cards-album-grid">
        ${group.cards.map(card => cardRenderer(card)).join('')}
      </div>
    `;
  },

  /**
   * Renderizar contenido lista
   */
  renderGroupListContent(group, cardRenderer) {
    return `
      <div class="cards-list">
        ${group.cards.map(card => cardRenderer(card)).join('')}
      </div>
    `;
  },

  /**
   * Setup listeners - SE LLAMA UNA SOLA VEZ
   */
  setupGroupListeners(containerSelector, onToggleCallback) {
    // Si ya están inicializados, no hacer nada
    if (this.listenersInitialized) {
      console.log('⚡ Listeners ya inicializados, saltando');
      return;
    }

    const container = document.querySelector(containerSelector);
    if (!container) {
      console.error('❌ Contenedor no encontrado:', containerSelector);
      return;
    }

    console.log('🔧 Configurando listeners de grupos...');

    // DELEGACIÓN: Un solo listener en el contenedor
    container.addEventListener('click', (e) => {
      // Click en header (toggle individual)
      const header = e.target.closest('.group-header');
      if (header) {
        e.preventDefault();
        e.stopPropagation();
        const groupKey = header.dataset.groupKey;
        console.log('🔵 Toggle grupo:', groupKey);
        this.toggleGroup(groupKey);
        if (onToggleCallback) {
          onToggleCallback();
        }
        return;
      }

      // Click en expandir todos
      const expandBtn = e.target.closest('.btn-expand-all');
      if (expandBtn) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔵 Expandir todos');
        const allGroups = container.querySelectorAll('.card-group');
        const groupKeys = Array.from(allGroups).map(g => g.dataset.groupKey);
        this.expandAll(groupKeys);
        if (onToggleCallback) {
          onToggleCallback();
        }
        return;
      }

      // Click en colapsar todos
      const collapseBtn = e.target.closest('.btn-collapse-all');
      if (collapseBtn) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔵 Colapsar todos');
        this.collapseAll();
        if (onToggleCallback) {
          onToggleCallback();
        }
        return;
      }
    });

    this.listenersInitialized = true;
    console.log('✅ Listeners de grupos configurados');
  }
};

// Inicializar
CardGrouping.init();
