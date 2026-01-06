/**
 * auth.js - Con localStorage para mantener sesión
 * Una vez logueado, no vuelve a preguntar hasta logout
 */

const Auth = {
  currentUser: null,
  STORAGE_KEY: 'cromify_user',

  /**
   * Inicializar autenticación
   */
  async init() {
    try {
      console.log('🔵 Inicializando Auth...');
      
      // 1. PRIMERO: Intentar cargar desde localStorage
      const storedUser = this.loadFromStorage();
      if (storedUser) {
        console.log('✅ Usuario recuperado de localStorage:', storedUser.email);
        this.currentUser = storedUser;
        return true;
      }
      
      // 2. Si no hay en storage, intentar desde Supabase
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (session) {
        console.log('✅ Sesión encontrada en Supabase:', session.user.email);
        
        // Crear usuario básico desde la sesión
        const user = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
          role: session.user.email === 'marinbalaguer@gmail.com' ? 'admin' : 'user'
        };
        
        this.currentUser = user;
        this.saveToStorage(user);
        
        console.log('✅ Usuario guardado en localStorage');
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
   * Guardar usuario en localStorage
   */
  saveToStorage(user) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
      console.log('💾 Usuario guardado en localStorage');
    } catch (error) {
      console.error('❌ Error guardando en localStorage:', error);
    }
  },

  /**
   * Cargar usuario desde localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        console.log('📦 Usuario cargado desde localStorage:', user.email);
        return user;
      }
      return null;
    } catch (error) {
      console.error('❌ Error cargando desde localStorage:', error);
      return null;
    }
  },

  /**
   * Limpiar localStorage
   */
  clearStorage() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ localStorage limpiado');
    } catch (error) {
      console.error('❌ Error limpiando localStorage:', error);
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
      
      // Guardar en localStorage inmediatamente
      const user = {
        id: data.user.id,
        email: data.user.email,
        name: name,
        role: 'user'
      };
      
      this.currentUser = user;
      this.saveToStorage(user);
      
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

      console.log('✅ Sesión iniciada');
      
      // Guardar en localStorage
      const user = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || email.split('@')[0],
        role: email === 'marinbalaguer@gmail.com' ? 'admin' : 'user'
      };
      
      this.currentUser = user;
      this.saveToStorage(user);
      
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
      
      // 1. Limpiar localStorage PRIMERO (esto siempre funciona)
      this.clearStorage();
      
      // 2. Limpiar currentUser
      this.currentUser = null;
      
      // 3. Intentar cerrar sesión en Supabase (puede fallar si no hay sesión)
      try {
        const { error } = await supabaseClient.auth.signOut();
        if (error && error.message !== 'Auth session missing!') {
          console.warn('⚠️ Error cerrando sesión en Supabase:', error.message);
        } else {
          console.log('✅ Sesión Supabase cerrada');
        }
      } catch (supabaseError) {
        console.warn('⚠️ No se pudo cerrar sesión en Supabase (probablemente ya estaba cerrada)');
      }

      console.log('✅ Sesión cerrada completamente');
      return true;
    } catch (error) {
      console.error('❌ Error en logout:', error);
      // Aunque falle, aseguramos que local está limpio
      this.clearStorage();
      this.currentUser = null;
      return true;
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
      
      if (event === 'SIGNED_IN' && session) {
        console.log('⚡ SIGNED_IN detectado');
        
        // Si ya tenemos usuario en memoria, no hacer nada
        if (this.currentUser) {
          console.log('⚡ Usuario ya en memoria, saltando');
          callback(event, session, this.currentUser);
          return;
        }
        
        // Si no está en memoria, cargar de localStorage
        const storedUser = this.loadFromStorage();
        if (storedUser) {
          console.log('⚡ Usuario cargado de localStorage');
          this.currentUser = storedUser;
          callback(event, session, this.currentUser);
          return;
        }
        
        // Si no está en localStorage, crear desde sesión
        console.log('⚡ Creando usuario desde sesión');
        const user = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
          role: session.user.email === 'marinbalaguer@gmail.com' ? 'admin' : 'user'
        };
        
        this.currentUser = user;
        this.saveToStorage(user);
        
        callback(event, session, this.currentUser);
        
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 SIGNED_OUT detectado');
        this.clearStorage();
        this.currentUser = null;
        callback(event, null, null);
        
      } else if (event === 'INITIAL_SESSION' && session) {
        console.log('⚡ INITIAL_SESSION detectado');
        // No hacer nada, Auth.init() ya lo manejó
        callback(event, session, this.currentUser);
        
      } else {
        callback(event, session, this.currentUser);
      }
    });
  }
};
