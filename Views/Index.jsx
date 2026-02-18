import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/* ── Module-specific styles (modular split) ── */
import './trabajadores-layout.css';
import './trabajadores-table.css';
import './trabajadores-form.css';
import './trabajadores-import.css';
import './trabajadores-modal.css';

// ── Components ─
import {
  BackIcon, ListIcon, UploadIcon,
  SearchIcon, PlusIcon, TeamIcon, StatUsersIcon,
  CheckCircleIcon, XCircleIcon, DownloadIcon, FileIcon, CloseIcon
} from './components/Icons';
import TrabajadoresTable from './components/TrabajadoresTable';
import CustomSelect from './components/CustomSelect';

const POLLING_INTERVAL_MS = 3000;
const CACHE_PREFIX = 'trabajadores_cache_';
const DEFAULT_FORM = {
  dni: '', nombres: '', apellido_paterno: '', apellido_materno: '',
  fecha_nacimiento: '', genero: 'M', estado_civil: 'Soltero',
  telefono: '', email: '', direccion: '', cargo: '',
  fecha_ingreso: '', tipo_contrato: 'Indefinido', estado: 'Activo',
  sueldo_basico: '', sistema_pensiones: '',
  contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
  contacto_emergencia_parentesco: '', observaciones: '',
};
const BADGE_CLASSES = {
  Activo: 'badge-success', Inactivo: 'badge-danger', Cesado: 'badge-danger',
  Vacaciones: 'badge-warning', Licencia: 'badge-info',
};

// ── Helpers (hoisted outside component) ──
function getModuleName() {
  return window.location.pathname.split('/')[1] || 'trabajadoreskrsft';
}

function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-PE');
}

function getInitials(t) {
  const first = t.nombres?.charAt(0) || '';
  const last = t.apellido_paterno?.charAt(0) || '';
  return (first + last).toUpperCase() || 'XX';
}

// ── Cache helpers ──
function saveToCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* ignore quota errors */ }
}

function loadFromCache(key) {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (cached) return JSON.parse(cached).data;
  } catch { /* ignore parse errors */ }
  return null;
}

// ── Static JSX hoisted outside component (rendering-hoist-jsx) ──
const SPINNER_SMALL = <span className="spinner-small" />;

