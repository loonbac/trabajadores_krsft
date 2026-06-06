import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPinIcon } from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';
import FileViewerModal from './modals/FileViewerModal';

// Quita la extensión del nombre mostrado (el archivo igual se sirve completo).
const stripExt = (name = '') => name.replace(/\.[^./\\]+$/, '');
const ssomaFileUrl = (id) => `/api/trabajadoreskrsft/ssoma/files/${id}/download`;
import {
    SSOMA_DOC_TYPES,
    DOC_LABELS,
    DOC_DOT,
    DOC_TEXT_COLOR,
    APTITUD_LABELS,
    APTITUD_VARIANT,
    formatDate,
    initials,
    docEstadoText,
} from './ssomaSection';

// Slide-over de detalle (sin headlessui — @headlessui/react es v2 en este
// proyecto; se usa el patrón de modal de módulos: div plano + transición CSS).
export default function SsomaWorkerDrawer({ worker, isOpen, onClose, onEdit, onDelete }) {
    const [viewerFile, setViewerFile] = useState(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    if (!isOpen || !worker) return null;

    return createPortal(
        <>
            <div
                className="krsft-fade-in fixed inset-0 z-50 bg-black/25 backdrop-blur-sm"
                onClick={onClose}
            />

            <div
                role="dialog"
                aria-modal="true"
                className="krsft-slide-in-right fixed inset-y-0 right-0 z-50 flex w-screen max-w-[420px] flex-col bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
                    <span className="krsft-scale-in flex size-12 items-center justify-center rounded-lg bg-primary-50 text-primary-700 font-semibold shrink-0">
                        {initials(worker.nombre)}
                    </span>
                    <div className="krsft-fade-up min-w-0 flex-1" style={{ '--krsft-delay': '60ms' }}>
                        <p className="text-lg font-medium text-gray-900 truncate">{worker.nombre}</p>
                        <Badge
                            variant={worker.origen === 'externo' ? 'amber' : 'blue'}
                            dot
                            className="my-1 px-2 py-0 text-xs"
                        >
                            {worker.origen === 'externo' ? 'Externo' : 'Interno'}
                        </Badge>
                        <p className="text-sm text-gray-500 font-mono">{worker.dni}</p>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-gray-50">
                    {/* Quick status */}
                    <div className="krsft-fade-up grid grid-cols-2 gap-3" style={{ '--krsft-delay': '80ms' }}>
                        <div className="krsft-hover-lift rounded-lg border border-gray-100 bg-white p-4">
                            <p className="text-xs text-gray-500 mb-1">Aptitud</p>
                            <Badge variant={APTITUD_VARIANT[worker.aptitud_medica] ?? 'gray'}>
                                {APTITUD_LABELS[worker.aptitud_medica] ?? 'No Definido'}
                            </Badge>
                        </div>
                        <div className="krsft-hover-lift rounded-lg border border-gray-100 bg-white p-4">
                            <p className="text-xs text-gray-500 mb-1">Estado (Oficina / Campo)</p>
                            <p className="text-sm font-medium text-gray-900">{worker.modalidad || '—'}</p>
                        </div>
                        <div className="krsft-hover-lift rounded-lg border border-gray-100 bg-white p-4">
                            <div className="flex items-center gap-1 mb-1">
                                <MapPinIcon className="size-4 text-gray-400" />
                                <p className="text-xs text-gray-500">Ubicación</p>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{worker.ubicacion || '—'}</p>
                        </div>
                        <div className="krsft-hover-lift flex flex-col items-center justify-center rounded-lg border border-gray-100 bg-white p-3">
                            <p className="text-xs text-gray-500 mb-1 self-start">Fotocheck</p>
                            {worker.fotocheck_url
                                ? <img src={worker.fotocheck_url} alt="Fotocheck" className="size-16 rounded object-cover ring-1 ring-gray-200" />
                                : <span className="text-xs text-gray-300">Sin foto</span>}
                        </div>
                    </div>

                    {/* Estado de documentación */}
                    <div className="krsft-fade-up" style={{ '--krsft-delay': '180ms' }}>
                        <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-2">
                            Estado de Documentación
                        </h3>
                        <div className="rounded-lg border border-gray-100 bg-white divide-y divide-gray-100">
                            {SSOMA_DOC_TYPES.map((tipo, di) => {
                                const doc = Array.isArray(worker.documentos)
                                    ? worker.documentos.find((d) => d.tipo === tipo)
                                    : worker.documentos?.[tipo];
                                const estado = doc?.estado ?? 'no_definido';
                                const dias = doc?.dias ?? 0;
                                const archivos = doc?.archivos ?? [];
                                return (
                                    <div
                                        key={tipo}
                                        className="krsft-fade-up px-4 py-2.5 transition-colors hover:bg-gray-50"
                                        style={{ '--krsft-delay': `${220 + di * 60}ms` }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`size-2 rounded-full shrink-0 ${DOC_DOT[estado] ?? DOC_DOT.no_definido} ${estado === 'vencido' ? 'krsft-pulse-soft' : ''}`}
                                                />
                                                <span className="text-sm text-gray-700">{DOC_LABELS[tipo]}</span>
                                            </div>
                                            <span className={`text-sm ${DOC_TEXT_COLOR[estado] ?? DOC_TEXT_COLOR.no_definido}`}>
                                                {docEstadoText(estado, dias)}
                                            </span>
                                        </div>
                                        {archivos.length > 0 && (
                                            <ul className="mt-1.5 space-y-0.5 pl-4">
                                                {archivos.map((f) => (
                                                    <li key={f.id}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewerFile({
                                                                id: f.id,
                                                                original_name: stripExt(f.nombre),
                                                                mime_type: f.mime || '',
                                                            })}
                                                            className="text-left text-xs text-primary hover:underline"
                                                        >
                                                            {stripExt(f.nombre)}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Datos laborales */}
                    <div className="krsft-fade-up" style={{ '--krsft-delay': '320ms' }}>
                        <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-2">
                            Datos Laborales
                        </h3>
                        <dl>
                            {[
                                { label: 'Tipo', value: worker.tipo || '—' },
                                { label: 'Cargo', value: worker.cargo || '—' },
                                { label: 'Fecha Ingreso', value: formatDate(worker.fecha_ingreso) },
                                { label: 'Supervisor', value: worker.supervisor || '—', last: true },
                            ].map(({ label, value, last }) => (
                                <div
                                    key={label}
                                    className={`flex justify-between rounded px-1 py-1.5 text-sm transition-colors hover:bg-gray-50${last ? '' : ' border-b border-dashed border-gray-200'}`}
                                >
                                    <dt className="text-gray-500">{label}</dt>
                                    <dd className="font-medium text-gray-900">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-6 py-4 space-y-2">
                    <div className="flex gap-2">
                        <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
                            Cerrar
                        </Button>
                        <Button variant="primary" size="md" onClick={() => onEdit?.(worker.trabajador ?? worker)} className="flex-1">
                            Editar
                        </Button>
                    </div>
                    {worker.origen === 'externo' && (
                        <Button variant="danger" size="md" onClick={() => onDelete?.(worker.id)} className="w-full">
                            Eliminar trabajador externo
                        </Button>
                    )}
                </div>
            </div>

            <FileViewerModal
                isOpen={!!viewerFile}
                file={viewerFile}
                getDownloadUrl={ssomaFileUrl}
                onClose={() => setViewerFile(null)}
            />
        </>,
        document.body,
    );
}
