/**
 * =====================================================================
 * COMPONENTS.JS - Componentes reutilizables
 * ===================================================================== */

const Components = {
  
  /**
   * Renderizar card de partida en dashboard
   */
  renderGameCard(game) {
    return `
      <div class="game-card" onclick="event.stopPropagation()">
        <div class="game-card-header">
          <div class="game-card-info">
            <h3>${Utils.sanitizeHTML(game.courses?.name || 'Sin campo')}</h3>
            <div class="game-card-meta">
              ${game.courses?.location ? `
                <span>📍 ${Utils.sanitizeHTML(game.courses.location)}</span>
              ` : ''}
              <span>📅 ${Utils.formatDate(game.game_date)}</span>
              ${game.game_name ? `
                <span>🏆 ${Utils.sanitizeHTML(game.game_name)}</span>
              ` : ''}
            </div>
          </div>
        </div>
        
        <div class="game-card-scores">
          <div class="game-card-score">
            <span class="game-card-score-label">SCR</span>
            <span class="game-card-score-value score-scr">${game.score_sch || 0}</span>
          </div>
          <div class="game-card-score">
            <span class="game-card-score-label">HCP</span>
            <span class="game-card-score-value score-hcp">${game.score_hcp || 0}</span>
          </div>
        </div>
        
        <div class="game-card-actions">
          <button class="game-card-action-view" onclick="DashboardView.showGameDetail('${game.id}')">
            👁️ Ver
          </button>
          <button class="game-card-action-edit" onclick="DashboardView.editGame('${game.id}')">
            ✏️ Editar
          </button>
          <button class="game-card-action-delete" onclick="DashboardView.deleteGame('${game.id}')">
            🗑️
          </button>
        </div>
      </div>
    `;
  },
  
  /**
   * Renderizar card de campo
   */
  renderCourseCard(course) {
    return `
      <div class="course-card">
        <div class="course-card-header">
          <h3>${Utils.sanitizeHTML(course.name)}</h3>
          ${course.location ? `
            <div class="course-card-location">
              📍 ${Utils.sanitizeHTML(course.location)}
            </div>
          ` : ''}
        </div>
        
        <div class="course-card-actions">
          <button class="btn-secondary" onclick="CoursesView.editCourse('${course.id}')">
            ✏️ Editar
          </button>
          <button class="btn-danger" onclick="CoursesView.deleteCourse('${course.id}')">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    `;
  },
  
  /**
   * Renderizar tarjeta de hoyo en nueva partida
   */
  renderHoleCard(holeNumber, par = 4, stars = 0, strokes = '') {
    const { scr, hcp } = Utils.calculatePoints(par, stars, strokes);
    
    return `
      <div class="hole-card">
        <div class="hole-card-header">
          <div class="hole-number">${holeNumber}</div>
          <div class="hole-info">
            <div class="hole-par">
              <span>Par</span>
              <strong>${par}</strong>
            </div>
            <div class="hole-stars-editable">
              <span>★</span>
              <div class="hole-stars-toggle" data-hole="${holeNumber}">
                <button type="button" class="star-toggle-btn ${stars === 0 ? 'active' : ''}" data-value="0" onclick="Components.selectGameStars(${holeNumber}, 0)">0</button>
                <button type="button" class="star-toggle-btn ${stars === 1 ? 'active' : ''}" data-value="1" onclick="Components.selectGameStars(${holeNumber}, 1)">1</button>
                <button type="button" class="star-toggle-btn ${stars === 2 ? 'active' : ''}" data-value="2" onclick="Components.selectGameStars(${holeNumber}, 2)">2</button>
                <button type="button" class="star-toggle-btn ${stars === 3 ? 'active' : ''}" data-value="3" onclick="Components.selectGameStars(${holeNumber}, 3)">3</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="hole-card-body">
          <div class="hole-strokes-input">
            <label>Golpes</label>
            <input 
              type="number" 
              id="strokes-${holeNumber}"
              data-hole="${holeNumber}"
              min="1" 
              max="20" 
              value="${strokes}"
              oninput="GameView.updateHoleScore(${holeNumber})"
              placeholder="-"
            >
          </div>
          
          <div class="hole-score">
            <span class="hole-score-label">SCR</span>
            <span class="hole-score-value score-scr" id="scr-${holeNumber}">${scr}</span>
          </div>
          
          <div class="hole-score">
            <span class="hole-score-label">HCP</span>
            <span class="hole-score-value score-hcp" id="hcp-${holeNumber}">${hcp}</span>
          </div>
        </div>
      </div>
    `;
  },
  
  /**
   * Seleccionar estrellas en partida (sin modificar campo base)
   */
  selectGameStars(holeNumber, stars) {
    // Desactivar todos los botones del grupo
    const group = document.querySelector(`.hole-stars-toggle[data-hole="${holeNumber}"]`);
    if (!group) return;
    
    group.querySelectorAll('.star-toggle-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Activar el botón seleccionado
    const selectedBtn = group.querySelector(`[data-value="${stars}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add('active');
    }
    
    // Recalcular puntos del hoyo
    if (typeof GameView !== 'undefined') {
      GameView.updateHoleScore(holeNumber);
    }
  },
  
  /**
   * Renderizar input de hoyo en modal de campo
   */
  renderCourseHoleInput(holeNumber, par = 4, stars = 0) {
    return `
      <div class="course-hole-item">
        <div class="course-hole-number">${holeNumber}</div>
        <div class="course-hole-config">
          <div class="course-hole-field">
            <label>Par</label>
            <div class="course-toggle-group" data-hole="${holeNumber}" data-field="par">
              <button type="button" class="course-toggle-btn ${par === 3 ? 'active' : ''}" data-value="3" onclick="Components.selectCourseValue(${holeNumber}, 'par', 3)">3</button>
              <button type="button" class="course-toggle-btn ${par === 4 ? 'active' : ''}" data-value="4" onclick="Components.selectCourseValue(${holeNumber}, 'par', 4)">4</button>
              <button type="button" class="course-toggle-btn ${par === 5 ? 'active' : ''}" data-value="5" onclick="Components.selectCourseValue(${holeNumber}, 'par', 5)">5</button>
            </div>
          </div>
          <div class="course-hole-field">
            <label>★</label>
            <div class="course-toggle-group" data-hole="${holeNumber}" data-field="stars">
              <button type="button" class="course-toggle-btn ${stars === 0 ? 'active' : ''}" data-value="0" onclick="Components.selectCourseValue(${holeNumber}, 'stars', 0)">0</button>
              <button type="button" class="course-toggle-btn ${stars === 1 ? 'active' : ''}" data-value="1" onclick="Components.selectCourseValue(${holeNumber}, 'stars', 1)">1</button>
              <button type="button" class="course-toggle-btn ${stars === 2 ? 'active' : ''}" data-value="2" onclick="Components.selectCourseValue(${holeNumber}, 'stars', 2)">2</button>
              <button type="button" class="course-toggle-btn ${stars === 3 ? 'active' : ''}" data-value="3" onclick="Components.selectCourseValue(${holeNumber}, 'stars', 3)">3</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  
  /**
   * Seleccionar valor en configuración de campo (par o estrellas)
   */
  selectCourseValue(holeNumber, field, value) {
    // Desactivar todos los botones del grupo
    const group = document.querySelector(`.course-toggle-group[data-hole="${holeNumber}"][data-field="${field}"]`);
    if (!group) return;
    
    group.querySelectorAll('.course-toggle-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Activar el botón seleccionado
    const selectedBtn = group.querySelector(`[data-value="${value}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add('active');
    }
  },
  
  /**
   * Renderizar scorecard completa
   */
  renderScorecard(game) {
    const holes = game.holes || [];
    
    // Dividir en dos mitades
    const frontNine = holes.slice(0, 9);
    const backNine = holes.slice(9, 18);
    
    // Identificar mejores y peores hoyos por rendimiento HCP
    // Criterio: Puntos HCP (más alto = mejor rendimiento)
    const holesWithStrokes = holes.filter(h => h.strokes > 0);
    
    let bestHoles = [];
    let worstHoles = [];
    
    if (holesWithStrokes.length > 0) {
      // Ordenar por puntos HCP
      const sortedByHcp = [...holesWithStrokes].sort((a, b) => b.score_hcp - a.score_hcp);
      
      // Top 3 mejores hoyos (mayor puntuación HCP)
      const numBest = Math.min(3, Math.ceil(holesWithStrokes.length * 0.2));
      bestHoles = sortedByHcp.slice(0, numBest).map(h => h.hole_number);
      
      // Top 3 peores hoyos (menor puntuación HCP)
      const numWorst = Math.min(3, Math.ceil(holesWithStrokes.length * 0.2));
      worstHoles = sortedByHcp.slice(-numWorst).map(h => h.hole_number);
    }
    
    // Función para obtener clase de rendimiento
    const getPerformanceClass = (holeNumber) => {
      if (bestHoles.includes(holeNumber)) return 'hole-best';
      if (worstHoles.includes(holeNumber)) return 'hole-worst';
      return '';
    };
    
    // Calcular totales
    const totalFrontScr = frontNine.reduce((sum, h) => sum + (h.score_sch || 0), 0);
    const totalFrontHcp = frontNine.reduce((sum, h) => sum + (h.score_hcp || 0), 0);
    const totalFrontStrokes = frontNine.reduce((sum, h) => sum + (h.strokes || 0), 0);
    
    const totalBackScr = backNine.reduce((sum, h) => sum + (h.score_sch || 0), 0);
    const totalBackHcp = backNine.reduce((sum, h) => sum + (h.score_hcp || 0), 0);
    const totalBackStrokes = backNine.reduce((sum, h) => sum + (h.strokes || 0), 0);
    
    return `
      <div class="scorecard">
        <div class="scorecard-header">
          <h4>${Utils.sanitizeHTML(game.courses?.name || 'Sin campo')}</h4>
          <div class="scorecard-meta">
            ${Utils.formatDate(game.game_date)} • 
            ${game.game_name ? Utils.sanitizeHTML(game.game_name) + ' • ' : ''}
            Hándicap ${game.handicap_total}
          </div>
        </div>
        
        <div class="scorecard-summary">
          <div class="scorecard-summary-item">
            <span class="scorecard-summary-label">Golpes</span>
            <span class="scorecard-summary-value">${game.total_strokes || 0}</span>
          </div>
          <div class="scorecard-summary-item">
            <span class="scorecard-summary-label">SCR</span>
            <span class="scorecard-summary-value scr">${game.score_sch || 0}</span>
          </div>
          <div class="scorecard-summary-item">
            <span class="scorecard-summary-label">HCP</span>
            <span class="scorecard-summary-value hcp">${game.score_hcp || 0}</span>
          </div>
        </div>
        
        <div class="scorecard-legend">
          <span class="legend-item"><span class="legend-dot best"></span>Mejores hoyos</span>
          <span class="legend-item"><span class="legend-dot worst"></span>Peores hoyos</span>
        </div>
        
        <!-- Primeros 9 -->
        <table class="scorecard-table">
          <thead>
            <tr>
              <th>Hoyo</th>
              ${frontNine.map(h => `<th class="${getPerformanceClass(h.hole_number)}">${h.hole_number}</th>`).join('')}
              <th class="total-cell">OUT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Par</td>
              ${frontNine.map(h => `<td class="${getPerformanceClass(h.hole_number)}">${h.par}</td>`).join('')}
              <td class="total-cell">${frontNine.reduce((sum, h) => sum + h.par, 0)}</td>
            </tr>
            <tr>
              <td>★</td>
              ${frontNine.map(h => `<td class="${getPerformanceClass(h.hole_number)}">${h.stars}</td>`).join('')}
              <td class="total-cell">-</td>
            </tr>
            <tr class="strokes-row">
              <td>Golpes</td>
              ${frontNine.map(h => `<td class="${getPerformanceClass(h.hole_number)}">${h.strokes || '-'}</td>`).join('')}
              <td class="total-cell">${totalFrontStrokes}</td>
            </tr>
            <tr class="scr-row">
              <td>SCR</td>
              ${frontNine.map(h => `<td class="${getPerformanceClass(h.hole_number)}">${h.score_sch || 0}</td>`).join('')}
              <td class="total-cell">${totalFrontScr}</td>
            </tr>
            <tr class="hcp-row">
              <td>HCP</td>
              ${frontNine.map(h => `<td class="${getPerformanceClass(h.hole_number)}">${h.score_hcp || 0}</td>`).join('')}
              <td class="total-cell">${totalFrontHcp}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- Últimos 9 -->
        <table class="scorecard-table" style="margin-top: 2rem;">
          <thead>
            <tr>
              <th>Hoyo</th>
              ${backNine.map(h => `<th class="${getPerformanceClass(h.hole_number)}">${h.hole_number}</th>`).join('')}
              <th class="total-cell">IN</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Par</td>
              ${backNine.map(h => `<td class="${getPerformanceClass(h.hole_number)}">${h.par}</td>`).join('')}
              <td class="total-cell">${backNine.reduce((sum, h) => sum + h.par, 0)}</td>
            </tr>
            <tr>
              <td>★</td>
              ${backNine.map(h => `<td class="${getPerformanceClass(h.hole_number)}">${h.stars}</td>`).join('')}
              <td class="total-cell">-</td>
            </tr>
            <tr class="strokes-row">
              <td>Golpes</td>
              ${backNine.map(h => `<td class="${getPerformanceClass(h.hole_number)}">${h.strokes || '-'}</td>`).join('')}
              <td class="total-cell">${totalBackStrokes}</td>
            </tr>
            <tr class="scr-row">
              <td>SCR</td>
              ${backNine.map(h => `<td class="${getPerformanceClass(h.hole_number)}">${h.score_sch || 0}</td>`).join('')}
              <td class="total-cell">${totalBackScr}</td>
            </tr>
            <tr class="hcp-row">
              <td>HCP</td>
              ${backNine.map(h => `<td class="${getPerformanceClass(h.hole_number)}">${h.score_hcp || 0}</td>`).join('')}
              <td class="total-cell">${totalBackHcp}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- Total 18 -->
        <table class="scorecard-table" style="margin-top: 2rem; background: var(--bg-tertiary);">
          <thead>
            <tr>
              <th>TOTAL 18</th>
              <th class="total-cell">Par</th>
              <th class="total-cell">Golpes</th>
              <th class="total-cell">SCR</th>
              <th class="total-cell">HCP</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight: bold;">Totales</td>
              <td class="total-cell">${holes.reduce((sum, h) => sum + h.par, 0)}</td>
              <td class="total-cell">${game.total_strokes || 0}</td>
              <td class="total-cell scr-row">${game.score_sch || 0}</td>
              <td class="total-cell hcp-row">${game.score_hcp || 0}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  },
  
  /**
   * Renderizar empty state
   */
  renderEmptyState(icon, title, text, buttonText, buttonAction) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <h3 class="empty-title">${title}</h3>
        <p class="empty-text">${text}</p>
        ${buttonText ? `
          <button class="btn-primary" onclick="${buttonAction}">
            ${buttonText}
          </button>
        ` : ''}
      </div>
    `;
  }
};

// Exportar
window.Components = Components;

console.log('✅ Components cargado');
