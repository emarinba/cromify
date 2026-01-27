/**
 * =====================================================================
 * SUPABASE CLIENT - MÓDULO DE CONEXIÓN Y OPERACIONES
 * =====================================================================
 */

// =====================================================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN
// =====================================================================

/**
 * ⚠️ IMPORTANTE: Reemplaza con tus credenciales de Supabase
 * Obtén estos valores de: https://app.supabase.com/project/_/settings/api
 */
const SUPABASE_URL = 'https://ynfmwdurzpjavmjbywhm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8Fy1L0P-l-om5qjZEYYNfw_LY6biu0V';

// Verificar que Supabase esté disponible
if (typeof window.supabase === 'undefined') {
  console.error('❌ ERROR: Supabase no está cargado. Verifica que el CDN esté incluido en el HTML.');
}

// Inicializar el cliente de Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variable global para almacenar el usuario actual
let currentUser = null;

// =====================================================================
// 2. GESTIÓN DE AUTENTICACIÓN
// =====================================================================

const SupabaseAuth = {
  /**
   * Registrar nuevo usuario
   */
  async signUp(email, password, metadata = {}) {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Error en signUp:', error);
      return { user: null, error: error.message };
    }
  },

  /**
   * Iniciar sesión
   */
  async signIn(email, password) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      currentUser = data.user;
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error('Error en signIn:', error);
      return { user: null, session: null, error: error.message };
    }
  },

  /**
   * Cerrar sesión
   */
  async signOut() {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      currentUser = null;
      return { error: null };
    } catch (error) {
      console.error('Error en signOut:', error);
      return { error: error.message };
    }
  },

  /**
   * Obtener usuario actual
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      
      if (error) throw error;

      currentUser = user;
      return { user, error: null };
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      return { user: null, error: error.message };
    }
  },

  /**
   * Escuchar cambios en autenticación
   */
  onAuthStateChange(callback) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      callback(event, session);
    });
  },

  /**
   * Restablecer contraseña
   */
  async resetPassword(email) {
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error en resetPassword:', error);
      return { error: error.message };
    }
  }
};

// =====================================================================
// 3. OPERACIONES CON CAMPOS DE GOLF (courses)
// =====================================================================

