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
      // Calcular estadísticas desde datos reales ya que las vistas no existen
      
      // 1. Total de usuarios
      const { data: users, error: usersError } = await supabaseClient
        .from('users')
        .select('id, role');
      
      if (usersError) throw usersError;
      
      const totalUsers = users.length;
      const totalRegularUsers = users.filter(u => u.role === 'user').length;
      const totalAdmins = users.filter(u => u.role === 'admin').length;
      
      // 2. Total de álbumes
      const { data: albums, error: albumsError } = await supabaseClient
        .from('albums')
        .select('id');
      
      if (albumsError) throw albumsError;
      const totalAlbums = albums.length;
      
      // 3. Total de master cards
      const { data: masterCards, error: cardsError } = await supabaseClient
        .from('master_cards')
        .select('id');
      
      if (cardsError) throw cardsError;
      const totalMasterCards = masterCards.length;
      
      // 4. Total de cromos en poder de usuarios y repetidos
      const { data: userCards, error: userCardsError } = await supabaseClient
        .from('user_cards')
        .select('id, status, duplicates_count');
      
      if (userCardsError) throw userCardsError;
      
      const totalCardsOwned = userCards.filter(c => c.status === 'tengo').length;
      const totalDuplicates = userCards.reduce((sum, c) => sum + (c.duplicates_count || 0), 0);
      const totalCardsExchanged = userCards.filter(c => c.status === 'cambiado').length;
      
      // 5. Total de colecciones (usuarios que se han unido a álbumes)
      const { data: userCollections, error: collectionsError } = await supabaseClient
        .from('user_collections')
        .select('id');
      
      if (collectionsError) throw collectionsError;
      const totalCollections = userCollections.length;
      
      return {
        total_users: totalUsers,
        total_regular_users: totalRegularUsers,
        total_admins: totalAdmins,
        total_albums: totalAlbums,
        total_master_cards: totalMasterCards,
        total_cards_owned: totalCardsOwned,
        total_duplicates: totalDuplicates,
        total_cards_exchanged: totalCardsExchanged,
        total_collections: totalCollections
      };
      
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      // Retornar datos por defecto en caso de error
      return {
        total_users: 0,
        total_regular_users: 0,
        total_admins: 0,
        total_albums: 0,
        total_master_cards: 0,
        total_cards_owned: 0,
        total_duplicates: 0,
        total_cards_exchanged: 0,
        total_collections: 0
      };
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
      // Consultar álbumes con conteo de usuarios
      const { data: albums, error: albumsError } = await supabaseClient
        .from('albums')
        .select(`
          id,
          name,
          user_collections (
            id
          )
        `);
      
      if (albumsError) throw albumsError;
      
      // Formatear datos
      return albums.map(album => ({
        album_id: album.id,
        album_name: album.name,
        users_joined: album.user_collections ? album.user_collections.length : 0
      })).sort((a, b) => b.users_joined - a.users_joined);
      
    } catch (error) {
      console.error('Error getting albums popularity:', error);
      return [];
    }
  },

  /**
   * Obtener actividad reciente
   */
  async getRecentActivity() {
    this._checkAdmin();
    
    try {
      // Obtener colecciones recientes con información de usuario y álbum
      const { data: userCollections, error } = await supabaseClient
        .from('user_collections')
        .select(`
          id,
          joined_at,
          user:users(email),
          album:albums(name)
        `)
        .order('joined_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Formatear datos
      return userCollections.map(col => ({
        user_id: col.user?.id,
        user_name: col.user?.email || 'Usuario',
        album_name: col.album?.name || 'Álbum',
        activity_type: 'joined',
        activity_date: col.joined_at
      }));
      
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  },

  /**
   * Obtener distribución de progreso
   */
  async getProgressDistribution() {
    this._checkAdmin();
    
    try {
      // Obtener todas las colecciones con sus user_cards
      const { data: userCollections, error } = await supabaseClient
        .from('user_collections')
        .select(`
          id,
          album_id,
          user_cards(status)
        `);
      
      if (error) throw error;
      
      // Calcular progreso por colección
      const distribution = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      
      userCollections.forEach(col => {
        if (!col.user_cards || col.user_cards.length === 0) {
          distribution['0-20']++;
          return;
        }
        
        const total = col.user_cards.length;
        const owned = col.user_cards.filter(c => c.status === 'tengo').length;
        const percentage = Math.round((owned / total) * 100);
        
        if (percentage <= 20) distribution['0-20']++;
        else if (percentage <= 40) distribution['21-40']++;
        else if (percentage <= 60) distribution['41-60']++;
        else if (percentage <= 80) distribution['61-80']++;
        else distribution['81-100']++;
      });
      
      // Formatear como array
      return Object.entries(distribution).map(([range, count]) => ({
        progress_range: range,
        user_count: count
      }));
      
    } catch (error) {
      console.error('Error getting progress distribution:', error);
      return [];
    }
  },

  /**
   * Obtener top cromos más coleccionados
   */
  async getTopCollectedCards() {
    this._checkAdmin();
    
    try {
      // Obtener cromos con conteo de cuántos usuarios los tienen
      const { data: userCards, error } = await supabaseClient
        .from('user_cards')
        .select(`
          master_card_id,
          status,
          master_card:master_cards(
            number,
            player_name,
            team
          )
        `)
        .eq('status', 'tengo');
      
      if (error) throw error;
      
      // Contar por master_card_id
      const counts = {};
      userCards.forEach(uc => {
        if (uc.master_card_id && uc.master_card) {
          if (!counts[uc.master_card_id]) {
            counts[uc.master_card_id] = {
              card_number: uc.master_card.number,
              card_player: uc.master_card.player_name,
              card_team: uc.master_card.team,
              times_collected: 0
            };
          }
          counts[uc.master_card_id].times_collected++;
        }
      });
      
      // Convertir a array y ordenar
      return Object.values(counts)
        .sort((a, b) => b.times_collected - a.times_collected)
        .slice(0, 10);
      
    } catch (error) {
      console.error('Error getting top collected cards:', error);
      return [];
    }
  },

  /**
   * Obtener cromos más repetidos
   */
  async getMostDuplicatedCards() {
    this._checkAdmin();
    
    try {
      // Obtener cromos con sus duplicados
      const { data: userCards, error } = await supabaseClient
        .from('user_cards')
        .select(`
          master_card_id,
          duplicates_count,
          master_card:master_cards(
            number,
            player_name,
            team
          )
        `)
        .gt('duplicates_count', 0);
      
      if (error) throw error;
      
      // Sumar duplicados por master_card_id
      const counts = {};
      userCards.forEach(uc => {
        if (uc.master_card_id && uc.master_card) {
          if (!counts[uc.master_card_id]) {
            counts[uc.master_card_id] = {
              card_number: uc.master_card.number,
              card_player: uc.master_card.player_name,
              card_team: uc.master_card.team,
              total_duplicates: 0
            };
          }
          counts[uc.master_card_id].total_duplicates += uc.duplicates_count;
        }
      });
      
      // Convertir a array y ordenar
      return Object.values(counts)
        .sort((a, b) => b.total_duplicates - a.total_duplicates)
        .slice(0, 10);
      
    } catch (error) {
      console.error('Error getting most duplicated cards:', error);
      return [];
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
      // Intentar usar función RPC si existe
      const { data, error } = await supabaseClient
        .rpc('admin_get_user_growth_chart', { days });

      if (error) {
        // Fallback: generar datos desde tabla users
        const { data: users, error: usersError } = await supabaseClient
          .from('users')
          .select('created_at')
          .order('created_at', { ascending: true });
        
        if (usersError) throw usersError;
        
        // Agrupar por fecha
        const dateMap = {};
        users.forEach(user => {
          const date = new Date(user.created_at).toISOString().split('T')[0];
          dateMap[date] = (dateMap[date] || 0) + 1;
        });
        
        // Convertir a array acumulativo
        let cumulative = 0;
        return Object.entries(dateMap)
          .map(([date, count]) => {
            cumulative += count;
            return { date, total_users: cumulative };
          })
          .slice(-days);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting user growth chart:', error);
      return [];
    }
  },

  /**
   * Obtener datos para gráfico de álbumes
   */
  async getAlbumsChart() {
    this._checkAdmin();
    
    try {
      // Intentar usar función RPC si existe
      const { data, error } = await supabaseClient
        .rpc('admin_get_albums_chart');

      if (error) {
        // Fallback: calcular desde álbumes y colecciones
        const { data: albums, error: albumsError } = await supabaseClient
          .from('albums')
          .select(`
            id,
            name,
            user_collections(id)
          `);
        
        if (albumsError) throw albumsError;
        
        return albums.map(album => ({
          album_name: album.name,
          total_users: album.user_collections ? album.user_collections.length : 0
        }));
      }

      return data || [];
    } catch (error) {
      console.error('Error getting albums chart:', error);
      return [];
    }
  }
};
