/**
 * card-grouping.js - Sistema de agrupación de cromos
 * Lógica compartida entre usuario y admin
 */

const CardGrouping = {
  // Estado de grupos expandidos (por sesión)
  expandedGroups: new Set(),
  
  /**
   * Inicializar estado de agrupaciones
   */
  init() {
    // Cargar estado guardado de localStorage
    const saved = localStorage.getItem('cromify_expanded_groups');
    if (saved) {
      try {
        this.expandedGroups = new Set(JSON.parse(saved));
      } catch (e) {
        console.error('Error cargando estado de grupos:', e);
      }
    }
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
   * @returns {Array} Array de grupos {key, name, cards, type, color}
   */
  groupCards(cards, categories) {
    if (!cards || cards.length === 0) return [];

    // Mapa de categorías por ID para acceso rápido
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
    
    // Identificar categoría "Básica" (case insensitive)
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
        groupColor = '#718096'; // Color neutro para equipos
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

    // Ordenar grupos:
    // 1. Básica primero (equipos)
    // 2. Luego otras categorías por nombre
    groupsArray.sort((a, b) => {
      if (a.type === 'team' && b.type !== 'team') return -1;
      if (a.type !== 'team' && b.type === 'team') return 1;
      return a.name.localeCompare(b.name);
    });

    // Ordenar cromos dentro de cada grupo
    groupsArray.forEach(group => {
      group.cards = Utils.sortCards(group.cards);
    });

    // Si no hay grupos expandidos, expandir el primero por defecto
    if (this.expandedGroups.size === 0 && groupsArray.length > 0) {
      this.expandedGroups.add(groupsArray[0].key);
      this.saveState();
    }

    return groupsArray;
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
  expandAll(groups) {
    groups.forEach(group => {
      this.expandedGroups.add(group.key);
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
   * @param {Array} groups - Array de grupos
   * @param {Function} cardRenderer - Función para renderizar cada cromo
   * @returns {String} HTML
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
        <button class="btn-text" id="expandAllGroups">
          <i data-lucide="chevrons-down"></i>
          Expandir todos
        </button>
        <button class="btn-text" id="collapseAllGroups">
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
        <button class="btn-text" id="expandAllGroups">
          <i data-lucide="chevrons-down"></i>
          Expandir todos
        </button>
        <button class="btn-text" id="collapseAllGroups">
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

    return `
      <div class="card-group ${isExpanded ? 'expanded' : 'collapsed'}" 
           data-group-key="${group.key}">
        
        <div class="group-header" data-group-key="${group.key}">
          <div class="group-header-content">
            <i data-lucide="${chevronIcon}" class="group-chevron"></i>
            <div class="group-indicator" style="background-color: ${group.color};"></div>
            <h3 class="group-title">${Utils.escapeHtml(group.name)}</h3>
            <span class="group-count">${group.cards.length} cromos</span>
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
   * Setup event listeners para grupos
   */
  setupGroupListeners(container, onToggle) {
    // Toggle individual de grupos
    container.addEventListener('click', (e) => {
      const header = e.target.closest('.group-header');
      if (header) {
        const groupKey = header.dataset.groupKey;
        this.toggleGroup(groupKey);
        if (onToggle) onToggle();
      }
    });

    // Expandir todos
    const expandBtn = document.getElementById('expandAllGroups');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        const groups = container.querySelectorAll('.card-group');
        const groupKeys = Array.from(groups).map(g => g.dataset.groupKey);
        groupKeys.forEach(key => this.expandedGroups.add(key));
        this.saveState();
        if (onToggle) onToggle();
      });
    }

    // Colapsar todos
    const collapseBtn = document.getElementById('collapseAllGroups');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        this.collapseAll();
        if (onToggle) onToggle();
      });
    }
  }
};

// Inicializar al cargar
CardGrouping.init();
