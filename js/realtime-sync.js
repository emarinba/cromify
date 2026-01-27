/**
 * realtime-sync.js - Sincronización en Tiempo Real con Supabase
 * Propaga cambios del admin a todos los usuarios automáticamente
 */

const RealtimeSync = {
  subscriptions: [],
  isSubscribed: false,
  currentAlbumId: null,

  /**
   * Inicializar suscripciones para un álbum específico
   */
  async subscribeToAlbum(albumId, onChangesCallback) {
    // Desuscribir de álbum anterior si existe
    this.unsubscribeAll();

    this.currentAlbumId = albumId;
    console.log('🔔 Suscribiendo a cambios en álbum:', albumId);

    try {
      // Suscripción 1: Cambios en cromos maestros (master_cards)
      const masterCardsSubscription = supabaseClient
        .channel(`master_cards_${albumId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'master_cards',
            filter: `album_id=eq.${albumId}`
          },
          (payload) => {
            console.log('🔄 Cambio detectado en master_cards:', payload);
            this.handleMasterCardChange(payload, onChangesCallback);
          }
        )
        .subscribe((status) => {
          console.log('📡 Estado suscripción master_cards:', status);
        });

      // Suscripción 2: Cambios en categorías
      const categoriesSubscription = supabaseClient
        .channel(`categories_${albumId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'categories',
            filter: `album_id=eq.${albumId}`
          },
          (payload) => {
            console.log('🔄 Cambio detectado en categories:', payload);
            this.handleCategoryChange(payload, onChangesCallback);
          }
        )
        .subscribe((status) => {
          console.log('📡 Estado suscripción categories:', status);
        });

      // Guardar subscripciones
      this.subscriptions.push(masterCardsSubscription, categoriesSubscription);
      this.isSubscribed = true;

      console.log('✅ Suscripciones activas para álbum:', albumId);
      
    } catch (error) {
      console.error('❌ Error suscribiendo a cambios:', error);
    }
  },

  /**
   * Manejar cambios en master_cards
   */
  async handleMasterCardChange(payload, callback) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    console.log(`🔔 Master Card ${eventType}:`, newRecord || oldRecord);

    // Notificar al usuario
    switch (eventType) {
      case 'INSERT':
        Utils.showToast('📥 Nuevo cromo añadido al álbum', 'info');
        break;
      case 'UPDATE':
        Utils.showToast('✏️ Cromo actualizado', 'info');
        break;
      case 'DELETE':
        Utils.showToast('🗑️ Cromo eliminado del álbum', 'info');
        break;
    }

    // Esperar un momento para que la BD procese los triggers
    await new Promise(resolve => setTimeout(resolve, 500));

    // Recargar datos
    if (callback) {
      await callback();
    }
  },

  /**
   * Manejar cambios en categorías
   */
  async handleCategoryChange(payload, callback) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    console.log(`🔔 Category ${eventType}:`, newRecord || oldRecord);

    // Notificar al usuario
    switch (eventType) {
      case 'INSERT':
        Utils.showToast('📥 Nueva categoría añadida', 'info');
        break;
      case 'UPDATE':
        Utils.showToast('✏️ Categoría actualizada', 'info');
        break;
      case 'DELETE':
        Utils.showToast('🗑️ Categoría eliminada', 'info');
        break;
    }

    // Esperar un momento para que la BD procese los triggers
    await new Promise(resolve => setTimeout(resolve, 500));

    // Recargar datos
    if (callback) {
      await callback();
    }
  },

  /**
   * Desuscribir de todas las suscripciones
   */
  unsubscribeAll() {
    console.log('🔕 Desuscribiendo de cambios...');
    
    this.subscriptions.forEach(subscription => {
      try {
        supabaseClient.removeChannel(subscription);
      } catch (error) {
        console.warn('⚠️ Error removiendo canal:', error);
      }
    });

    this.subscriptions = [];
    this.isSubscribed = false;
    this.currentAlbumId = null;
    
    console.log('✅ Desuscripción completa');
  },

  /**
   * Verificar si hay suscripciones activas
   */
  isActive() {
    return this.isSubscribed && this.subscriptions.length > 0;
  },

  /**
   * Obtener información de suscripciones activas
   */
  getStatus() {
    return {
      isSubscribed: this.isSubscribed,
      albumId: this.currentAlbumId,
      subscriptionsCount: this.subscriptions.length
    };
  }
};