// ══════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════
export default function TrabajadoresIndex() {
  // ── State ──
  const [activeTab, setActiveTab] = useState('list');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [trabajadores, setTrabajadores] = useState(() => loadFromCache('trabajadores') || []);
  const [stats, setStats] = useState(() => loadFromCache('stats') || { total: 0, activos: 0, inactivos: 0 });
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Import state
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // Refs
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);
  const trabajadoresRef = useRef(trabajadores);
  const statsRef = useRef(stats);

  // Keep refs in sync (avoid stale closures in polling)
  useEffect(() => { trabajadoresRef.current = trabajadores; }, [trabajadores]);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  // ── Computed values ──
  const uniqueCargos = useMemo(() => {
    const cargos = trabajadores.map(t => t.cargo).filter(c => c?.trim());
    return [...new Set(cargos)].sort();
  }, [trabajadores]);

  const filteredTrabajadores = useMemo(() => {
    let result = trabajadores;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.dni?.toLowerCase().includes(q) ||
        t.nombre_completo?.toLowerCase().includes(q) ||
        t.nombres?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
      );
    }

    // Cargo filter
    if (filterCargo) {
      result = result.filter(t => t.cargo === filterCargo);
    }

    return result;
  }, [trabajadores, searchQuery, filterCargo]);

  // ── Toast helper ──
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  }, []);

  // ── Data fetching ──
  const loadTrabajadores = useCallback(async (withLoading = false) => {
    if (withLoading) setLoading(true);
    try {
      const res = await fetch(`/api/${getModuleName()}/list`, {
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) {
        const incoming = data.trabajadores || [];
        if (JSON.stringify(trabajadoresRef.current) !== JSON.stringify(incoming)) {
          setTrabajadores(incoming);
          saveToCache('trabajadores', incoming);
        }
      }
    } catch (e) {
      console.error('Error:', e);
      if (withLoading) showToast('Error al cargar trabajadores', 'error');
    }
    if (withLoading) setLoading(false);
  }, [showToast]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/${getModuleName()}/stats`, {
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success && JSON.stringify(statsRef.current) !== JSON.stringify(data.stats)) {
        setStats(data.stats);
        saveToCache('stats', data.stats);
      }
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  }, []);

  // ── Lifecycle: mount + polling (async-parallel: fetch both in parallel) ──
  useEffect(() => {
    const hasCache = trabajadoresRef.current.length > 0;
    // Parallel fetch on mount
    Promise.all([loadTrabajadores(!hasCache), loadStats()]);

    pollingRef.current = setInterval(() => {
      Promise.all([loadTrabajadores(), loadStats()]);
    }, POLLING_INTERVAL_MS);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadTrabajadores, loadStats]);

  // ── Form helpers ──
  const openCreateModal = useCallback(() => {
    setForm({ ...DEFAULT_FORM });
    setEditingId(null);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setForm({ ...DEFAULT_FORM });
    setEditingId(null);
  }, []);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  // ── Search / filter handlers ──
  const handleSearchInput = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  // ── Actions ──
  const editTrabajador = useCallback((t) => {
    setEditingId(t.id);
    setForm({ ...t });
    setShowModal(true);
  }, []);

  const saveTrabajador = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId
        ? `/api/${getModuleName()}/${editingId}`
        : `/api/${getModuleName()}/create`;

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || 'Guardado exitosamente');
        closeModal();
        // Parallel refresh
        await Promise.all([loadTrabajadores(), loadStats()]);
      } else {
        showToast(data.message || 'Error al guardar', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    }
    setSaving(false);
  }, [editingId, form, showToast, closeModal, loadTrabajadores, loadStats]);

  const confirmDelete = useCallback((t) => {
    setItemToDelete(t);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/${getModuleName()}/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) {
        showToast('Trabajador eliminado');
        setShowDeleteModal(false);
        setItemToDelete(null);
        await Promise.all([loadTrabajadores(), loadStats()]);
      } else {
        showToast(data.message || 'Error al eliminar', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    }
    setDeleting(false);
  }, [itemToDelete, showToast, loadTrabajadores, loadStats]);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  }, []);

  // ── Excel functions ──
  const downloadTemplate = useCallback(async () => {
    setDownloadingTemplate(true);
    try {
      const res = await fetch(`/api/${getModuleName()}/excel/template`, {
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      if (!res.ok) throw new Error('Error downloading');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_trabajadores.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Plantilla descargada correctamente');
    } catch {
      showToast('Error al descargar plantilla', 'error');
    }
    setDownloadingTemplate(false);
  }, [showToast]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
    } else {
      showToast('Por favor selecciona un archivo Excel (.xlsx)', 'error');
    }
  }, [showToast]);

  const importExcel = useCallback(async () => {
    if (!selectedFile) {
      showToast('Por favor selecciona un archivo', 'error');
      return;
    }
    setImporting(true);
    setImportResults(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(`/api/${getModuleName()}/excel/import`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
        body: formData,
      });
      const result = await res.json();
      const results = {
        total: result.total || 0,
        imported: result.imported || 0,
        errors: result.errors || [],
      };
      setImportResults(results);
      setSelectedFile(null);

      if (results.imported > 0) {
        await Promise.all([loadTrabajadores(), loadStats()]);
      }
      if (results.errors.length === 0) {
        showToast(`¡Importación exitosa! ${results.imported} trabajadores importados`);
      } else {
        showToast(`${results.imported} de ${results.total} registros importados`, 'info');
      }
    } catch {
      showToast('Error al importar archivo', 'error');
    }
    setImporting(false);
  }, [selectedFile, showToast, loadTrabajadores, loadStats]);

  // ── Overlay click handlers ──
  const handleModalOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) closeModal();
  }, [closeModal]);

  const handleDeleteOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) closeDeleteModal();
  }, [closeDeleteModal]);

  // ── Drag handlers ──
  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════
  return (
    <div className="trabajadores-layout">
      {/* Background */}
      <div className="trabajadores-bg" />

      {/* Main Container */}
      <div className="trabajadores-container">
        {/* Header */}
        <header className="module-header">
          <div className="header-left">
            <button onClick={() => window.history.back()} className="btn-back" title="Volver">
              {BackIcon}
              Volver
            </button>
            <div className="module-title">
              <div className="title-icon-wrapper title-icon-white">
                {StatUsersIcon}
              </div>
              <div>
                <h1>GESTIÓN DE TRABAJADORES</h1>
                <p className="module-subtitle">Administre el personal y la información laboral</p>
              </div>
            </div>
          </div>
          <div className="header-right" />
        </header>

        {/* Tabs */}
        <div className="tabs-container">
          <button
            onClick={() => setActiveTab('list')}
            className={`tab-button${activeTab === 'list' ? ' tab-active' : ''}`}
          >
            {ListIcon}
            Listado
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`tab-button${activeTab === 'import' ? ' tab-active' : ''}`}
          >
            {UploadIcon}
            Importar Excel
          </button>
        </div>

        {/* Main Content */}
        <main className="module-content">
          {/* ── TAB: LISTADO ── */}
          <div style={{ display: activeTab === 'list' ? 'block' : 'none' }}>
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card stat-total">
                <div className="stat-icon stat-icon-white">
                  {StatUsersIcon}
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.total}</div>
                  <h3>Total Personal</h3>
                </div>
              </div>
              <div className="stat-card stat-installed">
                <div className="stat-icon">
                  {CheckCircleIcon}
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.activos}</div>
                  <h3>Personal Activo</h3>
                </div>
              </div>
              <div className="stat-card stat-updates">
                <div className="stat-icon">
                  {XCircleIcon}
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.inactivos}</div>
                  <h3>Inactivos / Cesados</h3>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="filters-container-row">
              <div className="filter-input-wrapper with-border">
                <span className="search-icon-fixed">{SearchIcon}</span>
                <input
                  type="text"
                  placeholder="DNI o Nombre..."
                  value={searchQuery}
                  onChange={handleSearchInput}
                />
              </div>

              <CustomSelect
                value={filterCargo}
                onChange={setFilterCargo}
                options={[
                  { value: '', label: 'Todos los cargos' },
                  ...uniqueCargos.map(c => ({ value: c, label: c }))
                ]}
                placeholder="Todos los cargos"
              />

              <button onClick={openCreateModal} className="btn-new-worker">
                {PlusIcon}
                Nuevo Trabajador
              </button>
            </div>

            {/* Table */}
            <div className="table-container">
              <TrabajadoresTable
                trabajadores={filteredTrabajadores}
                loading={loading}
                onEdit={editTrabajador}
                onDelete={confirmDelete}
                formatDate={formatDate}
                getInitials={getInitials}
                badgeClasses={BADGE_CLASSES}
                openCreateModal={openCreateModal}
              />
            </div>
          </div>

          {/* ── TAB: IMPORTAR EXCEL ── */}
          <div style={{ display: activeTab === 'import' ? 'block' : 'none' }}>
            <div className="import-section">
              <div className="import-card">
                <h2>Importación Masiva de Trabajadores</h2>
                <p>Sigue estos 3 pasos para importar múltiples trabajadores a la vez</p>

                <div className="steps-container">
                  {/* Step 1 */}
                  <div className="step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3>Descargar Plantilla</h3>
                      <p>Descarga la plantilla Excel con el formato requerido</p>
                      <button onClick={downloadTemplate} disabled={downloadingTemplate} className="btn-download">
                        {downloadingTemplate ? SPINNER_SMALL : DownloadIcon}
                        {downloadingTemplate ? 'Descargando...' : 'Descargar Plantilla'}
                      </button>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h3>Completar Datos</h3>
                      <p>Rellena la plantilla con los datos de los trabajadores (Formato CSV)</p>
                      <ul className="step-list">
                        <li>• Guardar archivo como CSV (Delimitado por comas)</li>
                        <li>• DNI (8 dígitos), Nombre Completo y Estado son obligatorios</li>
                        <li>• Estado debe ser: Activo o Cesado</li>
                      </ul>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>Subir Archivo</h3>
                      <p>Selecciona el archivo CSV</p>

                      <div
                        className={`upload-area${dragging ? ' dragging' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileSelect}
                          style={{ display: 'none' }}
                        />
                        {selectedFile ? (
                          <div className="upload-file-info">
                            {FileIcon}
                            <div>
                              <p className="file-name">{selectedFile.name}</p>
                              <p className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                            <button onClick={() => setSelectedFile(null)} className="btn-change-file">Cambiar</button>
                          </div>
                        ) : (
                          <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                            {UploadIcon}
                            <p>Arrastra el archivo Excel aquí o haz clic para seleccionar</p>
                            <span className="upload-hint">Formatos soportados: .xlsx, .xls</span>
                          </div>
                        )}
                      </div>

                      {selectedFile ? (
                        <button onClick={importExcel} disabled={importing} className="btn-import">
                          {importing ? SPINNER_SMALL : UploadIcon}
                          {importing ? 'Importando...' : 'Comenzar Importación'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Import Results */}
                {importResults ? (
                  <div className="import-results">
                    <div className="result-summary">
                      <h3>Resultados de Importación</h3>
                      <p>
                        <span className="result-imported">{importResults.imported}</span> de{' '}
                        <span className="result-total">{importResults.total}</span> registros importados
                      </p>
                    </div>
                    {importResults.errors?.length > 0 ? (
                      <div className="errors-list">
                        <h4>Errores encontrados:</h4>
                        <div className="error-items">
                          {importResults.errors.map((error, i) => (
                            <div key={i} className="error-item">
                              <span className="error-row">Fila {error.row}</span>
                              {error.dni ? <span className="error-dni">(DNI: {error.dni})</span> : null}
                              <span className="error-message">{error.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Toast */}
      {toast.show ? (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      ) : null}

      {/* ── MODAL: CREAR/EDITAR ── */}
      {showModal ? (
        <div className="modal-overlay" onClick={handleModalOverlayClick}>
          <div className="modal-container">
            <div className="modal-form-card">
              {/* Header with close button */}
              <div className="modal-header">
                <div className="modal-header-text">
                  <h2>{editingId ? 'Editar Trabajador' : 'Nuevo Trabajador'}</h2>
                  <p className="form-subtitle">Complete los campos requeridos (*) para registrar al trabajador.</p>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={closeModal}
                  title="Cerrar"
                  aria-label="Cerrar modal"
                >
                  {CloseIcon}
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={saveTrabajador} className="worker-form">
                  {/* Datos Personales */}
                  <div className="form-section-title">Datos Personales</div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>DNI / CE *</label>
                      <input name="dni" value={form.dni} onChange={handleFormChange} type="text" maxLength="12" required placeholder="12345678" />
                    </div>
                    <div className="form-group">
                      <label>Nombres *</label>
                      <input name="nombres" value={form.nombres} onChange={handleFormChange} type="text" required placeholder="Juan Carlos" />
                    </div>
                    <div className="form-group">
                      <label>Apellido Paterno *</label>
                      <input name="apellido_paterno" value={form.apellido_paterno} onChange={handleFormChange} type="text" required placeholder="García" />
                    </div>
                    <div className="form-group">
                      <label>Apellido Materno</label>
                      <input name="apellido_materno" value={form.apellido_materno || ''} onChange={handleFormChange} type="text" placeholder="López" />
                    </div>
                    <div className="form-group">
                      <label>Fecha de Nacimiento</label>
                      <input name="fecha_nacimiento" value={form.fecha_nacimiento || ''} onChange={handleFormChange} type="date" />
                    </div>
                    <div className="form-group">
                      <label>Género</label>
                      <select name="genero" value={form.genero} onChange={handleFormChange}>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Estado Civil</label>
                      <select name="estado_civil" value={form.estado_civil} onChange={handleFormChange}>
                        <option value="Soltero">Soltero</option>
                        <option value="Casado">Casado</option>
                        <option value="Divorciado">Divorciado</option>
                        <option value="Viudo">Viudo</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Teléfono</label>
                      <input name="telefono" value={form.telefono || ''} onChange={handleFormChange} type="tel" placeholder="999888777" />
                    </div>
                    <div className="form-group span-full">
                      <label>Email</label>
                      <input name="email" value={form.email || ''} onChange={handleFormChange} type="email" placeholder="correo@empresa.com" />
                    </div>
                    <div className="form-group span-full">
                      <label>Dirección</label>
                      <input name="direccion" value={form.direccion || ''} onChange={handleFormChange} type="text" placeholder="Av. Principal 123" />
                    </div>
                  </div>

                  {/* Datos Laborales */}
                  <div className="form-section-title">Datos Laborales</div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Cargo *</label>
                      <input name="cargo" value={form.cargo || ''} onChange={handleFormChange} type="text" required placeholder="Analista" />
                    </div>
                    <div className="form-group">
                      <label>Fecha de Ingreso *</label>
                      <input name="fecha_ingreso" value={form.fecha_ingreso || ''} onChange={handleFormChange} type="date" required />
                    </div>
                    <div className="form-group">
                      <label>Tipo de Contrato</label>
                      <select name="tipo_contrato" value={form.tipo_contrato} onChange={handleFormChange}>
                        <option value="Indefinido">Indefinido</option>
                        <option value="Plazo Fijo">Plazo Fijo</option>
                        <option value="Temporal">Temporal</option>
                        <option value="Practicas">Prácticas</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Estado</label>
                      <select name="estado" value={form.estado} onChange={handleFormChange}>
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                        <option value="Cesado">Cesado</option>
                        <option value="Vacaciones">Vacaciones</option>
                        <option value="Licencia">Licencia</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Sueldo Básico</label>
                      <input name="sueldo_basico" value={form.sueldo_basico || ''} onChange={handleFormChange} type="number" step="0.01" placeholder="2500.00" />
                    </div>
                    <div className="form-group">
                      <label>Sistema de Pensiones</label>
                      <select name="sistema_pensiones" value={form.sistema_pensiones || ''} onChange={handleFormChange}>
                        <option value="">Sin asignar</option>
                        <option value="ONP">ONP</option>
                        <option value="AFP Integra">AFP Integra</option>
                        <option value="AFP Prima">AFP Prima</option>
                        <option value="AFP Profuturo">AFP Profuturo</option>
                        <option value="AFP Habitat">AFP Habitat</option>
                      </select>
                    </div>
                  </div>

                  {/* Contacto de Emergencia */}
                  <div className="form-section-title">Contacto de Emergencia</div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre</label>
                      <input name="contacto_emergencia_nombre" value={form.contacto_emergencia_nombre || ''} onChange={handleFormChange} type="text" placeholder="María García" />
                    </div>
                    <div className="form-group">
                      <label>Teléfono</label>
                      <input name="contacto_emergencia_telefono" value={form.contacto_emergencia_telefono || ''} onChange={handleFormChange} type="tel" placeholder="999111222" />
                    </div>
                    <div className="form-group">
                      <label>Parentesco</label>
                      <input name="contacto_emergencia_parentesco" value={form.contacto_emergencia_parentesco || ''} onChange={handleFormChange} type="text" placeholder="Esposa" />
                    </div>
                  </div>

                  <div className="form-group span-full form-group-observations">
                    <label>Observaciones</label>
                    <textarea name="observaciones" value={form.observaciones || ''} onChange={handleFormChange} rows="3" placeholder="Notas adicionales..." />
                  </div>

                  {/* Actions */}
                  <div className="form-actions">
                    <button type="button" onClick={closeModal} className="btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" disabled={saving} className="btn-primary">
                      {saving ? SPINNER_SMALL : null}
                      {saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Registrar')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── MODAL: CONFIRM ELIMINAR ── */}
      {showDeleteModal ? (
        <div className="modal-overlay" onClick={handleDeleteOverlayClick}>
          <div className="delete-modal-card">
            <div className="delete-modal-icon">
              {XCircleIcon}
            </div>
            <h2>¿Estás seguro?</h2>
            <p>
              Estás a punto de eliminar a{' '}
              <strong>{itemToDelete?.nombre_completo || itemToDelete?.nombres}</strong>.
              Esta acción no se puede deshacer.
            </p>
            <div className="delete-modal-actions">
              <button onClick={closeDeleteModal} className="btn-secondary" disabled={deleting}>
                Cancelar
              </button>
              <button onClick={handleDeleteConfirmed} className="btn-danger" disabled={deleting}>
                {deleting ? SPINNER_SMALL : null}
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
