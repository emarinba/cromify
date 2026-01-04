/**
 * auth.js - Módulo de Autenticación
 * Gestiona login, registro, logout y sesiones
 */

const Auth = {
  currentUser: null,

  /**
   * Inicializar autenticación
   */
  async init() {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (session) {
        await this.loadUserProfile(session.user.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing auth:', error);
      return false;
    }
  },

  /**
   * Cargar perfil de usuario
   */
  async loadUserProfile(userId) {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      this.currentUser = data;
      return data;
    } catch (error) {
      console.error('Error loading user profile:', error);
      throw error;
    }
  },

  /**
   * Registrar nuevo usuario
   */
  async register(email, password, name) {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (error) throw error;

      // El trigger creará automáticamente el perfil en la tabla users
      return data;
    } catch (error) {
      console.error('Error registering:', error);
      throw error;
    }
  },

  /**
   * Iniciar sesión
   */
  async login(email, password) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      await this.loadUserProfile(data.user.id);
      return data;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      this.currentUser = null;
      return true;
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },

  /**
   * Verificar si el usuario es admin
   */
  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  },

  /**
   * Obtener usuario actual
   */
  getCurrentUser() {
    return this.currentUser;
  },

  /**
   * Escuchar cambios de autenticación
   */
  onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
      }
      callback(event, session, this.currentUser);
    });
  }
};
