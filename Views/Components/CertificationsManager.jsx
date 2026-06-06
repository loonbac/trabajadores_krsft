/**
 * CertificationsManager — gestor compartido de Capacitaciones y Certificados.
 *
 * Usado por dos superficies: el panel deslizante de la tabla SSOMA
 * (SsomaCertPanel) y el swap dentro de WorkerFormModal. Autocontenido:
 * trae sus propios datos, sube/borra documentos y guarda emisión/vencimiento.
 *
 * Regla: subir un documento HABILITA la certificación y revela los campos
 * de Emisión y Vencimiento. El Vencimiento se calcula desde la Emisión + la
 * vigencia (meses) del tipo; editable como override por trabajador.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    ArrowUpTrayIcon, XMarkIcon, DocumentTextIcon,
    CalendarDaysIcon, ClockIcon, LockClosedIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { hasPermission } from '@/utils/permissions';
import FileViewerModal from './modals/FileViewerModal';
import {
    DOC_DOT, DOC_TEXT_COLOR, CERT_CODES, CERT_LABELS,
    computeVigencia, computeVencimientoFromEmision, docEstadoText,
} from './ssomaSection';

const API = '/api/trabajadoreskrsft/certifications';
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content || '';
const jsonH = () => ({ 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() });
const formH = () => ({ Accept: 'application/json', 'X-CSRF-TOKEN': csrf() });

const stripExt = (name = '') => name.replace(/\.[^./\\]+$/, '');
const certFileUrl = (id) => `${API}/files/${id}/download`;

function VigenciaBadge({ fecha }) {
    const { estado, dias } = computeVigencia(fecha);
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold ${DOC_TEXT_COLOR[estado]}`}>
            <span className={`size-2 rounded-full ${DOC_DOT[estado]} ${estado === 'vencido' ? 'krsft-pulse-soft' : ''}`} />
            {docEstadoText(estado, dias)}
        </span>
    );
}

// Filas de respaldo mientras carga (catálogo local), sin trabajador.
const fallbackRows = () => CERT_CODES.map((codigo, i) => ({
    certification_type_id: -(i + 1),
    codigo,
    nombre: CERT_LABELS[codigo],
    vigencia_meses: 12,
    cert: { fecha_emision: null, fecha_vencimiento: null, vencimiento_override: false, notas: null },
    estado: 'no_definido',
    dias: 0,
    archivos: [],
}));

export default function CertificationsManager({ trabajadorId, workerName, onBack, hideHeaderBack = false }) {
    const { auth } = usePage().props;
    const canManage = hasPermission(auth, 'module.trabajadoreskrsft.manage_certificaciones');

    const [rows, setRows] = useState(fallbackRows);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [local, setLocal] = useState({});       // typeId → { fecha_emision, fecha_vencimiento, vencimiento_override }
    const [uploading, setUploading] = useState({}); // typeId → bool
    const [savingId, setSavingId] = useState({});  // typeId → bool
    const [viewerFile, setViewerFile] = useState(null);

    const timersRef = useRef({});

    // Espejo siempre-actualizado de `local` para que el guardado debounced lea
    // el valor más reciente (ver saveCert).
    const localRef = useRef(local);
    localRef.current = local;

    const hydrateLocal = useCallback((list) => {
        const next = {};
        list.forEach((r) => {
            next[r.certification_type_id] = {
                fecha_emision: r.cert?.fecha_emision || '',
                fecha_vencimiento: r.cert?.fecha_vencimiento || '',
                vencimiento_override: !!r.cert?.vencimiento_override,
            };
        });
        setLocal(next);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = trabajadorId ? `${API}/${trabajadorId}` : `${API}/types`;
            const res = await fetch(url, { headers: formH(), cache: 'no-store' });
            const json = await res.json();
            if (!json.success) { setError(json.message || 'Error al cargar certificaciones'); return; }

            const list = trabajadorId
                ? json.data
                : (json.data || []).map((t) => ({
                    certification_type_id: t.id,
                    codigo: t.codigo,
                    nombre: t.nombre,
                    vigencia_meses: t.vigencia_meses,
                    cert: { fecha_emision: null, fecha_vencimiento: null, vencimiento_override: false, notas: null },
                    estado: 'no_definido',
                    dias: 0,
                    archivos: [],
                }));
            setRows(list);
            hydrateLocal(list);
        } catch (e) {
            setError(e.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    }, [trabajadorId, hydrateLocal]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Limpia timers de debounce al desmontar.
    useEffect(() => () => { Object.values(timersRef.current).forEach(clearTimeout); }, []);

    const saveCert = useCallback(async (typeId) => {
        if (!trabajadorId || !canManage) return;
        // Leer de la ref (no del closure): el setTimeout del debounce captura el
        // `local` viejo y mandaría la fecha previa (null) → el server respondía
        // null y "borraba" la fecha recién puesta ~1s después.
        const l = localRef.current[typeId] || {};
        setSavingId((p) => ({ ...p, [typeId]: true }));
        try {
            const res = await fetch(`${API}/${trabajadorId}`, {
                method: 'POST',
                headers: jsonH(),
                body: JSON.stringify({
                    certification_type_id: typeId,
                    fecha_emision: l.fecha_emision || null,
                    fecha_vencimiento: l.fecha_vencimiento || null,
                    vencimiento_override: !!l.vencimiento_override,
                }),
            });
            const json = await res.json();
            if (json.success) {
                // El servidor es la autoridad del vencimiento.
                setLocal((p) => ({
                    ...p,
                    [typeId]: {
                        fecha_emision: json.data.fecha_emision || '',
                        fecha_vencimiento: json.data.fecha_vencimiento || '',
                        vencimiento_override: !!json.data.vencimiento_override,
                    },
                }));
            }
        } catch { /* noop */ } finally {
            setSavingId((p) => ({ ...p, [typeId]: false }));
        }
    }, [trabajadorId, canManage]);

    const scheduleSave = useCallback((typeId) => {
        if (timersRef.current[typeId]) clearTimeout(timersRef.current[typeId]);
        timersRef.current[typeId] = setTimeout(() => saveCert(typeId), 400);
    }, [saveCert]);

    const onEmisionChange = (row, value) => {
        const typeId = row.certification_type_id;
        setLocal((p) => {
            const cur = p[typeId] || {};
            const next = { ...cur, fecha_emision: value };
            if (!cur.vencimiento_override) {
                next.fecha_vencimiento = computeVencimientoFromEmision(value, row.vigencia_meses);
            }
            return { ...p, [typeId]: next };
        });
        scheduleSave(typeId);
    };

    const onVencimientoChange = (typeId, value) => {
        setLocal((p) => ({ ...p, [typeId]: { ...(p[typeId] || {}), fecha_vencimiento: value } }));
        scheduleSave(typeId);
    };

    const onToggleOverride = (row) => {
        const typeId = row.certification_type_id;
        setLocal((p) => {
            const cur = p[typeId] || {};
            const override = !cur.vencimiento_override;
            const next = { ...cur, vencimiento_override: override };
            if (!override) {
                // Volver al cálculo automático.
                next.fecha_vencimiento = computeVencimientoFromEmision(cur.fecha_emision, row.vigencia_meses);
            }
            return { ...p, [typeId]: next };
        });
        scheduleSave(typeId);
    };

    const onUpload = async (typeId, fileList) => {
        if (!trabajadorId || !canManage) return;
        const files = Array.from(fileList || []);
        if (!files.length) return;

        // La fecha de emisión es opcional al subir: el flujo lógico es subir el
        // documento primero y completarla después (queda en borrador hasta tenerla).
        // Si ya está cargada (orden inverso), se envía y se valida de una.
        const l = localRef.current[typeId] || {};
        setUploading((p) => ({ ...p, [typeId]: true }));
        try {
            for (const file of files) {
                const fd = new FormData();
                fd.append('certification_type_id', typeId);
                if (l.fecha_emision) fd.append('fecha_emision', l.fecha_emision);
                fd.append('file', file);
                const res = await fetch(`${API}/${trabajadorId}/files`, { method: 'POST', headers: formH(), body: fd });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j.message || j.errors?.fecha_emision?.[0] || j.errors?.file?.[0] || 'No se pudo subir el documento');
                }
            }
            setError(null);
            await fetchData();
        } catch (e) {
            setError(e.message || 'Error al subir el documento');
        } finally {
            setUploading((p) => ({ ...p, [typeId]: false }));
        }
    };

    const onDeleteFile = async (typeId, fileId) => {
        if (!canManage) return;
        try {
            const res = await fetch(`${API}/files/${fileId}`, { method: 'DELETE', headers: formH() });
            const json = await res.json();
            if (json.success) {
                setRows((p) => p.map((r) => (
                    r.certification_type_id === typeId
                        ? { ...r, archivos: r.archivos.filter((f) => f.id !== fileId) }
                        : r
                )));
            }
        } catch { /* noop */ }
    };

    const readOnly = !canManage || !trabajadorId;

    return (
        <div className="krsft-fade-in">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                        <DocumentTextIcon className="size-5" />
                    </span>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Capacitaciones y Certificados</h3>
                        {workerName && <p className="text-xs text-gray-500">{workerName}</p>}
                    </div>
                </div>
                {onBack && !hideHeaderBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="krsft-hover-pop krsft-press rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Cerrar"
                    >
                        <XMarkIcon className="size-5" />
                    </button>
                )}
            </div>

            {!trabajadorId && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    <LockClosedIcon className="size-4 shrink-0" />
                    Guarda primero el trabajador para gestionar sus certificaciones.
                </div>
            )}
            {!canManage && trabajadorId && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    <LockClosedIcon className="size-4 shrink-0" />
                    Solo lectura — no tienes permiso para gestionar certificaciones.
                </div>
            )}
            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <svg className="size-7 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="mt-3 text-sm text-gray-500">Cargando...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {rows.map((row, i) => {
                        const typeId = row.certification_type_id;
                        const l = local[typeId] || {};
                        const archivos = row.archivos || [];
                        const hasFile = archivos.length > 0;
                        return (
                            <section
                                key={row.codigo}
                                className="krsft-fade-up rounded-lg border border-gray-200 bg-white"
                                style={{ '--krsft-delay': `${Math.min(i * 40, 400)}ms` }}
                            >
                                {/* Cabecera de la certificación */}
                                <header className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                                    <span className="text-sm font-semibold text-gray-900">{row.nombre}</span>
                                    {hasFile && <VigenciaBadge fecha={l.fecha_vencimiento} />}
                                </header>

                                <div className="space-y-4 p-4">
                                    {/* Draft banner: file present but fecha_emision missing (legacy / evaded) */}
                                    {hasFile && !l.fecha_emision && (
                                        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                                            <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                            <div className="text-xs text-amber-800">
                                                <p className="font-semibold">Registro incompleto — borrador</p>
                                                <p className="mt-0.5">Ingresa la fecha de emisión para validar esta certificación.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Documento — se sube primero; la fecha de emisión se completa después */}
                                    <div>
                                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Documento</p>
                                        {!readOnly && (
                                            <label className={[
                                                'krsft-press flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed px-3 py-2 text-xs transition-colors',
                                                uploading[typeId]
                                                    ? 'cursor-not-allowed border-gray-200 bg-gray-50/50 text-gray-400'
                                                    : 'border-gray-300 bg-gray-50/70 text-gray-500 hover:border-primary hover:text-primary',
                                            ].join(' ')}>
                                                {uploading[typeId]
                                                    ? <span>Subiendo...</span>
                                                    : <><ArrowUpTrayIcon className="size-4" /> Subir documento (PDF/JPG)</>}
                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    multiple
                                                    className="hidden"
                                                    disabled={uploading[typeId]}
                                                    onChange={(e) => { onUpload(typeId, e.target.files); e.target.value = ''; }}
                                                />
                                            </label>
                                        )}
                                        {archivos.length > 0 ? (
                                            <ul className="mt-2 space-y-1">
                                                {archivos.map((f) => (
                                                    <li key={f.id} className="flex items-center justify-between gap-2 text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewerFile({ id: f.id, original_name: stripExt(f.nombre), mime_type: f.mime || '' })}
                                                            className="truncate text-left text-primary hover:underline"
                                                        >
                                                            {stripExt(f.nombre)}
                                                        </button>
                                                        {!readOnly && (
                                                            <button type="button" onClick={() => onDeleteFile(typeId, f.id)} className="krsft-hover-pop text-red-500">
                                                                <XMarkIcon className="size-4" />
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            readOnly && <p className="mt-1 text-xs text-gray-400">Sin documentos.</p>
                                        )}
                                    </div>

                                    {/* Emisión — se completa luego de subir (o antes, da igual). Obligatoria para validar. */}
                                    {!readOnly && (
                                        <div className={[
                                            'rounded-lg border p-3',
                                            !l.fecha_emision
                                                ? 'border-amber-300 bg-amber-50/60 ring-1 ring-amber-300'
                                                : 'border-gray-100 bg-gray-50/60',
                                        ].join(' ')}>
                                            <div className="mb-1.5 flex items-center gap-1.5">
                                                <CalendarDaysIcon className={`size-4 ${!l.fecha_emision ? 'text-amber-500' : 'text-gray-400'}`} />
                                                <p className={`text-xs font-semibold uppercase tracking-wide ${!l.fecha_emision ? 'text-amber-700' : 'text-gray-500'}`}>
                                                    Emisión <span className="text-amber-600">*</span>
                                                </p>
                                            </div>
                                            <input
                                                type="date"
                                                value={l.fecha_emision || ''}
                                                onChange={(e) => onEmisionChange(row, e.target.value)}
                                                className={[
                                                    'w-full rounded border px-2 py-1.5 text-sm shadow-sm focus:ring-1',
                                                    !l.fecha_emision
                                                        ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-400'
                                                        : 'border-gray-300 focus:border-primary focus:ring-primary',
                                                ].join(' ')}
                                            />
                                            <p className="mt-1 text-[11px] text-gray-400">
                                                {!l.fecha_emision
                                                    ? 'Complétala luego de subir el documento (queda en borrador hasta tenerla).'
                                                    : 'Fecha indicada dentro del documento.'}
                                            </p>
                                            {savingId[typeId] && <p className="mt-1 text-[11px] text-primary">Guardando...</p>}
                                        </div>
                                    )}
                                    {/* Emisión read-only view (canManage=false but has a file) */}
                                    {readOnly && hasFile && (
                                        <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                                            <div className="mb-1.5 flex items-center gap-1.5">
                                                <CalendarDaysIcon className="size-4 text-gray-400" />
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Emisión</p>
                                            </div>
                                            <input
                                                type="date"
                                                value={l.fecha_emision || ''}
                                                disabled
                                                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm disabled:cursor-not-allowed disabled:bg-gray-100"
                                            />
                                        </div>
                                    )}

                                    {/* Vencimiento — only shown once a file exists */}
                                    {hasFile && (
                                        <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                                            <div className="mb-1.5 flex items-center gap-1.5">
                                                <ClockIcon className="size-4 text-gray-400" />
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vencimiento</p>
                                            </div>
                                            <input
                                                type="date"
                                                value={l.fecha_vencimiento || ''}
                                                disabled={readOnly || !l.vencimiento_override}
                                                onChange={(e) => onVencimientoChange(typeId, e.target.value)}
                                                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100"
                                            />
                                            {!readOnly && (
                                                <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-500">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!l.vencimiento_override}
                                                        onChange={() => onToggleOverride(row)}
                                                        className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    Anular cálculo automático
                                                </label>
                                            )}
                                            {!l.vencimiento_override && (
                                                <p className="mt-1 text-[11px] text-gray-400">Calculado: Emisión + {row.vigencia_meses} meses.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            <FileViewerModal
                isOpen={!!viewerFile}
                file={viewerFile}
                getDownloadUrl={certFileUrl}
                onClose={() => setViewerFile(null)}
            />
        </div>
    );
}
