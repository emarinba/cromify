/**
 * =====================================================================
 * GAME.JS - Vista de nueva partida / editar
 * ===================================================================== */

const GameView = {
  
  editingGameId: null,
  currentCourseId: null,
  holesData: [],
  
  /**
   * Inicializar vista
   */
  async initialize() {
    console.log('🎮 Inicializando vista de juego...');
    
    // Cargar campos para el combo
    await this.loadCourses();
    
    // Establecer fecha actual
    document.getElementById('game-date').value = Utils.getTodayDate();
    
    // Renderizar hoyos vacíos
    this.renderHoles();
  },
  
  /**
   * Cargar campos para el select
   */
  async loadCourses() {
    try {
      const { data, error } = await window.SupabaseAPI.courses.getAll();
      
      if (error) throw new Error(error);
      
      this.updateCourseSelect(data || []);
      
    } catch (error) {
      console.error('Error cargando campos:', error);
    }
  },
  
  /**
   * Actualizar el select de campos
   */
  updateCourseSelect(courses) {
    const select = document.getElementById('game-course-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecciona un campo</option>' + 
      courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  },
  
  /**
   * Cuando cambia el campo seleccionado → PRE-CARGAR configuración
   */
  async onCourseChange() {
    const select = document.getElementById('game-course-select');
    const courseId = select.value;
    
    if (!courseId) {
      // Sin campo → valores por defecto
      this.currentCourseId = null;
      this.renderHoles();
      return;
    }
    
    try {
      // Cargar configuración del campo
      const { data: course, error } = await window.SupabaseAPI.courses.getById(courseId);
      
      if (error || !course) {
        throw new Error('Error cargando campo');
      }
      
      this.currentCourseId = courseId;
      
      // PRE-CARGAR par y estrellas de cada hoyo
      const holes = course.course_holes || [];
      this.renderHoles(holes);
      
      Utils.showToast(`Campo "${course.name}" cargado`, 'success');
      
    } catch (error) {
      console.error('Error cargando configuración del campo:', error);
      Utils.showToast('Error al cargar configuración del campo', 'error');
    }
  },
  
  /**
   * Renderizar tarjetas de hoyos
   */
  renderHoles(courseHoles = []) {
    const container = document.getElementById('holes-container');
    if (!container) return;
    
    const defaultPars = [4, 4, 3, 4, 5, 3, 4, 4, 5, 4, 4, 3, 4, 5, 3, 4, 4, 5];
    
    container.innerHTML = Array.from({ length: 18 }, (_, i) => {
      const holeNumber = i + 1;
      const hole = courseHoles.find(h => h.hole_number === holeNumber);
      const par = hole?.par || defaultPars[i];
      const stars = hole?.stars || 0;
      const strokes = this.holesData[i]?.strokes || '';
      
      return Components.renderHoleCard(holeNumber, par, stars, strokes);
    }).join('');
    
    // Actualizar totales
    this.updateTotals();
  },
  
  /**
   * Actualizar puntuación de un hoyo cuando cambian los golpes o estrellas
   */
  updateHoleScore(holeNumber) {
    const index = holeNumber - 1;
    
    // Obtener valores
    const strokesInput = document.getElementById(`strokes-${holeNumber}`);
    const strokes = strokesInput.value ? parseInt(strokesInput.value) : 0;
    
    // Obtener par y estrellas del DOM
    const holeCard = strokesInput.closest('.hole-card');
    const parText = holeCard.querySelector('.hole-par strong').textContent;
    
    // Leer estrellas desde los botones activos
    const starsGroup = holeCard.querySelector('.hole-stars-toggle');
    const activeStarBtn = starsGroup?.querySelector('.star-toggle-btn.active');
    const stars = activeStarBtn ? parseInt(activeStarBtn.dataset.value) : 0;
    
    const par = parseInt(parText);
    
    // Calcular puntos (solo si hay golpes)
    let scr = 0;
    let hcp = 0;
    
    if (strokes > 0) {
      const points = Utils.calculatePoints(par, stars, strokes);
      scr = points.scr;
      hcp = points.hcp;
    }
    
    // Actualizar display
    document.getElementById(`scr-${holeNumber}`).textContent = scr;
    document.getElementById(`hcp-${holeNumber}`).textContent = hcp;
    
    // Guardar en array
    this.holesData[index] = {
      hole_number: holeNumber,
      par,
      stars,
      strokes,
      scr,
      hcp
    };
    
    // Actualizar totales
    this.updateTotals();
  },
  
  /**
   * Actualizar totales (9 primeros, 9 últimos, total 18)
   */
  updateTotals() {
    const front9 = this.holesData.slice(0, 9);
    const back9 = this.holesData.slice(9, 18);
    
    // Primeros 9
    const frontStrokes = front9.reduce((sum, h) => sum + (h?.strokes || 0), 0);
    const frontScr = front9.reduce((sum, h) => sum + (h?.scr || 0), 0);
    const frontHcp = front9.reduce((sum, h) => sum + (h?.hcp || 0), 0);
    
    document.getElementById('total-front-strokes').textContent = frontStrokes;
    document.getElementById('total-front-scr').textContent = frontScr;
    document.getElementById('total-front-hcp').textContent = frontHcp;
    
    // Últimos 9
    const backStrokes = back9.reduce((sum, h) => sum + (h?.strokes || 0), 0);
    const backScr = back9.reduce((sum, h) => sum + (h?.scr || 0), 0);
    const backHcp = back9.reduce((sum, h) => sum + (h?.hcp || 0), 0);
    
    document.getElementById('total-back-strokes').textContent = backStrokes;
    document.getElementById('total-back-scr').textContent = backScr;
    document.getElementById('total-back-hcp').textContent = backHcp;
    
    // Total 18
    const totalScr = frontScr + backScr;
    const totalHcp = frontHcp + backHcp;
    
    document.getElementById('total-strokes').textContent = frontStrokes + backStrokes;
    document.getElementById('total-scr').textContent = totalScr;
    document.getElementById('total-hcp').textContent = totalHcp;
    
    // Actualizar vista rápida (toggle button)
    const quickScr = document.getElementById('quick-total-scr');
    const quickHcp = document.getElementById('quick-total-hcp');
    if (quickScr) quickScr.textContent = totalScr;
    if (quickHcp) quickHcp.textContent = totalHcp;
  },
  
  /**
   * Toggle del resumen de totales
   */
  toggleTotals() {
    const totalsEl = document.getElementById('game-totals');
    const toggleBtn = document.querySelector('.game-totals-toggle');
    const summaryText = document.getElementById('totals-summary-text');
    
    if (totalsEl && toggleBtn) {
      const isCollapsed = totalsEl.classList.contains('collapsed');
      
      if (isCollapsed) {
        totalsEl.classList.remove('collapsed');
        toggleBtn.classList.add('expanded');
        if (summaryText) summaryText.textContent = 'Ocultar resumen';
      } else {
        totalsEl.classList.add('collapsed');
        toggleBtn.classList.remove('expanded');
        if (summaryText) summaryText.textContent = 'Ver resumen';
      }
    }
  },
  
  /**
   * Guardar partida (nueva o editada)
   */
  async saveGame() {
    try {
      console.log('💾 Iniciando guardado de partida');
      console.log('📊 Estado actual:', {
        editingGameId: this.editingGameId,
        esNueva: !this.editingGameId,
        holesData: this.holesData.length
      });
      
      // Validar fecha
      const gameDate = document.getElementById('game-date').value;
      if (!gameDate) {
        Utils.showToast('Por favor selecciona una fecha', 'warning');
        return;
      }
      
      // Contar hoyos con golpes (validar al menos 1 hoyo jugado)
      const holesWithStrokes = this.holesData.filter(h => h?.strokes > 0).length;
      
      console.log('🎯 Hoyos con golpes:', holesWithStrokes);
      
      if (holesWithStrokes === 0) {
        Utils.showToast('Por favor introduce los golpes de al menos un hoyo', 'warning');
        return;
      }
      
      // Recopilar solo los hoyos con golpes (filtrar vacíos para BD)
      const holes = [];
      for (let i = 1; i <= 18; i++) {
        const strokesInput = document.getElementById(`strokes-${i}`);
        const strokes = parseInt(strokesInput.value) || 0;
        
        // Solo incluir hoyos con golpes > 0
        if (strokes === 0) continue;
        
        const holeCard = strokesInput.closest('.hole-card');
        const par = parseInt(holeCard.querySelector('.hole-par strong').textContent);
        
        // Leer estrellas desde botones activos
        const starsGroup = holeCard.querySelector('.hole-stars-toggle');
        const activeStarBtn = starsGroup?.querySelector('.star-toggle-btn.active');
        const stars = activeStarBtn ? parseInt(activeStarBtn.dataset.value) : 0;
        
        const scr = parseInt(document.getElementById(`scr-${i}`).textContent) || 0;
        const hcp = parseInt(document.getElementById(`hcp-${i}`).textContent) || 0;
        
        holes.push({
          hole: i,
          par,
          stars,
          strokes,
          score_sch: scr,
          score_hcp: hcp
        });
      }
      
      // Construir objeto de partida
      const gameData = {
        courseId: document.getElementById('game-course-select').value || null,
        gameDate: gameDate,
        gameName: document.getElementById('game-name').value.trim() || null,
        handicapTotal: parseInt(document.getElementById('game-handicap').value) || 0,
        holes
      };
      
      console.log('📦 Datos a guardar:', {
        esNueva: !this.editingGameId,
        gameId: this.editingGameId,
        courseId: gameData.courseId,
        fecha: gameData.gameDate,
        hoyosEnviados: holes.length
      });
      
      // Deshabilitar botón
      const btn = document.getElementById('save-game-btn');
      if (btn) {
        btn.disabled = true;
        btn.classList.add('loading');
      }
      
      let result;
      
      if (this.editingGameId) {
        // Actualizar partida existente
        console.log('🔄 ACTUALIZAR partida:', this.editingGameId);
        result = await window.SupabaseAPI.games.update(this.editingGameId, gameData);
        Utils.showToast('Partida actualizada correctamente', 'success');
      } else {
        // Crear nueva partida
        console.log('➕ CREAR nueva partida');
        result = await window.SupabaseAPI.games.create(gameData);
        Utils.showToast('Partida guardada correctamente', 'success');
      }
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      console.log('✅ Partida guardada correctamente, ID:', this.editingGameId || 'nueva');
      
      // Rehabilitar botón ANTES de resetear
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
      
      // CRÍTICO: Resetear ANTES de navegar
      this.reset();
      
      // Volver al dashboard
      GolfApp.navigate('dashboard');
      
    } catch (error) {
      console.error('Error guardando partida:', error);
      Utils.showToast('Error al guardar partida', 'error');
      
      // Restaurar botón
      const btn = document.getElementById('save-game-btn');
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  },
  
  /**
   * Cargar partida para editar
   */
  loadGameForEdit(game) {
    console.log('✏️ Cargando partida para editar:', game.id);
    console.log('📊 Datos de la partida:', {
      id: game.id,
      fecha: game.game_date,
      campo: game.course_id,
      hoyos: game.holes?.length || 0
    });
    
    // CRÍTICO: Establecer ID de edición ANTES de cargar datos
    this.editingGameId = game.id;
    
    // Actualizar título
    const title = document.getElementById('game-view-title');
    if (title) title.textContent = 'Editar Partida';
    
    // Rellenar formulario
    document.getElementById('game-course-select').value = game.course_id || '';
    document.getElementById('game-date').value = game.game_date;
    document.getElementById('game-name').value = game.game_name || '';
    document.getElementById('game-handicap').value = game.handicap_total;
    
    // Crear array completo de 18 hoyos
    // Combinar hoyos guardados con hoyos por defecto
    const savedHoles = game.holes || [];
    const completeHoles = [];
    
    console.log('📝 Hoyos guardados en BD:', savedHoles.length);
    
    for (let i = 1; i <= 18; i++) {
      // Buscar si este hoyo está guardado
      const savedHole = savedHoles.find(h => h.hole_number === i);
      
      if (savedHole) {
        // Usar datos guardados
        completeHoles.push(savedHole);
      } else {
        // Usar defaults (hoyo vacío)
        completeHoles.push({
          hole_number: i,
          par: 4,
          stars: 0,
          strokes: 0,
          score_sch: 0,
          score_hcp: 0
        });
      }
    }
    
    // Actualizar holesData
    this.holesData = completeHoles.map((h, i) => ({
      hole_number: h.hole_number || i + 1,
      par: h.par,
      stars: h.stars,
      strokes: h.strokes || 0,
      scr: h.score_sch || 0,
      hcp: h.score_hcp || 0
    }));
    
    console.log('✅ Estado cargado - editingGameId:', this.editingGameId);
    
    // Renderizar todos los hoyos (18)
    this.renderHolesWithData(completeHoles);
  },
  
  /**
   * Renderizar hoyos con datos de partida existente
   */
  renderHolesWithData(holes) {
    const container = document.getElementById('holes-container');
    if (!container) return;
    
    container.innerHTML = holes.map((h, i) => {
      const holeNumber = h.hole_number || i + 1;
      // Permitir valores 0 o null sin problemas
      const strokes = h.strokes || '';
      return Components.renderHoleCard(holeNumber, h.par, h.stars, strokes);
    }).join('');
    
    this.updateTotals();
  },
  
  /**
   * Resetear formulario y estado
   */
  reset() {
    console.log('🔄 Reseteando GameView');
    
    // CRÍTICO: Limpiar estado de edición
    this.editingGameId = null;
    this.currentCourseId = null;
    this.holesData = [];
    
    // Resetear título
    const title = document.getElementById('game-view-title');
    if (title) title.textContent = 'Nueva Partida';
    
    // Resetear formulario
    document.getElementById('game-course-select').value = '';
    document.getElementById('game-date').value = Utils.getTodayDate();
    document.getElementById('game-name').value = '';
    document.getElementById('game-handicap').value = '20';
    
    // CRÍTICO: Rehabilitar botón guardar
    const btn = document.getElementById('save-game-btn');
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
    
    // Limpiar container de hoyos
    const container = document.getElementById('holes-container');
    if (container) container.innerHTML = '';
    
    // Renderizar hoyos vacíos
    this.renderHoles();
    
    console.log('✅ GameView reseteado');
  }
};

// Exportar
window.GameView = GameView;

console.log('✅ GameView cargado');
