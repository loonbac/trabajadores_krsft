import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { hasPermission } from '@/utils/permissions';
import { getModuleName, getCsrfToken } from '../utils';

const POLLING_MS = 30000;

/**
 * usePdrMetasData — State, fetch and CRUD for the PDR metas tab.
 */
export function usePdrMetasData(auth) {
    const [supervisores, setSupervisores] = useState([]);
    const [supervisoresResumen, setSupervisoresResumen] = useState([]);
    const [supervisorId, setSupervisorId] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('inspecciones');
    const [metasConfig, setMetasConfig] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [pendientes, setPendientes] = useState([]);
    const [ejecuciones, setEjecuciones] = useState([]);
    const [hallazgos, setHallazgos] = useState([]);
    const [trabajadores, setTrabajadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedMeta, setSelectedMeta] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const pollingRef = useRef(null);

    const permissions = useMemo(() => ({
        view: hasPermission(auth, 'module.trabajadoreskrsft.view_pdr'),
        execute: hasPermission(auth, 'module.trabajadoreskrsft.execute_pdr'),
        manageConfig: hasPermission(auth, 'module.trabajadoreskrsft.manage_pdr_config'),
        manageSupervisors: hasPermission(auth, 'module.trabajadoreskrsft.manage_pdr_supervisors'),
        manageHallazgos: hasPermission(auth, 'module.trabajadoreskrsft.manage_pdr_hallazgos'),
    }), [auth]);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    }, []);

    const API = `/api/${getModuleName()}/pdr`;
    const hdrs = () => ({ Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() });

    /* ── Fetchers ── */
    const fetchSupervisores = useCallback(async () => {
        try {
            const res = await fetch(`${API}/supervisores?is_active=true`, { headers: hdrs(), cache: 'no-store' });
            const json = await res.json();
            if (json.success) setSupervisores(Array.isArray(json.data) ? json.data : []);
        } catch { /* silent */ }
    }, []);

    const fetchSupervisoresResumen = useCallback(async () => {
        try {
            const res = await fetch(`${API}/resumen-supervisores`, { headers: hdrs(), cache: 'no-store' });
            const json = await res.json();
            if (json.success) setSupervisoresResumen(Array.isArray(json.data) ? json.data : []);
        } catch { /* silent */ }
    }, []);

    const fetchMetasConfig = useCallback(async () => {
        try {
            const res = await fetch(`${API}/metas-config`, { headers: hdrs(), cache: 'no-store' });
            const json = await res.json();
            if (json.success) setMetasConfig(Array.isArray(json.data) ? json.data : []);
        } catch { /* silent */ }
    }, []);

    // sId null/undefined => global aggregate (vista general)
    const fetchResumen = useCallback(async (sId) => {
        try {
            const qs = sId ? `?supervisor_id=${sId}` : '';
            const res = await fetch(`${API}/resumen${qs}`, { headers: hdrs(), cache: 'no-store' });
            const json = await res.json();
            if (json.success) setResumen(json.data);
        } catch { /* silent */ }
    }, []);

    const fetchPendientes = useCallback(async (sId) => {
        if (!sId) return;
        try {
            const res = await fetch(`${API}/pendientes?supervisor_id=${sId}`, { headers: hdrs(), cache: 'no-store' });
            const json = await res.json();
            if (json.success) setPendientes(Array.isArray(json.data) ? json.data : []);
        } catch { /* silent */ }
    }, []);

    const fetchEjecuciones = useCallback(async (metaAsignadaId) => {
        if (!metaAsignadaId) return;
        try {
            const res = await fetch(`${API}/ejecuciones/${metaAsignadaId}`, { headers: hdrs(), cache: 'no-store' });
            const json = await res.json();
            if (json.success) setEjecuciones(Array.isArray(json.data) ? json.data : []);
        } catch { /* silent */ }
    }, []);

    const fetchTrabajadores = useCallback(async () => {
        try {
            const res = await fetch(`/api/${getModuleName()}/list?estado=Activo`, { headers: hdrs(), cache: 'no-store' });
            const json = await res.json();
            if (json.success) setTrabajadores(Array.isArray(json.trabajadores) ? json.trabajadores : []);
        } catch { /* silent */ }
    }, []);

    const fetchHallazgos = useCallback(async () => {
        try {
            const params = supervisorId ? `?supervisor_id=${supervisorId}` : '';
            const res = await fetch(`${API}/hallazgos${params}`, { headers: hdrs(), cache: 'no-store' });
            const json = await res.json();
            if (json.success) setHallazgos(Array.isArray(json.data) ? json.data : []);
        } catch { /* silent */ }
    }, [supervisorId]);

    /* ── Write ops ── */
    const registrarEjecucion = useCallback(async (formData) => {
        setSaving(true);
        try {
            const res = await fetch(`${API}/ejecuciones`, {
                method: 'POST',
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
                body: formData,
            });
            const json = await res.json();
            if (json.success) {
                showToast('Ejecucion registrada correctamente');
                if (supervisorId) {
                    await Promise.all([fetchResumen(supervisorId), fetchPendientes(supervisorId)]);
                }
                await fetchHallazgos();
                return json.data;
            }
            showToast(json.message || 'Error al registrar', 'error');
            return null;
        } catch {
            showToast('Error de conexion', 'error');
            return null;
        } finally {
            setSaving(false);
        }
    }, [supervisorId, fetchResumen, fetchPendientes, fetchHallazgos, showToast]);

    const createSupervisor = useCallback(async (trabajadorId) => {
        setSaving(true);
        try {
            const res = await fetch(`${API}/supervisores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...hdrs() },
                body: JSON.stringify({ trabajador_id: trabajadorId }),
            });
            const json = await res.json();
            if (json.success) {
                showToast('Supervisor registrado correctamente');
                await fetchSupervisores();
                return json.data;
            }
            showToast(json.message || 'Error al registrar supervisor', 'error');
            return null;
        } catch {
            showToast('Error de conexion', 'error');
            return null;
        } finally {
            setSaving(false);
        }
    }, [fetchSupervisores, showToast]);

    const createSupervisorsBatch = useCallback(async (trabajadorIds) => {
        if (!Array.isArray(trabajadorIds) || trabajadorIds.length === 0) return { ok: 0, fail: 0 };
        setSaving(true);
        let ok = 0;
        let fail = 0;
        try {
            for (const tid of trabajadorIds) {
                try {
                    const res = await fetch(`${API}/supervisores`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...hdrs() },
                        body: JSON.stringify({ trabajador_id: tid }),
                    });
                    const json = await res.json();
                    if (json.success) ok += 1; else fail += 1;
                } catch {
                    fail += 1;
                }
            }
            await fetchSupervisores();
            if (ok > 0) showToast(`Registrado${ok === 1 ? '' : 's'} ${ok} supervisor${ok === 1 ? '' : 'es'}${fail ? ` (${fail} con error)` : ''}`);
            else if (fail > 0) showToast(`Error al registrar ${fail} supervisor${fail === 1 ? '' : 'es'}`, 'error');
        } finally {
            setSaving(false);
        }
        return { ok, fail };
    }, [fetchSupervisores, showToast]);

    const deleteSupervisorsBatch = useCallback(async (supervisorIds) => {
        if (!Array.isArray(supervisorIds) || supervisorIds.length === 0) return { ok: 0, fail: 0 };
        setSaving(true);
        let ok = 0;
        let fail = 0;
        try {
            for (const sid of supervisorIds) {
                try {
                    const res = await fetch(`${API}/supervisores/${sid}`, { method: 'DELETE', headers: hdrs() });
                    const json = await res.json();
                    if (json.success) ok += 1; else fail += 1;
                } catch {
                    fail += 1;
                }
            }
            await fetchSupervisores();
            if (supervisorIds.includes(supervisorId)) setSupervisorId(null);
            if (ok > 0) showToast(`Desactivado${ok === 1 ? '' : 's'} ${ok} supervisor${ok === 1 ? '' : 'es'}${fail ? ` (${fail} con error)` : ''}`);
            else if (fail > 0) showToast(`Error al desactivar ${fail} supervisor${fail === 1 ? '' : 'es'}`, 'error');
        } finally {
            setSaving(false);
        }
        return { ok, fail };
    }, [fetchSupervisores, supervisorId, showToast]);

    const deleteSupervisor = useCallback(async (id) => {
        try {
            const res = await fetch(`${API}/supervisores/${id}`, {
                method: 'DELETE',
                headers: hdrs(),
            });
            const json = await res.json();
            if (json.success) {
                showToast('Supervisor desactivado');
                await fetchSupervisores();
                if (supervisorId === id) setSupervisorId(null);
            } else {
                showToast(json.message || 'Error', 'error');
            }
        } catch {
            showToast('Error de conexion', 'error');
        }
    }, [fetchSupervisores, supervisorId, showToast]);

    const updateHallazgo = useCallback(async (id, estadoResolucion) => {
        try {
            const res = await fetch(`${API}/hallazgos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...hdrs() },
                body: JSON.stringify({ estado_resolucion: estadoResolucion }),
            });
            const json = await res.json();
            if (json.success) {
                showToast('Hallazgo actualizado');
                await fetchHallazgos();
            } else {
                showToast(json.message || 'Error', 'error');
            }
        } catch {
            showToast('Error de conexion', 'error');
        }
    }, [fetchHallazgos, showToast]);

    /* ── Lifecycle ── */
    useEffect(() => {
        Promise.all([fetchSupervisores(), fetchMetasConfig()]).then(() => setLoading(false));
    }, [fetchSupervisores, fetchMetasConfig]);

    // Auto-detect supervisor from auth user (solo si el usuario ES supervisor).
    // Si no, queda null => vista general (agregado global). No autoseleccionar.
    useEffect(() => {
        if (supervisores.length > 0 && !supervisorId) {
            const userId = auth?.user?.id;
            const match = supervisores.find(s => s.trabajador_id === userId);
            if (match) setSupervisorId(match.id);
        }
    }, [supervisores, supervisorId, auth]);

    // Load data on mount and when supervisor changes.
    // supervisorId null => resumen global + todos los hallazgos (vista general).
    // pendientes requiere supervisor (lista de ejecucion personal).
    useEffect(() => {
        fetchResumen(supervisorId);
        fetchHallazgos();
        if (supervisorId) {
            fetchPendientes(supervisorId);
        } else {
            setPendientes([]);
            fetchSupervisoresResumen();
        }
    }, [supervisorId, fetchResumen, fetchPendientes, fetchHallazgos, fetchSupervisoresResumen]);

    // Polling
    useEffect(() => {
        pollingRef.current = setInterval(() => {
            fetchResumen(supervisorId);
            if (supervisorId) fetchPendientes(supervisorId);
            else fetchSupervisoresResumen();
        }, POLLING_MS);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [supervisorId, fetchResumen, fetchPendientes, fetchSupervisoresResumen]);

    return {
        supervisorId, setSupervisorId, supervisores, supervisoresResumen,
        activeSubTab, setActiveSubTab,
        metasConfig, resumen, pendientes, ejecuciones, hallazgos, trabajadores,
        loading, saving, selectedMeta, setSelectedMeta,
        permissions, toast,
        fetchEjecuciones, registrarEjecucion, updateHallazgo,
        fetchResumen, fetchPendientes, fetchHallazgos,
        fetchSupervisores, fetchTrabajadores,
        createSupervisor, deleteSupervisor,
        createSupervisorsBatch, deleteSupervisorsBatch,
        showToast,
    };
}
