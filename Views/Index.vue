<template>
  <div class="trabajadores-layout">
    <!-- Background -->
    <div class="trabajadores-bg"></div>
    
    <!-- Main Container -->
    <div class="trabajadores-container">
      <!-- Header -->
      <header class="module-header">
        <div class="header-left">
          <button @click="goBack" class="btn-back">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Volver
          </button>
          <h1>
            <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/>
            </svg>
            GESTIÓN DE TRABAJADORES
          </h1>
        </div>
        <div class="header-right">
          <span class="module-count">{{ stats.total }} registrados</span>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs-container">
        <button 
          :class="['tab-button', { 'tab-active': activeTab === 'list' }]"
          @click="activeTab = 'list'"
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Listado
        </button>
        <button 
          :class="['tab-button', { 'tab-active': activeTab === 'create' }]"
          @click="activeTab = 'create'; resetForm()"
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Trabajador
        </button>
        <button 
          :class="['tab-button', { 'tab-active': activeTab === 'import' }]"
          @click="activeTab = 'import'"
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Importar Excel
        </button>
      </div>

      <!-- Main Content -->
      <main class="module-content">
        <!-- TAB: LISTADO -->
        <div v-show="activeTab === 'list'">
          <!-- Stats Cards -->
          <div class="stats-grid">
            <div class="stat-card stat-total">
              <div class="stat-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m7-10a4 4 0 100-8 4 4 0 000 8zm8 10v-2a4 4 0 00-3-3.87m3.87 0a4 4 0 100-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="stat-content">
                <h3>TOTAL TRABAJADORES</h3>
                <p class="stat-number">{{ stats.total }}</p>
                <p class="stat-subtitle">Registrados en el sistema</p>
              </div>
            </div>

            <div class="stat-card stat-active">
              <div class="stat-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="stat-content">
                <h3>ACTIVOS</h3>
                <p class="stat-number">{{ stats.activos }}</p>
                <p class="stat-subtitle">En planilla activa</p>
              </div>
            </div>

            <div class="stat-card stat-inactive">
              <div class="stat-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="stat-content">
                <h3>INACTIVOS</h3>
                <p class="stat-number">{{ stats.inactivos }}</p>
                <p class="stat-subtitle">Cesados o licencia</p>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-container">
            <div class="filters-row">
              <div class="search-box">
                <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  v-model="searchQuery" 
                  type="text" 
                  placeholder="Buscar por DNI, nombre, email..."
                  class="search-input"
                  @input="debouncedSearch"
                />
              </div>
              
              <select v-model="filterEstado" @change="loadTrabajadores" class="filter-select">
                <option value="">Todos los estados</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Cesado">Cesado</option>
                <option value="Vacaciones">Vacaciones</option>
                <option value="Licencia">Licencia</option>
              </select>
              
              <button @click="loadTrabajadores" class="btn-refresh">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
            </div>
          </div>

          <!-- Table -->
          <div class="table-container">
            <div v-if="loading" class="loading-state">
              <div class="spinner"></div>
              <p>Cargando trabajadores...</p>
            </div>
            
            <div v-else-if="trabajadores.length === 0" class="empty-state">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>No hay trabajadores registrados</p>
              <button @click="activeTab = 'create'" class="btn-primary">Agregar primer trabajador</button>
            </div>
            
            <table v-else class="data-table">
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>DNI</th>
                  <th>Cargo</th>
                  <th>Fecha Ingreso</th>
                  <th>Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in filteredTrabajadores" :key="t.id">
                  <td>
                    <div class="worker-info">
                      <div class="avatar">{{ getInitials(t) }}</div>
                      <div>
                        <div class="worker-name">{{ t.nombre_completo || `${t.apellido_paterno} ${t.apellido_materno}, ${t.nombres}` }}</div>
                        <div class="worker-email">{{ t.email || 'Sin email' }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="mono">{{ t.dni }}</td>
                  <td>{{ t.cargo || '-' }}</td>
                  <td>{{ formatDate(t.fecha_ingreso) }}</td>
                  <td>
                    <span :class="['badge', getBadgeClass(t.estado)]">{{ t.estado }}</span>
                  </td>
                  <td class="actions-cell">
                    <button @click="editTrabajador(t)" class="btn-action btn-edit" title="Editar">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button @click="confirmDelete(t)" class="btn-action btn-delete" title="Eliminar">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB: CREAR/EDITAR -->
        <div v-show="activeTab === 'create'" class="form-section">
          <div class="form-card">
            <h2>{{ editingId ? 'Editar Trabajador' : 'Nuevo Trabajador' }}</h2>
            <p class="form-subtitle">Complete los campos requeridos (*) para registrar al trabajador.</p>
            
            <form @submit.prevent="saveTrabajador" class="worker-form">
              <!-- Datos Personales -->
              <div class="form-section-title">Datos Personales</div>
              
              <div class="form-grid">
                <div class="form-group">
                  <label>DNI/CE *</label>
                  <input v-model="form.dni" type="text" maxlength="12" required placeholder="12345678" />
                </div>
                
                <div class="form-group">
                  <label>Nombres *</label>
                  <input v-model="form.nombres" type="text" required placeholder="Juan Carlos" />
                </div>
                
                <div class="form-group">
                  <label>Apellido Paterno *</label>
                  <input v-model="form.apellido_paterno" type="text" required placeholder="García" />
                </div>
                
                <div class="form-group">
                  <label>Apellido Materno</label>
                  <input v-model="form.apellido_materno" type="text" placeholder="López" />
                </div>
                
                <div class="form-group">
                  <label>Fecha de Nacimiento</label>
                  <input v-model="form.fecha_nacimiento" type="date" />
                </div>
                
                <div class="form-group">
                  <label>Género</label>
                  <select v-model="form.genero">
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Estado Civil</label>
                  <select v-model="form.estado_civil">
                    <option value="Soltero">Soltero</option>
                    <option value="Casado">Casado</option>
                    <option value="Divorciado">Divorciado</option>
                    <option value="Viudo">Viudo</option>
                    <option value="Conviviente">Conviviente</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Teléfono</label>
                  <input v-model="form.telefono" type="tel" placeholder="999-999-999" />
                </div>
                
                <div class="form-group span-2">
                  <label>Email</label>
                  <input v-model="form.email" type="email" placeholder="email@ejemplo.com" />
                </div>
                
                <div class="form-group span-2">
                  <label>Dirección</label>
                  <input v-model="form.direccion" type="text" placeholder="Av. Principal 123" />
                </div>
              </div>
              
              <!-- Datos Laborales -->
              <div class="form-section-title">Datos Laborales</div>
              
              <div class="form-grid">
                <div class="form-group">
                  <label>Cargo</label>
                  <input v-model="form.cargo" type="text" placeholder="Ingeniero de Sistemas" />
                </div>
                
                <div class="form-group">
                  <label>Fecha de Ingreso *</label>
                  <input v-model="form.fecha_ingreso" type="date" required />
                </div>
                
                <div class="form-group">
                  <label>Tipo de Contrato</label>
                  <select v-model="form.tipo_contrato">
                    <option value="Indefinido">Indefinido</option>
                    <option value="Plazo Fijo">Plazo Fijo</option>
                    <option value="Por Obra">Por Obra</option>
                    <option value="Servicios">Servicios</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Estado</label>
                  <select v-model="form.estado">
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Cesado">Cesado</option>
                    <option value="Vacaciones">Vacaciones</option>
                    <option value="Licencia">Licencia</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Sueldo Básico</label>
                  <input v-model="form.sueldo_basico" type="number" step="0.01" placeholder="0.00" />
                </div>
                
                <div class="form-group">
                  <label>Sistema de Pensiones</label>
                  <select v-model="form.sistema_pensiones">
                    <option value="">Seleccionar</option>
                    <option value="AFP">AFP</option>
                    <option value="ONP">ONP</option>
                  </select>
                </div>
              </div>
              
              <!-- Contacto de Emergencia -->
              <div class="form-section-title">Contacto de Emergencia</div>
              
              <div class="form-grid">
                <div class="form-group">
                  <label>Nombre</label>
                  <input v-model="form.contacto_emergencia_nombre" type="text" placeholder="María García" />
                </div>
                
                <div class="form-group">
                  <label>Teléfono</label>
                  <input v-model="form.contacto_emergencia_telefono" type="tel" placeholder="999-999-999" />
                </div>
                
                <div class="form-group">
                  <label>Parentesco</label>
                  <input v-model="form.contacto_emergencia_parentesco" type="text" placeholder="Esposa" />
                </div>
              </div>
              
              <!-- Observaciones -->
              <div class="form-group span-full">
                <label>Observaciones</label>
                <textarea v-model="form.observaciones" rows="3" placeholder="Notas adicionales..."></textarea>
              </div>
              
              <!-- Actions -->
              <div class="form-actions">
                <button type="button" @click="activeTab = 'list'; resetForm()" class="btn-secondary">Cancelar</button>
                <button type="submit" :disabled="saving" class="btn-primary">
                  <span v-if="saving" class="spinner-small"></span>
                  {{ saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Registrar') }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- TAB: IMPORTAR EXCEL -->
        <div v-show="activeTab === 'import'" class="import-section">
          <div class="import-card">
            <h2>Importación Masiva de Trabajadores</h2>
            
            <div class="steps-container">
              <div class="step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h3>Descargar Plantilla</h3>
                  <p>Descarga la plantilla Excel con el formato requerido</p>
                  <button @click="downloadTemplate" :disabled="downloadingTemplate" class="btn-download">
                    <span v-if="downloadingTemplate" class="spinner-small"></span>
                    <svg v-else fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {{ downloadingTemplate ? 'Descargando...' : 'Descargar Plantilla' }}
                  </button>
                </div>
              </div>

              <div class="step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h3>Completar Datos</h3>
                  <p>Rellena la plantilla con los datos de los trabajadores (Formato CSV)</p>
                  <ul class="step-list">
                    <li>• Guardar archivo como CSV (Delimitado por comas)</li>
                    <li>• DNI (8 dígitos), Nombre Completo y Estado son obligatorios</li>
                    <li>• Estado debe ser: Activo o Cesado</li>
                  </ul>
                </div>
              </div>

              <div class="step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h3>Subir Archivo</h3>
                  <p>Selecciona el archivo CSV</p>
                  
                  <div 
                    class="upload-area" 
                    :class="{ 'dragging': dragging }"
                    @dragover.prevent="dragging = true"
                    @dragleave="dragging = false"
                    @drop.prevent="handleDrop"
                  >
                    <input
                      ref="fileInputRef"
                      type="file"
                      accept=".csv,.txt"
                      @change="handleFileSelect"
                      style="display: none;"
                    />
                    <div v-if="!selectedFile" class="upload-placeholder" @click="$refs.fileInputRef.click()">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p>Arrastra el archivo aquí o haz clic para seleccionar</p>
                      <span class="upload-hint">Solo archivos .csv</span>
                    </div>
                    <div v-else class="upload-file-info">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p class="file-name">{{ selectedFile.name }}</p>
                        <p class="file-size">{{ (selectedFile.size / 1024).toFixed(2) }} KB</p>
                      </div>
                      <button @click="selectedFile = null" class="btn-change-file">Cambiar</button>
                    </div>
                  </div>

                  <button
                    v-if="selectedFile"
                    @click="importExcel"
                    :disabled="importing"
                    class="btn-import"
                  >
                    <span v-if="importing" class="spinner-small"></span>
                    <svg v-else fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {{ importing ? 'Importando...' : 'Importar Trabajadores' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Import Results -->
            <div v-if="importResults" class="import-results">
              <div class="result-summary">
                <h3>Resultados de Importación</h3>
                <p>
                  <span class="result-imported">{{ importResults.imported || 0 }}</span> de 
                  <span class="result-total">{{ importResults.total || 0 }}</span> registros importados
                </p>
              </div>
              
              <div v-if="importResults.errors && importResults.errors.length > 0" class="errors-list">
                <h4>Errores encontrados:</h4>
                <div class="error-items">
                  <div v-for="(error, index) in importResults.errors" :key="index" class="error-item">
                    <span class="error-row">Fila {{ error.row }}</span>
                    <span v-if="error.dni" class="error-dni">(DNI: {{ error.dni }})</span>
                    <span class="error-message">{{ error.error }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// State
const activeTab = ref('list');
const loading = ref(false);
const saving = ref(false);
const searchQuery = ref('');
const filterEstado = ref('');
const trabajadores = ref([]);
const stats = ref({ total: 0, activos: 0, inactivos: 0 });
const editingId = ref(null);
const toast = ref({ show: false, message: '', type: 'success' });

// Import state
const selectedFile = ref(null);
const dragging = ref(false);
const importing = ref(false);
const downloadingTemplate = ref(false);
const importResults = ref(null);
const fileInputRef = ref(null);

let searchTimeout = null;

// Form data
const defaultForm = {
  dni: '',
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  fecha_nacimiento: '',
  genero: 'M',
  estado_civil: 'Soltero',
  telefono: '',
  email: '',
  direccion: '',
  cargo: '',
  fecha_ingreso: '',
  tipo_contrato: 'Indefinido',
  estado: 'Activo',
  sueldo_basico: '',
  sistema_pensiones: '',
  contacto_emergencia_nombre: '',
  contacto_emergencia_telefono: '',
  contacto_emergencia_parentesco: '',
  observaciones: ''
};

const form = ref({ ...defaultForm });

// Computed
const filteredTrabajadores = computed(() => {
  if (!searchQuery.value) return trabajadores.value;
  const q = searchQuery.value.toLowerCase();
  return trabajadores.value.filter(t => 
    (t.dni && t.dni.toLowerCase().includes(q)) ||
    (t.nombre_completo && t.nombre_completo.toLowerCase().includes(q)) ||
    (t.nombres && t.nombres.toLowerCase().includes(q)) ||
    (t.email && t.email.toLowerCase().includes(q))
  );
});

// Methods
function goBack() {
  window.location.href = '/';
}

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => { toast.value.show = false; }, 4000);
}

function resetForm() {
  form.value = { ...defaultForm };
  editingId.value = null;
}

function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadTrabajadores(), 500);
}

function getInitials(t) {
  const first = t.nombres?.charAt(0) || '';
  const last = t.apellido_paterno?.charAt(0) || '';
  return (first + last).toUpperCase() || 'XX';
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-PE');
}

function getBadgeClass(estado) {
  const classes = {
    'Activo': 'badge-success',
    'Inactivo': 'badge-danger',
    'Cesado': 'badge-danger',
    'Vacaciones': 'badge-warning',
    'Licencia': 'badge-info'
  };
  return classes[estado] || 'badge-default';
}

async function loadTrabajadores() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (filterEstado.value) params.set('estado', filterEstado.value);
    if (searchQuery.value) params.set('search', searchQuery.value);
    
    const response = await fetch(`/api/trabajadoreskrsft/list?${params}`, {
      headers: {
        'Accept': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
      }
    });
    const data = await response.json();
    if (data.success) {
      trabajadores.value = data.trabajadores || [];
    }
  } catch (e) {
    console.error('Error:', e);
    showToast('Error al cargar trabajadores', 'error');
  }
  loading.value = false;
}

