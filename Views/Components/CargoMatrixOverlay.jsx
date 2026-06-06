/**
 * CargoMatrixOverlay — slide-out panel for assigning SST roles (cargos)
 * to workers per certification type.
 *
 * Structural clone of CertMatrixOverlay: same slide-in-from-right animation,
 * same leftOffset / headHeight / rowHeight geometry, same scroll-wheel→horizontal
 * behaviour. Positioned over the SSOMA base table using the same absolute
 * right-anchored clipper.
 *
 * Two modes driven by a multiselect cert-type filter at the top:
 *   • Matrix  (no filter) — worker × certType grid, each cell is a cargo Select.
 *   • Detail  (≥1 cert selected) — per-row table with cargo select, cert badges,
 *             document preview/upload, and fotocheck placeholder.
 *
 * Save gate: persisting a non-null cargo requires a document. Closing/saving
 * when there are staged non-null cargos without a document is blocked with an
 * amber warning that lists the offenders and highlights each upload affordance.
 *
 * The component is self-contained: it fetches the cargo matrix on its own
 * (re-uses the same /certifications/matrix endpoint that SsomaTab uses for
 * CertMatrixOverlay), so SsomaTab can mount it independently without sharing
 * matrix state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowUpTrayIcon,
    FaceFrownIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    IdentificationIcon,
    XMarkIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Toast from './ui/Toast';
import FileViewerModal from './modals/FileViewerModal';
import { ESTADO_LABORAL_VARIANT } from './ssomaSection';

// ── Constants ────────────────────────────────────────────────────────────────
const CERT_API   = '/api/trabajadoreskrsft/certifications';
const ESTADO_W   = 120;
const CARGO_COL  = 160;
const DETAIL_COL = 180;

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content || '';
const formH = () => ({ Accept: 'application/json', 'X-CSRF-TOKEN': csrf() });
const jsonH = () => ({ 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() });

const certFileUrl = (id) => `${CERT_API}/files/${id}/download`;
const stripExt = (name = '') => name.replace(/\.[^./\\]+$/, '');
// snake_case minúscula → "Title Case" con espacios (para labels de cert/codigo).
const prettyLabel = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const CARGO_VARIANT = {
    emisor:   'primary',
    receptor: 'blue',
    vigia:    'emerald',
};

// ── Loading spinner (inline, no dependency) ───────────────────────────────────
function Spinner() {
    return (
        <svg className="size-6 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    );
}

// ── InlineUploader — re-creates CertificationsManager's upload affordance ─────
function InlineUploader({ workerId, certTypeId, highlighted, onUploadDone, onError }) {
    const [uploading, setUploading] = useState(false);

    // Flujo: se sube el documento primero (sin fecha). La fecha de emisión se
    // completa después vía DraftEmisionCompletionCell (queda como borrador).
    const handleFiles = async (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        setUploading(true);
        try {
            for (const file of files) {
                const fd = new FormData();
                fd.append('certification_type_id', certTypeId);
                fd.append('file', file);
                const res = await fetch(`${CERT_API}/${workerId}/files`, { method: 'POST', headers: formH(), body: fd });
                if (!res.ok) {
                    const json = await res.json().catch(() => ({}));
                    throw new Error(json.message || json.errors?.file?.[0] || 'No se pudo subir el documento');
                }
            }
            onUploadDone?.();
        } catch (e) {
            onError?.(e.message || 'Error al subir el documento');
        } finally {
            setUploading(false);
        }
    };

    return (
        <label
            className={[
                'krsft-press inline-flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors',
                highlighted
                    ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-primary hover:text-primary',
            ].join(' ')}
        >
            {uploading
                ? <span className="animate-pulse">Subiendo...</span>
                : <><ArrowUpTrayIcon className="size-3.5" /> Subir documento</>}
            <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
        </label>
    );
}

// ── DraftEmisionCompletionCell — inline returnable draft path ─────────────────
// Shown in the detail-mode Documento cell when a file exists but fecha_emision
// is missing. Posts to the saveCert endpoint and calls onDone to refresh the matrix.
function DraftEmisionCompletionCell({ workerId, certTypeId, onDone, onError }) {
    const [fecha, setFecha] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!fecha) return;
        setSaving(true);
        try {
            const res = await fetch(`${CERT_API}/${workerId}`, {
                method: 'POST',
                headers: jsonH(),
                body: JSON.stringify({ certification_type_id: certTypeId, fecha_emision: fecha }),
            });
            const json = await res.json();
            if (!res.ok || json.success === false) {
                throw new Error(json.message || 'No se pudo guardar la fecha de emisión');
            }
            setFecha('');
            onDone?.();
        } catch (e) {
            onError?.(e.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex items-center gap-1 rounded border border-amber-300 bg-amber-50 p-1" title="Falta fecha de emisión">
            <ExclamationTriangleIcon className="size-3.5 shrink-0 text-amber-600" />
            <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="min-w-0 flex-1 rounded border border-amber-400 bg-white px-1 py-0.5 text-[11px] focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
                type="button"
                onClick={handleSave}
                disabled={!fecha || saving}
                className="shrink-0 rounded border border-primary bg-primary px-2 py-0.5 text-[10px] font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {saving ? '...' : 'OK'}
            </button>
        </div>
    );
}

// ── FotocheckCard ─────────────────────────────────────────────────────────────
function FotocheckCard({ workerId, fotocheckPath }) {
    const SSOMA_API = '/api/trabajadoreskrsft/ssoma';

    if (fotocheckPath) {
        return (
            <img
                src={`${SSOMA_API}/${workerId}/fotocheck`}
                alt="fotocheck"
                className="mx-auto h-10 w-8 rounded object-cover ring-1 ring-gray-200"
                loading="lazy"
            />
        );
    }
    return (
        <div className="mx-auto flex h-10 w-8 items-center justify-center rounded border-2 border-dashed border-gray-200 bg-gray-50" title="Fotocheck">
            <IdentificationIcon className="size-4 text-gray-300" />
        </div>
    );
}

// ── CargoChip — click izq cicla cargo (cada uno su color), click der abre modal ──
const CARGO_CHIP = {
    '':       { label: 'Sin Cargo', cls: 'border-gray-300 bg-gray-100 text-gray-500' },
    emisor:   { label: 'Emisor',    cls: 'border-primary-500 bg-primary-50 text-primary-700' },
    receptor: { label: 'Receptor',  cls: 'border-blue-500 bg-blue-50 text-blue-700' },
    vigia:    { label: 'Vigía',     cls: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
};
const CARGO_CYCLE = ['', 'emisor', 'receptor', 'vigia'];

function CargoChip({ value, attention, onCycle, onOpenModal, contextMenu = true }) {
    const v = value || '';
    const c = CARGO_CHIP[v] || CARGO_CHIP[''];
    return (
        <button
            type="button"
            onClick={onCycle}
            onContextMenu={contextMenu ? (e) => { e.preventDefault(); onOpenModal(); } : undefined}
            title={contextMenu
                ? (attention
                    ? 'Falta documento y/o fecha de emisión — click derecho para configurarlo'
                    : 'Click: cambiar cargo · Click derecho: documento y fecha')
                : 'Click: cambiar cargo'}
            className={[
                'krsft-press relative w-full select-none rounded border px-2 py-1.5 text-xs font-semibold transition-colors',
                c.cls,
            ].join(' ')}
        >
            {c.label}
            {/* Indicador único: cargo pendiente por falta de documento/fecha → punto ámbar pulsante */}
            {attention && (
                <span className="absolute -right-1 -top-1 flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-amber-500 ring-1 ring-white" />
                </span>
            )}
        </button>
    );
}

