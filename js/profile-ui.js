/**
 * profile-ui.js - Gestión de Perfil/Cuenta de Usuario
 */

const ProfileUI = {
  /**
   * Mostrar vista de perfil
   */
  async showProfile() {
    try {
      Utils.showLoader();
      Utils.showView('viewProfile');
      
      await Promise.all([
        this.loadUserInfo(),
        this.loadUserCollections(),
        this.loadUserStats()
      ]);
      
      this.setupProfileListeners();
      
    } catch (error) {
      console.error('Error loading profile:', error);
      Utils.showToast('Error al cargar perfil', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Cargar información del usuario
   */
  async loadUserInfo() {
    try {
      const user = Auth.currentUser;
      if (!user) return;

      // Avatar
      const avatarLarge = document.getElementById('profileAvatarLarge');
      if (avatarLarge) {
        if (user.avatar_url) {
          avatarLarge.style.backgroundImage = `url(${user.avatar_url})`;
          avatarLarge.textContent = '';
        } else {
          const initial = (user.full_name || user.email).charAt(0).toUpperCase();
          avatarLarge.textContent = initial;
          avatarLarge.style.backgroundImage = 'none';
        }
      }

      // Nombre completo
      const fullNameEl = document.getElementById('profileFullName');
      if (fullNameEl) {
        fullNameEl.textContent = user.full_name || 'Sin nombre';
      }

      // Nickname
      const nicknameEl = document.getElementById('profileNickname');
      if (nicknameEl) {
        nicknameEl.textContent = user.nickname || 'Sin nickname';
      }

      // Email
      const emailEl = document.getElementById('profileEmail');
      if (emailEl) {
        emailEl.textContent = user.email;
      }

      // Email en modal de contraseña
      const passwordEmailInput = document.getElementById('inputPasswordEmail');
      if (passwordEmailInput) {
        passwordEmailInput.value = user.email;
      }

    } catch (error) {
      console.error('Error loading user info:', error);
    }
  },

  /**
   * Cargar colecciones del usuario
   */
  async loadUserCollections() {
    try {
      const collections = await API.getUserCollections();
      const container = document.getElementById('profileCollectionsList');
      
      if (!container) return;

      if (collections.length === 0) {
        container.innerHTML = `
          <div class="empty-state-small">
            <i data-lucide="folder"></i>
            <p>No tienes colecciones todavía</p>
          </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      container.innerHTML = collections.map(collection => {
        const album = collection.album;
        const totalCards = collection.user_cards?.length || 0;
        const ownedCards = collection.user_cards?.filter(c => c.status === 'tengo').length || 0;
        const progress = totalCards > 0 ? Math.round((ownedCards / totalCards) * 100) : 0;
        const albumColor = album.color || '#6366F1';
        
        return `
          <div class="profile-collection-card" data-collection-id="${collection.id}">
            <div class="profile-collection-header">
              <div class="profile-collection-icon" style="background: ${albumColor}20; color: ${albumColor};">
                📔
              </div>
              <div>
                <div class="profile-collection-title">${Utils.escapeHtml(album.name)}</div>
                <div class="profile-collection-date">
                  Desde ${Utils.formatDateShort(collection.joined_at)}
                </div>
              </div>
            </div>
            
            <div class="profile-collection-progress">
              <div class="profile-collection-progress-bar">
                <div class="profile-collection-progress-fill" style="width: ${progress}%; background: ${albumColor};"></div>
              </div>
              <div class="profile-collection-progress-text">
                <span class="profile-collection-progress-percent">${progress}%</span>
                <span class="profile-collection-progress-count">${ownedCards}/${totalCards} cromos</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      if (typeof lucide !== 'undefined') lucide.createIcons();

      // Listeners para abrir colecciones
      container.querySelectorAll('.profile-collection-card').forEach(card => {
        card.addEventListener('click', async () => {
          const collectionId = card.dataset.collectionId;
          if (collectionId) {
            await UserUI.openCollection(collectionId);
          }
        });
      });

    } catch (error) {
      console.error('Error loading collections:', error);
    }
  },

  /**
   * Cargar estadísticas del usuario
   */
  async loadUserStats() {
    try {
      const userId = Auth.getCurrentUser().id;
      
      // Obtener colecciones con sus álbumes y user_cards
      const { data: collections, error: collectionsError } = await supabaseClient
        .from('user_collections')
        .select(`
          id,
          album_id,
          album:albums(id, name)
        `)
        .eq('user_id', userId);
      
      if (collectionsError) throw collectionsError;
      
      // 1. Total de colecciones
      const totalCollections = collections?.length || 0;
      document.getElementById('statTotalCollections').textContent = totalCollections;
      
      if (totalCollections === 0) {
        // Si no hay colecciones, todo es 0
        document.getElementById('statTotalCards').textContent = '0';
        document.getElementById('statCardsOwned').textContent = '0';
        document.getElementById('statAvgProgress').textContent = '0%';
        return;
      }
      
      // 2. Obtener todos los user_cards del usuario con status
      const { data: userCards, error: cardsError } = await supabaseClient
        .from('user_cards')
        .select('id, collection_id, status')
        .eq('user_id', userId);
      
      if (cardsError) throw cardsError;
      
      // 3. Calcular estadísticas globales
      let totalCardsInAllAlbums = 0;
      let totalCardsOwned = 0;
      
      // Por cada colección, contar cromos
      collections.forEach(collection => {
        const cardsInThisCollection = userCards.filter(c => c.collection_id === collection.id);
        const totalInCollection = cardsInThisCollection.length;
        const ownedInCollection = cardsInThisCollection.filter(c => c.status === 'tengo').length;
        
        totalCardsInAllAlbums += totalInCollection;
        totalCardsOwned += ownedInCollection;
      });
      
      // 4. Mostrar resultados
      document.getElementById('statTotalCards').textContent = Utils.formatNumber(totalCardsInAllAlbums);
      document.getElementById('statCardsOwned').textContent = Utils.formatNumber(totalCardsOwned);
      
      // 5. Progreso global (conseguidos / total)
      const globalProgress = totalCardsInAllAlbums > 0 
        ? Math.round((totalCardsOwned / totalCardsInAllAlbums) * 100) 
        : 0;
      document.getElementById('statAvgProgress').textContent = `${globalProgress}%`;
      
    } catch (error) {
      console.error('Error loading stats:', error);
      // Mostrar 0s en caso de error
      document.getElementById('statTotalCollections').textContent = '0';
      document.getElementById('statTotalCards').textContent = '0';
      document.getElementById('statCardsOwned').textContent = '0';
      document.getElementById('statAvgProgress').textContent = '0%';
    }
  },

  /**
   * Configurar listeners
   */
  setupProfileListeners() {
    // Botón volver
    const btnBack = document.getElementById('btnBackToDashboardFromProfile');
    if (btnBack) {
      btnBack.replaceWith(btnBack.cloneNode(true));
      document.getElementById('btnBackToDashboardFromProfile').addEventListener('click', () => {
        if (Auth.isAdmin()) {
          AdminUI.showDashboard();
        } else {
          UserUI.showDashboard();
        }
      });
    }

    // Editar avatar
    const btnEditAvatar = document.getElementById('btnEditAvatar');
    const avatarUpload = document.getElementById('avatarUpload');
    if (btnEditAvatar && avatarUpload) {
      btnEditAvatar.addEventListener('click', () => avatarUpload.click());
      avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
    }

    // Editar nombre
    const btnEditFullName = document.getElementById('btnEditFullName');
    if (btnEditFullName) {
      btnEditFullName.addEventListener('click', () => this.showEditFullName());
    }

    // Editar nickname
    const btnEditNickname = document.getElementById('btnEditNickname');
    if (btnEditNickname) {
      btnEditNickname.addEventListener('click', () => this.showEditNickname());
    }

    // Cambiar contraseña
    const btnChangePassword = document.getElementById('btnChangePassword');
    if (btnChangePassword) {
      btnChangePassword.addEventListener('click', () => this.showChangePassword());
    }

    // Cerrar modales
    document.querySelectorAll('[data-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal;
        Utils.closeModal(modalId);
      });
    });

    // Guardar nombre
    const btnSaveFullName = document.getElementById('btnSaveFullName');
    if (btnSaveFullName) {
      btnSaveFullName.addEventListener('click', () => this.saveFullName());
    }

    // Guardar nickname
    const btnSaveNickname = document.getElementById('btnSaveNickname');
    if (btnSaveNickname) {
      btnSaveNickname.addEventListener('click', () => this.saveNickname());
    }

    // Enviar reset password
    const btnSendPasswordReset = document.getElementById('btnSendPasswordReset');
    if (btnSendPasswordReset) {
      btnSendPasswordReset.addEventListener('click', () => this.sendPasswordReset());
    }
  },

  /**
   * Manejar subida de avatar
   */
  async handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      Utils.showToast('Por favor selecciona una imagen', 'error');
      return;
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      Utils.showToast('La imagen es demasiado grande (máx 2MB)', 'error');
      return;
    }

    try {
      Utils.showLoader();
      
      // Subir a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Auth.currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data, error } = await supabaseClient.storage
        .from('user-avatars')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      // Obtener URL pública
      const { data: { publicUrl } } = supabaseClient.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      // Actualizar usuario en BD
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', Auth.currentUser.id);

      if (updateError) throw updateError;

      // Actualizar Auth.currentUser y PERSISTIR en localStorage
      Auth.currentUser.avatar_url = publicUrl;
      Auth.saveToStorage(Auth.currentUser);
      
      // Actualizar UI
      const avatarLarge = document.getElementById('profileAvatarLarge');
      if (avatarLarge) {
        avatarLarge.style.backgroundImage = `url(${publicUrl})`;
        avatarLarge.textContent = '';
      }

      // Actualizar avatar en header
      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) {
        if (publicUrl) {
          userAvatar.style.backgroundImage = `url(${publicUrl})`;
          userAvatar.textContent = '';
        }
      }

      Utils.showToast('Avatar actualizado', 'success');
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Utils.showToast('Error al subir imagen', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Mostrar modal editar nombre
   */
  showEditFullName() {
    const input = document.getElementById('inputFullName');
    if (input) {
      input.value = Auth.currentUser.full_name || '';
    }
    Utils.openModal('modalEditFullName');
  },

  /**
   * Guardar nombre completo
   */
  async saveFullName() {
    const input = document.getElementById('inputFullName');
    const fullName = input.value.trim();

    if (!fullName) {
      Utils.showToast('El nombre no puede estar vacío', 'error');
      return;
    }

    try {
      Utils.showLoader();

      const { error } = await supabaseClient
        .from('users')
        .update({ full_name: fullName })
        .eq('id', Auth.currentUser.id);

      if (error) throw error;

      // Actualizar y persistir
      Auth.currentUser.full_name = fullName;
      Auth.currentUser.name = fullName; // También actualizar name para el header
      Auth.saveToStorage(Auth.currentUser);
      
      const profileFullName = document.getElementById('profileFullName');
      if (profileFullName) {
        profileFullName.textContent = fullName;
      }

      // Actualizar header
      const userNameDisplay = document.getElementById('userNameDisplay');
      if (userNameDisplay) {
        userNameDisplay.textContent = fullName;
      }

      Utils.closeModal('modalEditFullName');
      Utils.showToast('Nombre actualizado', 'success');

    } catch (error) {
      console.error('Error updating name:', error);
      Utils.showToast('Error al actualizar nombre', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Mostrar modal editar nickname
   */
  showEditNickname() {
    const input = document.getElementById('inputNickname');
    if (input) {
      input.value = Auth.currentUser.nickname || '';
    }
    Utils.openModal('modalEditNickname');
  },

  /**
   * Guardar nickname
   */
  async saveNickname() {
    const input = document.getElementById('inputNickname');
    const nickname = input.value.trim().toLowerCase();

    if (!nickname) {
      Utils.showToast('El nickname no puede estar vacío', 'error');
      return;
    }

    // Validar formato (solo letras, números, guiones)
    if (!/^[a-z0-9-]+$/.test(nickname)) {
      Utils.showToast('Solo se permiten letras, números y guiones', 'error');
      return;
    }

    try {
      Utils.showLoader();

      // Verificar que no existe
      const { data: existing, error: checkError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('nickname', nickname)
        .neq('id', Auth.currentUser.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        Utils.showToast('Este nickname ya está en uso', 'error');
        return;
      }

      // Actualizar
      const { error } = await supabaseClient
        .from('users')
        .update({ nickname })
        .eq('id', Auth.currentUser.id);

      if (error) throw error;

      // Actualizar y persistir
      Auth.currentUser.nickname = nickname;
      Auth.saveToStorage(Auth.currentUser);
      
      const profileNickname = document.getElementById('profileNickname');
      if (profileNickname) {
        profileNickname.textContent = nickname;
      }

      Utils.closeModal('modalEditNickname');
      Utils.showToast('Nickname actualizado', 'success');

    } catch (error) {
      console.error('Error updating nickname:', error);
      Utils.showToast('Error al actualizar nickname', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Mostrar modal cambiar contraseña
   */
  showChangePassword() {
    Utils.openModal('modalChangePassword');
  },

  /**
   * Enviar email para resetear contraseña
   */
  async sendPasswordReset() {
    try {
      Utils.showLoader();

      const { error } = await supabaseClient.auth.resetPasswordForEmail(
        Auth.currentUser.email,
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      );

      if (error) throw error;

      Utils.closeModal('modalChangePassword');
      Utils.showToast('Email enviado. Revisa tu bandeja de entrada', 'success');

    } catch (error) {
      console.error('Error sending password reset:', error);
      Utils.showToast('Error al enviar email', 'error');
    } finally {
      Utils.hideLoader();
    }
  }
};
