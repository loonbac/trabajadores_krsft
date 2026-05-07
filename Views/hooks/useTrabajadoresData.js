import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { hasPermission } from '@/utils/permissions';
import {
  POLLING_MS, DEFAULT_FORM,
  getModuleName, getCsrfToken,
  saveToCache, loadFromCache,
} from '../utils';

/**
 * useTrabajadoresData – All state, fetching, CRUD and handlers.
 */
export function useTrabajadoresData(auth) {
  /* ── Core state ── */
  const [trabajadores, setTrabajadores] = useState(() => loadFromCache('trabajadores') || []);
  const [stats, setStats] = useState(() => loadFromCache('stats') || { total: 0, activos: 0, inactivos: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Search / filter / tabs ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const [vacationSearch, setVacationSearch] = useState('');
  const [vacationRequests, setVacationRequests] = useState([]);
  const [vacationForm, setVacationForm] = useState({
    trabajador_id: '',
    tipo: 'vacaciones',
    fecha_inicio: '',
    fecha_fin: '',
    motivo: '',
  });

  /* ── Form modal ── */
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  /* ── Delete modal ── */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Toast ── */
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  /* ── Import ── */
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importResults, setImportResults] = useState(null);

  /* ── Refs ── */
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);
  const trabajadoresRef = useRef(trabajadores);
  const statsRef = useRef(stats);

  useEffect(() => { trabajadoresRef.current = trabajadores; }, [trabajadores]);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  const permissions = useMemo(() => ({
    view_listado: hasPermission(auth, 'module.trabajadoreskrsft.view_listado'),
    view_rrhh: hasPermission(auth, 'module.trabajadoreskrsft.view_rrhh'),
    view_vacaciones: hasPermission(auth, 'module.trabajadoreskrsft.view_vacaciones'),
    view_planillas: hasPermission(auth, 'module.trabajadoreskrsft.view_planillas'),
    create: hasPermission(auth, 'module.trabajadoreskrsft.create'),
    update: hasPermission(auth, 'module.trabajadoreskrsft.update'),
    delete: hasPermission(auth, 'module.trabajadoreskrsft.delete'),
    import: hasPermission(auth, 'module.trabajadoreskrsft.import'),
    export: hasPermission(auth, 'module.trabajadoreskrsft.export'),
  }), [auth]);

  /* ── Computed ── */
  const uniqueCargos = useMemo(() => {
    const cargos = trabajadores.map(t => t.cargo).filter(c => c?.trim());
    return [...new Set(cargos)].sort();
  }, [trabajadores]);

  const filteredTrabajadores = useMemo(() => {
    let result = trabajadores;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.dni?.toLowerCase().includes(q) ||
        t.nombre_completo?.toLowerCase().includes(q) ||
        t.nombres?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
      );
    }
    if (filterCargo) result = result.filter(t => t.cargo === filterCargo);
    return result;
  }, [trabajadores, searchQuery, filterCargo]);

  const vacationBalances = useMemo(() => {
    return trabajadores
      .filter(t => (t.estado || '').trim().toLowerCase() === 'activo')
      .map((t) => {
        const start = t.fecha_ingreso ? new Date(t.fecha_ingreso) : null;
        const validStart = start && !Number.isNaN(start.getTime());
        const workedDays = validStart ? Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))) : 0;
        const accruedDays = validStart ? Math.min(30, Math.round((workedDays / 365) * 30)) : 0;

        const approvedDays = vacationRequests
          .filter(r => r.trabajador_id === t.id && r.estado === 'aprobada')
          .reduce((acc, r) => acc + (Number(r.dias) || 0), 0);

        const pendingDays = vacationRequests
          .filter(r => r.trabajador_id === t.id && r.estado === 'pendiente')
          .reduce((acc, r) => acc + (Number(r.dias) || 0), 0);

        return {
          id: t.id,
          dni: t.dni,
          nombre: t.nombre_completo || `${t.apellido_paterno || ''} ${t.apellido_materno || ''} ${t.nombres || ''}`.trim(),
          cargo: t.cargo || '-',
          fecha_ingreso: t.fecha_ingreso || null,
          accruedDays,
          approvedDays,
          pendingDays,
          availableDays: Math.max(accruedDays - approvedDays, 0),
        };
      });
  }, [trabajadores, vacationRequests]);

  const filteredVacationBalances = useMemo(() => {
    const q = vacationSearch.trim().toLowerCase();
    if (!q) return vacationBalances;
    return vacationBalances.filter((w) =>
      (w.nombre || '').toLowerCase().includes(q)
      || (w.dni || '').toLowerCase().includes(q)
      || (w.cargo || '').toLowerCase().includes(q)
    );
  }, [vacationBalances, vacationSearch]);

  const vacationSummary = useMemo(() => ({
    activos: vacationBalances.length,
    diasDisponibles: vacationBalances.reduce((acc, w) => acc + (w.availableDays || 0), 0),
    solicitudesPendientes: vacationRequests.filter(r => r.estado === 'pendiente').length,
    solicitudesAprobadas: vacationRequests.filter(r => r.estado === 'aprobada').length,
  }), [vacationBalances, vacationRequests]);

  const rrhhOverview = useMemo(() => {
    const activeWorkers = trabajadores.filter(t => (t.estado || '').trim().toLowerCase() === 'activo');

    const missingPayrollData = activeWorkers.filter(t => {
      const hasContract = !!(t.tipo_contrato || '').trim();
      const hasPension = !!(t.sistema_pensiones || '').trim();
      const hasSalary = Number(t.sueldo_basico || 0) > 0;
      return !(hasContract && hasPension && hasSalary);
    });

    const missingPlameData = activeWorkers.filter(t => {
      const hasDni = !!(t.dni || '').trim();
      const hasName = !!(t.nombre_completo || t.nombres || '').trim();
      const hasEntryDate = !!t.fecha_ingreso;
      return !(hasDni && hasName && hasEntryDate);
    });

    const potentialArcoRisk = activeWorkers.filter(t => !(t.email || '').trim() && !(t.telefono || '').trim());

    const withVacationBase = activeWorkers.filter(t => !!t.fecha_ingreso);
    const estimatedVacationPool = withVacationBase.reduce((acc, t) => {
      const start = new Date(t.fecha_ingreso);
      if (Number.isNaN(start.getTime())) return acc;
      const daysWorked = Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const estimatedAccrued = Math.min(30, Math.round((daysWorked / 365) * 30));
      return acc + estimatedAccrued;
    }, 0);

    const complianceDenominator = Math.max(1, activeWorkers.length * 4);
    const complianceNumerator = Math.max(0,
      complianceDenominator
      - missingPayrollData.length
      - missingPlameData.length
      - potentialArcoRisk.length
      - activeWorkers.filter(t => !(t.fecha_ingreso || '').trim()).length
    );

    return {
      activeWorkers: activeWorkers.length,
      missingPayrollData: missingPayrollData.length,
      missingPlameData: missingPlameData.length,
      potentialArcoRisk: potentialArcoRisk.length,
      estimatedVacationPool,
      complianceScore: Math.max(0, Math.min(100, Math.round((complianceNumerator / complianceDenominator) * 100))),
    };
  }, [trabajadores]);

  const payrollConcepts = useMemo(() => ([
    { code: 'ING001', name: 'Sueldo Basico', type: 'ingreso', affectation: 'afecto', formula: 'base_mensual' },
    { code: 'ING020', name: 'Horas Extra', type: 'ingreso', affectation: 'afecto', formula: 'horas_extra * tarifa_hora' },
    { code: 'DES010', name: 'ONP', type: 'descuento', affectation: 'previsional', formula: 'base_previsional * 0.13' },
    { code: 'DES020', name: 'AFP', type: 'descuento', affectation: 'previsional', formula: 'base_previsional * tasa_afp' },
    { code: 'APP001', name: 'EsSalud', type: 'aporte', affectation: 'empleador', formula: 'base_salud * 0.09' },
  ]), []);

  const payrollFormulaModel = useMemo(() => ([
    {
      key: 'horas_trabajadas',
      label: 'Horas Trabajadas',
      formula: 'horas = dias_trabajados * 8',
      excelReference: 'I = J * 8',
    },
    {
      key: 'remuneracion_diaria',
      label: 'Remuneracion Diaria',
      formula: 'rem_diaria = remuneracion_bruta / 30',
      excelReference: 'K = M / 30',
    },
    {
      key: 'movilidad_supeditada',
      label: 'Movilidad Supeditada',
      formula: 'movilidad = tarifa_categoria * dias_trabajados +/- ajustes',
      excelReference: 'P = AM * J (con ajustes manuales en algunas filas)',
    },
    {
      key: 'total_ingresos',
      label: 'Total de Ingresos',
      formula: 'total_ingresos = SUM(remuneracion_bruta ... cts_trunca)',
      excelReference: 'W = SUM(M:V)',
    },
    {
      key: 'rem_aportacion',
      label: 'Remuneracion para Aportacion',
      formula: 'rem_aportacion = remuneracion_bruta + asignacion_familiar + vacaciones_truncas',
      excelReference: 'X = M + N + S',
    },
    {
      key: 'afp_onp',
      label: 'Descuentos Previsionales',
      formula: 'afp = rem_aportacion * 10%; onp = rem_aportacion * 13% (segun regimen)',
      excelReference: 'AB = X * 10%; AA = X * 13%',
    },
    {
      key: 'essalud',
      label: 'EsSalud',
      formula: 'essalud = rem_aportacion * 9%',
      excelReference: 'AH = X * 9%',
    },
    {
      key: 'total_deduccion',
      label: 'Total Deduccion',
      formula: 'deduccion = SUM(onp, afp, seguro, comision, quinta)',
      excelReference: 'AF = SUM(AA:AE)',
    },
    {
      key: 'neto_pagar',
      label: 'Neto a Pagar',
      formula: 'neto = total_ingresos - total_deduccion',
      excelReference: 'AG = W - AF',
    },
    {
      key: 'fin_mes',
      label: 'Pago Fin de Mes',
      formula: 'fin_mes = neto - primera_quincena',
      excelReference: 'AK = AG - AJ',
    },
  ]), []);

  const payrollExcelSnapshot = useMemo(() => ({
    sourceFile: 'docs/plantillas/PLANILLA 2026 CEYA (16).xlsx',
    workersInExcel: 12,
    workersMatchedByDni: 9,
    workersMissingInDb: 3,
    missingWorkers: [
      { dni: '70596908', nombre: 'ALVAREZ RUBIO EDUARDO ENRIQUE' },
      { dni: '70552979', nombre: 'CONDEZO PISCO JHON HECTOR' },
      { dni: '70482088', nombre: 'MACEDO TANGOA ROSA ISABEL' },
    ],
    netoTotal: 15113.66,
    remuneracionTotal: 15461.66,
    pensionDistribution: [
      { system: 'INTEGRA', workers: 9 },
      { system: 'PROFUTURO', workers: 2 },
      { system: 'ONP', workers: 1 },
    ],
  }), []);

  const legalParameters = useMemo(() => ([
    { code: 'UIT_2026', name: 'UIT', value: 5350, unit: 'PEN', valid_from: '2026-01-01' },
    { code: 'RMV_2026', name: 'Remuneracion Minima Vital', value: 1130, unit: 'PEN', valid_from: '2026-01-01' },
    { code: 'ESSALUD_2026', name: 'Aporte EsSalud', value: 9, unit: '%', valid_from: '2026-01-01' },
    { code: 'ONP_2026', name: 'Aporte ONP', value: 13, unit: '%', valid_from: '2026-01-01' },
    { code: 'AFP_COM_REFER', name: 'AFP Comision Referencial', value: 1.69, unit: '%', valid_from: '2026-01-01' },
  ]), []);

  const plamePreview = useMemo(() => {
    return trabajadores.slice(0, 20).map((t) => {
      const hasDni = !!(t.dni || '').trim();
      const hasName = !!(t.nombre_completo || t.nombres || '').trim();
      const hasEntryDate = !!(t.fecha_ingreso || '').trim();
      const hasStatus = !!(t.estado || '').trim();
      const valid = hasDni && hasName && hasEntryDate && hasStatus;

      return {
        id: t.id,
        dni: t.dni || '-',
        name: t.nombre_completo || t.nombres || '-',
        period: new Date().toISOString().slice(0, 7),
        status: valid ? 'listo' : 'incompleto',
        issues: [
          !hasDni ? 'DNI' : null,
          !hasName ? 'Nombre' : null,
          !hasEntryDate ? 'Fecha ingreso' : null,
          !hasStatus ? 'Estado' : null,
        ].filter(Boolean),
      };
    });
  }, [trabajadores]);

  /* ── Toast helper ── */
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  }, []);

  /* ── API ── */
  const API = `/api/${getModuleName()}`;
  const hdrs = () => ({ Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() });
  const jsonHdrs = () => ({ 'Content-Type': 'application/json', ...hdrs() });

  const loadTrabajadores = useCallback(async (withLoading = false) => {
    if (withLoading) setLoading(true);
    try {
      const res = await fetch(`${API}/list`, { headers: hdrs() });
      const data = await res.json();
      if (data.success) {
        const incomingRaw = data.trabajadores ?? data.workers ?? [];
        const incoming = Array.isArray(incomingRaw) ? incomingRaw : [];
        const computedStats = {
          total: incoming.length,
          activos: incoming.filter(t => (t.estado || '').trim().toLowerCase() === 'activo').length,
          inactivos: incoming.filter(t => (t.estado || '').trim().toLowerCase() !== 'activo').length,
        };
        if (JSON.stringify(trabajadoresRef.current) !== JSON.stringify(incoming)) {
          setTrabajadores(incoming);
          saveToCache('trabajadores', incoming);
        }
        if (JSON.stringify(statsRef.current) !== JSON.stringify(computedStats)) {
          setStats(computedStats);
          saveToCache('stats', computedStats);
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
      const res = await fetch(`${API}/stats`, { headers: hdrs() });
      const data = await res.json();
      if (data.success && data.stats) {
        if (JSON.stringify(statsRef.current) !== JSON.stringify(data.stats)) {
          setStats(data.stats);
          saveToCache('stats', data.stats);
        }
      }
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  }, []);

  /* ── Lifecycle + polling ── */
  useEffect(() => {
    const hasCache = trabajadoresRef.current.length > 0;
    loadTrabajadores(!hasCache);
    loadStats();
    pollingRef.current = setInterval(() => {
      loadTrabajadores();
      loadStats();
    }, POLLING_MS);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [loadTrabajadores, loadStats]);

  /* ── Modal handlers ── */
  const openCreateModal = useCallback(() => {
    if (!permissions.create) {
      showToast('No tienes permiso para crear trabajadores', 'error');
      return;
    }

    setForm({ ...DEFAULT_FORM });
    setEditingId(null);
    setShowModal(true);
  }, [permissions.create, showToast]);
  const closeModal = useCallback(() => { setShowModal(false); setForm({ ...DEFAULT_FORM }); setEditingId(null); }, []);
  const editTrabajador = useCallback((t) => {
    if (!permissions.update) {
      showToast('No tienes permiso para editar trabajadores', 'error');
      return;
    }

    setEditingId(t.id);
    setForm({ ...t });
    setShowModal(true);
  }, [permissions.update, showToast]);
  const handleFormChange = useCallback((e) => { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); }, []);

  /* ── CRUD ── */
  const saveTrabajador = useCallback(async (e) => {
    e.preventDefault();

    if ((editingId && !permissions.update) || (!editingId && !permissions.create)) {
      showToast('No tienes permiso para guardar trabajadores', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `${API}/${editingId}` : `${API}/create`;
      const res = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: jsonHdrs(), body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Guardado exitosamente');
        closeModal();
        await Promise.all([loadTrabajadores(), loadStats()]);
      } else {
        showToast(data.message || 'Error al guardar', 'error');
      }
    } catch { showToast('Error de conexión', 'error'); }
    setSaving(false);
  }, [editingId, form, permissions.create, permissions.update, showToast, closeModal, loadTrabajadores, loadStats]);

  /* ── Delete ── */
  const confirmDelete = useCallback((t) => {
    if (!permissions.delete) {
      showToast('No tienes permiso para eliminar trabajadores', 'error');
      return;
    }

    setItemToDelete(t);
    setShowDeleteModal(true);
  }, [permissions.delete, showToast]);
  const closeDeleteModal = useCallback(() => { setShowDeleteModal(false); setItemToDelete(null); }, []);
  const handleDeleteConfirmed = useCallback(async () => {
    if (!itemToDelete) return;

    if (!permissions.delete) {
      showToast('No tienes permiso para eliminar trabajadores', 'error');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`${API}/${itemToDelete.id}`, { method: 'DELETE', headers: hdrs() });
      const data = await res.json();
      if (data.success) {
        showToast('Trabajador eliminado');
        setShowDeleteModal(false); setItemToDelete(null);
        await Promise.all([loadTrabajadores(), loadStats()]);
      } else { showToast(data.message || 'Error al eliminar', 'error'); }
    } catch { showToast('Error de conexión', 'error'); }
    setDeleting(false);
  }, [itemToDelete, permissions.delete, showToast, loadTrabajadores, loadStats]);

  /* ── Import ── */
  const downloadTemplate = useCallback(async () => {
    if (!permissions.export) {
      showToast('No tienes permiso para exportar plantillas', 'error');
      return;
    }

    setDownloadingTemplate(true);
    try {
      const res = await fetch(`${API}/excel/template`, {
        headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'plantilla_trabajadores.xlsx'; a.click();
      window.URL.revokeObjectURL(url);
      showToast('Plantilla descargada correctamente');
    } catch { showToast('Error al descargar plantilla', 'error'); }
    setDownloadingTemplate(false);
  }, [permissions.export, showToast]);

  const handleFileSelect = useCallback((e) => { const f = e.target.files[0]; if (f) setSelectedFile(f); }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setSelectedFile(f);
    else showToast('Por favor selecciona un archivo Excel (.xlsx)', 'error');
  }, [showToast]);

  const importExcel = useCallback(async () => {
    if (!permissions.import) {
      showToast('No tienes permiso para importar trabajadores', 'error');
      return;
    }

    if (!selectedFile) { showToast('Por favor selecciona un archivo', 'error'); return; }
    setImporting(true); setImportResults(null);
    try {
      const fd = new FormData(); fd.append('file', selectedFile);
      const res = await fetch(`${API}/excel/import`, { method: 'POST', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() }, body: fd });
      const result = await res.json();
      const results = { total: result.total || 0, imported: result.imported || 0, errors: result.errors || [] };
      setImportResults(results); setSelectedFile(null);
      if (results.imported > 0) await Promise.all([loadTrabajadores(), loadStats()]);
      if (results.errors.length === 0) showToast(`¡Importación exitosa! ${results.imported} trabajadores importados`);
      else showToast(`${results.imported} de ${results.total} registros importados`, 'info');
    } catch { showToast('Error al importar archivo', 'error'); }
    setImporting(false);
  }, [selectedFile, permissions.import, showToast, loadTrabajadores, loadStats]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);

  const setVacationFormField = useCallback((field, value) => {
    setVacationForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetVacationForm = useCallback(() => {
    setVacationForm({
      trabajador_id: '',
      tipo: 'vacaciones',
      fecha_inicio: '',
      fecha_fin: '',
      motivo: '',
    });
  }, []);

  const createVacationRequest = useCallback(() => {
    const trabajadorId = Number(vacationForm.trabajador_id || 0);
    const worker = vacationBalances.find(w => w.id === trabajadorId);

    if (!worker) {
      showToast('Selecciona un trabajador valido', 'error');
      return;
    }
    if (!vacationForm.fecha_inicio || !vacationForm.fecha_fin) {
      showToast('Debes indicar fecha de inicio y fin', 'error');
      return;
    }

    const start = new Date(vacationForm.fecha_inicio);
    const end = new Date(vacationForm.fecha_fin);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      showToast('Rango de fechas invalido', 'error');
      return;
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (vacationForm.tipo === 'vacaciones' && diffDays > worker.availableDays) {
      showToast('El trabajador no tiene saldo suficiente para ese rango', 'error');
      return;
    }

    const overlap = vacationRequests.some((r) => {
      if (r.trabajador_id !== trabajadorId || r.estado === 'rechazada') return false;
      const existingStart = new Date(r.fecha_inicio);
      const existingEnd = new Date(r.fecha_fin);
      return start <= existingEnd && end >= existingStart;
    });

    if (overlap) {
      showToast('No se permite traslape con solicitudes vigentes', 'error');
      return;
    }

    const request = {
      id: Date.now(),
      trabajador_id: trabajadorId,
      trabajador_nombre: worker.nombre,
      tipo: vacationForm.tipo,
      fecha_inicio: vacationForm.fecha_inicio,
      fecha_fin: vacationForm.fecha_fin,
      dias: diffDays,
      motivo: vacationForm.motivo || '-',
      estado: 'pendiente',
      created_at: new Date().toISOString(),
    };

    setVacationRequests((prev) => [request, ...prev]);
    resetVacationForm();
    showToast('Solicitud registrada en bandeja de RRHH', 'success');
  }, [vacationForm, vacationBalances, vacationRequests, showToast, resetVacationForm]);

  const updateVacationRequestStatus = useCallback((requestId, estado) => {
    setVacationRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, estado } : r)));
  }, []);

  return {
    trabajadores, stats, filteredTrabajadores, uniqueCargos,
    loading, saving, activeTab, setActiveTab,
    searchQuery, setSearchQuery, filterCargo, setFilterCargo,
    editingId, showModal, form, handleFormChange,
    openCreateModal, closeModal, editTrabajador, saveTrabajador,
    showDeleteModal, itemToDelete, deleting,
    confirmDelete, handleDeleteConfirmed, closeDeleteModal,
    toast,
    permissions,
    rrhhOverview,
    payrollConcepts,
    payrollFormulaModel,
    payrollExcelSnapshot,
    legalParameters,
    plamePreview,
    vacationSearch,
    setVacationSearch,
    vacationBalances,
    filteredVacationBalances,
    vacationRequests,
    vacationSummary,
    vacationForm,
    setVacationFormField,
    createVacationRequest,
    updateVacationRequestStatus,
    selectedFile, setSelectedFile, dragging, importing,
    downloadingTemplate, importResults, fileInputRef,
    downloadTemplate, handleFileSelect, handleDrop, importExcel,
    handleDragOver, handleDragLeave,
  };
}
