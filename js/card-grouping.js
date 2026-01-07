/**
 * card-grouping.js - SIMPLE Y FUNCIONAL
 */

const CardGrouping = {
  expandedGroups: new Set(),

  init() {
    this.expandedGroups = new Set();
  },

  groupCards(cards, categories) {
    if (!cards || cards.length === 0) return [];

    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
    const basicCategory = categories.find(cat => 
      cat.name.toLowerCase() === 'básica' || cat.name.toLowerCase() === 'basica'
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
          color: groupColor
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
      const total = group.cards.length;
      const owned = group.cards.filter(c => c.status === 'tengo').length;
      group.stats = {
        total,
        owned,
        percentage: total > 0 ? Math.round((owned / total) * 100) : 0
      };
      this.expandedGroups.add(group.key);
    });

    return groupsArray;
  },

  isExpanded(groupKey) {
    return this.expandedGroups.has(groupKey);
  },

  toggleGroup(groupKey) {
    if (this.expandedGroups.has(groupKey)) {
      this.expandedGroups.delete(groupKey);
    } else {
      this.expandedGroups.add(groupKey);
    }
  },

  expandAll(groupKeys) {
    groupKeys.forEach(key => this.expandedGroups.add(key));
  },

  collapseAll() {
    this.expandedGroups.clear();
  },

  renderGroupedAlbumView(groups, cardRenderer) {
    if (groups.length === 0) {
      return '<div class="empty-state"><i data-lucide="inbox"></i><p>No hay cromos</p></div>';
    }

    return `
      <div class="groups-controls">
        <button class="btn-text" data-action="expand-all">
          <i data-lucide="chevrons-down"></i> Expandir todos
        </button>
        <button class="btn-text" data-action="collapse-all">
          <i data-lucide="chevrons-up"></i> Colapsar todos
        </button>
      </div>
      <div class="cards-groups-container">
        ${groups.map(group => this.renderGroup(group, cardRenderer, 'album')).join('')}
      </div>
    `;
  },

  renderGroupedListView(groups, cardRenderer) {
    if (groups.length === 0) {
      return '<div class="empty-state"><i data-lucide="inbox"></i><p>No hay cromos</p></div>';
    }

    return `
      <div class="groups-controls">
        <button class="btn-text" data-action="expand-all">
          <i data-lucide="chevrons-down"></i> Expandir todos
        </button>
        <button class="btn-text" data-action="collapse-all">
          <i data-lucide="chevrons-up"></i> Colapsar todos
        </button>
      </div>
      <div class="cards-groups-container list-mode">
        ${groups.map(group => this.renderGroup(group, cardRenderer, 'list')).join('')}
      </div>
    `;
  },

  renderGroup(group, cardRenderer, viewMode) {
    const isExpanded = this.isExpanded(group.key);
    const chevron = isExpanded ? 'chevron-down' : 'chevron-right';
    const stats = group.stats;

    return `
      <div class="card-group ${isExpanded ? 'expanded' : 'collapsed'}" data-group="${group.key}">
        <div class="group-header" data-action="toggle-group" data-group="${group.key}">
          <div class="group-header-content">
            <i data-lucide="${chevron}" class="group-chevron"></i>
            <div class="group-indicator" style="background-color: ${group.color};"></div>
            <h3 class="group-title">${Utils.escapeHtml(group.name)}</h3>
            <div class="group-stats">
              <span class="group-progress"><strong>${stats.owned}</strong> / ${stats.total}</span>
              <span class="group-percentage">${stats.percentage}%</span>
            </div>
          </div>
        </div>
        <div class="group-content" style="display: ${isExpanded ? 'block' : 'none'};">
          ${viewMode === 'album' 
            ? `<div class="cards-album-grid">${group.cards.map(card => cardRenderer(card)).join('')}</div>`
            : `<div class="cards-list">${group.cards.map(card => cardRenderer(card)).join('')}</div>`
          }
        </div>
      </div>
    `;
  }
};

CardGrouping.init();
