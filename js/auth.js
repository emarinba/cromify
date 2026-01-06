/**
 * auth.js - Versión SIMPLE que funciona
 * Sin timeout, sin complejidad - Solo protección contra doble carga
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
   * Cargar perfil de usuario - CON PROTECCIÓN CONTRA DOBLE CARGA
   */
  async loadUserProfile(userId) {
    try {
      console.log('🔵 Cargando perfil de usuario:', userId);
      
      // ✅ CLAVE: Si ya está cargado, usar caché
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
      console.log('🔵 Registrando usuario:', email);
      
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      if (error) throw error;

      console.log('✅ Usuario registrado:', data);
      return data;
    } catch (error) {
      console.error('❌ Error registrando:', error);
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

      if (error) throw error;

      console.log('✅ Sesión iniciada:', data.user.id);
      
      // Cargar perfil inmediatamente
      await this.loadUserProfile(data.user.id);
      
      return data;
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  },

  /**
   * Login con Google
   */
  async loginWithGoogle() {
    try {
      console.log('🔵 Iniciando login con Google...');
      
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;
      
      console.log('✅ Redirigiendo a Google...');
      return data;
    } catch (error) {
      console.error('❌ Error en Google login:', error);
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
   * ✅ CLAVE: Solo cargar si NO está ya cargado
   */
  onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('🔵 Auth event:', event, session?.user?.email || 'no session');
      
      if (event === 'SIGNED_IN' && session && !this.currentUser) {
        // ✅ Solo cargar si NO está cargado
        console.log('⚡ Cargando perfil por SIGNED_IN...');
        try {
          // Esperar un poco para que el trigger cree el usuario
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.loadUserProfile(session.user.id);
        } catch (error) {
          console.error('❌ Error cargando perfil en SIGNED_IN:', error);
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
