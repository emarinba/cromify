/**
 * analytics-api.js - API para Analytics de Administrador
 * Solo accesible para usuarios con rol admin
 */

const AnalyticsAPI = {
  
  /**
   * Verificar que el usuario es admin
   */
  _checkAdmin() {
    if (!Auth.isAdmin()) {
      throw new Error('Acceso denegado: Solo administradores');
    }
  },

  /**
   * Obtener resumen general del dashboard
   */
  async getDashboardSummary() {
    this._checkAdmin();
    
    try {
      const { data, error } = await supabaseClient
        .from('admin_dashboard_summary')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw error;
    }
  },

  /**
   * Obtener usuarios registrados por día
   */
  async getUsersByDay() {
    this._checkAdmin();
    
    try {
      const { data, error } = await supabaseClient
        .from('admin_users_by_day')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting users by day:', error);
      throw error;
    }
  },

  /**
   * Obtener popularidad de álbumes
   */
  async getAlbumsPopularity() {
    this._checkAdmin();
    
    try {
      const { data, error } = await supabaseClient
        .from('admin_albums_popularity')
        .select('*')
        .order('users_joined', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting albums popularity:', error);
      throw error;
    }
  },

  /**
   * Obtener actividad reciente
   */
  async getRecentActivity() {
    this._checkAdmin();
    
    try {
      const { data, error } = await supabaseClient
        .from('admin_recent_activity')
        .select('*')
        .order('activity_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting recent activity:', error);
      throw error;
    }
  },

  /**
   * Obtener distribución de progreso
   */
  async getProgressDistribution() {
    this._checkAdmin();
    
    try {
      const { data, error } = await supabaseClient
        .from('admin_progress_distribution')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting progress distribution:', error);
      throw error;
    }
  },

  /**
   * Obtener top cromos más coleccionados
   */
  async getTopCollectedCards() {
    this._checkAdmin();
    
    try {
      const { data, error } = await supabaseClient
        .from('admin_top_collected_cards')
        .select('*')
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting top collected cards:', error);
      throw error;
    }
  },

  /**
   * Obtener cromos más repetidos
   */
  async getMostDuplicatedCards() {
    this._checkAdmin();
    
    try {
      const { data, error } = await supabaseClient
        .from('admin_most_duplicated_cards')
        .select('*')
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting most duplicated cards:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats() {
    this._checkAdmin();
    
    try {
      const { data, error } = await supabaseClient
        .from('admin_user_stats')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  },

  /**
   * Obtener datos para gráfico de crecimiento de usuarios
   */
  async getUserGrowthChart(days = 30) {
    this._checkAdmin();
    
    try {
      const { data, error } = await supabaseClient
        .rpc('admin_get_user_growth_chart', { days });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user growth chart:', error);
      throw error;
    }
  },

  /**
   * Obtener datos para gráfico de álbumes
   */
  async getAlbumsChart() {
    this._checkAdmin();
    
    try {
      const { data, error } = await supabaseClient
        .rpc('admin_get_albums_chart');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting albums chart:', error);
      throw error;
    }
  }
};
