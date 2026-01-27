/**
 * =====================================================================
 * DASHBOARD.JS - Vista principal con lista de partidas
 * ===================================================================== */

const DashboardView = {
  
  games: [],
  allGames: [], // Guardar todas las partidas sin filtrar
  courses: [],
  filters: {
    courseId: '',
    dateFrom: '',
    dateTo: ''
  },
  
  /**
   * Inicializar dashboard
   */
  async initialize() {
    console.log('📊 Inicializando dashboard...');
    await this.loadGames();
    await this.loadCourses();
  },
  
  /**
   * Cargar partidas desde Supabase
   */
  async loadGames() {
    try {
      const { data, error } = await window.SupabaseAPI.games.getAll();
      
      if (error) {
        throw new Error(error);
      }
      
      this.allGames = data || [];
      this.games = [...this.allGames];
      this.applyFilters();
      
      console.log(`✅ ${this.allGames.length} partidas cargadas`);
      
    } catch (error) {
      console.error('❌ Error cargando partidas:', error);
      Utils.showToast('Error al cargar partidas', 'error');
    }
  },
  
  /**
   * Cargar campos para el filtro
   */
  async loadCourses() {
    try {
      const { data, error } = await window.SupabaseAPI.courses.getAll();
      
      if (error) throw new Error(error);
      
      this.courses = data || [];
      this.populateCourseFilter();
      
    } catch (error) {
      console.error('Error cargando campos:', error);
    }
  },
  
  /**
   * Poblar select de campos en filtro
   */
  populateCourseFilter() {
    const select = document.getElementById('filter-course');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todos los campos</option>' +
      this.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  },
  
  /**
   * Aplicar filtros
   */
  applyFilters() {
    // Obtener valores de filtros
    this.filters.courseId = document.getElementById('filter-course')?.value || '';
    this.filters.dateFrom = document.getElementById('filter-date-from')?.value || '';
    this.filters.dateTo = document.getElementById('filter-date-to')?.value || '';
    
    // Filtrar partidas
    this.games = this.allGames.filter(game => {
      // Filtro por campo
      if (this.filters.courseId && game.course_id !== this.filters.courseId) {
        return false;
      }
      
      // Filtro por fecha desde
      if (this.filters.dateFrom && game.game_date < this.filters.dateFrom) {
        return false;
      }
      
      // Filtro por fecha hasta
      if (this.filters.dateTo && game.game_date > this.filters.dateTo) {
        return false;
      }
      
      return true;
    });
    
    this.render();
  },
  
  /**
   * Limpiar filtros
   */
  clearFilters() {
    document.getElementById('filter-course').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    
    this.filters = {
      courseId: '',
      dateFrom: '',
      dateTo: ''
    };
    
    this.games = [...this.allGames];
    this.render();
  },
  
  /**
   * Renderizar lista de partidas
   */
  render() {
    const container = document.getElementById('games-list');
    const emptyState = document.getElementById('empty-state');
    const noResultsState = document.getElementById('no-results-state');
    
    if (!container) return;
    
    // Si no hay partidas en absoluto
    if (this.allGames.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      if (noResultsState) noResultsState.classList.add('hidden');
      return;
    }
    
    // Si hay partidas pero los filtros no devuelven resultados
    if (this.games.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.add('hidden');
      if (noResultsState) noResultsState.classList.remove('hidden');
      return;
    }
    
    // Hay resultados
    if (emptyState) emptyState.classList.add('hidden');
    if (noResultsState) noResultsState.classList.add('hidden');
    
    container.innerHTML = this.games
      .map(game => Components.renderGameCard(game))
      .join('');
  },
  
  /**
   * Mostrar detalle de partida (modal)
   */
  async showGameDetail(gameId) {
    try {
      const game = this.games.find(g => g.id === gameId);
      
      if (!game) {
        Utils.showToast('Partida no encontrada', 'error');
        return;
      }
      
      const modal = document.getElementById('game-detail-modal');
      const titleEl = document.getElementById('detail-modal-title');
      const bodyEl = document.getElementById('detail-modal-body');
      
      if (titleEl) {
        titleEl.textContent = game.courses?.name || 'Detalle de Partida';
      }
      
      if (bodyEl) {
        bodyEl.innerHTML = Components.renderScorecard(game);
      }
      
      if (modal) {
        modal.classList.add('active');
      }
      
    } catch (error) {
      console.error('Error mostrando detalle:', error);
      Utils.showToast('Error al mostrar detalle', 'error');
    }
  },
  
  /**
   * Editar partida
   */
  editGame(gameId) {
    const game = this.games.find(g => g.id === gameId);
    
    if (!game) {
      Utils.showToast('Partida no encontrada', 'error');
      return;
    }
    
    // Pasar datos a GameView y cambiar a esa vista
    GameView.loadGameForEdit(game);
    GolfApp.navigate('game');
  },
  
  /**
   * Eliminar partida
   */
  async deleteGame(gameId) {
    const confirmed = await Utils.confirm(
      '¿Seguro que quieres eliminar esta partida? Esta acción no se puede deshacer.'
    );
    
    if (!confirmed) return;
    
    try {
      const { error } = await window.SupabaseAPI.games.delete(gameId);
      
      if (error) {
        throw new Error(error);
      }
      
      Utils.showToast('Partida eliminada correctamente', 'success');
      
      // Recargar lista
      await this.loadGames();
      
    } catch (error) {
      console.error('Error eliminando partida:', error);
      Utils.showToast('Error al eliminar partida', 'error');
    }
  }
};

// Exportar
window.DashboardView = DashboardView;

console.log('✅ DashboardView cargado');
