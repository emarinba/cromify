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
      console.log('🔵 Inicializando Auth...');
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (session) {
        console.log('✅ Sesión encontrada, cargando perfil...');
        await this.loadUserProfile(session.user.id);
        console.log('✅ Auth inicializado correctamente');
        return true;
      }
      
      console.log('ℹ️ No hay sesión activa');
      return false;
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      return false;
    }
  },

  /**
   * Cargar perfil de usuario
   */
  async loadUserProfile(userId) {
    try {
      console.log('🔵 Cargando perfil de usuario:', userId);
      
      // Si ya está cargado, no volver a cargar
      if (this.currentUser && this.currentUser.id === userId) {
        console.log('⚡ Perfil ya cargado, usando caché');
        return this.currentUser;
      }
      
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error en consulta:', error);
        throw error;
      }
      
      if (!data) {
        console.error('❌ No se encontró el usuario');
        throw new Error('Usuario no encontrado en la base de datos');
      }

      console.log('✅ Perfil cargado:', data.email, 'Role:', data.role);
      this.currentUser = data;
      return data;
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
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
   * Iniciar sesión con Google
   */
  async loginWithGoogle() {
    try {
      console.log('🔵 Iniciando login con Google...');
      
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('❌ Error en OAuth:', error);
        throw error;
      }
      
      console.log('✅ OAuth iniciado correctamente');
      return data;
    } catch (error) {
      console.error('❌ Error logging in with Google:', error);
      
      // Mensajes específicos según el error
      if (error.message?.includes('popup')) {
        throw new Error('Por favor, permite popups para este sitio');
      } else if (error.message?.includes('provider')) {
        throw new Error('Google OAuth no está configurado. Contacta al administrador.');
      }
      
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
      console.log('🔵 Auth event en Auth.js:', event);
      
      // Solo cargar perfil en SIGNED_IN, no en INITIAL_SESSION
      if (event === 'SIGNED_IN' && session && !this.currentUser) {
        console.log('⚡ Cargando perfil por SIGNED_IN...');
        try {
          // Esperar un poco para que el trigger cree el usuario
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.loadUserProfile(session.user.id);
        } catch (error) {
          console.error('❌ Error cargando perfil en SIGNED_IN:', error);
          // Reintentar una vez
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            await this.loadUserProfile(session.user.id);
          } catch (retryError) {
            console.error('❌ Error en reintento:', retryError);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 Limpiando usuario por SIGNED_OUT');
        this.currentUser = null;
      } else if (event === 'INITIAL_SESSION' && session) {
        console.log('⚡ Sesión inicial detectada, dejando que Auth.init() maneje');
        // No cargar perfil aquí, Auth.init() ya lo hace
      }
      
      callback(event, session, this.currentUser);
    });
  }
};
