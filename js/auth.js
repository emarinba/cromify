/**
 * auth.js - VERSIÓN CON TIMEOUT Y DIAGNÓSTICO
 */

const Auth = {
  currentUser: null,
  isLoadingProfile: false,

  /**
   * Inicializar autenticación
   */
  async init() {
    try {
      console.log('🔵 Inicializando Auth...');
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (session) {
        console.log('✅ Sesión encontrada:', session.user.email);
        console.log('🔵 User ID:', session.user.id);
        
        this.isLoadingProfile = true;
        
        try {
          const user = await this.loadUserProfileWithTimeout(session.user.id, 10000); // 10 segundos
          console.log('✅ Auth inicializado correctamente');
          return true;
        } catch (error) {
          console.error('❌ Error cargando perfil en init:', error);
          console.error('🔧 Intentando crear usuario...');
          
          try {
            await this.ensureUserExists(session.user);
            console.log('✅ Usuario creado, Auth inicializado');
            return true;
          } catch (createError) {
            console.error('❌ Error crítico creando usuario:', createError);
            console.error('⚠️ EJECUTA EL SQL DE DIAGNÓSTICO EN SUPABASE');
            return false;
          }
        } finally {
          this.isLoadingProfile = false;
        }
      }
      
      console.log('ℹ️ No hay sesión activa');
      return false;
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      this.isLoadingProfile = false;
      return false;
    }
  },

  /**
   * Cargar perfil con timeout
   */
  async loadUserProfileWithTimeout(userId, timeoutMs = 10000) {
    console.log(`🔵 Cargando perfil con timeout de ${timeoutMs}ms...`);
    
    return Promise.race([
      this.loadUserProfile(userId),
      new Promise((_, reject) => 
        setTimeout(() => {
          console.error(`❌ TIMEOUT después de ${timeoutMs}ms`);
          console.error('⚠️ La consulta está tardando demasiado');
          console.error('💡 Posibles causas:');
          console.error('   1. RLS bloqueando la consulta');
          console.error('   2. Usuario no existe en la tabla users');
          console.error('   3. Índice faltante en la BD');
          reject(new Error(`Timeout cargando perfil después de ${timeoutMs}ms`));
        }, timeoutMs)
      )
    ]);
  },

  /**
   * Asegurar que el usuario existe
   */
  async ensureUserExists(authUser) {
    try {
      console.log('🔧 ensureUserExists para:', authUser.email);
      
      // Intentar cargar primero
      const { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      
      if (existingUser) {
        console.log('✅ Usuario ya existe:', existingUser.email);
        this.currentUser = existingUser;
        return existingUser;
      }
      
      console.log('⚡ Usuario no existe, creando...');
      
      // Crear usuario
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
      
      if (error) {
        console.error('❌ Error en INSERT:', error);
        throw error;
      }
      
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
      
      // Si ya está cargado, usar caché
      if (this.currentUser && this.currentUser.id === userId) {
        console.log('⚡ Perfil ya en caché');
        return this.currentUser;
      }
      
      console.log('🔍 Consultando BD...');
      const startTime = Date.now();
      
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const elapsed = Date.now() - startTime;
      console.log(`⏱️ Consulta tardó ${elapsed}ms`);

      if (error) {
        console.error('❌ Error en consulta:', error);
        console.error('📋 Error code:', error.code);
        console.error('📋 Error message:', error.message);
        console.error('📋 Error details:', error.details);
        throw error;
      }
      
      if (!data) {
        console.error('❌ Consulta devolvió null (usuario no existe o RLS bloqueando)');
        throw new Error('Usuario no encontrado en BD');
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

      console.log('✅ Usuario registrado');
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
      
      this.isLoadingProfile = true;
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('✅ Sesión iniciada:', data.user.id);
      
      // Cargar perfil con timeout de 10 segundos
      try {
        await this.loadUserProfileWithTimeout(data.user.id, 10000);
      } catch (profileError) {
        console.error('❌ Error/timeout cargando perfil, creando usuario...');
        await this.ensureUserExists(data.user);
      } finally {
        this.isLoadingProfile = false;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error en login:', error);
      this.isLoadingProfile = false;
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
      this.isLoadingProfile = false;
      console.log('✅ Sesión cerrada');
      return true;
    } catch (error) {
      console.error('❌ Error logging out:', error);
      throw error;
    }
  },

  /**
   * Verificar si es admin
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
          
          // Si ya está cargando, saltar
          if (this.isLoadingProfile) {
            console.log('⚡ Ya se está cargando perfil, saltando...');
            callback(event, session, this.currentUser);
            return;
          }
          
          // Si ya está cargado, saltar
          if (this.currentUser && this.currentUser.id === session.user.id) {
            console.log('⚡ Usuario ya cargado, saltando...');
            callback(event, session, this.currentUser);
            return;
          }
          
          console.log('⚡ Cargando perfil...');
          this.isLoadingProfile = true;
          
          try {
            // Esperar un poco al trigger
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Cargar con timeout de 10 segundos
            await this.loadUserProfileWithTimeout(session.user.id, 10000);
            console.log('✅ Perfil cargado en SIGNED_IN');
          } catch (error) {
            console.error('❌ Error/timeout en SIGNED_IN, creando usuario...');
            try {
              await this.ensureUserExists(session.user);
            } catch (createError) {
              console.error('❌ Error crítico en SIGNED_IN:', createError);
              console.error('⚠️ EJECUTA EL SQL: DIAGNOSTICO-USUARIO.sql');
            }
          } finally {
            this.isLoadingProfile = false;
          }
          
          callback(event, session, this.currentUser);
          
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 SIGNED_OUT detectado');
          this.currentUser = null;
          this.isLoadingProfile = false;
          callback(event, null, null);
          
        } else if (event === 'INITIAL_SESSION' && session) {
          console.log('⚡ INITIAL_SESSION detectado');
          callback(event, session, this.currentUser);
          
        } else {
          callback(event, session, this.currentUser);
        }
      } catch (error) {
        console.error('❌ Error en onAuthStateChange:', error);
        this.isLoadingProfile = false;
        callback(event, session, null);
      }
    });
  }
};
