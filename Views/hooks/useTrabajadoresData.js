import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  POLLING_MS, DEFAULT_FORM,
  getModuleName, getCsrfToken,
  saveToCache, loadFromCache,
} from '../utils';

/**
 * useTrabajadoresData – All state, fetching, CRUD and handlers.
 */
export function useTrabajadoresData() {
  /* ── Core state ── */
  const [trabajadores, setTrabajadores] = useState(() => loadFromCache('trabajadores') || []);
  const [stats, setStats] = useState(() => loadFromCache('stats') || { total: 0, activos: 0, inactivos: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Search / filter / tabs ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [activeTab, setActiveTab] = useState('list');

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
  const openCreateModal = useCallback(() => { setForm({ ...DEFAULT_FORM }); setEditingId(null); setShowModal(true); }, []);
  const closeModal = useCallback(() => { setShowModal(false); setForm({ ...DEFAULT_FORM }); setEditingId(null); }, []);
  const editTrabajador = useCallback((t) => { setEditingId(t.id); setForm({ ...t }); setShowModal(true); }, []);
  const handleFormChange = useCallback((e) => { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); }, []);

  /* ── CRUD ── */
  const saveTrabajador = useCallback(async (e) => {
    e.preventDefault();
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
  }, [editingId, form, showToast, closeModal, loadTrabajadores, loadStats]);

  /* ── Delete ── */
  const confirmDelete = useCallback((t) => { setItemToDelete(t); setShowDeleteModal(true); }, []);
  const closeDeleteModal = useCallback(() => { setShowDeleteModal(false); setItemToDelete(null); }, []);
  const handleDeleteConfirmed = useCallback(async () => {
    if (!itemToDelete) return;
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
  }, [itemToDelete, showToast, loadTrabajadores, loadStats]);

  /* ── Import ── */
  const downloadTemplate = useCallback(async () => {
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
  }, [showToast]);

  const handleFileSelect = useCallback((e) => { const f = e.target.files[0]; if (f) setSelectedFile(f); }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setSelectedFile(f);
    else showToast('Por favor selecciona un archivo Excel (.xlsx)', 'error');
  }, [showToast]);

  const importExcel = useCallback(async () => {
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
  }, [selectedFile, showToast, loadTrabajadores, loadStats]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);

  return {
    trabajadores, stats, filteredTrabajadores, uniqueCargos,
    loading, saving, activeTab, setActiveTab,
    searchQuery, setSearchQuery, filterCargo, setFilterCargo,
    editingId, showModal, form, handleFormChange,
    openCreateModal, closeModal, editTrabajador, saveTrabajador,
    showDeleteModal, itemToDelete, deleting,
    confirmDelete, handleDeleteConfirmed, closeDeleteModal,
    toast,
    selectedFile, setSelectedFile, dragging, importing,
    downloadingTemplate, importResults, fileInputRef,
    downloadTemplate, handleFileSelect, handleDrop, importExcel,
    handleDragOver, handleDragLeave,
  };
}
