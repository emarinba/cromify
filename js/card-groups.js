/**
 * card-groups.js - Sistema de agrupaciones DESDE CERO
 * Simple, funcional, sin complejidad innecesaria
 */

const CardGroups = {
  expanded: new Set(),

  /**
   * Agrupar cromos
   */
  group(cards, categories) {
    if (!cards?.length) return [];

    const catMap = new Map(categories.map(c => [c.id, c]));
    const basic = categories.find(c => c.name.toLowerCase().replace(/á/g, 'a') === 'basica');
    const groups = new Map();

    cards.forEach(card => {
      const cat = catMap.get(card.categoryId);
      let key, name, color;

      if (cat?.id === basic?.id) {
        key = `team_${card.team || 'sin_equipo'}`;
        name = card.team || 'Sin equipo';
        color = '#718096';
      } else {
        key = `cat_${card.categoryId || 'sin_categoria'}`;
        name = cat?.name || 'Sin categoría';
        color = cat?.color || '#718096';
      }

      if (!groups.has(key)) {
        groups.set(key, { key, name, color, cards: [] });
      }
      groups.get(key).cards.push(card);
    });

    const result = Array.from(groups.values());
    
    result.sort((a, b) => {
      if (a.key.startsWith('team_') && !b.key.startsWith('team_')) return -1;
      if (!a.key.startsWith('team_') && b.key.startsWith('team_')) return 1;
      return a.name.localeCompare(b.name);
    });

    result.forEach(g => {
      g.cards = Utils.sortCards(g.cards);
      const owned = g.cards.filter(c => c.status === 'tengo').length;
      g.stats = {
        total: g.cards.length,
        owned,
        percent: Math.round((owned / g.cards.length) * 100)
      };
      this.expanded.add(g.key);
    });

    return result;
  },

  /**
   * Renderizar grupos
   */
  render(groups, cardRenderer) {
    if (!groups.length) {
      return '<div class="empty-state"><i data-lucide="inbox"></i><p>Sin cromos</p></div>';
    }

    return `
      <div class="groups-toolbar">
        <button class="btn-ghost" data-groups-action="expand-all">
          <i data-lucide="chevrons-down"></i>
          Expandir todos
        </button>
        <button class="btn-ghost" data-groups-action="collapse-all">
          <i data-lucide="chevrons-up"></i>
          Colapsar todos
        </button>
      </div>
      <div class="groups-list">
        ${groups.map(g => {
          const exp = this.expanded.has(g.key);
          return `
            <div class="group ${exp ? 'expanded' : 'collapsed'}">
              <button class="group-header" data-groups-action="toggle" data-key="${g.key}">
                <i data-lucide="${exp ? 'chevron-down' : 'chevron-right'}" class="group-icon"></i>
                <span class="group-dot" style="background:${g.color}"></span>
                <h3 class="group-name">${Utils.escapeHtml(g.name)}</h3>
                <div class="group-counter">
                  <strong>${g.stats.owned}</strong>/${g.stats.total}
                  <span class="group-percent">${g.stats.percent}%</span>
                </div>
              </button>
              <div class="group-body" ${exp ? '' : 'hidden'}>
                <div class="cards-grid">
                  ${g.cards.map(cardRenderer).join('')}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /**
   * Setup listeners - Se llama UNA VEZ
   */
  listen(containerId, onUpdate) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.addEventListener('click', e => {
      const action = e.target.closest('[data-groups-action]');
      if (!action) return;

      e.preventDefault();
      const type = action.dataset.groupsAction;

      if (type === 'toggle') {
        const key = action.dataset.key;
        if (this.expanded.has(key)) {
          this.expanded.delete(key);
        } else {
          this.expanded.add(key);
        }
        onUpdate();
      }

      if (type === 'expand-all') {
        document.querySelectorAll('[data-key]').forEach(btn => {
          this.expanded.add(btn.dataset.key);
        });
        onUpdate();
      }

      if (type === 'collapse-all') {
        this.expanded.clear();
        onUpdate();
      }
    });
  }
};
