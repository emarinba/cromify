/**
 * card-groups.js - Sistema UNIFICADO de agrupación de cromos
 * Soporta vista álbum y vista lista
 */

const CardGroups = {
  expanded: new Set(),
  viewMode: 'album', // 'album' o 'list'
  initialized: false, // Flag para saber si ya inicializamos

  /**
   * Resetear estado
   */
  reset() {
    this.expanded.clear();
    this.initialized = false;
  },

  /**
   * Expandir todos los grupos
   */
  expandAll(groupKeys) {
    this.expanded.clear(); // Limpiar primero
    groupKeys.forEach(key => this.expanded.add(key));
  },

  /**
   * Colapsar todos los grupos
   */
  collapseAll() {
    this.expanded.clear();
  },

  /**
   * Toggle de un grupo específico
   */
  toggle(groupKey) {
    if (this.expanded.has(groupKey)) {
      this.expanded.delete(groupKey);
    } else {
      this.expanded.add(groupKey);
    }
  },

  /**
   * Verificar si un grupo está expandido
   */
  isExpanded(groupKey) {
    return this.expanded.has(groupKey);
  },

  /**
   * Agrupar cromos por equipo (categoría básica) o por categoría (resto)
   */
  group(cards, categories) {
    if (!cards || cards.length === 0) return [];

    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const basicCategory = categories.find(c => 
      c.name.toLowerCase().replace(/á/g, 'a') === 'basica' ||
      c.name.toLowerCase() === 'básica' ||
      c.is_basic === true
    );

    const groups = new Map();

    cards.forEach(card => {
      const category = categoryMap.get(card.categoryId);
      let groupKey, groupName, groupColor;

      // Si es categoría básica → agrupar por equipo
      if (category && category.id === basicCategory?.id) {
        groupKey = `team_${card.team || 'sin_equipo'}`;
        groupName = card.team || 'Sin equipo';
        groupColor = '#718096';
      } else {
        // Resto de categorías → agrupar por categoría
        groupKey = `cat_${card.categoryId || 'sin_categoria'}`;
        groupName = category?.name || 'Sin categoría';
        groupColor = category?.color || '#718096';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          name: groupName,
          color: groupColor,
          cards: []
        });
      }

      groups.get(groupKey).cards.push(card);
    });

    // Convertir a array
    const groupsArray = Array.from(groups.values());

    // Ordenar: equipos primero, luego por nombre
    groupsArray.sort((a, b) => {
      if (a.key.startsWith('team_') && !b.key.startsWith('team_')) return -1;
      if (!a.key.startsWith('team_') && b.key.startsWith('team_')) return 1;
      return a.name.localeCompare(b.name);
    });

    // Calcular estadísticas para cada grupo
    groupsArray.forEach(group => {
      group.cards = Utils.sortCards(group.cards);
      const total = group.cards.length;
      const owned = group.cards.filter(c => c.status === 'tengo').length;
      group.stats = {
        total,
        owned,
        percentage: total > 0 ? Math.round((owned / total) * 100) : 0
      };
    });

    // Expandir todos SOLO la primera vez que se carga
    if (!this.initialized && groupsArray.length > 0) {
      groupsArray.forEach(g => this.expanded.add(g.key));
      this.initialized = true;
    }

    return groupsArray;
  },

  /**
   * Renderizar grupos con el modo de vista actual
   */
  render(groups, cardRenderer, viewMode = 'album') {
    this.viewMode = viewMode;

    if (!groups || groups.length === 0) {
      return '<div class="empty-state"><i data-lucide="inbox"></i><p>No hay cromos</p></div>';
    }

    return `
      <div class="groups-toolbar">
        <button class="btn-ghost" data-group-action="expand-all">
          <i data-lucide="chevrons-down"></i>
          Expandir todos
        </button>
        <button class="btn-ghost" data-group-action="collapse-all">
          <i data-lucide="chevrons-up"></i>
          Colapsar todos
        </button>
      </div>
      <div class="groups-list">
        ${groups.map(group => this.renderGroup(group, cardRenderer)).join('')}
      </div>
    `;
  },

  /**
   * Renderizar un grupo individual
   */
  renderGroup(group, cardRenderer) {
    const isExpanded = this.isExpanded(group.key);
    const chevronIcon = isExpanded ? 'chevron-down' : 'chevron-right';

    return `
      <div class="group ${isExpanded ? 'expanded' : 'collapsed'}" data-group-key="${group.key}">
        <button class="group-header" data-group-action="toggle" data-group-key="${group.key}">
          <i data-lucide="${chevronIcon}" class="group-icon"></i>
          <span class="group-dot" style="background: ${group.color};"></span>
          <h3 class="group-name">${Utils.escapeHtml(group.name)}</h3>
          <div class="group-counter">
            <span class="group-progress">
              <strong>${group.stats.owned}</strong> / ${group.stats.total}
            </span>
            <span class="group-percent">${group.stats.percentage}%</span>
          </div>
        </button>
        <div class="group-body" ${isExpanded ? '' : 'hidden'}>
          ${this.renderGroupContent(group, cardRenderer)}
        </div>
      </div>
    `;
  },

  /**
   * Renderizar contenido del grupo según el modo de vista
   */
  renderGroupContent(group, cardRenderer) {
    if (this.viewMode === 'list') {
      return `
        <div class="cards-list-view">
          ${group.cards.map(card => this.renderCardList(card)).join('')}
        </div>
      `;
    } else {
      return `
        <div class="cards-grid">
          ${group.cards.map(card => cardRenderer(card)).join('')}
        </div>
      `;
    }
  },

  /**
   * Renderizar cromo en modo lista
   */
  renderCardList(card) {
    return `
      <div class="card-list-item status-${card.status}" data-id="${card.id}">
        <div class="card-list-number">${Utils.escapeHtml(card.number)}</div>
        <div class="card-list-info">
          <div class="card-list-name">${Utils.escapeHtml(card.playerName)}</div>
          <div class="card-list-team">${Utils.escapeHtml(card.team || '')}</div>
          ${card.category ? `
            <div class="card-list-category" style="color: ${card.category.color}">
              ${Utils.escapeHtml(card.category.name)}
            </div>
          ` : ''}
        </div>
        <div class="card-list-actions">
          <button class="btn-status ${card.status === 'falta' ? 'active' : ''}"
                  data-card-action="status" data-card-id="${card.id}" data-status="falta"
                  title="Me falta">
            <i data-lucide="x"></i>
          </button>
          <button class="btn-status ${card.status === 'tengo' ? 'active' : ''}"
                  data-card-action="status" data-card-id="${card.id}" data-status="tengo"
                  title="Lo tengo">
            <i data-lucide="check"></i>
          </button>
          <button class="btn-status ${card.status === 'cambiado' ? 'active' : ''}"
                  data-card-action="status" data-card-id="${card.id}" data-status="cambiado"
                  title="Para cambiar">
            <i data-lucide="repeat"></i>
          </button>
          <input type="number" 
                 class="input-duplicates" 
                 value="${card.duplicates_count || 0}" 
                 min="0" 
                 data-card-action="duplicates"
                 data-card-id="${card.id}"
                 ${card.status !== 'tengo' ? 'disabled' : ''}
                 placeholder="Rep.">
        </div>
      </div>
    `;
  }
};
