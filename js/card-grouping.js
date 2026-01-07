/**
 * card-grouping.js - Sistema de agrupación de cromos
 * Con delegación de eventos robusta y contadores
 */

const CardGrouping = {
  // Estado de grupos expandidos (por sesión)
  expandedGroups: new Set(),
  
  // Contenedor actual (para delegación)
  currentContainer: null,
  
  // Callback de toggle (para re-render)
  onToggleCallback: null,

  /**
   * Inicializar estado de agrupaciones
   */
  init() {
    // SIEMPRE empezar con todos expandidos
    this.expandedGroups = new Set();
    console.log('🔵 CardGrouping inicializado: Todos los grupos expandidos por defecto');
  },

  /**
   * Guardar estado de grupos
   */
  saveState() {
    try {
      localStorage.setItem('cromify_expanded_groups', 
        JSON.stringify([...this.expandedGroups])
      );
    } catch (e) {
      console.error('Error guardando estado de grupos:', e);
    }
  },

  /**
   * Agrupar cromos según la lógica:
   * - Categoría "Básica" → Agrupar por equipo
   * - Otras categorías → Agrupar por categoría
   * 
   * @param {Array} cards - Array de cromos
   * @param {Array} categories - Array de categorías
   * @returns {Array} Array de grupos {key, name, cards, type, color, stats}
   */
  groupCards(cards, categories) {
    if (!cards || cards.length === 0) return [];

    // Mapa de categorías por ID
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
    
    // Identificar categoría "Básica"
    const basicCategory = categories.find(cat => 
      cat.name.toLowerCase() === 'básica' || 
      cat.name.toLowerCase() === 'basica'
    );

    const groups = new Map();

    cards.forEach(card => {
      const category = categoryMap.get(card.categoryId);
      
      // Determinar la clave y nombre del grupo
      let groupKey, groupName, groupType, groupColor;

      if (category && category.id === basicCategory?.id) {
        // Básica: agrupar por equipo
        groupKey = `team_${card.team || 'sin_equipo'}`;
        groupName = card.team || 'Sin equipo';
        groupType = 'team';
        groupColor = '#718096';
      } else {
        // Otras categorías: agrupar por categoría
        groupKey = `category_${card.categoryId || 'sin_categoria'}`;
        groupName = category ? category.name : 'Sin categoría';
        groupType = 'category';
        groupColor = category?.color || '#718096';
      }

      // Crear grupo si no existe
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

      // Añadir cromo al grupo
      groups.get(groupKey).cards.push(card);
    });

    // Convertir a array y ordenar
    let groupsArray = Array.from(groups.values());

    // Ordenar grupos
    groupsArray.sort((a, b) => {
      if (a.type === 'team' && b.type !== 'team') return -1;
      if (a.type !== 'team' && b.type === 'team') return 1;
      return a.name.localeCompare(b.name);
    });

    // Ordenar cromos dentro de cada grupo y calcular estadísticas
    groupsArray.forEach(group => {
      group.cards = Utils.sortCards(group.cards);
      
      // Calcular estadísticas del grupo
      group.stats = this.calculateGroupStats(group.cards);
    });

    // TODOS LOS GRUPOS EXPANDIDOS POR DEFECTO
    groupsArray.forEach(group => {
      this.expandedGroups.add(group.key);
    });
    this.saveState();

    return groupsArray;
  },

  /**
   * Calcular estadísticas de un grupo
   * @param {Array} cards - Cromos del grupo
   * @returns {Object} {total, owned, missing, traded}
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
   * Toggle estado de un grupo
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
   * Expandir todos los grupos
   */
  expandAll(groupKeys) {
    groupKeys.forEach(key => {
      this.expandedGroups.add(key);
    });
    this.saveState();
  },

  /**
   * Colapsar todos los grupos
   */
  collapseAll() {
    this.expandedGroups.clear();
    this.saveState();
  },

  /**
   * Verificar si un grupo está expandido
   */
  isExpanded(groupKey) {
    return this.expandedGroups.has(groupKey);
  },

  /**
   * Renderizar HTML de grupos (vista álbum)
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
        <button class="btn-text btn-expand-all">
          <i data-lucide="chevrons-down"></i>
          Expandir todos
        </button>
        <button class="btn-text btn-collapse-all">
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
   * Renderizar HTML de grupos (vista lista)
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
        <button class="btn-text btn-expand-all">
          <i data-lucide="chevrons-down"></i>
          Expandir todos
        </button>
        <button class="btn-text btn-collapse-all">
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
   * Renderizar un grupo individual
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
   * Renderizar contenido del grupo (vista álbum)
   */
  renderGroupAlbumContent(group, cardRenderer) {
    return `
      <div class="cards-album-grid">
        ${group.cards.map(card => cardRenderer(card)).join('')}
      </div>
    `;
  },

  /**
   * Renderizar contenido del grupo (vista lista)
   */
  renderGroupListContent(group, cardRenderer) {
    return `
      <div class="cards-list">
        ${group.cards.map(card => cardRenderer(card)).join('')}
      </div>
    `;
  },

  /**
   * Setup event listeners para grupos (DELEGACIÓN)
   * Se llama UNA SOLA VEZ al inicio
   */
  setupGroupListeners(container, onToggle) {
    // Guardar referencias
    this.currentContainer = container;
    this.onToggleCallback = onToggle;

    // IMPORTANTE: Limpiar listeners anteriores
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    this.currentContainer = newContainer;

    // DELEGACIÓN: Un solo listener en el contenedor
    this.currentContainer.addEventListener('click', (e) => {
      // Toggle individual de grupos
      const header = e.target.closest('.group-header');
      if (header) {
        e.stopPropagation();
        const groupKey = header.dataset.groupKey;
        this.toggleGroup(groupKey);
        if (this.onToggleCallback) {
          this.onToggleCallback();
        }
        return;
      }

      // Expandir todos
      const expandBtn = e.target.closest('.btn-expand-all');
      if (expandBtn) {
        e.stopPropagation();
        const groups = this.currentContainer.querySelectorAll('.card-group');
        const groupKeys = Array.from(groups).map(g => g.dataset.groupKey);
        this.expandAll(groupKeys);
        if (this.onToggleCallback) {
          this.onToggleCallback();
        }
        return;
      }

      // Colapsar todos
      const collapseBtn = e.target.closest('.btn-collapse-all');
      if (collapseBtn) {
        e.stopPropagation();
        this.collapseAll();
        if (this.onToggleCallback) {
          this.onToggleCallback();
        }
        return;
      }
    });

    console.log('✅ Group listeners configurados con delegación');
  }
};

// Inicializar al cargar
CardGrouping.init();
