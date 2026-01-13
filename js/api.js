/**
 * api.js - Módulo de API
 * Gestiona todas las operaciones de datos con Supabase
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
   * Eliminar álbum (solo admin)
   */
  async deleteAlbum(albumId) {
    try {
      const { error } = await supabaseClient
        .from('albums')
        .delete()
        .eq('id', albumId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting album:', error);
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
   * Verificar si el usuario ya tiene una colección de un álbum
   */
  async hasCollection(albumId) {
    try {
      const userId = Auth.getCurrentUser().id;
      
      const { data, error } = await supabaseClient
        .from('user_collections')
        .select('id')
        .eq('user_id', userId)
        .eq('album_id', albumId)
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    } catch (error) {
      console.error('Error checking collection:', error);
      throw error;
    }
  },

  /**
   * Unirse a una colección (crear colección personal)
   */
  async joinCollection(albumId) {
    try {
      const userId = Auth.getCurrentUser().id;

      // Verificar que no exista ya
      const exists = await this.hasCollection(albumId);
      if (exists) {
        throw new Error('Ya tienes una colección de este álbum');
      }

      const { data, error } = await supabaseClient
        .from('user_collections')
        .insert([{
          user_id: userId,
          album_id: albumId
        }])
        .select()
        .single();

      if (error) throw error;
      
      // El trigger creará automáticamente todos los cromos
      return data;
    } catch (error) {
      console.error('Error joining collection:', error);
      throw error;
    }
  },

  /**
   * Desunirse de una colección (eliminar colección personal)
   */
  async leaveCollection(collectionId) {
    try {
      const userId = Auth.getCurrentUser().id;
      
      const { error } = await supabaseClient
        .from('user_collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', userId); // Seguridad: solo puede borrar sus propias colecciones

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error leaving collection:', error);
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
  }
};