// ── CargoCellModal — flotante: subir documento + fecha de emisión ────────────────
function CargoCellModal({ worker, certType, cell, onClose, onSaved, onError }) {
    const [fecha, setFecha] = useState(cell?.fecha_emision || '');
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const archivo = cell?.archivo || null;

    const handleSave = async () => {
        if (!file && !fecha) {
            onError?.('Sube un documento o ingresa la fecha de emisión');
            return;
        }
        setSaving(true);
        try {
            if (file) {
                // Subir documento (con fecha si está) — atómico en el backend.
                const fd = new FormData();
                fd.append('certification_type_id', certType.id);
                if (fecha) fd.append('fecha_emision', fecha);
                fd.append('file', file);
                const res = await fetch(`${CERT_API}/${worker.id}/files`, { method: 'POST', headers: formH(), body: fd });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j.message || j.errors?.file?.[0] || 'No se pudo subir el documento');
                }
            } else {
                // Solo fecha (el documento ya existe).
                const res = await fetch(`${CERT_API}/${worker.id}`, {
                    method: 'POST',
                    headers: jsonH(),
                    body: JSON.stringify({ certification_type_id: certType.id, fecha_emision: fecha }),
                });
                const j = await res.json();
                if (!res.ok || j.success === false) {
                    throw new Error(j.message || 'No se pudo guardar la fecha de emisión');
                }
            }
            onSaved?.();
        } catch (e) {
            onError?.(e.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="krsft-scale-in w-full max-w-sm rounded-lg bg-white p-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">{worker.nombre}</h3>
                        <p className="text-xs text-gray-500">{certType.nombre}</p>
                    </div>
                    <button type="button" onClick={onClose} className="krsft-hover-pop text-gray-400 hover:text-gray-600" aria-label="Cerrar">
                        <XMarkIcon className="size-5" />
                    </button>
                </div>

                {archivo ? (
                    <p className="mb-2 flex items-center gap-1.5 text-xs text-gray-600">
                        <DocumentTextIcon className="size-4 text-primary" />
                        Documento actual: <span className="font-medium text-primary">{stripExt(archivo.nombre)}</span>
                    </p>
                ) : (
                    <p className="mb-2 flex items-center gap-1.5 text-xs text-amber-600">
                        <ExclamationTriangleIcon className="size-4" />
                        Aún no hay documento.
                    </p>
                )}

                <label className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500 transition-colors hover:border-primary hover:text-primary">
                    <ArrowUpTrayIcon className="size-4" />
                    {file ? file.name : (archivo ? 'Reemplazar documento (PDF/JPG)' : 'Subir documento (PDF/JPG)')}
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                </label>

                <label className="mb-1 block text-xs font-medium text-gray-600">
                    Fecha de emisión <span className="text-amber-600">*</span>
                </label>
                <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className={[
                        'w-full rounded border px-2 py-1.5 text-sm shadow-sm focus:ring-1',
                        !fecha
                            ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-400'
                            : 'border-gray-300 focus:border-primary focus:ring-primary',
                    ].join(' ')}
                />

                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="krsft-press rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSave} disabled={saving} className="krsft-press rounded bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CargoMatrixOverlay({
    open,
    workers = [],
    leftOffset = 0,
    headHeight = 40,
    rowHeight = 52,
    onToolbarHeight,
    onPendingChange,
    onCargoFilterChange,
}) {
    // Animation state (same pattern as CertMatrixOverlay)
    const [render, setRender] = useState(open);
    const [enter, setEnter]   = useState(false);
    const rafRef = useRef(null);

    // Data
    const [certTypes, setCertTypes]   = useState([]);
    const [matrix, setMatrix]         = useState({});
    const [loading, setLoading]       = useState(false);

    // Staged local cargo changes: { [workerId]: { [certTypeId]: 'emisor'|'receptor'|'vigia'|null } }
    const [staged, setStaged] = useState({});
    // Espejo siempre-actualizado de staged (para retry del cargo tras completar doc/fecha).
    const stagedRef = useRef(staged);
    stagedRef.current = staged;

    // Saving state per (workerId, certTypeId)
    const [saving, setSaving] = useState({});

    // Gate: list of { worker, certType } blocked from saving (no doc + non-null cargo)
    const [blocked, setBlocked] = useState([]);
    const [showBlockedAlert, setShowBlockedAlert] = useState(false);

    // Toast
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // File viewer
    const [previewFile, setPreviewFile] = useState(null);

    // Modal de celda (click derecho): { worker, certType }
    const [cellModal, setCellModal] = useState(null);

    // Filter: selected cert-type IDs (multiselect)
    const [filterIds, setFilterIds] = useState([]);

    // Scroll ref for horizontal wheel
    const scrollRef = useRef(null);

    // Toolbar ref: reports its measured height to the parent so the base SSOMA
    // table can grow its header by the same amount and keep both grids aligned.
    const toolbarRef = useRef(null);
    useEffect(() => {
        if (!render || !toolbarRef.current || !onToolbarHeight) return undefined;
        const el = toolbarRef.current;
        const report = () => onToolbarHeight(Math.round(el.getBoundingClientRect().height));
        report();
        const ro = new ResizeObserver(report);
        ro.observe(el);
        return () => ro.disconnect();
    }, [render, onToolbarHeight]);

    // ── Fetch matrix ───────────────────────────────────────────────────────────
    const fetchMatrix = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch(`${CERT_API}/matrix`, { cache: 'no-store' });
            const json = await res.json();
            if (json.success) {
                setCertTypes(Array.isArray(json.types) ? json.types : []);
                setMatrix(json.workers || {});
            }
        } catch { /* silencioso */ } finally {
            setLoading(false);
        }
    }, []);

    // ── Animation lifecycle ────────────────────────────────────────────────────
    useEffect(() => {
        if (open) {
            setRender(true);
            rafRef.current = requestAnimationFrame(() => setEnter(true));
            fetchMatrix();
            return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }
        setEnter(false);
        setPreviewFile(null);
        setBlocked([]);
        setShowBlockedAlert(false);
        setStaged({});
        setFilterIds([]);
        const t = setTimeout(() => setRender(false), 480);
        return () => clearTimeout(t);
    }, [open, fetchMatrix]);

    // ── Wheel → horizontal scroll (non-passive, same as CertMatrixOverlay) ─────
    // Solo en matrix mode (columnas horizontales). En detail mode las filas son
    // verticales y más altas que la tabla base: hay que dejar el scroll vertical
    // nativo o las últimas filas quedan inaccesibles.
    useEffect(() => {
        if (!render) return undefined;
        if (filterIds.length > 0) return undefined;
        const ov = scrollRef.current;
        if (!ov) return undefined;
        const onWheel = (e) => {
            const delta = e.deltaY || e.deltaX;
            if (delta === 0) return;
            ov.scrollLeft += delta;
            e.preventDefault();
            e.stopPropagation();
        };
        ov.addEventListener('wheel', onWheel, { passive: false });
        return () => ov.removeEventListener('wheel', onWheel);
    }, [render, enter, loading, filterIds.length]);

    // ── Stage a cargo change (no immediate save) ────────────────────────────────
    const stageCargo = useCallback((workerId, certTypeId, value) => {
        setStaged((prev) => ({
            ...prev,
            [workerId]: {
                ...(prev[workerId] || {}),
                [certTypeId]: value || null,
            },
        }));
        // Clear blocking alert if user starts fixing things
        setShowBlockedAlert(false);
    }, []);

    // ── Get effective cargo (staged overrides matrix) ──────────────────────────
    const effectiveCargo = useCallback((workerId, certTypeId) => {
        const s = staged[workerId];
        if (s && Object.prototype.hasOwnProperty.call(s, certTypeId)) return s[certTypeId];
        return matrix[workerId]?.[certTypeId]?.cargo ?? null;
    }, [staged, matrix]);

    // ── Save a single staged change ────────────────────────────────────────────
    const saveSingle = useCallback(async (workerId, certTypeId, cargo) => {
        const key = `${workerId}-${certTypeId}`;
        setSaving((p) => ({ ...p, [key]: true }));
        try {
            const res = await fetch(`${CERT_API}/${workerId}/cargo`, {
                method: 'POST',
                headers: jsonH(),
                body: JSON.stringify({ certification_type_id: certTypeId, cargo }),
            });
            const json = await res.json();
            if (res.ok && (json.success !== false)) {
                // Sync matrix local state
                setMatrix((prev) => {
                    const workerMap = { ...(prev[workerId] || {}) };
                    workerMap[certTypeId] = { ...(workerMap[certTypeId] || {}), cargo };
                    return { ...prev, [workerId]: workerMap };
                });
                // Clear staged for this entry
                setStaged((prev) => {
                    const wm = { ...(prev[workerId] || {}) };
                    delete wm[certTypeId];
                    return { ...prev, [workerId]: wm };
                });
                return { ok: true };
            }
            // 422 → no document
            return { ok: false, message: json.message || json.errors?.cargo?.[0] || 'Se requiere un documento' };
        } catch {
            return { ok: false, message: 'Error de conexión' };
        } finally {
            setSaving((p) => { const n = { ...p }; delete n[key]; return n; });
        }
    }, []);

    // ── Guardado automático del cargo (sin botón Guardar) ──────────────────────
    // Persiste de inmediato. Si falta documento/fecha el backend responde 422 y el
    // cargo queda pendiente localmente (punto ámbar) hasta completarlo por click derecho.
    const autoSaveCargo = useCallback((workerId, certTypeId, value) => {
        stageCargo(workerId, certTypeId, value);
        saveSingle(workerId, certTypeId, value);
    }, [stageCargo, saveSingle]);

    // Click izquierdo en el chip: cicla Sin Cargo → Emisor → Receptor → Vigía → … y guarda.
    const cycleCargo = useCallback((workerId, certTypeId, current) => {
        const idx = CARGO_CYCLE.indexOf(current || '');
        const next = CARGO_CYCLE[(idx + 1) % CARGO_CYCLE.length] || null;
        autoSaveCargo(workerId, certTypeId, next);
    }, [autoSaveCargo]);

    // ── After upload: refresh matrix and re-check blocked ─────────────────────
    const handleUploadDone = useCallback(async () => {
        await fetchMatrix();
        // Re-compute blocked after matrix refresh
        setBlocked([]);
        setShowBlockedAlert(false);
        setToast({ show: true, message: 'Documento subido. Completa la fecha de emisión para habilitar el cargo.', type: 'success' });
    }, [fetchMatrix]);

    // ── Filter multiselect toggle ──────────────────────────────────────────────
    // Single-select: un chip a la vez. Click al activo lo deselecciona (vuelve a matrix).
    const toggleFilter = (id) => {
        setFilterIds((prev) => (prev.includes(id) ? [] : [id]));
    };

    // ── Determine if a (workerId, certTypeId) is in the blocked list ───────────
    const isBlocked = useCallback((workerId, certTypeId) => {
        return blocked.some((b) => b.worker.id === workerId && b.certType.id === certTypeId);
    }, [blocked]);

    // ── Mode ───────────────────────────────────────────────────────────────────
    const mode = filterIds.length > 0 ? 'detail' : 'matrix';
    const selectedCertTypes = certTypes.filter((ct) => filterIds.includes(ct.id));

    // Hay al menos una celda pendiente → recordatorio:
    //   - cargo asignado sin documento, o
    //   - documento cargado sin fecha de emisión (borrador).
    const hasPending = workers.some((w) =>
        certTypes.some((ct) => {
            const cell = matrix[w.id]?.[ct.id];
            const hasDoc = !!cell?.archivo;
            const cargo = effectiveCargo(w.id, ct.id);
            return !!cell?.incompleto || (!!cargo && !hasDoc);
        }),
    );

    // Reporta el estado pendiente al padre (SsomaTab), que renderiza el banner
    // recordatorio FUERA de la tabla. Aquí no se dibuja el banner.
    useEffect(() => { onPendingChange?.(hasPending); }, [hasPending, onPendingChange]);

    // Reporta al padre (SsomaTab) los ids de trabajadores con cargo en el cert
    // filtrado, para que filtre+pagine la tabla base igual. El overlay se dibuja
    // sobre esa tabla, así ambos muestran el mismo conjunto y quedan alineados.
    // null = sin filtro (modo matriz) → el padre muestra todos.
    useEffect(() => {
        if (!onCargoFilterChange) return;
        if (filterIds.length === 0) { onCargoFilterChange(null, null); return; }
        // Matriz aún no cargada: no reportar (evita ocultar a todos transitoriamente).
        if (Object.keys(matrix).length === 0) return;
        const certId = filterIds[0];
        // Ids como string (las keys de matrix siempre son string); SsomaTab compara
        // contra String(worker.id) para no depender del tipo que devuelva el backend.
        const ids = Object.keys(matrix).filter((wid) => matrix[wid]?.[certId]?.cargo);
        onCargoFilterChange(certId, ids);
    }, [filterIds, matrix, onCargoFilterChange]);

    if (!render) return null;

    return (
        <>
        {/* Clipper: same absolute right-anchored container as CertMatrixOverlay */}
        <div
            className="absolute right-0.5 bottom-0.5 top-0 z-20 overflow-hidden rounded-r-lg"
            style={{ left: leftOffset }}
        >
            <div
                className="flex h-full flex-col rounded-tl-lg border-l-2 border-primary/40 bg-white shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.35)] transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: enter ? 'translateX(0)' : 'translateX(100%)' }}
            >
                {/* ── Toolbar ──────────────────────────────────────────── */}
                <div ref={toolbarRef} className="shrink-0 rounded-tl-lg border-b border-gray-200 bg-gray-50 px-3 py-2">
                    {/* Filter bar: header title + cert-type filter chips */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Header title */}
                        <div className="flex items-center gap-1.5 mr-2">
                            <ShieldCheckIcon className="size-4 text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">Asignar Cargos SST</span>
                        </div>

                        {/* Cert-type filter chips */}
                        <div className="flex flex-wrap items-center gap-1">
                            {certTypes.map((ct) => (
                                <button
                                    key={ct.id}
                                    type="button"
                                    onClick={() => toggleFilter(ct.id)}
                                    className={[
                                        'krsft-press rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                                        filterIds.includes(ct.id)
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary',
                                    ].join(' ')}
                                >
                                    {prettyLabel(ct.codigo || ct.nombre)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Body ─────────────────────────────────────────────── */}
                {loading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Spinner />
                            <p className="text-xs text-gray-500">Cargando matriz...</p>
                        </div>
                    </div>
                ) : mode === 'matrix' ? (
                    /* ── Matrix mode ── */
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-x-auto overflow-y-hidden overscroll-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        <table className="min-w-full border-separate border-spacing-0 text-sm">
                            <thead className="sticky top-0 z-20 bg-gray-50">
                                <tr style={{ height: headHeight }}>
                                    <th
                                        className="sticky left-0 z-30 whitespace-nowrap border-b border-gray-200 bg-gray-50 px-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                                        style={{ width: ESTADO_W }}
                                    >
                                        Estado
                                    </th>
                                    {certTypes.map((ct) => (
                                        <th
                                            key={ct.id}
                                            className="break-words border-b border-gray-200 bg-gray-50 px-3 text-center text-xs font-medium uppercase leading-tight tracking-wide text-gray-500"
                                            style={{ width: CARGO_COL, minWidth: CARGO_COL }}
                                        >
                                            {ct.nombre}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {workers.map((worker) => (
                                    <tr
                                        key={worker.id}
                                        className="transition-colors hover:bg-primary-50/40"
                                        style={{ height: rowHeight }}
                                    >
                                        <td
                                            className="sticky left-0 z-10 whitespace-nowrap border-b border-gray-100 bg-white px-4 transition-colors hover:bg-primary-50/40"
                                            style={{ width: ESTADO_W }}
                                        >
                                            <Badge variant={ESTADO_LABORAL_VARIANT[worker.estado_laboral] ?? 'gray'}>
                                                {worker.estado_laboral || '—'}
                                            </Badge>
                                        </td>
                                        {certTypes.map((ct) => {
                                            const cargo      = effectiveCargo(worker.id, ct.id);
                                            const cell       = matrix[worker.id]?.[ct.id];
                                            const hasDoc     = !!cell?.archivo;
                                            const incompleto = !!cell?.incompleto;
                                            // Indicador único: cargo asignado pero el cert no está completo
                                            // (sin documento o sin fecha) → necesita atención (punto ámbar).
                                            const needsAttention = incompleto || (!!cargo && (!hasDoc || incompleto));
                                            return (
                                                <td
                                                    key={ct.id}
                                                    className="border-b border-gray-100 px-2 py-1.5"
                                                    style={{ width: CARGO_COL, minWidth: CARGO_COL }}
                                                >
                                                    <CargoChip
                                                        value={cargo}
                                                        attention={needsAttention}
                                                        onCycle={() => cycleCargo(worker.id, ct.id, cargo)}
                                                        onOpenModal={() => setCellModal({ worker, certType: ct })}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* ── Detail mode (one or more certs selected) ── */
                    <div className="flex-1 overflow-x-auto overflow-y-auto overscroll-contain">
                        <table className="min-w-full border-separate border-spacing-0 text-sm">
                            <thead className="sticky top-0 z-20 bg-gray-50">
                                <tr style={{ height: headHeight }}>
                                    {selectedCertTypes.length > 1 && (
                                        <th className="sticky left-0 z-30 whitespace-nowrap border-b border-gray-200 bg-gray-50 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Certificado
                                        </th>
                                    )}
                                    <th className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                                        style={{ width: CARGO_COL, minWidth: CARGO_COL }}>
                                        Cargo
                                    </th>
                                    <th className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                                        style={{ width: DETAIL_COL, minWidth: DETAIL_COL }}>
                                        Tipo de PDT
                                    </th>
                                    <th className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                                        style={{ width: DETAIL_COL, minWidth: DETAIL_COL }}>
                                        Documento
                                    </th>
                                    <th className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-gray-500"
                                        style={{ width: 72, minWidth: 72 }}>
                                        Fotocheck
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {workers.flatMap((worker) =>
                                    selectedCertTypes.map((ct) => {
                                        const cargo       = effectiveCargo(worker.id, ct.id);
                                        const cell        = matrix[worker.id]?.[ct.id];
                                        const archivo     = cell?.archivo ?? null;
                                        const blockedCell = isBlocked(worker.id, ct.id);
                                        const fotocheckPath = matrix[worker.id]?._meta?.fotocheck_path ?? null;

                                        return (
                                            <tr
                                                key={`${worker.id}-${ct.id}`}
                                                className="group/row border-b border-gray-100 transition-colors hover:bg-primary-50/30"
                                                style={{ height: rowHeight }}
                                            >
                                                {/* Certificado: solo con 2+ certs en el filtro (con 1 el chip de arriba ya lo indica).
                                                    El nombre del trabajador sale de la tabla base nativa, no se repite. */}
                                                {selectedCertTypes.length > 1 && (
                                                    <td className="sticky left-0 z-10 whitespace-nowrap border-b border-gray-100 bg-white px-4 py-1 transition-colors group-hover/row:bg-primary-50/30">
                                                        <span className="text-sm font-medium text-gray-700">{ct.nombre}</span>
                                                    </td>
                                                )}

                                                {/* Cargo: botón que cicla con click izq (sin click derecho;
                                                    el documento/fecha se gestiona en la columna Documento). */}
                                                <td className="border-b border-gray-100 px-2 py-1" style={{ width: CARGO_COL, minWidth: CARGO_COL }}>
                                                    <CargoChip
                                                        value={cargo}
                                                        attention={!!cell?.incompleto || (!!cargo && !archivo)}
                                                        onCycle={() => cycleCargo(worker.id, ct.id, cargo)}
                                                        contextMenu={false}
                                                    />
                                                </td>

                                                {/* Tipo de PDT — solo el cert de esta fila, y solo si el
                                                    trabajador tiene cargo configurado ahí. Si no, vacío (—). */}
                                                <td className="border-b border-gray-100 px-3 py-1" style={{ width: DETAIL_COL, minWidth: DETAIL_COL }}>
                                                    {cargo ? (
                                                        <Badge variant={CARGO_VARIANT[cargo] ?? 'gray'} className="text-[10px] px-1.5 py-0">
                                                            {prettyLabel(ct.codigo || ct.nombre)}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>

                                                {/* Documento */}
                                                <td className="border-b border-gray-100 px-3 py-1" style={{ width: DETAIL_COL, minWidth: DETAIL_COL }}>
                                                    {archivo ? (
                                                        <div className="flex flex-col gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewFile({ id: archivo.id, original_name: stripExt(archivo.nombre), mime_type: archivo.mime || '' })}
                                                                className="truncate text-left text-xs text-primary hover:underline max-w-[160px]"
                                                                title={archivo.nombre}
                                                            >
                                                                {stripExt(archivo.nombre)}
                                                            </button>
                                                            {/* Draft: file exists but fecha_emision is missing */}
                                                            {cell?.incompleto && (
                                                                <DraftEmisionCompletionCell
                                                                    key={`draft-${worker.id}-${ct.id}`}
                                                                    workerId={worker.id}
                                                                    certTypeId={ct.id}
                                                                    onDone={async () => {
                                                                        await fetchMatrix();
                                                                        setBlocked([]);
                                                                        setShowBlockedAlert(false);
                                                                        setToast({ show: true, message: 'Fecha de emisión guardada.', type: 'success' });
                                                                    }}
                                                                    onError={(m) => setToast({ show: true, message: m, type: 'error' })}
                                                                />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-start gap-1">
                                                            <div className="flex items-center gap-1.5 text-gray-400">
                                                                <FaceFrownIcon className={`size-4 ${blockedCell ? 'text-amber-500' : 'text-gray-300'}`} />
                                                                <span className={`text-[11px] ${blockedCell ? 'text-amber-600' : 'text-gray-400'}`}>Sin documento</span>
                                                            </div>
                                                            <InlineUploader
                                                                key={`up-${worker.id}-${ct.id}`}
                                                                workerId={worker.id}
                                                                certTypeId={ct.id}
                                                                highlighted={blockedCell}
                                                                onUploadDone={handleUploadDone}
                                                                onError={(m) => setToast({ show: true, message: m, type: 'error' })}
                                                            />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Fotocheck */}
                                                <td className="border-b border-gray-100 px-3 py-1 text-center" style={{ width: 72, minWidth: 72 }}>
                                                    <FotocheckCard workerId={worker.id} fotocheckPath={fotocheckPath} />
                                                </td>
                                            </tr>
                                        );
                                    }),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>

        {/* FileViewerModal portal */}
        {previewFile && createPortal(
            <FileViewerModal
                isOpen
                file={previewFile}
                getDownloadUrl={certFileUrl}
                onClose={() => setPreviewFile(null)}
            />,
            document.body,
        )}

        {/* Modal de celda (click derecho): subir documento + fecha de emisión */}
        {cellModal && (
            <CargoCellModal
                worker={cellModal.worker}
                certType={cellModal.certType}
                cell={matrix[cellModal.worker.id]?.[cellModal.certType.id]}
                onClose={() => setCellModal(null)}
                onSaved={async () => {
                    const wId = cellModal.worker.id;
                    const cId = cellModal.certType.id;
                    await fetchMatrix();
                    // Retry: si había un cargo pendiente para esta celda (no se pudo
                    // guardar por falta de doc/fecha), ahora que está completo se persiste.
                    const pending = stagedRef.current[wId]?.[cId];
                    if (pending) await saveSingle(wId, cId, pending);
                    setBlocked([]);
                    setShowBlockedAlert(false);
                    setCellModal(null);
                    setToast({ show: true, message: 'Guardado.', type: 'success' });
                }}
                onError={(m) => setToast({ show: true, message: m, type: 'error' })}
            />
        )}

        {/* Toast portal */}
        {createPortal(
            <Toast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast((p) => ({ ...p, show: false }))}
            />,
            document.body,
        )}
        </>
    );
}
