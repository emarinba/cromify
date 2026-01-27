/**
 * =====================================================================
 * COURSES.JS - Vista de gestión de campos
 * ===================================================================== */

const CoursesView = {
  
  courses: [],
  editingCourseId: null,
  
  /**
   * Inicializar vista de campos
   */
  async initialize() {
    console.log('🏌️ Inicializando vista de campos...');
    await this.loadCourses();
  },
  
  /**
   * Cargar campos desde Supabase
   */
  async loadCourses() {
    try {
      const { data, error } = await window.SupabaseAPI.courses.getAll();
      
      if (error) {
        throw new Error(error);
      }
      
      this.courses = data || [];
      this.render();
      
      // También actualizar el combo en GameView
      if (typeof GameView !== 'undefined') {
        GameView.updateCourseSelect(this.courses);
      }
      
      console.log(`✅ ${this.courses.length} campos cargados`);
      
    } catch (error) {
      console.error('❌ Error cargando campos:', error);
      Utils.showToast('Error al cargar campos', 'error');
    }
  },
  
  /**
   * Renderizar lista de campos
   */
  render() {
    const container = document.getElementById('courses-list');
    const emptyState = document.getElementById('courses-empty');
    
    if (!container) return;
    
    if (this.courses.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    container.innerHTML = this.courses
      .map(course => Components.renderCourseCard(course))
      .join('');
  },
  
  /**
   * Abrir modal para crear campo
   */
  openCreateModal() {
    this.editingCourseId = null;
    
    const modal = document.getElementById('course-modal');
    const title = document.getElementById('course-modal-title');
    const form = document.getElementById('course-form');
    
    if (title) title.textContent = 'Nuevo Campo';
    if (form) form.reset();
    
    document.getElementById('course-id').value = '';
    document.getElementById('course-name').value = '';
    document.getElementById('course-location').value = '';
    
    // Generar inputs para 18 hoyos con valores por defecto
    this.renderHolesConfig();
    
    if (modal) modal.classList.add('active');
  },
  
  /**
   * Abrir modal para editar campo
   */
  async editCourse(courseId) {
    try {
      const { data: course, error } = await window.SupabaseAPI.courses.getById(courseId);
      
      if (error || !course) {
        throw new Error('Campo no encontrado');
      }
      
      this.editingCourseId = courseId;
      
      const modal = document.getElementById('course-modal');
      const title = document.getElementById('course-modal-title');
      
      if (title) title.textContent = 'Editar Campo';
      
      document.getElementById('course-id').value = course.id;
      document.getElementById('course-name').value = course.name;
      document.getElementById('course-location').value = course.location || '';
      
      // Renderizar hoyos con datos del campo
      this.renderHolesConfig(course.course_holes || []);
      
      if (modal) modal.classList.add('active');
      
    } catch (error) {
      console.error('Error cargando campo:', error);
      Utils.showToast('Error al cargar campo', 'error');
    }
  },
  
  /**
   * Renderizar configuración de hoyos en el modal
   */
  renderHolesConfig(holes = []) {
    const container = document.getElementById('course-holes-grid');
    if (!container) return;
    
    const defaultPars = [4, 4, 3, 4, 5, 3, 4, 4, 5, 4, 4, 3, 4, 5, 3, 4, 4, 5];
    
    container.innerHTML = Array.from({ length: 18 }, (_, i) => {
      const holeNumber = i + 1;
      const hole = holes.find(h => h.hole_number === holeNumber);
      const par = hole?.par || defaultPars[i];
      const stars = hole?.stars || 0;
      
      return Components.renderCourseHoleInput(holeNumber, par, stars);
    }).join('');
  },
  
  /**
   * Guardar campo (crear o actualizar)
   */
  async saveCourse(event) {
    event.preventDefault();
    
    try {
      const name = document.getElementById('course-name').value.trim();
      const location = document.getElementById('course-location').value.trim();
      
      if (!name) {
        Utils.showToast('El nombre del campo es obligatorio', 'warning');
        return;
      }
      
      // Recopilar configuración de hoyos
      const holes = [];
      for (let i = 1; i <= 18; i++) {
        // Leer valores de los botones activos
        const parGroup = document.querySelector(`.course-toggle-group[data-hole="${i}"][data-field="par"]`);
        const starsGroup = document.querySelector(`.course-toggle-group[data-hole="${i}"][data-field="stars"]`);
        
        const parBtn = parGroup?.querySelector('.course-toggle-btn.active');
        const starsBtn = starsGroup?.querySelector('.course-toggle-btn.active');
        
        const par = parBtn ? parseInt(parBtn.dataset.value) : 4;
        const stars = starsBtn ? parseInt(starsBtn.dataset.value) : 0;
        
        holes.push({
          hole_number: i,
          par,
          stars
        });
      }
      
      const courseData = {
        name,
        location: location || null,
        holes
      };
      
      let result;
      
      if (this.editingCourseId) {
        // Actualizar
        result = await window.SupabaseAPI.courses.update(this.editingCourseId, courseData);
        Utils.showToast('Campo actualizado correctamente', 'success');
      } else {
        // Crear
        result = await window.SupabaseAPI.courses.create(courseData);
        Utils.showToast('Campo creado correctamente', 'success');
      }
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Cerrar modal y recargar
      GolfApp.closeModal('course-modal');
      await this.loadCourses();
      
    } catch (error) {
      console.error('Error guardando campo:', error);
      Utils.showToast('Error al guardar campo', 'error');
    }
  },
  
  /**
   * Eliminar campo
   */
  async deleteCourse(courseId) {
    const confirmed = await Utils.confirm(
      '¿Seguro que quieres eliminar este campo? Esta acción no se puede deshacer.'
    );
    
    if (!confirmed) return;
    
    try {
      const { error } = await window.SupabaseAPI.courses.delete(courseId);
      
      if (error) {
        throw new Error(error);
      }
      
      Utils.showToast('Campo eliminado correctamente', 'success');
      await this.loadCourses();
      
    } catch (error) {
      console.error('Error eliminando campo:', error);
      
      // Puede que falle si hay partidas asociadas
      if (error.message.includes('foreign key')) {
        Utils.showToast('No se puede eliminar: hay partidas asociadas a este campo', 'warning');
      } else {
        Utils.showToast('Error al eliminar campo', 'error');
      }
    }
  }
};

// Exportar
window.CoursesView = CoursesView;

console.log('✅ CoursesView cargado');