const SupabaseCourses = {
  /**
   * Obtener todos los campos
   */
  async getAll() {
    try {
      const { data, error } = await supabaseClient
        .from('courses')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener campos:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Obtener un campo por ID
   */
  async getById(courseId) {
    try {
      const { data, error } = await supabaseClient
        .from('courses')
        .select(`
          *,
          course_holes (
            hole_number,
            par,
            stars
          )
        `)
        .eq('id', courseId)
        .single();

      if (error) throw error;

      if (data.course_holes) {
        data.course_holes.sort((a, b) => a.hole_number - b.hole_number);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener campo:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Crear nuevo campo
   */
  async create(courseData) {
    try {
      const { data: course, error: courseError } = await supabaseClient
        .from('courses')
        .insert({
          name: courseData.name,
          location: courseData.location || null
        })
        .select()
        .single();

      if (courseError) throw courseError;

      if (courseData.holes && courseData.holes.length > 0) {
        const holesData = courseData.holes.map(h => ({
          course_id: course.id,
          hole_number: h.hole || h.hole_number,
          par: h.par,
          stars: h.stars || 0
        }));

        const { error: holesError } = await supabaseClient
          .from('course_holes')
          .insert(holesData);

        if (holesError) throw holesError;
      }

      return { data: course, error: null };
    } catch (error) {
      console.error('Error al crear campo:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Actualizar campo
   */
  async update(courseId, updates) {
    try {
      const courseUpdates = {};
      if (updates.name) courseUpdates.name = updates.name;
      if (updates.location !== undefined) courseUpdates.location = updates.location;

      let data = null;
      if (Object.keys(courseUpdates).length > 0) {
        const { data: updatedCourse, error: courseError } = await supabaseClient
          .from('courses')
          .update(courseUpdates)
          .eq('id', courseId)
          .select()
          .single();

        if (courseError) throw courseError;
        data = updatedCourse;
      }

      if (updates.holes && updates.holes.length > 0) {
        await supabaseClient
          .from('course_holes')
          .delete()
          .eq('course_id', courseId);

        const holesData = updates.holes.map(h => ({
          course_id: courseId,
          hole_number: h.hole || h.hole_number,
          par: h.par,
          stars: h.stars || 0
        }));

        const { error: holesError } = await supabaseClient
          .from('course_holes')
          .insert(holesData);

        if (holesError) throw holesError;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error al actualizar campo:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Eliminar campo
   */
  async delete(courseId) {
    try {
      const { error } = await supabaseClient
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error al eliminar campo:', error);
      return { error: error.message };
    }
  }
};

// =====================================================================
// 4. OPERACIONES CON PARTIDAS (games)
// =====================================================================

const SupabaseGames = {
  /**
   * Obtener todas las partidas del usuario actual
   */
  async getAll(filters = {}) {
    try {
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      let query = supabaseClient
        .from('games')
        .select(`
          *,
          courses (
            id,
            name,
            location
          ),
          holes (
            hole_number,
            par,
            stars,
            strokes,
            score_hcp,
            score_sch
          )
        `)
        .eq('user_id', currentUser.id)
        .order('game_date', { ascending: false });

      if (filters.courseId) {
        query = query.eq('course_id', filters.courseId);
      }
      if (filters.startDate) {
        query = query.gte('game_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('game_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      data.forEach(game => {
        if (game.holes) {
          game.holes.sort((a, b) => a.hole_number - b.hole_number);
        }
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener partidas:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Obtener una partida por ID
   */
  async getById(gameId) {
    try {
      const { data, error } = await supabaseClient
        .from('games')
        .select(`
          *,
          courses (
            id,
            name,
            location
          ),
          holes (
            hole_number,
            par,
            stars,
            strokes,
            score_hcp,
            score_sch
          )
        `)
        .eq('id', gameId)
        .single();

      if (error) throw error;

      if (data.holes) {
        data.holes.sort((a, b) => a.hole_number - b.hole_number);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener partida:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Crear nueva partida
   */
  async create(gameData) {
    try {
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const totalStrokes = gameData.holes.reduce((sum, h) => sum + (h.strokes || 0), 0);
      const scoreHcp = gameData.holes.reduce((sum, h) => sum + (h.score_hcp || h.hcp || 0), 0);
      const scoreSch = gameData.holes.reduce((sum, h) => sum + (h.score_sch || h.sch || 0), 0);

      const { data: game, error: gameError } = await supabaseClient
        .from('games')
        .insert({
          user_id: currentUser.id,
          course_id: gameData.courseId || null,
          game_date: gameData.gameDate,
          game_name: gameData.gameName || null,
          handicap_total: gameData.handicapTotal,
          total_strokes: totalStrokes,
          score_hcp: scoreHcp,
          score_sch: scoreSch
        })
        .select()
        .single();

      if (gameError) throw gameError;

      const holesData = gameData.holes.map(h => ({
        game_id: game.id,
        hole_number: h.hole || h.hole_number,
        par: h.par,
        stars: h.stars || 0,
        strokes: h.strokes,
        score_hcp: h.hcp || h.score_hcp || 0,
        score_sch: h.sch || h.score_sch || 0
      }));

      const { error: holesError } = await supabaseClient
        .from('holes')
        .insert(holesData);

      if (holesError) throw holesError;

      return { data: game, error: null };
    } catch (error) {
      console.error('Error al crear partida:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Actualizar partida
   */
  async update(gameId, updates) {
    try {
      console.log('🔄 API: Actualizando partida ID:', gameId);
      console.log('📊 API: Updates recibidos:', {
        courseId: updates.courseId,
        gameDate: updates.gameDate,
        hoyos: updates.holes?.length || 0
      });
      
      if (!gameId) {
        throw new Error('ID de partida no proporcionado');
      }
      
      const gameUpdates = {};
      if (updates.gameDate) gameUpdates.game_date = updates.gameDate;
      if (updates.gameName !== undefined) gameUpdates.game_name = updates.gameName;
      if (updates.handicapTotal !== undefined) gameUpdates.handicap_total = updates.handicapTotal;
      if (updates.courseId !== undefined) gameUpdates.course_id = updates.courseId;

      if (updates.holes && updates.holes.length > 0) {
        const totalStrokes = updates.holes.reduce((sum, h) => sum + (h.strokes || 0), 0);
        const scoreHcp = updates.holes.reduce((sum, h) => sum + (h.score_hcp || h.hcp || 0), 0);
        const scoreSch = updates.holes.reduce((sum, h) => sum + (h.score_sch || h.sch || 0), 0);

        gameUpdates.total_strokes = totalStrokes;
        gameUpdates.score_hcp = scoreHcp;
        gameUpdates.score_sch = scoreSch;

        console.log('🗑️ API: Eliminando hoyos antiguos de partida:', gameId);
        await supabaseClient
          .from('holes')
          .delete()
          .eq('game_id', gameId);

        const holesData = updates.holes.map(h => ({
          game_id: gameId,
          hole_number: h.hole || h.hole_number,
          par: h.par,
          stars: h.stars || 0,
          strokes: h.strokes,
          score_hcp: h.hcp || h.score_hcp || 0,
          score_sch: h.sch || h.score_sch || 0
        }));

        console.log('➕ API: Insertando', holesData.length, 'hoyos nuevos');
        await supabaseClient
          .from('holes')
          .insert(holesData);
      }

      console.log('📝 API: Actualizando tabla games');
      const { data, error } = await supabaseClient
        .from('games')
        .update(gameUpdates)
        .eq('id', gameId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error al actualizar partida:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Eliminar partida
   */
  async delete(gameId) {
    try {
      const { error } = await supabaseClient
        .from('games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error al eliminar partida:', error);
      return { error: error.message };
    }
  }
};

// =====================================================================
// 5. OPERACIONES CON ESTADÍSTICAS
// =====================================================================

const SupabaseStats = {
  /**
   * Obtener estadísticas del usuario actual
   */
  async getUserStats() {
    try {
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabaseClient
        .rpc('get_user_stats', { user_uuid: currentUser.id });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Obtener estadísticas por campo
   */
  async getStatsByCourse() {
    try {
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabaseClient
        .from('games')
        .select(`
          course_id,
          courses (name),
          score_hcp,
          score_sch,
          total_strokes
        `)
        .eq('user_id', currentUser.id)
        .not('course_id', 'is', null);

      if (error) throw error;

      const statsByCourse = {};
      data.forEach(game => {
        const courseName = game.courses?.name || 'Sin campo';
        if (!statsByCourse[courseName]) {
          statsByCourse[courseName] = {
            games: 0,
            totalHcp: 0,
            totalSch: 0,
            totalStrokes: 0
          };
        }
        statsByCourse[courseName].games++;
        statsByCourse[courseName].totalHcp += game.score_hcp;
        statsByCourse[courseName].totalSch += game.score_sch;
        statsByCourse[courseName].totalStrokes += game.total_strokes;
      });

      Object.keys(statsByCourse).forEach(course => {
        const stats = statsByCourse[course];
        stats.avgHcp = Math.round(stats.totalHcp / stats.games);
        stats.avgSch = Math.round(stats.totalSch / stats.games);
        stats.avgStrokes = Math.round(stats.totalStrokes / stats.games);
      });

      return { data: statsByCourse, error: null };
    } catch (error) {
      console.error('Error al obtener estadísticas por campo:', error);
      return { data: null, error: error.message };
    }
  }
};

// =====================================================================
// 6. EXPORTAR API GLOBAL
// =====================================================================

window.SupabaseAPI = {
  auth: SupabaseAuth,
  courses: SupabaseCourses,
  games: SupabaseGames,
  stats: SupabaseStats,
  client: supabaseClient,
  getCurrentUser: () => currentUser
};

console.log('✅ Supabase API inicializada correctamente');
