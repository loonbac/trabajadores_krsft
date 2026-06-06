import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { EyeIcon, InboxIcon, ArrowDownTrayIcon, AcademicCapIcon, TableCellsIcon, ChevronLeftIcon, ChevronRightIcon, ArrowsPointingInIcon, ShieldCheckIcon, CursorArrowRaysIcon } from '@heroicons/react/24/outline';

import { hasPermission } from '@/utils/permissions';
import SearchInput from './ui/SearchInput';
import Select      from './ui/Select';
import Badge       from './ui/Badge';
import Alert       from './ui/Alert';
import EmptyState  from './ui/EmptyState';
import SsomaWorkerDrawer from './SsomaWorkerDrawer';
import SsomaCertPanel    from './SsomaCertPanel';
import CertMatrixOverlay from './CertMatrixOverlay';
import CargoMatrixOverlay from './CargoMatrixOverlay';
import { useFocusTable } from '../hooks/useFocusTable';
import { ESTADO_OPTIONS } from '../utils';
import {
    SSOMA_POLLING_MS, SSOMA_DOC_TYPES, DOC_DOT,
    APTITUD_LABELS, APTITUD_VARIANT, ESTADO_LABORAL_VARIANT,
    MODALIDAD_OPTIONS, initials,
} from './ssomaSection';

const API = '/api/trabajadoreskrsft/ssoma';
const CERT_API = '/api/trabajadoreskrsft/certifications';
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

const DOC_HEAD = { SST: 'SST', EMO: 'EMO', CAMO: 'CAMO', EPP: 'EPP', DOC_SST: 'Cargo Doc SST' };
const VIGENCIA_OPTS = [
    { value: '', label: 'Vigencia: todas' },
    { value: 'vigente', label: 'Vigente' },
    { value: 'por_vencer', label: 'Por Vencer' },
    { value: 'vencido', label: 'Vencido' },
    { value: 'no_definido', label: 'ND' },
];

// Paginación: la tabla muestra siempre como máximo PAGE_SIZE trabajadores por
// página (sin scroll vertical); se navega con botones.
const PAGE_SIZE = 10;

/**
 * SsomaTab — cumplimiento documental dentro de Trabajadores.
 * Tabla + filtros + export. El detalle/edición vive en la ficha (modal).
 */
