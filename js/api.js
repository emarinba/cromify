/**
 * api.js - Módulo de API
 * Gestiona todas las operaciones de datos con Supabase
 * 
 * CAMBIOS APLICADOS:
 * ✅ joinCollection ahora es IDEMPOTENTE - no falla si los cromos ya existen
 * ✅ leaveCollection mejorado con eliminación robusta por album_id
 * ✅ Limpieza agresiva de huérfanos antes de unirse
 */

const API = {
  
  // ============================================
  // ÁLBUMES (Solo lectura para usuarios normales)
  // ============================================

  /**
   * Obtener todos los álbumes activos
   */
  async getAlbums() {
    try {
      const { data, error } = await supabaseClient
        .from('albums')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting albums:', error);
      throw error;
    }
  },

  /**
   * Obtener álbum por ID
   */
  async getAlbum(albumId) {
    try {
      const { data, error } = await supabaseClient
        .from('albums')
        .select('*')
        .eq('id', albumId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting album:', error);
      throw error;
    }
  },

  /**
   * Crear álbum (solo admin)
   */
  async createAlbum(albumData) {
    try {
      const { data, error } = await supabaseClient
        .from('albums')
        .insert([{
          ...albumData,
          created_by: Auth.getCurrentUser().id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating album:', error);
      throw error;
    }
  },

  /**
   * Actualizar álbum (solo admin)
   */
  async updateAlbum(albumId, albumData) {
    try {
      const { data, error } = await supabaseClient
        .from('albums')
        .update(albumData)
        .eq('id', albumId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating album:', error);
      throw error;
    }
  },

  /**
   * Eliminar álbum COMPLETO con cascada (solo admin)
   * ORDEN: user_cards → user_collections → master_cards → categories → album
   */
  async deleteAlbum(albumId) {
    try {
      const userId = Auth.getCurrentUser().id;
      console.log(`[API] deleteAlbum: albumId=${albumId}, userId=${userId}`);
      
      // PASO 1: Obtener información del álbum para logging
      const { data: album } = await supabaseClient
        .from('albums')
        .select('name')
        .eq('id', albumId)
        .single();
      
      if (album) {
        console.log(`[API] deleteAlbum: Eliminando "${album.name}"`);
      }
      
      // PASO 2: Obtener master_cards del álbum (necesario para eliminar user_cards)
      const { data: masterCards, error: masterError } = await supabaseClient
        .from('master_cards')
        .select('id')
        .eq('album_id', albumId);
      
      if (masterError) {
        console.error('[API] deleteAlbum: Error obteniendo master_cards:', masterError);
        throw masterError;
      }
      
      const masterCardIds = masterCards ? masterCards.map(mc => mc.id) : [];
      console.log(`[API] deleteAlbum: ${masterCardIds.length} master_cards encontrados`);
      
      // PASO 3: Eliminar user_cards (cromos de TODOS los usuarios)
      if (masterCardIds.length > 0) {
        console.log('[API] deleteAlbum: Eliminando user_cards...');
        
        // Eliminar en lotes para evitar URL muy larga
        const BATCH_SIZE = 50;
        let totalUserCardsDeleted = 0;
        
        for (let i = 0; i < masterCardIds.length; i += BATCH_SIZE) {
          const batchIds = masterCardIds.slice(i, i + BATCH_SIZE);
          
          const { data: deleted, error: deleteError } = await supabaseClient
            .from('user_cards')
            .delete()
            .in('master_card_id', batchIds)
            .select('id');
          
          if (deleteError) {
            console.error('[API] deleteAlbum: Error eliminando user_cards lote:', deleteError);
            // Continuar de todos modos
          } else {
            totalUserCardsDeleted += (deleted?.length || 0);
          }
        }
        
        console.log(`[API] deleteAlbum: ✅ ${totalUserCardsDeleted} user_cards eliminados`);
      }
      
      // PASO 4: Eliminar user_collections (colecciones de TODOS los usuarios)
      console.log('[API] deleteAlbum: Eliminando user_collections...');
      const { data: deletedCollections, error: collectionsError } = await supabaseClient
        .from('user_collections')
        .delete()
        .eq('album_id', albumId)
        .select('id');
      
      if (collectionsError) {
        console.error('[API] deleteAlbum: Error eliminando user_collections:', collectionsError);
        // Continuar de todos modos
      } else {
        console.log(`[API] deleteAlbum: ✅ ${deletedCollections?.length || 0} user_collections eliminadas`);
      }
      
      // PASO 5: Eliminar master_cards (cromos maestros del álbum)
      if (masterCardIds.length > 0) {
        console.log('[API] deleteAlbum: Eliminando master_cards...');
        
        const { data: deletedMasterCards, error: masterDeleteError } = await supabaseClient
          .from('master_cards')
          .delete()
          .eq('album_id', albumId)
          .select('id');
        
        if (masterDeleteError) {
          console.error('[API] deleteAlbum: Error eliminando master_cards:', masterDeleteError);
          throw masterDeleteError;
        }
        
        console.log(`[API] deleteAlbum: ✅ ${deletedMasterCards?.length || 0} master_cards eliminados`);
      }
      
      // PASO 6: Eliminar categories (categorías del álbum)
      console.log('[API] deleteAlbum: Eliminando categories...');
      const { data: deletedCategories, error: categoriesError } = await supabaseClient
        .from('categories')
        .delete()
        .eq('album_id', albumId)
        .select('id');
      
      if (categoriesError) {
        console.error('[API] deleteAlbum: Error eliminando categories:', categoriesError);
        // Continuar de todos modos
      } else {
        console.log(`[API] deleteAlbum: ✅ ${deletedCategories?.length || 0} categories eliminadas`);
      }
      
      // PASO 7: Eliminar el álbum
      console.log('[API] deleteAlbum: Eliminando álbum...');
      const { error: albumError } = await supabaseClient
        .from('albums')
        .delete()
        .eq('id', albumId);
      
      if (albumError) {
        console.error('[API] deleteAlbum: Error eliminando álbum:', albumError);
        throw albumError;
      }
      
      console.log('[API] deleteAlbum: ✅ Álbum eliminado');
      
      // PASO 8: Limpiar cache
      this.clearCollectionCache();
      
      console.log('[API] deleteAlbum: ✅✅✅ ELIMINACIÓN COMPLETA EXITOSA');
      return true;
      
    } catch (error) {
      console.error('[API] deleteAlbum: Error final:', error);
      throw error;
    }
  },

  // ============================================
  // CATEGORÍAS
  // ============================================

  /**
   * Obtener categorías de un álbum
   */
  async getCategories(albumId) {
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .select('*')
        .eq('album_id', albumId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  },

  /**
   * Crear categoría (solo admin)
   */
  async createCategory(albumId, categoryData) {
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .insert([{
          album_id: albumId,
          ...categoryData
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  /**
   * Actualizar categoría (solo admin)
   */
  async updateCategory(categoryId, categoryData) {
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .update(categoryData)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  /**
   * Eliminar categoría (solo admin)
   */
  async deleteCategory(categoryId) {
    try {
      const { error } = await supabaseClient
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  // ============================================
  // CROMOS MAESTROS (Solo admin gestiona)
  // ============================================

  /**
   * Obtener cromos maestros de un álbum
   */
  async getMasterCards(albumId) {
    try {
      const { data, error } = await supabaseClient
        .from('master_cards')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('album_id', albumId)
        .order('number');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting master cards:', error);
      throw error;
    }
  },

  /**
   * Crear cromo maestro (solo admin)
   */
  async createMasterCard(cardData) {
    try {
      const { data, error } = await supabaseClient
        .from('master_cards')
        .insert([cardData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating master card:', error);
      throw error;
    }
  },

  /**
   * Actualizar cromo maestro (solo admin)
   */
  async updateMasterCard(cardId, cardData) {
    try {
      const { data, error } = await supabaseClient
        .from('master_cards')
        .update(cardData)
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating master card:', error);
      throw error;
    }
  },

  /**
   * Eliminar cromo maestro (solo admin)
   */
  async deleteMasterCard(cardId) {
    try {
      const { error } = await supabaseClient
        .from('master_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting master card:', error);
      throw error;
    }
  },

  /**
   * Importar cromos maestros en masa (solo admin)
   */
  async importMasterCards(albumId, cardsArray) {
    try {
      const cardsWithAlbum = cardsArray.map(card => ({
        ...card,
        album_id: albumId
      }));

      const { data, error } = await supabaseClient
        .from('master_cards')
        .insert(cardsWithAlbum)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error importing master cards:', error);
      throw error;
    }
  },

  // ============================================
  // COLECCIONES DE USUARIO
  // ============================================

  /**
   * Obtener colecciones del usuario actual
   */
  async getUserCollections() {
    try {
      const userId = Auth.getCurrentUser().id;
      
      // Primero traer las colecciones con sus álbumes
      const { data: collections, error: collectionsError } = await supabaseClient
        .from('user_collections')
        .select(`
          *,
          album:albums(*)
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

      if (collectionsError) throw collectionsError;
      
      if (!collections || collections.length === 0) {
        return [];
      }
      
      // Para cada colección, traer los user_cards del usuario para ese álbum
      const collectionsWithCards = await Promise.all(
        collections.map(async (collection) => {
          const { data: userCards, error: cardsError } = await supabaseClient
            .from('user_cards')
            .select('id, master_card_id, status, duplicates_count')
            .eq('user_id', userId)
            .eq('collection_id', collection.id);
          
          if (cardsError) {
            console.error('Error getting user cards for collection:', cardsError);
            return { ...collection, user_cards: [] };
          }
          
          return {
            ...collection,
            user_cards: userCards || []
          };
        })
      );
      
      return collectionsWithCards;
    } catch (error) {
      console.error('Error getting user collections:', error);
      throw error;
    }
  },

  /**
   * Limpiar todo el cache de verificación de colecciones
   * Útil después de operaciones de join/leave para asegurar datos frescos
   */
  clearCollectionCache() {
    console.log('[API] Limpiando cache de hasCollection');
    this._hasCollectionCache = {};
  },

  /**
   * Verificar si usuario tiene colección de un álbum
   * Con cache temporal para evitar race conditions
   */
  async hasCollection(albumId, force = false) {
    try {
      const userId = Auth.getCurrentUser().id;
      const cacheKey = `has_collection_${userId}_${albumId}`;
      
      // Cache temporal de 1 segundo para prevenir race conditions
      if (!force && this._hasCollectionCache && this._hasCollectionCache[cacheKey]) {
        const cached = this._hasCollectionCache[cacheKey];
        if (Date.now() - cached.timestamp < 1000) {
          console.log(`[API] hasCollection (CACHE): albumId=${albumId}, exists=${cached.value}`);
          return cached.value;
        } else {
          console.log(`[API] hasCollection (CACHE EXPIRED): albumId=${albumId}`);
        }
      }
      
      console.log(`[API] hasCollection (QUERY BD): albumId=${albumId}`);
      const { data, error } = await supabaseClient
        .from('user_collections')
        .select('id')
        .eq('user_id', userId)
        .eq('album_id', albumId)
        .maybeSingle();

      if (error) throw error;
      
      const exists = data !== null;
      console.log(`[API] hasCollection (RESULT): albumId=${albumId}, exists=${exists}`, data ? `(collection_id: ${data.id})` : '');
      
      // Guardar en cache
      if (!this._hasCollectionCache) this._hasCollectionCache = {};
      this._hasCollectionCache[cacheKey] = {
        value: exists,
        timestamp: Date.now()
      };
      
      return exists;
    } catch (error) {
      console.error('Error checking collection:', error);
      throw error;
    }
  },

  /**
   * Limpiar cache de hasCollection para un álbum específico o todo
   */
  clearCollectionCache(albumId = null) {
    if (!this._hasCollectionCache) return;
    
    if (albumId) {
      // Limpiar cache de un álbum específico
      const userId = Auth.getCurrentUser()?.id;
      if (userId) {
        const cacheKey = `has_collection_${userId}_${albumId}`;
        delete this._hasCollectionCache[cacheKey];
        console.log(`[API] Cache limpiado para álbum: ${albumId}`);
      }
    } else {
      // Limpiar todo el cache
      this._hasCollectionCache = {};
      console.log('[API] Cache completo limpiado');
    }
  },

  /**
   * NUEVA FUNCIÓN: Limpiar TODOS los cromos de un usuario para un álbum específico
   * Usa album_id para eliminar SIN depender de collection_id
   * VERSIÓN MEJORADA: Más agresiva y con mejor manejo de errores
   */
  async cleanAllUserCardsForAlbum(userId, albumId) {
    try {
      console.log(`[API] cleanAllUserCardsForAlbum: userId=${userId}, albumId=${albumId}`);
      
      // ESTRATEGIA 1: Eliminar directamente por user_id y consultando master_cards
      // Esto es más eficiente y seguro
      
      // 1. Obtener todos los master_card_ids del álbum
      const { data: masterCards, error: masterError } = await supabaseClient
        .from('master_cards')
        .select('id')
        .eq('album_id', albumId);
      
      if (masterError) {
        console.error('[API] cleanAllUserCardsForAlbum: Error obteniendo master_cards:', masterError);
        throw masterError;
      }
      
      if (!masterCards || masterCards.length === 0) {
        console.log('[API] cleanAllUserCardsForAlbum: No hay master_cards en este álbum');
        return 0;
      }
      
      const masterCardIds = masterCards.map(c => c.id);
      console.log(`[API] cleanAllUserCardsForAlbum: ${masterCardIds.length} master_cards en el álbum`);
      
      // 2. Verificar cuántos user_cards existen ANTES de eliminar
      const { count: beforeCount, error: countError } = await supabaseClient
        .from('user_cards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('master_card_id', masterCardIds.slice(0, 100)); // Solo contar muestra
      
      if (!countError) {
        console.log(`[API] cleanAllUserCardsForAlbum: ~${beforeCount || 0} cromos a eliminar (aprox.)`);
      }
      
      // 3. Eliminar en lotes más pequeños (30 items) para mayor estabilidad
      const BATCH_SIZE = 30;
      let totalDeleted = 0;
      let batchErrors = 0;
      
      for (let i = 0; i < masterCardIds.length; i += BATCH_SIZE) {
        const batchIds = masterCardIds.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i/BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(masterCardIds.length/BATCH_SIZE);
        
        console.log(`[API] cleanAllUserCardsForAlbum: Lote ${batchNum}/${totalBatches} (${batchIds.length} items)`);
        
        try {
          const { data: deleted, error: deleteError, count } = await supabaseClient
            .from('user_cards')
            .delete({ count: 'exact' })
            .eq('user_id', userId)
            .in('master_card_id', batchIds)
            .select('id');
          
          if (deleteError) {
            console.error(`[API] cleanAllUserCardsForAlbum: Error en lote ${batchNum}:`, deleteError);
            batchErrors++;
            // NO lanzar error, continuar con siguiente lote
            continue;
          }
          
          const deletedCount = deleted?.length || 0;
          totalDeleted += deletedCount;
          
          if (deletedCount > 0) {
            console.log(`[API] cleanAllUserCardsForAlbum: Lote ${batchNum} → ${deletedCount} eliminados`);
          }
          
        } catch (batchError) {
          console.error(`[API] cleanAllUserCardsForAlbum: Excepción en lote ${batchNum}:`, batchError);
          batchErrors++;
          // Continuar con siguiente lote
        }
      }
      
      console.log(`[API] cleanAllUserCardsForAlbum: ✅ TOTAL: ${totalDeleted} cromos eliminados`);
      
      if (batchErrors > 0) {
        console.warn(`[API] cleanAllUserCardsForAlbum: ⚠️  ${batchErrors} lotes fallaron`);
      }
      
      // 4. VERIFICACIÓN FINAL: Contar cuántos quedan
      const { count: afterCount, error: afterCountError } = await supabaseClient
        .from('user_cards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('master_card_id', masterCardIds.slice(0, 100));
      
      if (!afterCountError && afterCount > 0) {
        console.warn(`[API] cleanAllUserCardsForAlbum: ⚠️  Aún quedan ~${afterCount} cromos (puede ser normal si el álbum es muy grande)`);
      } else if (!afterCountError && afterCount === 0) {
        console.log(`[API] cleanAllUserCardsForAlbum: ✅ Verificación: 0 cromos restantes`);
      }
      
      return totalDeleted;
      
    } catch (error) {
      console.error('[API] cleanAllUserCardsForAlbum: Error crítico:', error);
      // NO lanzar el error - queremos que joinCollection continúe
      return 0;
    }
  },

  /**
   * Unirse a una colección
   * VERSIÓN SIN TRIGGER: Crea cromos manualmente
   */
  async joinCollection(albumId) {
    try {
      const userId = Auth.getCurrentUser().id;
      console.log(`[API] joinCollection: albumId=${albumId}, userId=${userId}`);

      // PASO 1: Limpiar cache
      this.clearCollectionCache(albumId);
      
      // PASO 2: Verificar si YA existe la colección
      const { data: existingColl } = await supabaseClient
        .from('user_collections')
        .select('*')
        .eq('user_id', userId)
        .eq('album_id', albumId)
        .maybeSingle();
      
      if (existingColl) {
        console.log('[API] joinCollection: ✅ Ya existe');
        await this._ensureNoOrphanedCards(userId, albumId, existingColl.id);
        return existingColl;
      }
      
      // PASO 3: DIAGNÓSTICO - Ver qué cromos existen realmente
      console.log('[API] joinCollection: DIAGNÓSTICO - Verificando cromos existentes...');
      const { data: existingCards, error: diagError } = await supabaseClient
        .from('user_cards')
        .select('id, collection_id, master_card_id')
        .eq('user_id', userId)
        .limit(10);
      
      if (existingCards && existingCards.length > 0) {
        console.warn(`[API] joinCollection: ⚠️ ENCONTRADOS ${existingCards.length} cromos del usuario:`);
        existingCards.forEach((card, idx) => {
          console.log(`  ${idx+1}. card_id=${card.id}, collection_id=${card.collection_id}, master_card_id=${card.master_card_id}`);
        });
        
        // Ver si son de este álbum
        const { data: masterCards } = await supabaseClient
          .from('master_cards')
          .select('id, album_id, number')
          .in('id', existingCards.map(c => c.master_card_id).slice(0, 10));
        
        if (masterCards) {
          console.log('[API] joinCollection: Master cards de esos cromos:');
          masterCards.forEach(mc => {
            const isThisAlbum = mc.album_id === albumId;
            console.log(`  - master_card ${mc.id} (${mc.number}) → album=${mc.album_id} ${isThisAlbum ? '⚠️ ES DE ESTE ÁLBUM' : ''}`);
          });
        }
      } else {
        console.log('[API] joinCollection: ✅ No hay cromos del usuario en BD');
      }
      
      // PASO 4: LIMPIEZA AGRESIVA SIN IMPORTAR QUE DIGA EL COUNT
      console.log('[API] joinCollection: LIMPIEZA AGRESIVA - Eliminando cromos directamente...');
      
      // Eliminar colecciones huérfanas
      await supabaseClient
        .from('user_collections')
        .delete()
        .eq('user_id', userId)
        .eq('album_id', albumId);
      
      // Obtener master_cards del álbum
      const { data: masterCardsToDelete } = await supabaseClient
        .from('master_cards')
        .select('id')
        .eq('album_id', albumId);
      
      if (masterCardsToDelete && masterCardsToDelete.length > 0) {
        console.log(`[API] joinCollection: Intentando eliminar cromos de ${masterCardsToDelete.length} master_cards...`);
        
        // Eliminar en lotes pequeños
        const BATCH = 20;
        let realDeleted = 0;
        
        for (let i = 0; i < masterCardsToDelete.length; i += BATCH) {
          const batch = masterCardsToDelete.slice(i, i + BATCH);
          const batchIds = batch.map(mc => mc.id);
          
          const { data: deleted } = await supabaseClient
            .from('user_cards')
            .delete()
            .eq('user_id', userId)
            .in('master_card_id', batchIds)
            .select('id');
          
          if (deleted && deleted.length > 0) {
            realDeleted += deleted.length;
            console.log(`[API] joinCollection: Lote ${i/BATCH + 1}: ${deleted.length} eliminados`);
          }
          
          await new Promise(r => setTimeout(r, 200));
        }
        
        console.log(`[API] joinCollection: ✅ ${realDeleted} cromos eliminados en total`);
      }
      
      // Esperar para que BD procese
      await new Promise(r => setTimeout(r, 1500));
      
      // VERIFICACIÓN FINAL
      const { count: finalCount } = await supabaseClient
        .from('user_cards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      console.log(`[API] joinCollection: Verificación final: ${finalCount} cromos totales del usuario en BD`);
      
      console.log('[API] joinCollection: ✅ Limpieza completa');
      
      // PASO 5: Crear colección
      console.log('[API] joinCollection: Creando colección...');
      const { data: newCollection, error: collError } = await supabaseClient
        .from('user_collections')
        .insert([{ user_id: userId, album_id: albumId }])
        .select()
        .single();
      
      if (collError) {
        console.error('[API] joinCollection: Error creando colección:', collError);
        
        if (collError.code === '23505') {
          // Buscar la colección que pudo crearse
          const { data: found } = await supabaseClient
            .from('user_collections')
            .select('*')
            .eq('user_id', userId)
            .eq('album_id', albumId)
            .maybeSingle();
          
          if (found) {
            console.log('[API] joinCollection: Colección encontrada:', found.id);
            // Continuar con creación de cromos
            newCollection = found;
          } else {
            throw new Error('No se pudo crear ni encontrar la colección');
          }
        } else {
          throw collError;
        }
      }
      
      console.log('[API] joinCollection: ✅ Colección creada:', newCollection.id);
      
      // PASO 6: Crear cromos MANUALMENTE
      console.log('[API] joinCollection: Creando cromos manualmente...');
      
      try {
        await this._createUserCardsManually(userId, newCollection.id, albumId);
        console.log('[API] joinCollection: ✅ Cromos creados manualmente');
      } catch (cardsError) {
        console.warn('[API] joinCollection: Error creando cromos:', cardsError);
        if (cardsError.code !== '23505') {
          console.error('[API] joinCollection: Error inesperado con cromos:', cardsError);
        }
      }
      
      console.log('[API] joinCollection: ✅ ÉXITO TOTAL');
      this.clearCollectionCache(albumId);
      return newCollection;
      
    } catch (error) {
      console.error('[API] joinCollection: Error final:', error);
      throw error;
    }
  },

  /**
   * FUNCIÓN MEJORADA: Desunirse de una colección
   * Ahora elimina cromos usando album_id en lugar de collection_id
   */
  async leaveCollection(collectionId) {
    try {
      const userId = Auth.getCurrentUser().id;
      
      console.log(`[API] leaveCollection: collectionId=${collectionId}`);
      
      // PASO 1: Obtener album_id de la colección ANTES de eliminarla
      const { data: collection, error: getError } = await supabaseClient
        .from('user_collections')
        .select('album_id')
        .eq('id', collectionId)
        .eq('user_id', userId)
        .single();
      
      if (getError) {
        console.error('[API] leaveCollection: Error obteniendo colección:', getError);
        throw getError;
      }
      
      if (!collection) {
        throw new Error('Colección no encontrada');
      }
      
      const albumId = collection.album_id;
      console.log(`[API] leaveCollection: album_id=${albumId}`);
      
      // PASO 2: Eliminar TODOS los user_cards del usuario para este álbum
      // Usar la función robusta que trabaja con album_id
      console.log('[API] leaveCollection: Eliminando cromos...');
      const deleted = await this.cleanAllUserCardsForAlbum(userId, albumId);
      console.log(`[API] leaveCollection: ✅ ${deleted} cromos eliminados`);
      
      // PASO 3: Ahora sí, eliminar la colección
      console.log('[API] leaveCollection: Eliminando colección...');
      const { error: deleteError } = await supabaseClient
        .from('user_collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', userId); // Seguridad: solo puede borrar sus propias colecciones

      if (deleteError) {
        console.error('[API] leaveCollection: Error eliminando colección:', deleteError);
        throw deleteError;
      }
      
      console.log('[API] leaveCollection: ✅ Colección eliminada');
      
      // PASO 4: Limpiar cache
      this.clearCollectionCache(albumId);
      
      return true;
      
    } catch (error) {
      console.error('[API] leaveCollection: Error:', error);
      throw error;
    }
  },

  /**
   * Obtener colección específica
   */
  async getCollection(collectionId) {
    try {
      const { data, error } = await supabaseClient
        .from('user_collections')
        .select(`
          *,
          album:albums(*)
        `)
        .eq('id', collectionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting collection:', error);
      throw error;
    }
  },

  /**
   * Recargar cromos de usuario (obtiene versión actualizada desde master_cards)
   */
  async reloadUserCards(collectionId) {
    try {
      // Esto forzará a que Supabase recalcule los cromos desde master_cards
      // Si el trigger está bien configurado, debería sincronizar automáticamente
      const cards = await this.getUserCards(collectionId);
      return cards;
    } catch (error) {
      console.error('Error reloading user cards:', error);
      throw error;
    }
  },

  // ============================================
  // CROMOS DE USUARIO
  // ============================================

  /**
   * Obtener cromos de una colección del usuario
   */
  async getUserCards(collectionId) {
    try {
      const { data, error } = await supabaseClient
        .from('user_cards')
        .select(`
          *,
          master_card:master_cards(
            *,
            category:categories(*)
          )
        `)
        .eq('collection_id', collectionId)
        .order('master_card(number)');

      if (error) throw error;
      
      // Aplanar la estructura para facilitar el uso
      return (data || []).map(uc => ({
        id: uc.id,
        user_id: uc.user_id,
        collection_id: uc.collection_id,
        master_card_id: uc.master_card_id,
        status: uc.status,
        duplicates_count: uc.duplicates_count,
        notes: uc.notes,
        // Datos del cromo maestro
        number: uc.master_card.number,
        playerName: uc.master_card.player_name,
        team: uc.master_card.team,
        categoryId: uc.master_card.category_id,
        category: uc.master_card.category
      }));
    } catch (error) {
      console.error('Error getting user cards:', error);
      throw error;
    }
  },

  /**
   * Actualizar estado de un cromo
   */
  async updateUserCard(userCardId, updates) {
    try {
      const { data, error } = await supabaseClient
        .from('user_cards')
        .update(updates)
        .eq('id', userCardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user card:', error);
      throw error;
    }
  },

  /**
   * Actualizar múltiples cromos (cambio masivo de categoría)
   */
  async updateMultipleUserCards(userCardIds, updates) {
    try {
      const { data, error } = await supabaseClient
        .from('user_cards')
        .update(updates)
        .in('id', userCardIds)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating multiple cards:', error);
      throw error;
    }
  },

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  /**
   * Obtener estadísticas de una colección
   */
  async getCollectionStats(collectionId) {
    try {
      const { data, error } = await supabaseClient
        .from('user_collection_stats')
        .select('*')
        .eq('collection_id', collectionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting collection stats:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas generales del usuario
   */
  async getUserStats() {
    try {
      const userId = Auth.getCurrentUser().id;
      
      const { data, error } = await supabaseClient
        .from('user_collection_stats')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  },

  /**
   * HELPER PRIVADO: Workaround para datos inconsistentes
   * Actualiza collection_id de cromos huérfanos
   * @private
   */
  async _ensureNoOrphanedCards(userId, albumId, collectionId) {
    try {
      const { data: masterCards } = await supabaseClient
        .from('master_cards')
        .select('id')
        .eq('album_id', albumId);
      
      if (!masterCards || masterCards.length === 0) return 0;
      
      const masterCardIds = masterCards.map(c => c.id);
      
      // Actualizar cromos con collection_id NULL o diferente
      const { data: updated, error } = await supabaseClient
        .from('user_cards')
        .update({ collection_id: collectionId })
        .eq('user_id', userId)
        .in('master_card_id', masterCardIds)
        .or(`collection_id.is.null,collection_id.neq.${collectionId}`)
        .select('id');
      
      if (!error && updated && updated.length > 0) {
        console.log(`[API] _ensureNoOrphanedCards: ✅ ${updated.length} cromos huérfanos corregidos`);
      }
      
      return updated?.length || 0;
      
    } catch (error) {
      console.error('[API] _ensureNoOrphanedCards: Error:', error);
      return 0;
    }
  },

  /**
   * HELPER PRIVADO: Crear cromos manualmente (sin trigger)
   * @private
   */
  async _createUserCardsManually(userId, collectionId, albumId) {
    try {
      console.log('[API] _createUserCardsManually: Obteniendo master_cards...');
      
      // Obtener todos los master_cards del álbum
      const { data: masterCards, error: masterError } = await supabaseClient
        .from('master_cards')
        .select('id')
        .eq('album_id', albumId);
      
      if (masterError) throw masterError;
      if (!masterCards || masterCards.length === 0) {
        console.warn('[API] _createUserCardsManually: No hay master_cards');
        return 0;
      }
      
      console.log(`[API] _createUserCardsManually: ${masterCards.length} master_cards encontrados`);
      
      // Crear user_cards en lotes (para no sobrecargar)
      const BATCH_SIZE = 100;
      let totalCreated = 0;
      
      for (let i = 0; i < masterCards.length; i += BATCH_SIZE) {
        const batch = masterCards.slice(i, i + BATCH_SIZE);
        
        const userCardsToInsert = batch.map(mc => ({
          user_id: userId,
          collection_id: collectionId,
          master_card_id: mc.id,
          status: 'falta'
        }));
        
        const { data: inserted, error: insertError } = await supabaseClient
          .from('user_cards')
          .insert(userCardsToInsert)
          .select('id');
        
        if (insertError) {
          // Si es error de duplicados, usar UPSERT
          if (insertError.code === '23505') {
            console.log(`[API] _createUserCardsManually: Lote ${i} - usando UPSERT...`);
            
            // Intentar uno por uno con upsert
            for (const card of userCardsToInsert) {
              await supabaseClient
                .from('user_cards')
                .upsert(card, { onConflict: 'user_id,master_card_id' });
            }
            
            totalCreated += batch.length;
          } else {
            throw insertError;
          }
        } else {
          totalCreated += (inserted?.length || 0);
        }
        
        console.log(`[API] _createUserCardsManually: Lote ${i}-${i+batch.length} completado`);
      }
      
      console.log(`[API] _createUserCardsManually: ✅ ${totalCreated} cromos creados`);
      return totalCreated;
      
    } catch (error) {
      console.error('[API] _createUserCardsManually: Error:', error);
      throw error;
    }
  }
};
