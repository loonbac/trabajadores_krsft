import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/* ── Core ERP base styles (remove imports if you don't want base styles) ── */
import '../../../resources/css/Bytewave-theme.css';
import '../../../resources/css/modules-layout.css';
import '../../../resources/css/users-table.css';
import '../../../resources/css/modules-modal.css';

/* ── Module-specific styles (modular split) ── */
import './trabajadores-layout.css';
import './trabajadores-table.css';
import './trabajadores-form.css';
import './trabajadores-import.css';
import './trabajadores-modal.css';

// ── Constants ──
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

  // Import state
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // Refs
  const fileInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
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
    if (!searchQuery) return trabajadores;
    const q = searchQuery.toLowerCase();
    return trabajadores.filter(t =>
      t.dni?.toLowerCase().includes(q) ||
      t.nombre_completo?.toLowerCase().includes(q) ||
      t.nombres?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q)
    );
  }, [trabajadores, searchQuery]);

  // ── Toast helper ──
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  }, []);

  // ── Data fetching ──
  const loadTrabajadores = useCallback(async (withLoading = false) => {
    if (withLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCargo) params.set('cargo', filterCargo);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/${getModuleName()}/list?${params}`, {
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) {
        const incoming = data.trabajadores || [];
        // Only update if data actually changed
        if (JSON.stringify(trabajadoresRef.current) !== JSON.stringify(incoming)) {
          setTrabajadores(incoming);
          if (!filterCargo && !searchQuery) saveToCache('trabajadores', incoming);
        }
      }
    } catch (e) {
      console.error('Error:', e);
      if (withLoading) showToast('Error al cargar trabajadores', 'error');
    }
    if (withLoading) setLoading(false);
  }, [filterCargo, searchQuery, showToast]);

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
    if (localStorage.getItem('trabajadores-dark-mode') === 'true') {
      document.body.classList.add('dark-mode');
    }

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
  const resetForm = useCallback(() => {
    setForm({ ...DEFAULT_FORM });
    setEditingId(null);
  }, []);

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

  // ── Search debounce ──
  const handleSearchInput = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(value);
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => loadTrabajadores(), 500);
  }, [loadTrabajadores]);

  // ── Actions ──
  const toggleDarkMode = useCallback(() => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('trabajadores-dark-mode', isDark ? 'true' : 'false');
  }, []);

  const goBack = useCallback(() => { window.location.href = '/'; }, []);

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

  const confirmDelete = useCallback(async (t) => {
    if (!confirm(`¿Estás seguro de eliminar a ${t.nombre_completo || t.nombres}?`)) return;
    try {
      const res = await fetch(`/api/${getModuleName()}/${t.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) {
        showToast('Trabajador eliminado');
        await Promise.all([loadTrabajadores(), loadStats()]);
      } else {
        showToast(data.message || 'Error al eliminar', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    }
  }, [showToast, loadTrabajadores, loadStats]);

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

  // ── Filter by cargo ──
  const handleCargoFilter = useCallback((e) => {
    setFilterCargo(e.target.value);
  }, []);

  useEffect(() => {
    loadTrabajadores();
  }, [filterCargo, loadTrabajadores]);

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════
  return (
    <div className="trabajadores-layout">
      {/* Background */}
      <div className="trabajadores-bg" />

      {/* Main Container */}
      <div className="trabajadores-container">
        {/* Header — reuses .module-header, .header-left, .btn-back from core */}
        <header className="module-header">
          <div className="header-left">
            <button onClick={goBack} className="btn-back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Volver
            </button>
            <h1>
              <svg className="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/>
              </svg>
              GESTIÓN DE TRABAJADORES
            </h1>
          </div>
          <div className="header-right">
            <button onClick={toggleDarkMode} className="theme-toggle" title="Cambiar tema">
              <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
              <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Tabs — reuses .tabs-container, .tab-button from core */}
        <div className="tabs-container">
          <button className={`tab-button${activeTab === 'list' ? ' tab-active' : ''}`} onClick={() => setActiveTab('list')}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            Listado
          </button>
          <button className={`tab-button${activeTab === 'import' ? ' tab-active' : ''}`} onClick={() => setActiveTab('import')}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
            Importar Excel
          </button>
        </div>

        {/* Main Content */}
        <main className="module-content">
          {/* ── TAB: LISTADO ── */}
          <div style={{ display: activeTab === 'list' ? 'block' : 'none' }}>
            {/* Stats Cards — reuses .stats-grid, .stat-card, .stat-icon from core */}
            <div className="stats-grid">
              <div className="stat-card stat-total">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m7-10a4 4 0 100-8 4 4 0 000 8zm8 10v-2a4 4 0 00-3-3.87m3.87 0a4 4 0 100-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="stat-content">
                  <h3>TOTAL TRABAJADORES</h3>
                  <p className="stat-number">{stats.total}</p>
                  <p className="stat-subtitle">Registrados en el sistema</p>
                </div>
              </div>
              <div className="stat-card stat-active">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="stat-content">
                  <h3>ACTIVOS</h3>
                  <p className="stat-number">{stats.activos}</p>
                  <p className="stat-subtitle">En planilla activa</p>
                </div>
              </div>
              <div className="stat-card stat-inactive">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="stat-content">
                  <h3>INACTIVOS</h3>
                  <p className="stat-number">{stats.inactivos}</p>
                  <p className="stat-subtitle">Cesados o licencia</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="filters-container">
              <div className="filters-row">
                <div className="search-box">
                  <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input value={searchQuery} onChange={handleSearchInput} type="text" placeholder="Buscar por DNI, nombre, email..." className="search-input" />
                </div>
                <select value={filterCargo} onChange={handleCargoFilter} className="filter-select">
                  <option value="">Todos los cargos</option>
                  {uniqueCargos.map(cargo => <option key={cargo} value={cargo}>{cargo}</option>)}
                </select>
                <button onClick={openCreateModal} className="btn-new-worker">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Nuevo Trabajador
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="table-container">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Cargando trabajadores...</p>
                </div>
              ) : trabajadores.length === 0 ? (
                <div className="empty-state">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  <p>No hay trabajadores registrados</p>
                  <button onClick={openCreateModal} className="btn-primary">Agregar primer trabajador</button>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Trabajador</th>
                      <th>DNI</th>
                      <th>Cargo</th>
                      <th>Fecha Ingreso</th>
                      <th>Estado</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrabajadores.map(t => (
                      <tr key={t.id}>
                        <td>
                          <div className="worker-info">
                            <div className="avatar">{getInitials(t)}</div>
                            <div>
                              <div className="worker-name">{t.nombre_completo || `${t.apellido_paterno} ${t.apellido_materno}, ${t.nombres}`}</div>
                              <div className="worker-email">{t.email || 'Sin email'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="mono">{t.dni}</td>
                        <td>{t.cargo || '-'}</td>
                        <td>{formatDate(t.fecha_ingreso)}</td>
                        <td>
                          <span className={`badge ${BADGE_CLASSES[t.estado] || 'badge-default'}`}>{t.estado}</span>
                        </td>
                        <td className="actions-cell">
                          <button onClick={() => editTrabajador(t)} className="btn-action btn-edit" title="Editar">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          <button onClick={() => confirmDelete(t)} className="btn-action btn-delete" title="Eliminar">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── TAB: IMPORTAR EXCEL ── */}
          <div style={{ display: activeTab === 'import' ? 'block' : 'none' }}>
            <div className="import-section">
              <div className="import-card">
                <h2>Importación Masiva de Trabajadores</h2>

                <div className="steps-container">
                  {/* Step 1 */}
                  <div className="step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3>Descargar Plantilla</h3>
                      <p>Descarga la plantilla Excel con el formato requerido</p>
                      <button onClick={downloadTemplate} disabled={downloadingTemplate} className="btn-download">
                        {downloadingTemplate ? (
                          <span className="spinner-small" />
                        ) : (
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        )}
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
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                      >
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} style={{ display: 'none' }} />
                        {selectedFile ? (
                          <div className="upload-file-info">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            <div>
                              <p className="file-name">{selectedFile.name}</p>
                              <p className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                            <button onClick={() => setSelectedFile(null)} className="btn-change-file">Cambiar</button>
                          </div>
                        ) : (
                          <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                            <p>Arrastra el archivo aquí o haz clic para seleccionar</p>
                            <span className="upload-hint">Solo archivos Excel (.xlsx)</span>
                          </div>
                        )}
                      </div>

                      {selectedFile ? (
                        <button onClick={importExcel} disabled={importing} className="btn-import">
                          {importing ? (
                            <span className="spinner-small" />
                          ) : (
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                          )}
                          {importing ? 'Importando...' : 'Importar Trabajadores'}
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

      {/* Toast — reuses .toast from core modules-modal.css */}
      {toast.show ? (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      ) : null}

      {/* ── MODAL: CREAR/EDITAR ── */}
      {showModal ? (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-container">
            <button onClick={closeModal} className="modal-close" title="Cerrar">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>

            <div className="modal-form-card">
              <h2>{editingId ? 'Editar Trabajador' : 'Nuevo Trabajador'}</h2>
              <p className="form-subtitle">Complete los campos requeridos (*) para registrar al trabajador.</p>

              <form onSubmit={saveTrabajador} className="worker-form">
                {/* Datos Personales */}
                <div className="form-section-title">Datos Personales</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>DNI/CE *</label>
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
                  <div className="form-group span-2">
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

                <div className="form-group span-full">
                  <label>Observaciones</label>
                  <textarea name="observaciones" value={form.observaciones || ''} onChange={handleFormChange} rows="3" placeholder="Notas adicionales..." />
                </div>

                {/* Actions */}
                <div className="form-actions">
                  <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? <span className="spinner-small" /> : null}
                    {saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Registrar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