async function loadStats() {
  try {
    const response = await fetch('/api/trabajadoreskrsft/stats', {
      headers: {
        'Accept': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
      }
    });
    const data = await response.json();
    if (data.success) {
      stats.value = data.stats;
    }
  } catch (e) {
    console.error('Error loading stats:', e);
  }
}

function editTrabajador(t) {
  editingId.value = t.id;
  form.value = { ...t };
  activeTab.value = 'create';
}

async function saveTrabajador() {
  saving.value = true;
  try {
    const url = editingId.value 
      ? `/api/trabajadoreskrsft/${editingId.value}`
      : '/api/trabajadoreskrsft/create';
    
    const response = await fetch(url, {
      method: editingId.value ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
      },
      body: JSON.stringify(form.value)
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(data.message || 'Guardado exitosamente', 'success');
      resetForm();
      activeTab.value = 'list';
      await loadTrabajadores();
      await loadStats();
    } else {
      showToast(data.message || 'Error al guardar', 'error');
    }
  } catch (e) {
    console.error('Error:', e);
    showToast('Error de conexión', 'error');
  }
  saving.value = false;
}

async function confirmDelete(t) {
  if (!confirm(`¿Estás seguro de eliminar a ${t.nombre_completo || t.nombres}?`)) return;
  
  try {
    const response = await fetch(`/api/trabajadoreskrsft/${t.id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Trabajador eliminado', 'success');
      await loadTrabajadores();
      await loadStats();
    } else {
      showToast(data.message || 'Error al eliminar', 'error');
    }
  } catch (e) {
    console.error('Error:', e);
    showToast('Error de conexión', 'error');
  }
}

// Excel Functions
function getModuleName() {
  // Get module name from URL path
  return window.location.pathname.split('/')[1] || 'trabajadoreskrsft';
}

async function downloadTemplate() {
  downloadingTemplate.value = true;
  try {
    const moduleName = getModuleName();
    const response = await fetch(`/api/${moduleName}/excel/template`, {
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
      }
    });
    
    if (!response.ok) throw new Error('Error downloading');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_trabajadores.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast('Plantilla descargada correctamente', 'success');
  } catch (e) {
    console.error('Error:', e);
    showToast('Error al descargar plantilla', 'error');
  }
  downloadingTemplate.value = false;
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
  }
}

function handleDrop(event) {
  dragging.value = false;
  const file = event.dataTransfer.files[0];
  if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
    selectedFile.value = file;
  } else {
    showToast('Por favor selecciona un archivo .csv', 'error');
  }
}

async function importExcel() {
  if (!selectedFile.value) {
    showToast('Por favor selecciona un archivo', 'error');
    return;
  }

  importing.value = true;
  importResults.value = null;

  try {
    const moduleName = getModuleName();
    const formData = new FormData();
    formData.append('file', selectedFile.value);

    const response = await fetch(`/api/${moduleName}/excel/import`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
      },
      body: formData
    });

    const result = await response.json();

    importResults.value = {
      total: result.total || 0,
      imported: result.imported || 0,
      errors: result.errors || []
    };
    
    selectedFile.value = null;
    
    if (importResults.value.imported > 0) {
      await loadTrabajadores();
      await loadStats();
    }

    if (importResults.value.errors.length === 0) {
      showToast(`¡Importación exitosa! ${importResults.value.imported} trabajadores importados`, 'success');
    } else {
      showToast(`${importResults.value.imported} de ${importResults.value.total} registros importados`, 'info');
    }
  } catch (e) {
    console.error('Error:', e);
    showToast('Error al importar archivo', 'error');
  }
  importing.value = false;
}

// Lifecycle
onMounted(() => {
  loadTrabajadores();
  loadStats();
});
</script>

<style scoped>
/* Layout */
.trabajadores-layout {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.trabajadores-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 0;
}

.trabajadores-container {
  position: fixed;
  top: 30px;
  left: 30px;
  right: 30px;
  bottom: 30px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 30px 40px;
  display: flex;
  flex-direction: column;
  z-index: 10;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

/* Header */
.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-left h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.title-icon {
  width: 32px;
  height: 32px;
  color: #667eea;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-back:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-back svg {
  width: 20px;
  height: 20px;
}

.module-count {
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 8px 16px;
  border-radius: 20px;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

/* Tabs */
.tabs-container {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e2e8f0;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-button:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.tab-button svg {
  width: 20px;
  height: 20px;
}

.tab-button.tab-active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

/* Content */
.module-content {
  flex: 1;
  overflow-y: auto;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 20px;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 32px;
  height: 32px;
  color: white;
}

.stat-total .stat-icon { background: linear-gradient(135deg, #667eea, #764ba2); }
.stat-active .stat-icon { background: linear-gradient(135deg, #10b981, #059669); }
.stat-inactive .stat-icon { background: linear-gradient(135deg, #ef4444, #dc2626); }

.stat-content h3 {
  font-size: 12px;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px 0;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.stat-subtitle {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

/* Filters */
.filters-container {
  background: white;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
}

.filters-row {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-select {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  min-width: 180px;
  cursor: pointer;
  background: white;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
}

.btn-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-refresh:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-refresh svg {
  width: 18px;
  height: 18px;
}

/* Table */
.table-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
}

.loading-state svg, .empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  padding: 16px 20px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
  color: #334155;
}

.data-table tr:hover {
  background: #f8fafc;
}

.text-right {
  text-align: right;
}

.worker-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}

.worker-name {
  font-weight: 600;
  color: #1e293b;
}

.worker-email {
  font-size: 13px;
  color: #94a3b8;
}

.mono {
  font-family: monospace;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge-success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.badge-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.badge-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.badge-info { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.badge-default { background: #f1f5f9; color: #64748b; }

/* Action Buttons */
.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-action {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-action svg {
  width: 18px;
  height: 18px;
}

.btn-edit {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.btn-edit:hover {
  background: rgba(59, 130, 246, 0.2);
}

.btn-delete {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* Form Section */
.form-section {
  max-width: 900px;
  margin: 0 auto;
}

.form-card {
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.form-card h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.form-subtitle {
  color: #64748b;
  margin: 0 0 30px 0;
}

.form-section-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin: 30px 0 16px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #e2e8f0;
}

.form-section-title:first-of-type {
  margin-top: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.span-2 {
  grid-column: span 2;
}

.form-group.span-full {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-primary, .btn-secondary {
  padding: 14px 28px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 16px 32px;
  border-radius: 12px;
  font-weight: 600;
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

.toast.success {
  background: #10b981;
  color: white;
}

.toast.error {
  background: #ef4444;
  color: white;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .trabajadores-container {
    top: 15px;
    left: 15px;
    right: 15px;
    bottom: 15px;
    padding: 20px;
  }
  
  .header-left h1 {
    font-size: 18px;
  }
  
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .form-group.span-2 {
    grid-column: span 1;
  }
}

/* Import Section */
.import-section {
  max-width: 800px;
  margin: 0 auto;
}

.import-card {
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.import-card h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 30px 0;
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.step {
  display: flex;
  gap: 20px;
}

.step-number {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.step-content p {
  color: #64748b;
  margin: 0 0 12px 0;
}

.step-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0 0;
}

.step-list li {
  color: #64748b;
  padding: 4px 0;
  font-size: 14px;
}

.btn-download {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-download:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-download:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-download svg {
  width: 20px;
  height: 20px;
}

.upload-area {
  border: 2px dashed #e2e8f0;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  transition: all 0.3s;
  background: #f8fafc;
  margin-top: 16px;
}

.upload-area.dragging {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.upload-placeholder {
  cursor: pointer;
}

.upload-placeholder svg {
  width: 48px;
  height: 48px;
  color: #667eea;
  margin-bottom: 16px;
}

.upload-placeholder p {
  color: #64748b;
  margin: 0;
}

.upload-hint {
  display: block;
  color: #94a3b8;
  font-size: 13px;
  margin-top: 8px;
}

.upload-file-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.upload-file-info svg {
  width: 40px;
  height: 40px;
  color: #10b981;
}

.file-name {
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.file-size {
  color: #64748b;
  font-size: 13px;
  margin: 4px 0 0 0;
}

.btn-change-file {
  margin-left: auto;
  padding: 8px 16px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-change-file:hover {
  background: #fecaca;
}

.btn-import {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 20px;
}

.btn-import:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-import:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-import svg {
  width: 20px;
  height: 20px;
}

.import-results {
  margin-top: 30px;
  padding: 24px;
  background: #f8fafc;
  border-radius: 16px;
}

.result-summary h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.result-summary p {
  color: #64748b;
  margin: 0;
}

.result-imported {
  color: #10b981;
  font-weight: 700;
}

.result-total {
  font-weight: 700;
}

.errors-list {
  margin-top: 20px;
  padding: 16px;
  background: #fef2f2;
  border-radius: 12px;
}

.errors-list h4 {
  color: #dc2626;
  font-weight: 700;
  margin: 0 0 12px 0;
}

.error-items {
  max-height: 200px;
  overflow-y: auto;
}

.error-item {
  padding: 10px;
  background: white;
  border-left: 4px solid #ef4444;
  border-radius: 4px;
  margin-bottom: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.error-row {
  font-family: monospace;
  font-size: 13px;
  color: #475569;
  font-weight: 600;
}

.error-dni {
  font-family: monospace;
  font-size: 12px;
  color: #94a3b8;
}

.error-message {
  font-size: 14px;
  color: #ef4444;
}
</style>
