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
        try {
          await this.loadUserProfile(session.user.id);
          console.log('✅ Auth inicializado correctamente');
          return true;
        } catch (error) {
          console.error('❌ Error cargando perfil en init:', error);
          // Si falla, intentar crear el usuario
          await this.ensureUserExists(session.user);
          return true;
        }
      }
      
      console.log('ℹ️ No hay sesión activa');
      return false;
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      return false;
    }
  },

  /**
   * Asegurar que el usuario existe en la tabla users
   */
  async ensureUserExists(authUser) {
    try {
      console.log('🔧 Verificando si usuario existe en BD...');
      
      // Intentar cargar primero
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (existingUser) {
        console.log('✅ Usuario encontrado:', existingUser.email);
        this.currentUser = existingUser;
        return existingUser;
      }
      
      // Si no existe, crearlo
      console.log('⚡ Creando usuario en BD...');
      const { data: newUser, error } = await supabaseClient
        .from('users')
        .insert([{
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email.split('@')[0],
          role: 'user'
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Usuario creado:', newUser.email);
      this.currentUser = newUser;
      return newUser;
      
    } catch (error) {
      console.error('❌ Error en ensureUserExists:', error);
      throw error;
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
      try {
        await this.loadUserProfile(data.user.id);
      } catch (profileError) {
        console.error('❌ Error cargando perfil, intentando crear usuario...');
        await this.ensureUserExists(data.user);
      }
      
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
   */
  onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('🔵 Auth event:', event, session?.user?.email || 'no session');
      
      try {
        if (event === 'SIGNED_IN' && session) {
          console.log('⚡ SIGNED_IN detectado');
          
          // Solo cargar si no está ya cargado
          if (!this.currentUser || this.currentUser.id !== session.user.id) {
            console.log('⚡ Cargando perfil...');
            
            // Dar tiempo al trigger de crear el usuario
            await new Promise(resolve => setTimeout(resolve, 500));
            
            try {
              await this.loadUserProfile(session.user.id);
            } catch (error) {
              console.error('❌ Error cargando perfil, creando usuario...');
              await this.ensureUserExists(session.user);
            }
          } else {
            console.log('⚡ Usuario ya cargado');
          }
          
          callback(event, session, this.currentUser);
          
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 SIGNED_OUT detectado');
          this.currentUser = null;
          callback(event, null, null);
          
        } else if (event === 'INITIAL_SESSION' && session) {
          console.log('⚡ INITIAL_SESSION detectado (Auth.init() manejará)');
          // No hacer nada, Auth.init() ya carga el perfil
          callback(event, session, this.currentUser);
          
        } else {
          // Otros eventos
          callback(event, session, this.currentUser);
        }
      } catch (error) {
        console.error('❌ Error en onAuthStateChange:', error);
        callback(event, session, null);
      }
    });
  }
};
