/**
 * analytics-ui.js - Dashboard de Analytics para Administrador
 * Visualización de estadísticas y métricas del sistema
 */

const AnalyticsUI = {
  charts: {},

  /**
   * Mostrar dashboard de analytics
   */
  async showAnalyticsDashboard() {
    if (!Auth.isAdmin()) {
      Utils.showToast('Acceso denegado', 'error');
      return;
    }

    try {
      Utils.showLoader();
      Utils.showView('viewAnalyticsDashboard');
      
      // Cargar todas las estadísticas en paralelo
      await Promise.all([
        this.loadSummaryCards(),
        this.loadUserGrowthChart(),
        this.loadAlbumsChart(),
        this.loadProgressDistribution(),
        this.loadAlbumsTable(),
        this.loadRecentActivity(),
        this.loadTopCards()
      ]);

      this.setupAnalyticsListeners();
      
    } catch (error) {
      console.error('Error loading analytics dashboard:', error);
      Utils.showToast('Error al cargar analytics', 'error');
    } finally {
      Utils.hideLoader();
    }
  },

  /**
   * Cargar tarjetas de resumen
   */
  async loadSummaryCards() {
    try {
      const summary = await AnalyticsAPI.getDashboardSummary();
      
      const container = document.getElementById('analyticsSummaryCards');
      if (!container) return;

      const completionRate = summary.total_master_cards > 0
        ? Math.round((summary.total_cards_owned / (summary.total_regular_users * summary.total_master_cards)) * 100)
        : 0;

      container.innerHTML = `
        <div class="analytics-card">
          <div class="analytics-card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <i data-lucide="users"></i>
          </div>
          <div class="analytics-card-content">
            <div class="analytics-card-value">${summary.total_regular_users}</div>
            <div class="analytics-card-label">Usuarios Registrados</div>
            <div class="analytics-card-detail">${summary.total_admins} admin(s)</div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <i data-lucide="folder"></i>
          </div>
          <div class="analytics-card-content">
            <div class="analytics-card-value">${summary.total_albums}</div>
            <div class="analytics-card-label">Álbumes Activos</div>
            <div class="analytics-card-detail">${Utils.formatNumber(summary.total_master_cards)} cromos</div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
            <i data-lucide="layers"></i>
          </div>
          <div class="analytics-card-content">
            <div class="analytics-card-value">${summary.total_collections}</div>
            <div class="analytics-card-label">Colecciones Activas</div>
            <div class="analytics-card-detail">Promedio: ${(summary.total_collections / Math.max(summary.total_regular_users, 1)).toFixed(1)} por usuario</div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-card-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
            <i data-lucide="check-circle"></i>
          </div>
          <div class="analytics-card-content">
            <div class="analytics-card-value">${Utils.formatNumber(summary.total_cards_owned)}</div>
            <div class="analytics-card-label">Cromos Coleccionados</div>
            <div class="analytics-card-detail">${completionRate}% completado</div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-card-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
            <i data-lucide="copy"></i>
          </div>
          <div class="analytics-card-content">
            <div class="analytics-card-value">${Utils.formatNumber(summary.total_duplicates)}</div>
            <div class="analytics-card-label">Cromos Repetidos</div>
            <div class="analytics-card-detail">Listos para intercambio</div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-card-icon" style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);">
            <i data-lucide="repeat"></i>
          </div>
          <div class="analytics-card-content">
            <div class="analytics-card-value">${Utils.formatNumber(summary.total_cards_exchanged)}</div>
            <div class="analytics-card-label">Cromos Cambiados</div>
            <div class="analytics-card-detail">
              ${summary.total_cards_missing} faltan
            </div>
          </div>
        </div>
      `;

      if (typeof lucide !== 'undefined') lucide.createIcons();
      
    } catch (error) {
      console.error('Error loading summary cards:', error);
    }
  },

  /**
   * Cargar gráfico de crecimiento de usuarios
   */
  async loadUserGrowthChart() {
    try {
      const data = await AnalyticsAPI.getUserGrowthChart(30);
      
      const ctx = document.getElementById('chartUserGrowth');
      if (!ctx) return;

      // Destruir chart anterior si existe
      if (this.charts.userGrowth) {
        this.charts.userGrowth.destroy();
      }

      this.charts.userGrowth = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
          }),
          datasets: [
            {
              label: 'Nuevos usuarios',
              data: data.map(d => d.new_users),
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            },
            {
              label: 'Total acumulado',
              data: data.map(d => d.cumulative_users),
              borderColor: '#764ba2',
              backgroundColor: 'rgba(118, 75, 162, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Error loading user growth chart:', error);
    }
  },

  /**
   * Cargar gráfico de álbumes
   */
  async loadAlbumsChart() {
    try {
      const data = await AnalyticsAPI.getAlbumsChart();
      
      const ctx = document.getElementById('chartAlbums');
      if (!ctx) return;

      if (this.charts.albums) {
        this.charts.albums.destroy();
      }

      this.charts.albums = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.map(d => d.album_name),
          datasets: [
            {
              label: 'Usuarios',
              data: data.map(d => d.users_count),
              backgroundColor: 'rgba(67, 233, 123, 0.7)',
              borderColor: '#43e97b',
              borderWidth: 2,
              yAxisID: 'y'
            },
            {
              label: 'Progreso Promedio (%)',
              data: data.map(d => d.avg_progress),
              backgroundColor: 'rgba(79, 172, 254, 0.7)',
              borderColor: '#4facfe',
              borderWidth: 2,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              beginAtZero: true,
              ticks: {
                precision: 0
              },
              title: {
                display: true,
                text: 'Usuarios'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Progreso (%)'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Error loading albums chart:', error);
    }
  },

  /**
   * Cargar distribución de progreso
   */
  async loadProgressDistribution() {
    try {
      const data = await AnalyticsAPI.getProgressDistribution();
      
      const ctx = document.getElementById('chartProgressDistribution');
      if (!ctx) return;

      if (this.charts.progress) {
        this.charts.progress.destroy();
      }

      this.charts.progress = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: data.map(d => d.progress_range),
          datasets: [{
            data: data.map(d => d.collection_count),
            backgroundColor: [
              '#EF4444',
              '#F59E0B',
              '#FBBF24',
              '#84CC16',
              '#10B981',
              '#06B6D4'
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Error loading progress distribution:', error);
    }
  },

  /**
   * Cargar tabla de álbumes
   */
  async loadAlbumsTable() {
    try {
      const albums = await AnalyticsAPI.getAlbumsPopularity();
      
      const container = document.getElementById('albumsTable');
      if (!container) return;

      if (albums.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No hay álbumes aún</p>';
        return;
      }

      container.innerHTML = `
        <table class="analytics-table">
          <thead>
            <tr>
              <th>Álbum</th>
              <th>Temporada</th>
              <th>Usuarios</th>
              <th>Cromos</th>
              <th>Progreso Medio</th>
            </tr>
          </thead>
          <tbody>
            ${albums.map(album => `
              <tr>
                <td>
                  <div class="album-name-cell">
                    <span class="album-color-dot" style="background: ${album.color}"></span>
                    <strong>${Utils.escapeHtml(album.name)}</strong>
                  </div>
                </td>
                <td>${Utils.escapeHtml(album.season || '-')}</td>
                <td>
                  <span class="badge badge-primary">${album.users_joined}</span>
                </td>
                <td>${album.total_cards}</td>
                <td>
                  <div class="progress-bar-small">
                    <div class="progress-fill-small" style="width: ${album.avg_completion_percentage}%"></div>
                  </div>
                  <span class="progress-text">${Math.round(album.avg_completion_percentage)}%</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
    } catch (error) {
      console.error('Error loading albums table:', error);
    }
  },

  /**
   * Cargar actividad reciente
   */
  async loadRecentActivity() {
    try {
      const activities = await AnalyticsAPI.getRecentActivity();
      
      const container = document.getElementById('recentActivityList');
      if (!container) return;

      if (activities.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Sin actividad reciente</p>';
        return;
      }

      container.innerHTML = activities.map(activity => {
        const date = new Date(activity.activity_date);
        const timeAgo = this.getTimeAgo(date);
        
        if (activity.activity_type === 'user_registered') {
          return `
            <div class="activity-item">
              <div class="activity-icon" style="background: #667eea;">
                <i data-lucide="user-plus"></i>
              </div>
              <div class="activity-content">
                <div class="activity-text">
                  <strong>${activity.user_label}</strong> se registró
                </div>
                <div class="activity-time">${timeAgo}</div>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="activity-item">
              <div class="activity-icon" style="background: #43e97b;">
                <i data-lucide="folder-plus"></i>
              </div>
              <div class="activity-content">
                <div class="activity-text">
                  <strong>${activity.user_label}</strong> se unió a <em>${Utils.escapeHtml(activity.album_name)}</em>
                </div>
                <div class="activity-time">${timeAgo}</div>
              </div>
            </div>
          `;
        }
      }).join('');

      if (typeof lucide !== 'undefined') lucide.createIcons();
      
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  },

  /**
   * Cargar top cromos
   */
  async loadTopCards() {
    try {
      const [topCollected, mostDuplicated] = await Promise.all([
        AnalyticsAPI.getTopCollectedCards(),
        AnalyticsAPI.getMostDuplicatedCards()
      ]);

      // Top coleccionados
      const collectedContainer = document.getElementById('topCollectedCards');
      if (collectedContainer) {
        if (topCollected.length === 0) {
          collectedContainer.innerHTML = '<p class="text-center text-muted">Sin datos</p>';
        } else {
          collectedContainer.innerHTML = `
            <div class="top-cards-list">
              ${topCollected.slice(0, 5).map((card, index) => `
                <div class="top-card-item">
                  <div class="top-card-rank">#${index + 1}</div>
                  <div class="top-card-info">
                    <div class="top-card-number">${Utils.escapeHtml(card.number)}</div>
                    <div class="top-card-name">${Utils.escapeHtml(card.player_name)}</div>
                    <div class="top-card-team">${Utils.escapeHtml(card.team || '')}</div>
                  </div>
                  <div class="top-card-stats">
                    <div class="stat-value">${card.ownership_percentage}%</div>
                    <div class="stat-label">${card.users_have_it} usuarios</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      }

      // Más repetidos
      const duplicatedContainer = document.getElementById('mostDuplicatedCards');
      if (duplicatedContainer) {
        if (mostDuplicated.length === 0) {
          duplicatedContainer.innerHTML = '<p class="text-center text-muted">Sin datos</p>';
        } else {
          duplicatedContainer.innerHTML = `
            <div class="top-cards-list">
              ${mostDuplicated.slice(0, 5).map((card, index) => `
                <div class="top-card-item">
                  <div class="top-card-rank">#${index + 1}</div>
                  <div class="top-card-info">
                    <div class="top-card-number">${Utils.escapeHtml(card.number)}</div>
                    <div class="top-card-name">${Utils.escapeHtml(card.player_name)}</div>
                    <div class="top-card-team">${Utils.escapeHtml(card.team || '')}</div>
                  </div>
                  <div class="top-card-stats">
                    <div class="stat-value">${card.total_duplicates}</div>
                    <div class="stat-label">${card.users_with_duplicates} usuarios</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      }
      
    } catch (error) {
      console.error('Error loading top cards:', error);
    }
  },

  /**
   * Configurar listeners del analytics
   */
  setupAnalyticsListeners() {
    const btnBack = document.getElementById('btnBackToAdmin');
    if (btnBack) {
      btnBack.replaceWith(btnBack.cloneNode(true));
      document.getElementById('btnBackToAdmin').addEventListener('click', () => {
        AdminUI.showDashboard();
      });
    }

    const btnRefresh = document.getElementById('btnRefreshAnalytics');
    if (btnRefresh) {
      btnRefresh.replaceWith(btnRefresh.cloneNode(true));
      document.getElementById('btnRefreshAnalytics').addEventListener('click', () => {
        this.showAnalyticsDashboard();
      });
    }
  },

  /**
   * Calcular tiempo relativo
   */
  getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'hace un momento';
  }
};
