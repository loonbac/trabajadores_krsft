/**
 * WorkerFormModal — alta/edición de trabajador.
 * Card-grid 6xl (diseño ERP + krsft-*), funcional: persiste trabajador +
 * datos SSOMA (aptitud/modalidad/supervisor/ubicación + fechas docs) +
 * archivos (disco privado) + fotocheck. Tipo de trabajador con alta inline.
 */
import { useCallback, useEffect, useState } from 'react';
import {
    UserCircleIcon, BriefcaseIcon, PhoneIcon, PencilSquareIcon,
    ShieldCheckIcon, ClipboardDocumentCheckIcon, IdentificationIcon,
    ArrowUpTrayIcon, XMarkIcon, PlusIcon, AcademicCapIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import CertificationsManager from '../CertificationsManager';
import {
    GENERO_OPTIONS, ESTADO_CIVIL_OPTIONS,
    TIPO_CONTRATO_OPTIONS, ESTADO_OPTIONS, PENSIONES_OPTIONS,
} from '../../utils';
import {
    SSOMA_DOC_TYPES, DOC_LABELS, DOC_DOT, DOC_TEXT_COLOR,
    APTITUD_OPTIONS, MODALIDAD_OPTIONS, computeVigencia, docEstadoText,
} from '../ssomaSection';

const API = '/api/trabajadoreskrsft';
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content || '';
const jsonH = () => ({ 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() });
const formH = () => ({ Accept: 'application/json', 'X-CSRF-TOKEN': csrf() });

function Card({ title, icon, badge, delay = 0, children, disabled = false, className = '' }) {
    return (
        <section
            className={`krsft-fade-up flex flex-col ${disabled ? 'opacity-60' : ''} rounded-lg border border-gray-200 bg-white ${className}`}
            style={{ '--krsft-delay': `${delay}ms` }}
        >
            <header className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary-50 text-primary-700 [&>svg]:size-4">
                        {icon}
                    </span>
                    {title}
                </h3>
                {badge}
            </header>
            <div className="flex flex-1 flex-col p-5">{children}</div>
        </section>
    );
}

function VigenciaBadge({ fecha }) {
    const { estado, dias } = computeVigencia(fecha);
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold ${DOC_TEXT_COLOR[estado]}`}>
            <span className={`size-2 rounded-full ${DOC_DOT[estado]} ${estado === 'vencido' ? 'krsft-pulse-soft' : ''}`} />
            {docEstadoText(estado, dias)}
        </span>
    );
}

function PillSelector({ options, value, onChange }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
                const v = typeof opt === 'string' ? opt : opt.value;
                const l = typeof opt === 'string' ? opt : opt.label;
                const active = value === v;
                return (
                    <button
                        key={v}
                        type="button"
                        onClick={() => onChange(v)}
                        className={`krsft-press rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            active
                                ? 'border-primary bg-primary text-white'
                                : 'border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary'
                        }`}
                    >
                        {l}
                    </button>
                );
            })}
        </div>
    );
}

const EMPTY_FECHAS = { SST: '', EMO: '', CAMO: '', EPP: '', DOC_SST: '' };
const EMPTY_FILES = { SST: [], EMO: [], CAMO: [], EPP: [], DOC_SST: [] };

export default function WorkerFormModal({
    show, onClose, editingId, form, onChange,
    submitWorker, refreshWorkers, showToast, modalContext = 'general',
}) {
    const isSsoma = modalContext === 'ssoma';
    const esExterno = (form?.origen ?? 'interno') === 'externo';
    // En SSOMA: Datos Personales solo-lectura para INTERNOS (su identidad la maneja RRHH).
    // Externos (y altas desde SSOMA) sí editan todo.
    const personalReadOnly = isSsoma && !!editingId && !esExterno;
    const [ssoma, setSsoma] = useState({ aptitud_medica: 'no_definido', modalidad: '', supervisor: '', ubicacion: '' });
    const [docFechas, setDocFechas] = useState({ ...EMPTY_FECHAS });
    const [newFiles, setNewFiles] = useState({ ...EMPTY_FILES });
    const [existingFiles, setExistingFiles] = useState({ ...EMPTY_FILES });
    const [fotocheckFile, setFotocheckFile] = useState(null);
    const [fotocheckUrl, setFotocheckUrl] = useState(null);
    const [tipos, setTipos] = useState([]);
    const [nuevoTipo, setNuevoTipo] = useState('');
    const [creatingTipo, setCreatingTipo] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [certView, setCertView] = useState(false);

    const resetSsoma = useCallback(() => {
        setSsoma({ aptitud_medica: 'no_definido', modalidad: '', supervisor: '', ubicacion: '' });
        setDocFechas({ ...EMPTY_FECHAS });
        setNewFiles({ ...EMPTY_FILES });
        setExistingFiles({ ...EMPTY_FILES });
        setFotocheckFile(null);
        setFotocheckUrl(null);
        setNuevoTipo('');
        setCertView(false);
    }, []);

    // Reset de la vista de certificaciones al cerrar el modal.
    useEffect(() => { if (!show) setCertView(false); }, [show]);

    // Cargar tipos al abrir
    useEffect(() => {
        if (!show) return;
        fetch(`${API}/ssoma/tipos`, { headers: formH() })
            .then((r) => r.json())
            .then((j) => { if (j.success) setTipos(j.data || []); })
            .catch(() => {});
    }, [show]);

    // Prefill SSOMA al editar / reset al crear
    useEffect(() => {
        if (!show) return;
        if (!editingId) { resetSsoma(); return; }
        fetch(`${API}/ssoma/${editingId}`, { headers: formH() })
            .then((r) => r.json())
            .then((j) => {
                if (!j.success) return;
                const d = j.data;
                setSsoma({
                    aptitud_medica: d.aptitud_medica || 'no_definido',
                    modalidad: d.modalidad || '',
                    supervisor: d.supervisor || '',
                    ubicacion: d.ubicacion || '',
                });
                const f = { ...EMPTY_FECHAS };
                const ex = { ...EMPTY_FILES };
                (d.documentos || []).forEach((doc) => {
                    f[doc.tipo] = doc.fecha_vencimiento ? String(doc.fecha_vencimiento).slice(0, 10) : '';
                    ex[doc.tipo] = doc.archivos || [];
                });
                setDocFechas(f);
                setExistingFiles(ex);
                setFotocheckUrl(d.fotocheck_url || null);
            })
            .catch(() => {});
    }, [show, editingId, resetSsoma]);

    const addFiles = (tipo, fileList) => {
        const arr = Array.from(fileList || []);
        if (arr.length) setNewFiles((p) => ({ ...p, [tipo]: [...p[tipo], ...arr] }));
    };
    const removeNewFile = (tipo, idx) =>
        setNewFiles((p) => ({ ...p, [tipo]: p[tipo].filter((_, i) => i !== idx) }));

    const deleteExistingFile = async (tipo, fileId) => {
        try {
            const r = await fetch(`${API}/ssoma/files/${fileId}`, { method: 'DELETE', headers: formH() });
            const j = await r.json();
            if (j.success) {
                setExistingFiles((p) => ({ ...p, [tipo]: p[tipo].filter((f) => f.id !== fileId) }));
            }
        } catch { /* noop */ }
    };

    const crearTipo = async () => {
        const nombre = nuevoTipo.trim();
        if (!nombre) return;
        setCreatingTipo(true);
        try {
            const r = await fetch(`${API}/ssoma/tipos`, { method: 'POST', headers: jsonH(), body: JSON.stringify({ nombre }) });
            const j = await r.json();
            if (j.success) {
                const n = j.data.nombre;
                setTipos((p) => (p.includes(n) ? p : [...p, n].sort()));
                onChange({ target: { name: 'tipo_trabajador', value: n } });
                setNuevoTipo('');
            }
        } catch { /* noop */ }
        setCreatingTipo(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let id;

            if (!isSsoma) {
                // ── General: trabajador INTERNO, sin persistencia SSOMA ──
                const r = await submitWorker();
                if (!r.success) { showToast(r.message || 'Error al guardar', 'error'); setSubmitting(false); return; }
                showToast(editingId ? 'Trabajador actualizado' : 'Trabajador registrado');
                await refreshWorkers();
                onClose();
                setSubmitting(false);
                return;
            }

            // ── Contexto SSOMA ──
            if (!editingId) {
                // Alta de trabajador EXTERNO (endpoint gateado por view_ssoma)
                const res = await fetch(`${API}/ssoma/worker`, { method: 'POST', headers: jsonH(), body: JSON.stringify(form) });
                const j = await res.json();
                if (!j.success) { showToast(j.message || 'Error al crear', 'error'); setSubmitting(false); return; }
                id = j.trabajador_id;
            } else if (esExterno) {
                // Edición completa de externo
                const res = await fetch(`${API}/ssoma/${editingId}/worker`, { method: 'PUT', headers: jsonH(), body: JSON.stringify(form) });
                const j = await res.json();
                if (!j.success) { showToast(j.message || 'Error al actualizar', 'error'); setSubmitting(false); return; }
                id = editingId;
            } else {
                // Interno editado desde SSOMA: Datos Personales solo-lectura, no se toca trabajador
                id = editingId;
            }

            await fetch(`${API}/ssoma/${id}/profile`, {
                method: 'POST',
                headers: jsonH(),
                body: JSON.stringify({
                    aptitud_medica: ssoma.aptitud_medica || 'no_definido',
                    modalidad: ssoma.modalidad || null,
                    supervisor: ssoma.supervisor || null,
                    ubicacion: ssoma.ubicacion || null,
                    documentos: SSOMA_DOC_TYPES.reduce((acc, t) => {
                        acc[t] = { fecha_vencimiento: docFechas[t] || null };
                        return acc;
                    }, {}),
                }),
            });

            for (const tipo of SSOMA_DOC_TYPES) {
                for (const file of newFiles[tipo]) {
                    const fd = new FormData();
                    fd.append('tipo', tipo);
                    fd.append('file', file);
                    await fetch(`${API}/ssoma/${id}/files`, { method: 'POST', headers: formH(), body: fd });
                }
            }

            if (fotocheckFile) {
                const fd = new FormData();
                fd.append('file', fotocheckFile);
                await fetch(`${API}/ssoma/${id}/fotocheck`, { method: 'POST', headers: formH(), body: fd });
            }

            showToast(editingId ? 'Datos guardados' : 'Trabajador externo registrado');
            await refreshWorkers();
            onClose();
        } catch {
            showToast('Error de conexión al guardar', 'error');
        }
        setSubmitting(false);
    };

    const tipoOptions = [
        ...(tipos.length ? tipos : ['Administrativo', 'Campo']).map((t) => ({ value: t, label: t })),
    ];

    const fotoPreview = fotocheckFile ? URL.createObjectURL(fotocheckFile) : fotocheckUrl;

    return (
        <Modal
            open={show}
            onClose={onClose}
            title={certView
                ? 'Capacitaciones y Certificados'
                : (editingId ? 'Editar Trabajador' : 'Nuevo Trabajador')}
            titleIcon={certView
                ? <AcademicCapIcon className="size-6 text-primary" />
                : <UserCircleIcon className="size-6 text-primary" />}
            size="2xl"
            footer={certView ? (
                <Button variant="primary" onClick={() => setCertView(false)} className="gap-2">
                    <ArrowLeftIcon className="size-4" /> Volver al formulario
                </Button>
            ) : (
                <>
                    <Button variant="danger" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="worker-form" loading={submitting}>
                        {submitting ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Registrar trabajador')}
                    </Button>
                </>
            )}
        >
            {certView ? (
                <div className="krsft-slide-in-right">
                    <CertificationsManager
                        trabajadorId={editingId}
                        workerName={form?.nombre_completo || [form?.apellido_paterno, form?.nombres].filter(Boolean).join(', ')}
                        onBack={() => setCertView(false)}
                        hideHeaderBack
                    />
                </div>
            ) : (
            <>
            <p className="mb-5 text-sm text-gray-500">
                Complete los campos requeridos <span className="font-semibold text-red-500">*</span>. Los documentos calculan su vigencia automáticamente desde la fecha de vencimiento.
            </p>

            <form onSubmit={handleSubmit} id="worker-form">
                <div className="space-y-5">
                    {/* Fila: datos del trabajador (2 columnas) */}
                    <div className="grid gap-5 lg:grid-cols-2">
                        <Card title="Datos Personales" icon={<UserCircleIcon />} delay={0}
                            badge={personalReadOnly ? <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500">Solo lectura</span> : undefined}>
                            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                                <Input label="DNI / CE" name="dni" value={form.dni} onChange={onChange} required maxLength="12" placeholder="12345678" disabled={personalReadOnly} />
                                <Input label="Nombres" name="nombres" value={form.nombres} onChange={onChange} required placeholder="Juan Carlos" disabled={personalReadOnly} />
                                <Input label="Apellido Paterno" name="apellido_paterno" value={form.apellido_paterno} onChange={onChange} required placeholder="García" disabled={personalReadOnly} />
                                <Input label="Apellido Materno" name="apellido_materno" value={form.apellido_materno || ''} onChange={onChange} placeholder="López" disabled={personalReadOnly} />
                                <Input label="Fecha de Nacimiento" name="fecha_nacimiento" value={form.fecha_nacimiento || ''} onChange={onChange} type="date" disabled={personalReadOnly} />
                                <Select label="Género" name="genero" value={form.genero} onChange={onChange} options={GENERO_OPTIONS} placeholder="" disabled={personalReadOnly} />
                                <Select label="Estado Civil" name="estado_civil" value={form.estado_civil} onChange={onChange} options={ESTADO_CIVIL_OPTIONS} placeholder="" disabled={personalReadOnly} />
                                <Input label="Teléfono" name="telefono" value={form.telefono || ''} onChange={onChange} type="tel" placeholder="999888777" disabled={personalReadOnly} />
                                <Input label="Email" name="email" value={form.email || ''} onChange={onChange} type="email" placeholder="correo@empresa.com" disabled={personalReadOnly} />
                                <div className="sm:col-span-2">
                                    <Input label="Dirección" name="direccion" value={form.direccion || ''} onChange={onChange} placeholder="Av. Principal 123" disabled={personalReadOnly} />
                                </div>
                            </div>
                        </Card>

                        <Card title="Datos Laborales" icon={<BriefcaseIcon />} delay={80}>
                            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                                <Input label="Cargo" name="cargo" value={form.cargo || ''} onChange={onChange} required placeholder="Analista" />
                                <Select label="Tipo Trabajador" name="tipo_trabajador" value={form.tipo_trabajador || ''} onChange={onChange} options={tipoOptions} placeholder="Seleccionar..." />
                                <Input label="Fecha de Ingreso" name="fecha_ingreso" value={form.fecha_ingreso || ''} onChange={onChange} type="date" required />
                                <Select label="Tipo de Contrato" name="tipo_contrato" value={form.tipo_contrato} onChange={onChange} options={TIPO_CONTRATO_OPTIONS} placeholder="" />
                                <Select label="Estado en Sistema" name="estado" value={form.estado} onChange={onChange} options={ESTADO_OPTIONS} placeholder="" />
                                <Input label="Sueldo Básico" name="sueldo_basico" value={form.sueldo_basico || ''} onChange={onChange} type="number" step="0.01" placeholder="2500.00" />
                                <Select label="Sistema de Pensiones" name="sistema_pensiones" value={form.sistema_pensiones || ''} onChange={onChange} options={PENSIONES_OPTIONS} />
                            </div>
                            <div className="mt-auto flex flex-col gap-1.5 border-t border-gray-100 pt-4 sm:flex-row sm:items-center">
                                <span className="text-xs font-medium text-gray-500">¿No está el tipo? Crear uno nuevo:</span>
                                <div className="flex flex-1 gap-1.5">
                                    <input
                                        type="text"
                                        value={nuevoTipo}
                                        onChange={(e) => setNuevoTipo(e.target.value)}
                                        placeholder="Nombre del nuevo tipo..."
                                        className="h-9 flex-1 rounded border border-gray-300 px-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                                    />
                                    <button type="button" onClick={crearTipo} disabled={creatingTipo || !nuevoTipo.trim()}
                                        className="krsft-press inline-flex items-center gap-1 rounded bg-primary px-3 text-sm font-medium text-white disabled:opacity-50">
                                        <PlusIcon className="size-4" /> Crear
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Cumplimiento SSOMA — ancho completo (tiles de documentos) */}
                        <Card title="Cumplimiento SSOMA" icon={<ClipboardDocumentCheckIcon />} delay={160}>
                            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {SSOMA_DOC_TYPES.map((tipo) => (
                                    <div key={tipo} className="rounded-lg border border-gray-200 p-3">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <span className="text-sm font-medium text-gray-800">{DOC_LABELS[tipo]}</span>
                                            <VigenciaBadge fecha={docFechas[tipo]} />
                                        </div>
                                        <label className="mb-1 block text-xs text-gray-500">Fecha de vencimiento</label>
                                        <input
                                            type="date"
                                            value={docFechas[tipo]}
                                            onChange={(e) => setDocFechas((p) => ({ ...p, [tipo]: e.target.value }))}
                                            className="mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                        <label className="krsft-press flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-gray-300 bg-gray-50/70 px-3 py-2 text-xs text-gray-500 transition-colors hover:border-primary hover:text-primary">
                                            <ArrowUpTrayIcon className="size-4" /> Subir documento (PDF/JPG)
                                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden"
                                                onChange={(e) => { addFiles(tipo, e.target.files); e.target.value = ''; }} />
                                        </label>
                                        <ul className="mt-2 space-y-1">
                                            {existingFiles[tipo].map((f) => (
                                                <li key={f.id} className="flex items-center justify-between gap-2 text-xs">
                                                    <a href={f.download_url} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">{f.nombre}</a>
                                                    <button type="button" onClick={() => deleteExistingFile(tipo, f.id)} className="krsft-hover-pop text-red-500"><XMarkIcon className="size-4" /></button>
                                                </li>
                                            ))}
                                            {newFiles[tipo].map((f, i) => (
                                                <li key={i} className="flex items-center justify-between gap-2 text-xs text-gray-600">
                                                    <span className="truncate">{f.name} <span className="text-amber-600">(nuevo)</span></span>
                                                    <button type="button" onClick={() => removeNewFile(tipo, i)} className="krsft-hover-pop text-red-500"><XMarkIcon className="size-4" /></button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </Card>

                    {/* Fila: inducción / observaciones (2 columnas) */}
                    <div className="grid gap-5 md:grid-cols-2">
                        <Card title="Capacitaciones y Certificados" icon={<AcademicCapIcon />} delay={240}>
                            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6">
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={() => setCertView(true)}
                                    disabled={!editingId}
                                    className="gap-2"
                                >
                                    <AcademicCapIcon className="size-4" /> Gestionar Certificaciones
                                </Button>
                                {!editingId && (
                                    <p className="text-center text-xs text-gray-400">Disponible tras guardar el trabajador.</p>
                                )}
                            </div>
                        </Card>

                        <Card title="Observaciones" icon={<PencilSquareIcon />} delay={320}>
                            <textarea
                                name="observaciones"
                                value={form.observaciones || ''}
                                onChange={onChange}
                                rows="3"
                                placeholder="Notas adicionales..."
                                className="w-full flex-1 min-h-[90px] resize-none rounded border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </Card>

                    </div>

                    {/* Fila: clasificación / fotocheck (2 columnas) */}
                    <div className="grid gap-5 md:grid-cols-2">
                        <Card title="Clasificación" icon={<ShieldCheckIcon />} delay={120}>
                            <div className="space-y-4">
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Aptitud</p>
                                    <PillSelector options={APTITUD_OPTIONS} value={ssoma.aptitud_medica}
                                        onChange={(v) => setSsoma((p) => ({ ...p, aptitud_medica: v }))} />
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Estado (Oficina / Campo)</p>
                                    <PillSelector options={MODALIDAD_OPTIONS} value={ssoma.modalidad}
                                        onChange={(v) => setSsoma((p) => ({ ...p, modalidad: v }))} />
                                </div>
                                <Input label="Supervisor" value={ssoma.supervisor}
                                    onChange={(e) => setSsoma((p) => ({ ...p, supervisor: e.target.value }))} placeholder="Roberto Díaz" />
                                <Input label="Ubicación" value={ssoma.ubicacion}
                                    onChange={(e) => setSsoma((p) => ({ ...p, ubicacion: e.target.value }))} placeholder="Campo Sur" />
                            </div>
                        </Card>

                        <Card title="Fotocheck" icon={<IdentificationIcon />} delay={200}>
                            <div className="flex flex-1 flex-col items-center justify-center gap-3">
                                <div className="flex size-28 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                    {fotoPreview
                                        ? <img src={fotoPreview} alt="Fotocheck" className="size-full object-cover" />
                                        : <IdentificationIcon className="size-10 text-gray-300" />}
                                </div>
                                <label className="krsft-press flex cursor-pointer items-center gap-2 rounded border border-dashed border-gray-300 bg-gray-50/70 px-3 py-2 text-xs text-gray-500 transition-colors hover:border-primary hover:text-primary">
                                    <ArrowUpTrayIcon className="size-4" /> Subir foto
                                    <input type="file" accept=".jpg,.jpeg,.png" className="hidden"
                                        onChange={(e) => setFotocheckFile(e.target.files?.[0] || null)} />
                                </label>
                                <p className="text-center text-[11px] text-gray-400">Formato carnet, fondo blanco recomendado.</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </form>
            </>
            )}
        </Modal>
    );
}
