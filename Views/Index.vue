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
          <button @click="toggleDarkMode" class="theme-toggle" title="Cambiar tema">
            <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
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
              
              <button @click="openCreateModal" class="btn-refresh">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Trabajador
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
              <button @click="openCreateModal" class="btn-primary">Agregar primer trabajador</button>
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
                      accept=".xlsx,.xls"
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

    <!-- MODAL FLOTANTE: CREAR/EDITAR -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-container">
        <button @click="closeModal" class="modal-close" title="Cerrar">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div class="modal-form-card">
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
                </select>
              </div>
              
              <div class="form-group">
                <label>Teléfono</label>
                <input v-model="form.telefono" type="tel" placeholder="999888777" />
              </div>
              
              <div class="form-group span-2">
                <label>Email</label>
                <input v-model="form.email" type="email" placeholder="correo@empresa.com" />
              </div>
              
              <div class="form-group span-full">
                <label>Dirección</label>
                <input v-model="form.direccion" type="text" placeholder="Av. Principal 123" />
              </div>
            </div>

            <!-- Datos Laborales -->
            <div class="form-section-title">Datos Laborales</div>
            
            <div class="form-grid">
              <div class="form-group">
                <label>Cargo *</label>
                <input v-model="form.cargo" type="text" required placeholder="Analista" />
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
                  <option value="Temporal">Temporal</option>
                  <option value="Practicas">Prácticas</option>
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
                <input v-model="form.sueldo_basico" type="number" step="0.01" placeholder="2500.00" />
              </div>
              
              <div class="form-group">
                <label>Sistema de Pensiones</label>
                <select v-model="form.sistema_pensiones">
                  <option value="">Sin asignar</option>
                  <option value="ONP">ONP</option>
                  <option value="AFP Integra">AFP Integra</option>
                  <option value="AFP Prima">AFP Prima</option>
                  <option value="AFP Profuturo">AFP Profuturo</option>
                  <option value="AFP Habitat">AFP Habitat</option>
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
                <input v-model="form.contacto_emergencia_telefono" type="tel" placeholder="999111222" />
              </div>
              
              <div class="form-group">
                <label>Parentesco</label>
                <input v-model="form.contacto_emergencia_parentesco" type="text" placeholder="Esposa" />
              </div>
            </div>

            <div class="form-group span-full">
              <label>Observaciones</label>
              <textarea v-model="form.observaciones" rows="3" placeholder="Notas adicionales..."></textarea>
            </div>
            
            <!-- Actions -->
            <div class="form-actions">
              <button type="button" @click="closeModal" class="btn-secondary">Cancelar</button>
              <button type="submit" :disabled="saving" class="btn-primary">
                <span v-if="saving" class="spinner-small"></span>
                {{ saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Registrar') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import './trabajadores_theme.css';
import './trabajadores.css';

// State
const activeTab = ref('list');
const loading = ref(false);
const saving = ref(false);
const searchQuery = ref('');
const filterEstado = ref('');
const trabajadores = ref([]);
const stats = ref({ total: 0, activos: 0, inactivos: 0 });
const editingId = ref(null);
const showModal = ref(false);
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

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  // Guardar preferencia en localStorage
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('trabajadores-dark-mode', isDark ? 'true' : 'false');
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
    
    const response = await fetch(`/api/${getModuleName()}/list?${params}`, {
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
    const response = await fetch(`/api/${getModuleName()}/stats`, {
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
  showModal.value = true;
}

function openCreateModal() {
  resetForm();
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  resetForm();
}

async function saveTrabajador() {
  saving.value = true;
  try {
    const url = editingId.value 
      ? `/api/${getModuleName()}/${editingId.value}`
      : `/api/${getModuleName()}/create`;
    
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
      showModal.value = false;
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
    const response = await fetch(`/api/${getModuleName()}/${t.id}`, {
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
        'Accept': 'text/csv',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
      }
    });
    
    if (!response.ok) throw new Error('Error downloading');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_trabajadores.csv';
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
  // Restaurar preferencia de modo oscuro
  if (localStorage.getItem('trabajadores-dark-mode') === 'true') {
    document.body.classList.add('dark-mode');
  }
  loadTrabajadores();
  loadStats();
});
</script>

<style>
/* Los estilos han sido movidos a:
   - trabajadores_theme.css (variables de colores)
   - trabajadores.css (estilos de componentes)
   Los iconos SVG están disponibles en: trabajadores_svg/
*/
</style>
