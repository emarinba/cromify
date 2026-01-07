/**
 * card-groups.js - CON LOGS DE DEBUG
 */

const CardGroups = {
  expanded: new Set(),

  group(cards, categories) {
    console.log('🔵 CardGroups.group() - Iniciando agrupación');
    console.log('   Cards:', cards?.length);
    console.log('   Categories:', categories?.length);
    
    if (!cards?.length) {
      console.log('⚠️  Sin cards, retornando []');
      return [];
    }

    const catMap = new Map(categories.map(c => [c.id, c]));
    const basic = categories.find(c => c.name.toLowerCase().replace(/á/g, 'a') === 'basica');
    console.log('   Categoría básica encontrada:', basic?.name);
    
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
    console.log('   Grupos creados:', result.length);
    result.forEach(g => console.log('      -', g.name, ':', g.cards.length, 'cromos'));
    
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

    console.log('   Grupos expandidos:', Array.from(this.expanded));
    console.log('✅ CardGroups.group() - Completado');
    return result;
  },

  render(groups, cardRenderer) {
    console.log('🔵 CardGroups.render() - Renderizando');
    console.log('   Grupos a renderizar:', groups.length);
    
    if (!groups.length) {
      console.log('⚠️  Sin grupos, retornando empty state');
      return '<div class="empty-state"><i data-lucide="inbox"></i><p>Sin cromos</p></div>';
    }

    const html = `
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
          console.log('   Renderizando grupo:', g.name, '- Expandido:', exp);
          return `
            <div class="group ${exp ? 'expanded' : 'collapsed'}" data-group-id="${g.key}">
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
    
    console.log('✅ CardGroups.render() - HTML generado');
    return html;
  },

  listen(containerId, onUpdate) {
    console.log('🔵 CardGroups.listen() - Configurando listeners');
    console.log('   Container ID:', containerId);
    
    const el = document.getElementById(containerId);
    if (!el) {
      console.error('❌ Contenedor NO encontrado:', containerId);
      return;
    }
    
    console.log('✅ Contenedor encontrado:', el);

    el.addEventListener('click', e => {
      console.log('═══════════════════════════════════════');
      console.log('🔴 CLICK DETECTADO');
      console.log('   Target:', e.target);
      console.log('   Target.tagName:', e.target.tagName);
      console.log('   Target.className:', e.target.className);
      
      const action = e.target.closest('[data-groups-action]');
      console.log('   Closest [data-groups-action]:', action);
      
      if (!action) {
        console.log('⚠️  NO es un elemento de grupos, ignorando');
        console.log('═══════════════════════════════════════');
        return;
      }

      e.preventDefault();
      console.log('✅ Elemento de grupos detectado');
      
      const type = action.dataset.groupsAction;
      console.log('   Action type:', type);

      if (type === 'toggle') {
        const key = action.dataset.key;
        console.log('   🔵 TOGGLE GROUP');
        console.log('      Key:', key);
        console.log('      Estado actual:', this.expanded.has(key) ? 'EXPANDIDO' : 'COLAPSADO');
        
        if (this.expanded.has(key)) {
          console.log('      ➡️  Colapsando...');
          this.expanded.delete(key);
        } else {
          console.log('      ➡️  Expandiendo...');
          this.expanded.add(key);
        }
        
        console.log('      Nuevo estado:', this.expanded.has(key) ? 'EXPANDIDO' : 'COLAPSADO');
        console.log('      Grupos expandidos ahora:', Array.from(this.expanded));
        console.log('      🔄 Llamando onUpdate()...');
        
        onUpdate();
        console.log('      ✅ onUpdate() completado');
      }

      if (type === 'expand-all') {
        console.log('   🔵 EXPAND ALL');
        const buttons = document.querySelectorAll('[data-key]');
        console.log('      Botones encontrados:', buttons.length);
        buttons.forEach(btn => {
          const k = btn.dataset.key;
          console.log('         Expandiendo:', k);
          this.expanded.add(k);
        });
        console.log('      🔄 Llamando onUpdate()...');
        onUpdate();
        console.log('      ✅ onUpdate() completado');
      }

      if (type === 'collapse-all') {
        console.log('   🔵 COLLAPSE ALL');
        console.log('      Grupos antes:', Array.from(this.expanded));
        this.expanded.clear();
        console.log('      Grupos después:', Array.from(this.expanded));
        console.log('      🔄 Llamando onUpdate()...');
        onUpdate();
        console.log('      ✅ onUpdate() completado');
      }
      
      console.log('═══════════════════════════════════════');
    });
    
    console.log('✅ CardGroups.listen() - Listeners configurados');
  }
};