export default function SsomaTab({ onEdit, focusBlocked = false }) {
    const { auth } = usePage().props;
    const canViewCerts = hasPermission(auth, 'module.trabajadoreskrsft.view_certificaciones')
        || hasPermission(auth, 'module.trabajadoreskrsft.manage_certificaciones');

    const [workers, setWorkers] = useState([]);
    const [stats, setStats]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const [search, setSearch]   = useState('');
    const [tipos, setTipos]     = useState([]);
    const [filters, setFilters] = useState({ tipo: '', estado: '', vigencia: '', aptitud: '', modalidad: '' });

    const [selected, setSelected]     = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [certWorker, setCertWorker]   = useState(null);
    const [certPanelOpen, setCertPanelOpen] = useState(false);

    // Vista: 'ssoma' (cumplimiento documental) ↔ 'certs' (capacitaciones) ↔ 'cargos' (asignar cargos).
    const [view, setView]             = useState('ssoma');
    const [certTypes, setCertTypes]   = useState([]);
    const [certMatrix, setCertMatrix] = useState({});
    const [certLoading, setCertLoading] = useState(false);
    // Altura del toolbar del overlay "Asignar Cargos" (la reporta el overlay).
    // Empuja el header de la tabla base la misma cantidad para alinear ambas grillas.
    const [cargoToolbarH, setCargoToolbarH] = useState(0);
    // Pending state (cargo sin documento, o documento sin fecha) reportado por
    // CargoMatrixOverlay. El banner recordatorio se renderiza FUERA de la tabla.
    const [cargoPending, setCargoPending] = useState(false);
    // Ids de trabajadores con cargo en el cert filtrado del overlay 'Asignar Cargos'
    // (los reporta CargoMatrixOverlay). null = sin chip activo → se muestran todos.
    const [cargoFilteredIds, setCargoFilteredIds] = useState(null);

    // Página actual (0-based) de la tabla paginada.
    const [page, setPage] = useState(0);

    // Geometría medida de la tabla base para alinear el overlay de certificados
    // exactamente sobre las columnas Tipo…Acciones (deja visibles Nombre y DNI).
    const [geom, setGeom] = useState({ left: 0, head: 0, row: 0, tableH: 0 });
    // Modo foco (fórmula común en useFocusTable): al scrollear, la tabla salta al
    // frente centrada con fondo desenfocado. No se entra si carga, no hay filas o
    // hay panel/drawer abierto (ese wheel es global y robaría el scroll del panel).
    const wrapperRef    = useRef(null);
    const {
        focused, focusRender, focusEnter, goFocus,
        sectionRef, flipRef, baseScrollRef, onAreaWheel,
    } = useFocusTable(!loading && workers.length > 0 && !certPanelOpen && !drawerOpen && !focusBlocked);
    const theadRef    = useRef(null);
    const dniThRef    = useRef(null);
    const firstRowRef = useRef(null);
    const tableRef    = useRef(null);

    const debounceRef = useRef(null);

    const buildQuery = useCallback((q) => {
        const p = new URLSearchParams();
        if (q) p.set('search', q);
        Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
        const s = p.toString();
        return s ? `?${s}` : '';
    }, [filters]);

    const fetchWorkers = useCallback(async (q = '') => {
        try {
            const res  = await fetch(`${API}/list${buildQuery(q)}`, { cache: 'no-store' });
            const json = await res.json();
            if (json.success) {
                setWorkers(Array.isArray(json.data) ? json.data : []);
                setError(null);
            } else {
                setError(json.message || 'Error al cargar los trabajadores');
            }
        } catch (err) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    }, [buildQuery]);

    const fetchStats = useCallback(async () => {
        try {
            const res  = await fetch(`${API}/stats`, { cache: 'no-store' });
            const json = await res.json();
            if (json.success) setStats(json.data);
        } catch { /* silencioso */ }
    }, []);

    const loadCertMatrix = useCallback(async () => {
        setCertLoading(true);
        try {
            const res  = await fetch(`${CERT_API}/matrix`, { cache: 'no-store' });
            const json = await res.json();
            if (json.success) {
                setCertTypes(Array.isArray(json.types) ? json.types : []);
                setCertMatrix(json.workers || {});
            }
        } catch { /* silencioso */ } finally {
            setCertLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch(`${API}/tipos`, { cache: 'no-store' }).then((r) => r.json()).then((j) => { if (j.success) setTipos(j.data || []); }).catch(() => {});
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchWorkers('');
        fetchStats();
    }, [fetchWorkers, fetchStats]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setLoading(true);
            fetchWorkers(search);
        }, 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [search, fetchWorkers]);

    useEffect(() => {
        const t = setInterval(() => {
            fetchWorkers(search);
            fetchStats();
            if (view === 'certs') loadCertMatrix();
        }, SSOMA_POLLING_MS);
        return () => clearInterval(t);
    }, [fetchWorkers, fetchStats, search, view, loadCertMatrix]);

    // Mide la tabla base (borde derecho de DNI) para posicionar el overlay sobre
    // las columnas Tipo…Acciones (tanto CertMatrixOverlay como CargoMatrixOverlay).
    useLayoutEffect(() => {
        if (view !== 'certs' && view !== 'cargos') return undefined;
        const measure = () => {
            const wrap   = wrapperRef.current;
            const th     = dniThRef.current;
            const thead  = theadRef.current;
            const row    = firstRowRef.current;
            if (!wrap || !th || !thead) return;
            const wr = wrap.getBoundingClientRect();
            const tr = th.getBoundingClientRect();
            setGeom({
                left: Math.round(tr.right - wr.left),
                head: Math.round(thead.getBoundingClientRect().height),
                row:  row ? Math.round(row.getBoundingClientRect().height) : 52,
                tableH: tableRef.current ? Math.round(tableRef.current.getBoundingClientRect().height) : 0,
            });
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [view, workers, loading, certTypes, focusRender, focusEnter]);

    const openDrawer = useCallback(async (worker) => {
        try {
            const res  = await fetch(`${API}/${worker.id}`, { cache: 'no-store' });
            const json = await res.json();
            setSelected(json.success ? json.data : worker);
        } catch { setSelected(worker); }
        setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => { setDrawerOpen(false); setSelected(null); }, []);

    const toggleView = useCallback(() => {
        // If already in certs → go back to ssoma; otherwise switch to certs.
        const next = view === 'certs' ? 'ssoma' : 'certs';
        setView(next);
        if (next === 'certs') { loadCertMatrix(); goFocus(true); }
        else goFocus(false);
    }, [view, loadCertMatrix, goFocus]);

    const toggleCargoView = useCallback(() => {
        // If already in cargos → go back to ssoma; otherwise switch to cargos.
        setView((v) => {
            const next = v === 'cargos' ? 'ssoma' : 'cargos';
            goFocus(next === 'cargos');
            return next;
        });
    }, [goFocus]);

    // Recibe de CargoMatrixOverlay el cert filtrado + ids con cargo (o null,null).
    // Filtra+pagina la tabla base para que coincida con el overlay. Solo resetea la
    // página cuando cambia el cert activo (no en cada guardado, que también re-reporta).
    const cargoCertRef = useRef(null);
    const handleCargoFilter = useCallback((certId, ids) => {
        setCargoFilteredIds(ids);
        if (certId !== cargoCertRef.current) {
            cargoCertRef.current = certId;
            setPage(0);
        }
    }, []);

    const openCertPanel = useCallback((worker) => { setCertWorker(worker); setCertPanelOpen(true); }, []);
    const closeCertPanel = useCallback(() => {
        setCertPanelOpen(false);
        setView((v) => { if (v === 'certs') loadCertMatrix(); return v; });
    }, [loadCertMatrix]);

    // When cert panel closes from cargo view, no matrix reload needed
    // (CargoMatrixOverlay fetches its own data)

    const handleEdit = useCallback((trabajador) => {
        closeDrawer();
        onEdit?.(trabajador);
    }, [closeDrawer, onEdit]);

    const deleteExterno = useCallback(async (id) => {
        if (!window.confirm('¿Eliminar este trabajador externo? Se borran también sus documentos y archivos. No se puede deshacer.')) return;
        try {
            const res = await fetch(`${API}/${id}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
            });
            const j = await res.json();
            if (j.success) {
                closeDrawer();
                fetchWorkers(search);
                fetchStats();
            } else {
                setError(j.message || 'No se pudo eliminar');
            }
        } catch {
            setError('Error de conexión al eliminar');
        }
    }, [closeDrawer, fetchWorkers, fetchStats, search]);

    const setFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

    const totalAtRisk = useMemo(
        () => (stats ? stats.docs_vencidos + stats.docs_por_vencer : 0),
        [stats],
    );

    // ── Paginación (10/página, cliente) ──────────────────────────────────────
    // En vista 'cargos' con un chip activo, la tabla muestra SOLO los trabajadores
    // con cargo en ese certificado (ids reportados por CargoMatrixOverlay).
    const displayWorkers = useMemo(() => {
        if (view === 'cargos' && cargoFilteredIds !== null) {
            const set = new Set(cargoFilteredIds.map(String));
            return workers.filter((w) => set.has(String(w.id)));
        }
        return workers;
    }, [workers, view, cargoFilteredIds]);

    const pageCount = Math.max(1, Math.ceil(displayWorkers.length / PAGE_SIZE));
    // Clamp en el render mismo: si el filtro achica la lista, evita un frame con
    // slice fuera de rango (overlay vacío sobre tabla con filas) antes del effect.
    const safePage = Math.min(page, pageCount - 1);
    const pageWorkers = useMemo(
        () => displayWorkers.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
        [displayWorkers, safePage],
    );
    // Volver a la primera página al cambiar búsqueda/filtros.
    useEffect(() => { setPage(0); }, [search, filters]);
    // Clamp si la lista se achica (filtro/borrado) y la página actual ya no existe.
    useEffect(() => { setPage((p) => Math.min(p, pageCount - 1)); }, [pageCount]);

    const exportCsv = useCallback(() => {
        const head = ['Nombre', 'DNI', 'Tipo', 'Puesto', 'Estado', ...SSOMA_DOC_TYPES.map((t) => DOC_HEAD[t]), 'Estado O/C', 'Aptitud', 'Fotocheck'];
        const rows = workers.map((w) => [
            w.nombre, w.dni, w.tipo || '', w.cargo || '', w.estado_laboral || '',
            ...SSOMA_DOC_TYPES.map((t) => w.documentos?.[t]?.estado ?? 'no_definido'),
            w.modalidad || '', APTITUD_LABELS[w.aptitud_medica] ?? 'No Definido', w.fotocheck ? 'Sí' : 'No',
        ]);
        const csv = [head, ...rows]
            .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `ssoma_cumplimiento_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    }, [workers]);

    const body = (
        <>
            {stats && totalAtRisk > 0 && (
                <div className="krsft-fade-up">
                    <Alert
                        type="warning"
                        message={`Atención Requerida — Hay ${totalAtRisk} documento(s) (SST, EMO, CAMO, EPP, Cargo Doc SST) vencidos o por vencer que requieren acción para mantener el cumplimiento normativo.`}
                    />
                </div>
            )}
            {error && <div className="krsft-fade-up"><Alert type="error" message={error} /></div>}

            {/* Filtros — flotan arriba (tarjeta propia, más aún en modo foco) */}
            <div className="krsft-fade-up krsft-glow-ring rounded-lg border-2 border-gray-200 bg-white p-3 shadow-sm" style={{ '--krsft-delay': '60ms' }}>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Buscar por DNI o Nombre..." className="lg:flex-1" />
                    <Select value={filters.tipo} onChange={(e) => setFilter('tipo', e.target.value)}
                        options={[{ value: '', label: 'Tipo: todos' }, ...tipos.map((t) => ({ value: t, label: t }))]} placeholder="" className="lg:w-40" />
                    <Select value={filters.estado} onChange={(e) => setFilter('estado', e.target.value)}
                        options={[{ value: '', label: 'Estado: todos' }, ...ESTADO_OPTIONS]} placeholder="" className="lg:w-40" />
                    {view === 'ssoma' && (
                        <>
                            <Select value={filters.vigencia} onChange={(e) => setFilter('vigencia', e.target.value)}
                                options={VIGENCIA_OPTS} placeholder="" className="krsft-fade-in lg:w-44" />
                            <Select value={filters.aptitud} onChange={(e) => setFilter('aptitud', e.target.value)}
                                options={[{ value: '', label: 'Aptitud: todas' }, ...Object.entries(APTITUD_LABELS).map(([v, l]) => ({ value: v, label: l }))]} placeholder="" className="krsft-fade-in lg:w-48" />
                            <Select value={filters.modalidad} onChange={(e) => setFilter('modalidad', e.target.value)}
                                options={[{ value: '', label: 'O/C: todas' }, ...MODALIDAD_OPTIONS.map((m) => ({ value: m, label: m }))]} placeholder="" className="krsft-fade-in lg:w-36" />
                        </>
                    )}
                    {canViewCerts && (
                        <>
                            <button type="button" onClick={toggleView}
                                className={`krsft-hover-pop krsft-press inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium text-white transition-colors ${view === 'certs' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-primary hover:bg-primary-700'}`}>
                                {view === 'certs'
                                    ? <><TableCellsIcon className="size-4" /> Visualización normal</>
                                    : <><AcademicCapIcon className="size-4" /> Capacitaciones y certificados</>}
                            </button>
                            <button type="button" onClick={toggleCargoView}
                                className={`krsft-hover-pop krsft-press inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium text-white transition-colors ${view === 'cargos' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-primary hover:bg-primary-700'}`}>
                                <ShieldCheckIcon className="size-4" />
                                {view === 'cargos' ? 'Visualización normal' : 'Asignar Cargos'}
                            </button>
                        </>
                    )}
                    {/* Modo foco: se entra automáticamente al abrir certs/cargos, por eso
                        no hay botón "Ampliar". Solo se muestra "Reducir" para salir. */}
                    {focused && (
                        <button type="button" onClick={() => goFocus(false)}
                            title="Salir de la vista ampliada"
                            className="krsft-hover-pop krsft-press inline-flex items-center justify-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                            <ArrowsPointingInIcon className="size-4" /> Reducir
                        </button>
                    )}
                    <button type="button" onClick={exportCsv}
                        className="krsft-hover-pop krsft-press inline-flex items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
                        <ArrowDownTrayIcon className="size-4" /> Exportar
                    </button>
                </div>
            </div>

            {/* Recordatorio: FUERA de la tabla, entre la barra de filtros y la
                tabla. Solo en vista 'cargos' cuando hay alguna celda pendiente
                (cargo sin documento, o documento sin fecha de emisión). */}
            {view === 'cargos' && (
                <div
                    className={[
                        'grid transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                        cargoPending
                            ? 'grid-rows-[1fr] translate-y-0 opacity-100'
                            : 'grid-rows-[0fr] -translate-y-1 opacity-0 !mt-0',
                    ].join(' ')}
                    aria-hidden={!cargoPending}
                >
                    {/* overflow-hidden permite que grid-rows 1fr↔0fr colapse la altura.
                        p-0.5 deja aire para el shadow del banner. */}
                    <div className="overflow-hidden">
                        <div className="flex justify-center p-0.5">
                            <div className="flex w-fit items-center gap-2 whitespace-nowrap rounded-lg border-2 border-amber-300 bg-amber-100 px-4 py-2.5 text-sm font-medium text-amber-800 shadow-sm">
                                <CursorArrowRaysIcon className="size-5 shrink-0 animate-bounce text-amber-600" />
                                <span>No olvides configurar el documento y su fecha de emisión con <strong>click derecho</strong>.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative" ref={wrapperRef} onWheel={onAreaWheel}>
            {/* Sin scroll vertical interno: la tabla muestra como máximo PAGE_SIZE
                filas (paginación), así el overlay de certs alinea sus filas sin
                necesidad de sincronizar scroll. */}
            <div ref={baseScrollRef}>
            {/* Spacer animado: en vista 'cargos' empuja la tabla base hacia abajo
                la altura del toolbar del overlay (que reporta CargoMatrixOverlay),
                alineando el header NOMBRE/DNI con ESTADO/cert del overlay. El overlay
                es absolute top-0, así que no se mueve con este spacer. */}
            <div
                aria-hidden
                className="shrink-0 transition-[height] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ height: view === 'cargos' ? cargoToolbarH : 0 }}
            />
            {loading ? (
                <div className="krsft-fade-in flex flex-col items-center justify-center py-16">
                    <svg className="size-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="mt-4 text-sm text-gray-500">Cargando...</p>
                </div>
            ) : displayWorkers.length === 0 ? (
                <div className="krsft-scale-in">
                    <EmptyState title="Sin trabajadores" message="No se encontraron trabajadores con los filtros actuales." icon={<InboxIcon className="size-8" />} />
                </div>
            ) : (
                <div className="krsft-fade-up overflow-x-auto rounded-lg border-2 border-gray-200 bg-white shadow-sm" style={{ '--krsft-delay': '120ms' }}>
                    <table className="min-w-full divide-y divide-gray-200 text-sm" ref={tableRef}>
                        <thead className="sticky top-0 z-10 bg-gray-50" ref={theadRef}>
                            <tr className="*:px-3 *:py-2 *:text-left *:text-xs *:font-medium *:uppercase *:tracking-wide *:text-gray-500">
                                <th>Nombre</th>
                                <th ref={dniThRef}>DNI</th>
                                <th>Tipo</th>
                                <th>Puesto</th>
                                <th>Estado</th>
                                {SSOMA_DOC_TYPES.map((tipo) => (
                                    <th key={tipo} className="!text-center">{DOC_HEAD[tipo]}</th>
                                ))}
                                <th className="!text-center">Estado O/C</th>
                                <th>Aptitud</th>
                                <th className="!text-center">Fotocheck</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {pageWorkers.map((worker, i) => (
                                <tr
                                    key={worker.id}
                                    ref={i === 0 ? firstRowRef : undefined}
                                    className="krsft-fade-up h-[60px] cursor-pointer transition-colors hover:bg-primary-50/40"
                                    style={{ '--krsft-delay': `${Math.min(i * 35, 700)}ms` }}
                                    onClick={() => openDrawer(worker)}
                                >
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="krsft-hover-pop flex size-9 items-center justify-center rounded-full bg-primary-50 text-primary-700 text-xs font-semibold shrink-0">
                                                {initials(worker.nombre)}
                                            </span>
                                            <div className="min-w-0">
                                                <span className="block max-w-[240px] truncate font-medium text-gray-900">{worker.nombre}</span>
                                                <Badge
                                                    variant={worker.origen === 'externo' ? 'amber' : 'blue'}
                                                    dot
                                                    className="mt-0.5 px-2 py-0 text-xs"
                                                >
                                                    {worker.origen === 'externo' ? 'Externo' : 'Interno'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-gray-700">{worker.dni}</td>
                                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">{worker.tipo || '—'}</td>
                                    <td className="px-3 py-2 text-gray-700">
                                        <span className="line-clamp-2 max-w-[220px]">{worker.cargo || '—'}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <Badge className="krsft-hover-pop" variant={ESTADO_LABORAL_VARIANT[worker.estado_laboral] ?? 'gray'}>
                                            {worker.estado_laboral || '—'}
                                        </Badge>
                                    </td>
                                    {SSOMA_DOC_TYPES.map((tipo) => {
                                        const estado = worker.documentos?.[tipo]?.estado ?? 'no_definido';
                                        return (
                                            <td key={tipo} className="px-3 py-2 text-center">
                                                <span
                                                    className={`krsft-hover-pop inline-block size-3 rounded-full ${DOC_DOT[estado] ?? DOC_DOT.no_definido} ${estado === 'vencido' ? 'krsft-pulse-soft' : ''}`}
                                                    title={estado.replace('_', ' ')}
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-2 text-center text-gray-700">{worker.modalidad || '—'}</td>
                                    <td className="px-3 py-2">
                                        <Badge className="krsft-hover-pop" variant={APTITUD_VARIANT[worker.aptitud_medica] ?? 'gray'}>
                                            {APTITUD_LABELS[worker.aptitud_medica] ?? 'No Definido'}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {worker.fotocheck ? (
                                            <img
                                                src={`${API}/${worker.id}/fotocheck`}
                                                alt="fotocheck"
                                                className="mx-auto size-8 rounded object-cover ring-1 ring-gray-200"
                                                loading="lazy"
                                            />
                                        ) : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openDrawer(worker)}
                                                className="krsft-hover-pop krsft-press inline-flex items-center justify-center rounded border border-blue-100 bg-blue-50 p-1.5 text-blue-600 transition-colors hover:bg-blue-100 hover:border-blue-300"
                                                title="Ver detalle"
                                            >
                                                <EyeIcon className="size-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            </div>

                <CertMatrixOverlay
                    open={view === 'certs'}
                    workers={pageWorkers}
                    certTypes={certTypes}
                    certMatrix={certMatrix}
                    loading={certLoading}
                    leftOffset={geom.left}
                    headHeight={geom.head}
                    rowHeight={geom.row}
                    onRowClick={openCertPanel}
                />

                <CargoMatrixOverlay
                    open={view === 'cargos'}
                    workers={pageWorkers}
                    leftOffset={geom.left}
                    headHeight={geom.head}
                    rowHeight={geom.row}
                    onToolbarHeight={setCargoToolbarH}
                    onPendingChange={setCargoPending}
                    onCargoFilterChange={handleCargoFilter}
                />

            </div>

            {/* Controles de paginación (10/página). */}
            {displayWorkers.length > 0 && (
                <div className="krsft-fade-up flex flex-col items-center justify-between gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 shadow-sm sm:flex-row">
                    <p className="text-xs text-gray-500">
                        Mostrando <span className="font-semibold text-gray-700">{safePage * PAGE_SIZE + 1}</span>
                        –<span className="font-semibold text-gray-700">{Math.min((safePage + 1) * PAGE_SIZE, displayWorkers.length)}</span>
                        {' '}de <span className="font-semibold text-gray-700">{displayWorkers.length}</span> trabajadores
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="krsft-press inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeftIcon className="size-4" /> Anterior
                        </button>
                        <span className="px-2 text-sm font-medium text-gray-600">Página {safePage + 1} de {pageCount}</span>
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                            disabled={page >= pageCount - 1}
                            className="krsft-press inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Siguiente <ChevronRightIcon className="size-4" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div ref={sectionRef} className="krsft-fade-in space-y-4">
            {focusRender && (
                <div
                    className="fixed inset-0 z-[60] bg-white/50 backdrop-blur-sm transition-opacity duration-300"
                    style={{ opacity: focusEnter ? 1 : 0 }}
                    onClick={() => goFocus(false)}
                />
            )}

            <div ref={flipRef} className="space-y-4 will-change-transform">
                {body}
            </div>

            <SsomaWorkerDrawer
                worker={selected}
                isOpen={drawerOpen}
                onClose={closeDrawer}
                onEdit={handleEdit}
                onDelete={deleteExterno}
            />

            <SsomaCertPanel
                worker={certWorker}
                isOpen={certPanelOpen}
                onClose={closeCertPanel}
            />
        </div>
    );
}
