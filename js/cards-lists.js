/**
 * cards-lists.js - Listados de Cromos Faltantes y Repetidos
 * Visualización agrupada y desagrupada con opción de copiar
 */

const CardsLists = {
  currentCards: [],
  currentCategories: [],
  missingMode: 'grouped', // 'grouped' o 'ungrouped'
  duplicatesMode: 'grouped',

  /**
   * Abrir modal de cromos faltantes
   */
  openMissingCardsModal(cards, categories) {
    this.currentCards = cards;
    this.currentCategories = categories;
    this.missingMode = 'grouped';

    Utils.openModal('modalMissingCards');
    this.renderMissingCards();
    this.setupMissingListeners();
  },

  /**
   * Abrir modal de cromos repetidos
   */
  openDuplicateCardsModal(cards, categories) {
    this.currentCards = cards;
    this.currentCategories = categories;
    this.duplicatesMode = 'grouped';

    Utils.openModal('modalDuplicateCards');
    this.renderDuplicateCards();
    this.setupDuplicatesListeners();
  },

  /**
   * Renderizar cromos faltantes
   */
  renderMissingCards() {
    const container = document.getElementById('missingCardsContent');
    if (!container) return;

    const missingCards = this.currentCards.filter(c => c.status === 'falta');

    if (missingCards.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <i data-lucide="check-circle"></i>
          <p>¡No te falta ningún cromo! 🎉</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    if (this.missingMode === 'compact') {
      container.innerHTML = this.renderCompact(missingCards);
    } else if (this.missingMode === 'ungrouped') {
      container.innerHTML = this.renderUngrouped(missingCards);
    } else {
      container.innerHTML = this.renderGrouped(missingCards);
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar cromos repetidos
   */
  renderDuplicateCards() {
    const container = document.getElementById('duplicateCardsContent');
    if (!container) return;

    const duplicateCards = this.currentCards.filter(c => 
      c.status === 'tengo' && c.duplicates_count > 0
    );

    if (duplicateCards.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <i data-lucide="inbox"></i>
          <p>No tienes cromos repetidos</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    if (this.duplicatesMode === 'compact') {
      container.innerHTML = this.renderCompact(duplicateCards);
    } else if (this.duplicatesMode === 'ungrouped') {
      container.innerHTML = this.renderUngroupedDuplicates(duplicateCards);
    } else {
      container.innerHTML = this.renderGroupedDuplicates(duplicateCards);
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /**
   * Renderizar desagrupado (lista de números separados por comas)
   */
  renderUngrouped(cards) {
    const sortedCards = Utils.sortCards(cards);
    const numbers = sortedCards.map(c => c.number).join(', ');
    
    return `
      <div class="ungrouped-list">
        <div class="list-count">
          <i data-lucide="hash"></i>
          <span>Total: <strong>${cards.length}</strong> cromos</span>
        </div>
        <div class="numbers-text">${numbers}</div>
      </div>
    `;
  },

  /**
   * Renderizar agrupado (por equipo o categoría)
   */
  renderGrouped(cards) {
    const basicCategory = this.currentCategories.find(c => c.is_basic === true);
    
    // PASO 1: Ordenar TODOS los cromos por número primero
    const sortedCards = Utils.sortCards(cards);
    
    // PASO 2: Agrupar manteniendo el orden numérico
    const groups = new Map();
    const groupOrder = []; // Mantener orden de aparición

    sortedCards.forEach(card => {
      const category = this.currentCategories.find(c => c.id === card.categoryId);
      let groupKey, groupName, groupColor;

      // Si es categoría básica → agrupar por equipo
      if (category && category.id === basicCategory?.id) {
        groupKey = `team_${card.team || 'sin_equipo'}`;
        groupName = card.team || 'Sin equipo';
        groupColor = '#718096';
      } else {
        // Resto → agrupar por categoría
        groupKey = `cat_${card.categoryId || 'sin_categoria'}`;
        groupName = category?.name || 'Sin categoría';
        groupColor = category?.color || '#718096';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          name: groupName,
          color: groupColor,
          cards: []
        });
        groupOrder.push(groupKey); // Registrar orden de aparición
      }

      groups.get(groupKey).cards.push(card);
    });

    // PASO 3: Crear array de grupos EN ORDEN DE APARICIÓN (orden numérico)
    const groupsArray = groupOrder.map(key => groups.get(key));

    return `
      <div class="grouped-list">
        <div class="list-count">
          <i data-lucide="hash"></i>
          <span>Total: <strong>${cards.length}</strong> cromos en <strong>${groupsArray.length}</strong> grupos</span>
        </div>
        ${groupsArray.map(group => {
          // Los cromos ya vienen ordenados, no re-ordenar
          const numbers = group.cards.map(c => c.number).join(', ');
          return `
            <div class="list-group">
              <div class="list-group-header">
                <span class="list-group-dot" style="background: ${group.color};"></span>
                <strong>${Utils.escapeHtml(group.name)}</strong>
                <span class="list-group-count">(${group.cards.length})</span>
              </div>
              <div class="list-group-numbers">${numbers}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /**
   * Renderizar repetidos desagrupados (con cantidad)
   */
  renderUngroupedDuplicates(cards) {
    const sortedCards = Utils.sortCards(cards);
    const numbersWithCount = sortedCards.map(c => 
      `${c.number}${c.duplicates_count > 1 ? ` (×${c.duplicates_count})` : ''}`
    ).join(', ');
    
    const totalDuplicates = sortedCards.reduce((sum, c) => sum + c.duplicates_count, 0);
    
    return `
      <div class="ungrouped-list">
        <div class="list-count">
          <i data-lucide="hash"></i>
          <span>Total: <strong>${totalDuplicates}</strong> cromos repetidos</span>
        </div>
        <div class="numbers-text">${numbersWithCount}</div>
      </div>
    `;
  },

  /**
   * Renderizar repetidos agrupados (con cantidad)
   */
  renderGroupedDuplicates(cards) {
    const basicCategory = this.currentCategories.find(c => c.is_basic === true);
    
    // PASO 1: Ordenar TODOS los cromos por número primero
    const sortedCards = Utils.sortCards(cards);
    
    // PASO 2: Agrupar manteniendo el orden numérico
    const groups = new Map();
    const groupOrder = []; // Mantener orden de aparición

    sortedCards.forEach(card => {
      const category = this.currentCategories.find(c => c.id === card.categoryId);
      let groupKey, groupName, groupColor;

      if (category && category.id === basicCategory?.id) {
        groupKey = `team_${card.team || 'sin_equipo'}`;
        groupName = card.team || 'Sin equipo';
        groupColor = '#718096';
      } else {
        groupKey = `cat_${card.categoryId || 'sin_categoria'}`;
        groupName = category?.name || 'Sin categoría';
        groupColor = category?.color || '#718096';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          name: groupName,
          color: groupColor,
          cards: []
        });
        groupOrder.push(groupKey); // Registrar orden de aparición
      }

      groups.get(groupKey).cards.push(card);
    });

    // PASO 3: Crear array de grupos EN ORDEN DE APARICIÓN (orden numérico)
    const groupsArray = groupOrder.map(key => groups.get(key));

    const totalDuplicates = cards.reduce((sum, c) => sum + c.duplicates_count, 0);

    return `
      <div class="grouped-list">
        <div class="list-count">
          <i data-lucide="hash"></i>
          <span>Total: <strong>${totalDuplicates}</strong> cromos repetidos en <strong>${groupsArray.length}</strong> grupos</span>
        </div>
        ${groupsArray.map(group => {
          // Los cromos ya vienen ordenados, no re-ordenar
          const numbersWithCount = group.cards.map(c => 
            `${c.number}${c.duplicates_count > 1 ? ` (×${c.duplicates_count})` : ''}`
          ).join(', ');
          const groupTotal = group.cards.reduce((sum, c) => sum + c.duplicates_count, 0);
          return `
            <div class="list-group">
              <div class="list-group-header">
                <span class="list-group-dot" style="background: ${group.color};"></span>
                <strong>${Utils.escapeHtml(group.name)}</strong>
                <span class="list-group-count">(${groupTotal} repetidos)</span>
              </div>
              <div class="list-group-numbers">${numbersWithCount}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /**
   * Copiar cromos faltantes al portapapeles
   */
  async copyMissingToClipboard() {
    const missingCards = this.currentCards.filter(c => c.status === 'falta');
    
    if (missingCards.length === 0) {
      Utils.showToast('No hay cromos faltantes', 'info');
      return;
    }

    const text = this.getTextToCopy(missingCards, this.missingMode);
    
    try {
      await navigator.clipboard.writeText(text);
      Utils.showToast('Copiado al portapapeles', 'success');
    } catch (error) {
      console.error('Error copying:', error);
      Utils.showToast('Error al copiar', 'error');
    }
  },

  /**
   * Copiar cromos repetidos al portapapeles
   */
  async copyDuplicatesToClipboard() {
    const duplicateCards = this.currentCards.filter(c => 
      c.status === 'tengo' && c.duplicates_count > 0
    );
    
    if (duplicateCards.length === 0) {
      Utils.showToast('No hay cromos repetidos', 'info');
      return;
    }

    const text = this.getTextToCopyDuplicates(duplicateCards, this.duplicatesMode);
    
    try {
      await navigator.clipboard.writeText(text);
      Utils.showToast('Copiado al portapapeles', 'success');
    } catch (error) {
      console.error('Error copying:', error);
      Utils.showToast('Error al copiar', 'error');
    }
  },

  /**
   * Obtener texto para copiar (faltantes)
   */
  getTextToCopy(cards, mode) {
    if (mode === 'ungrouped') {
      const sortedCards = Utils.sortCards(cards);
      return sortedCards.map(c => c.number).join(', ');
    } else {
      // Agrupado - MANTENER ORDEN NUMÉRICO
      const basicCategory = this.currentCategories.find(c => c.is_basic === true);
      
      // PASO 1: Ordenar todos por número
      const sortedCards = Utils.sortCards(cards);
      
      // PASO 2: Agrupar manteniendo orden
      const groups = new Map();
      const groupOrder = [];

      sortedCards.forEach(card => {
        const category = this.currentCategories.find(c => c.id === card.categoryId);
        let groupKey, groupName;

        if (category && category.id === basicCategory?.id) {
          groupKey = `team_${card.team || 'sin_equipo'}`;
          groupName = card.team || 'Sin equipo';
        } else {
          groupKey = `cat_${card.categoryId || 'sin_categoria'}`;
          groupName = category?.name || 'Sin categoría';
        }

        if (!groups.has(groupKey)) {
          groups.set(groupKey, { name: groupName, cards: [] });
          groupOrder.push(groupKey);
        }
        groups.get(groupKey).cards.push(card);
      });

      // PASO 3: Crear array en orden de aparición (numérico)
      const groupsArray = groupOrder.map(key => groups.get(key));

      return groupsArray.map(group => {
        // Ya vienen ordenados, no re-ordenar
        const numbers = group.cards.map(c => c.number).join(', ');
        return `${group.name}: ${numbers}`;
      }).join('\n'); // UN solo salto de línea (antes: '\n\n')
    }
  },

  /**
   * Obtener texto para copiar (repetidos)
   */
  getTextToCopyDuplicates(cards, mode) {
    if (mode === 'ungrouped') {
      const sortedCards = Utils.sortCards(cards);
      return sortedCards.map(c => 
        `${c.number}${c.duplicates_count > 1 ? ` (×${c.duplicates_count})` : ''}`
      ).join(', ');
    } else {
      // Agrupado - MANTENER ORDEN NUMÉRICO
      const basicCategory = this.currentCategories.find(c => c.is_basic === true);
      
      // PASO 1: Ordenar todos por número
      const sortedCards = Utils.sortCards(cards);
      
      // PASO 2: Agrupar manteniendo orden
      const groups = new Map();
      const groupOrder = [];

      sortedCards.forEach(card => {
        const category = this.currentCategories.find(c => c.id === card.categoryId);
        let groupKey, groupName;

        if (category && category.id === basicCategory?.id) {
          groupKey = `team_${card.team || 'sin_equipo'}`;
          groupName = card.team || 'Sin equipo';
        } else {
          groupKey = `cat_${card.categoryId || 'sin_categoria'}`;
          groupName = category?.name || 'Sin categoría';
        }

        if (!groups.has(groupKey)) {
          groups.set(groupKey, { name: groupName, cards: [] });
          groupOrder.push(groupKey);
        }
        groups.get(groupKey).cards.push(card);
      });

      // PASO 3: Crear array en orden de aparición (numérico)
      const groupsArray = groupOrder.map(key => groups.get(key));

      return groupsArray.map(group => {
        // Ya vienen ordenados, no re-ordenar
        const numbersWithCount = group.cards.map(c => 
          `${c.number}${c.duplicates_count > 1 ? ` (×${c.duplicates_count})` : ''}`
        ).join(', ');
        return `${group.name}: ${numbersWithCount}`;
      }).join('\n'); // UN solo salto de línea (antes: '\n\n')
    }
  },

  /**
   * Setup listeners para modal de faltantes
   */
  setupMissingListeners() {
    const btnUngrouped = document.getElementById('btnMissingUngrouped');
    const btnGrouped = document.getElementById('btnMissingGrouped');
    const btnCompact = document.getElementById('btnMissingCompact');
    const btnCopy = document.getElementById('btnCopyMissing');

    if (btnUngrouped) {
      const newBtn = btnUngrouped.cloneNode(true);
      btnUngrouped.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        this.missingMode = 'ungrouped';
        document.getElementById('btnMissingUngrouped').classList.add('active');
        document.getElementById('btnMissingGrouped').classList.remove('active');
        document.getElementById('btnMissingCompact')?.classList.remove('active');
        this.renderMissingCards();
      });
    }

    if (btnGrouped) {
      const newBtn = btnGrouped.cloneNode(true);
      btnGrouped.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        this.missingMode = 'grouped';
        document.getElementById('btnMissingGrouped').classList.add('active');
        document.getElementById('btnMissingUngrouped').classList.remove('active');
        document.getElementById('btnMissingCompact')?.classList.remove('active');
        this.renderMissingCards();
      });
    }

    if (btnCompact) {
      const newBtn = btnCompact.cloneNode(true);
      btnCompact.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        this.missingMode = 'compact';
        document.getElementById('btnMissingCompact').classList.add('active');
        document.getElementById('btnMissingGrouped').classList.remove('active');
        document.getElementById('btnMissingUngrouped').classList.remove('active');
        this.renderMissingCards();
      });
    }

    if (btnCopy) {
      const newBtn = btnCopy.cloneNode(true);
      btnCopy.replaceWith(newBtn);
      newBtn.addEventListener('click', () => this.copyMissingToClipboard());
    }
  },

  /**
   * Setup listeners para modal de repetidos
   */
  setupDuplicatesListeners() {
    const btnUngrouped = document.getElementById('btnDuplicatesUngrouped');
    const btnGrouped = document.getElementById('btnDuplicatesGrouped');
    const btnCompact = document.getElementById('btnDuplicatesCompact');
    const btnCopy = document.getElementById('btnCopyDuplicates');

    if (btnUngrouped) {
      const newBtn = btnUngrouped.cloneNode(true);
      btnUngrouped.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        this.duplicatesMode = 'ungrouped';
        document.getElementById('btnDuplicatesUngrouped').classList.add('active');
        document.getElementById('btnDuplicatesGrouped').classList.remove('active');
        document.getElementById('btnDuplicatesCompact')?.classList.remove('active');
        this.renderDuplicateCards();
      });
    }

    if (btnGrouped) {
      const newBtn = btnGrouped.cloneNode(true);
      btnGrouped.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        this.duplicatesMode = 'grouped';
        document.getElementById('btnDuplicatesGrouped').classList.add('active');
        document.getElementById('btnDuplicatesUngrouped').classList.remove('active');
        document.getElementById('btnDuplicatesCompact')?.classList.remove('active');
        this.renderDuplicateCards();
      });
    }

    if (btnCompact) {
      const newBtn = btnCompact.cloneNode(true);
      btnCompact.replaceWith(newBtn);
      newBtn.addEventListener('click', () => {
        this.duplicatesMode = 'compact';
        document.getElementById('btnDuplicatesCompact').classList.add('active');
        document.getElementById('btnDuplicatesGrouped').classList.remove('active');
        document.getElementById('btnDuplicatesUngrouped').classList.remove('active');
        this.renderDuplicateCards();
      });
    }

    if (btnCopy) {
      const newBtn = btnCopy.cloneNode(true);
      btnCopy.replaceWith(newBtn);
      newBtn.addEventListener('click', () => this.copyDuplicatesToClipboard());
    }
  },

  /**
   * Renderizar en modo compacto (vista textual agrupada por categorías)
   * Inspirado en formato: Categoría: 1, 2, 3, 4, 5, ...
   */
  renderCompact(cards) {
    if (cards.length === 0) return '';

    // Agrupar por categoría
    const groupedByCategory = {};
    
    cards.forEach(card => {
      const categoryName = card.category?.name || 'Sin categoría';
      if (!groupedByCategory[categoryName]) {
        groupedByCategory[categoryName] = [];
      }
      groupedByCategory[categoryName].push(card.number);
    });

    // Ordenar categorías alfabéticamente
    const sortedCategories = Object.keys(groupedByCategory).sort();

    // Renderizar en formato compacto
    let html = '<div class="cards-list-compact">';
    
    sortedCategories.forEach(categoryName => {
      const numbers = groupedByCategory[categoryName];
      // Ordenar números (pueden ser alfanuméricos)
      numbers.sort((a, b) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });
      
      html += `
        <div class="compact-category-group">
          <strong>${Utils.escapeHtml(categoryName)}:</strong> ${numbers.join(', ')}
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
};
