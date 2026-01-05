/**
 * auth.js - Módulo de Autenticación
 * Gestiona login, registro, logout y sesiones
 * VERSIÓN CORREGIDA
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
      console.log('🔵 Cargando perfil de usuario:', userId);
      
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error cargando perfil:', error);
        throw error;
      }

      console.log('✅ Perfil cargado:', data);
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
      console.log('🔵 Registrando usuario:', email);
      
      // Verificar si el email ya existe en auth.users
      const { data: existingAuthUser } = await supabaseClient.auth.admin?.listUsers();
      
      // Como no tenemos acceso a admin, intentamos el registro directamente
      // Supabase ya maneja la validación de email duplicado
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        console.error('❌ Error en registro:', error);
        
        // Manejar errores específicos
        if (error.message?.includes('already registered')) {
          throw new Error('Este email ya está registrado');
        }
        
        throw error;
      }

      console.log('✅ Usuario registrado:', data);
      
      // El trigger creará automáticamente el perfil en la tabla users
      return data;
    } catch (error) {
      console.error('❌ Error registering:', error);
      throw error;
    }
  },

  /**
   * Iniciar sesión
   */
  async login(email, password) {
    try {
      console.log('🔵 Iniciando sesión:', email);
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Error en login:', error);
        throw error;
      }

      console.log('✅ Sesión iniciada:', data.user.id);
      
      // Intentar cargar perfil con reintentos
      let retries = 3;
      while (retries > 0) {
        try {
          await this.loadUserProfile(data.user.id);
          break;
        } catch (profileError) {
          console.warn(`⚠️ Reintentando cargar perfil... (${retries} intentos restantes)`);
          retries--;
          if (retries === 0) throw profileError;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error logging in:', error);
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
          redirectTo: `${window.location.origin}`,
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
      
      console.log('✅ OAuth iniciado correctamente', data);
      
      // El redirect es automático
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
      console.log('🔵 Cerrando sesión...');
      
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      this.currentUser = null;
      console.log('✅ Sesión cerrada');
      return true;
    } catch (error) {
      console.error('❌ Error logging out:', error);
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
      console.log('🔵 Auth event:', event);
      
      if (event === 'SIGNED_IN' && session) {
        // Esperar un poco para que el trigger cree el usuario
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          await this.loadUserProfile(session.user.id);
        } catch (error) {
          console.error('❌ Error cargando perfil después de login:', error);
          // Reintentar una vez más
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            await this.loadUserProfile(session.user.id);
          } catch (retryError) {
            console.error('❌ Error en reintento:', retryError);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
      }
      
      callback(event, session, this.currentUser);
    });
  }
};
