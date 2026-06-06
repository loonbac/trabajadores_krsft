/**
 * CertMatrixOverlay — panel de Capacitaciones y Certificados que se desliza
 * POR ENCIMA, cubriendo desde la columna Tipo hacia la derecha de la tabla SSOMA.
 *
 * Solo las columnas Nombre/DNI quedan visibles a la izquierda: el panel se
 * posiciona con `leftOffset` (medido en el padre, = borde derecho de la columna
 * DNI) y replica la altura de cabecera y de fila (`headHeight`/`rowHeight`) para
 * alinear cada fila con su trabajador. El propio panel incluye su columna
 * congelada Estado (Activo/Cesado) antes de los certificados.
 *
 * Scroll: las filas son fijas (paginadas, máx PAGE_SIZE) → sin scroll vertical;
 * las filas alinean estáticamente con la tabla base. La rueda del mouse sobre el
 * panel desplaza las columnas en HORIZONTAL (no hay drag-to-scroll); la columna
 * Estado queda congelada (sticky) y no se desplaza.
 *
 * Datos vienen del padre (workers + certTypes + certMatrix): sin fetch propio.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DocumentTextIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import FileViewerModal from './modals/FileViewerModal';
import Badge from './ui/Badge';
import { DOC_TEXT_COLOR, ESTADO_LABORAL_VARIANT, vencimientoTooltip } from './ssomaSection';

// Ancho de la columna congelada Estado dentro del overlay.
const ESTADO_W = 120;
// Ancho uniforme de cada columna de certificado (el título envuelve si no entra).
const CERT_COL_W = 150;

const stripExt = (name = '') => name.replace(/\.[^./\\]+$/, '');
const certFileUrl = (id) => `/api/trabajadoreskrsft/certifications/files/${id}/download`;

export default function CertMatrixOverlay({
    open, workers = [], certTypes = [], certMatrix = {},
    leftOffset = 0, headHeight = 40, rowHeight = 52, onRowClick,
}) {
    const [render, setRender] = useState(open);
    const [enter, setEnter]   = useState(false);
    const rafRef = useRef(null);

    const scrollRef = useRef(null);

    // Archivo abierto en el visor (preview de la celda). null = cerrado.
    const [previewFile, setPreviewFile] = useState(null);

    // Click en el icono de una celda: si hay archivo lo previsualiza; si no,
    // delega al click de fila para abrir el panel de subida/edición.
    const handleCellClick = (e, worker, cell) => {
        e.stopPropagation();
        const archivo = cell?.archivo;
        if (archivo) {
            setPreviewFile({ id: archivo.id, original_name: stripExt(archivo.nombre), mime_type: archivo.mime || '' });
        } else {
            onRowClick?.(worker);
        }
    };

    // Monta/desmonta con animación diferida (mismo patrón que SsomaCertPanel).
    useEffect(() => {
        if (open) {
            setRender(true);
            rafRef.current = requestAnimationFrame(() => setEnter(true));
            return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }
        setEnter(false);
        setPreviewFile(null); // cierra el visor si el overlay se oculta (limpieza de FileViewerModal)
        const t = setTimeout(() => setRender(false), 480);
        return () => clearTimeout(t);
    }, [open]);

    // Rueda vertical → scroll HORIZONTAL de las columnas (los trabajadores son
    // fijos/paginados, así que no hay scroll vertical: la rueda mueve la lista de
    // certificaciones a derecha/izquierda). Listener nativo non-passive porque
    // React hace onWheel passive y no deja preventDefault.
    useEffect(() => {
        if (!render) return undefined;
        const ov = scrollRef.current;
        if (!ov) return undefined;
        const onWheel = (e) => {
            const delta = e.deltaY || e.deltaX;
            if (delta === 0) return;
            ov.scrollLeft += delta;
            e.preventDefault();
            // Cortar propagación: si no, la rueda sobre la matriz llega a onAreaWheel
            // del padre y sale del modo foco al subir. Sobre la matriz solo se mueven
            // columnas; para salir del foco hay que scrollear fuera de la matriz.
            e.stopPropagation();
        };
        ov.addEventListener('wheel', onWheel, { passive: false });
        return () => ov.removeEventListener('wheel', onWheel);
    }, [render, enter]);

    if (!render) return null;

    const handleRowClick = (worker) => onRowClick?.(worker);

    return (
        <>
        {/* Recortador anclado al borde derecho de la card (cubre el viewport de la tabla). */}
        <div
            className="absolute right-0.5 bottom-0.5 top-0 z-20 overflow-hidden rounded-r-lg"
            style={{ left: leftOffset }}
        >
            <div
                className="h-full border-l-2 border-primary/40 bg-white shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.35)] transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: enter ? 'translateX(0)' : 'translateX(100%)' }}
            >
                <div
                    ref={scrollRef}
                    className="h-full overflow-x-auto overflow-y-hidden overscroll-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                                {certTypes.map((t) => (
                                    <th
                                        key={t.id}
                                        className="break-words border-b border-gray-200 bg-gray-50 px-3 text-center text-xs font-medium uppercase leading-tight tracking-wide text-gray-500"
                                        style={{ width: CERT_COL_W, minWidth: CERT_COL_W }}
                                    >
                                        {t.nombre}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {workers.map((worker) => (
                                <tr
                                    key={worker.id}
                                    className="group/row cursor-pointer transition-colors hover:bg-primary-50/40"
                                    style={{ height: rowHeight }}
                                    onClick={() => handleRowClick(worker)}
                                >
                                    <td
                                        className="sticky left-0 z-10 whitespace-nowrap border-b border-gray-100 bg-white px-4 transition-colors group-hover/row:bg-primary-50/40"
                                        style={{ width: ESTADO_W }}
                                    >
                                        <Badge variant={ESTADO_LABORAL_VARIANT[worker.estado_laboral] ?? 'gray'}>
                                            {worker.estado_laboral || '—'}
                                        </Badge>
                                    </td>
                                    {certTypes.map((t) => {
                                        const cell    = certMatrix[worker.id]?.[t.id];
                                        const estado  = cell?.estado ?? 'no_definido';
                                        const archivo = cell?.archivo ?? null;
                                        const count   = cell?.archivos_count ?? 0;
                                        const fileLine = archivo
                                            ? `${archivo.nombre}${count > 1 ? ` (+${count - 1} más)` : ''} — clic para ver`
                                            : 'Sin archivo — clic para subir/editar';
                                        const title = `${t.nombre}\n${vencimientoTooltip(estado, cell?.dias ?? 0, cell?.fecha_vencimiento)}\n${fileLine}`;
                                        return (
                                            <td key={t.id} className="border-b border-gray-100 p-0" style={{ width: CERT_COL_W, minWidth: CERT_COL_W }}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleCellClick(e, worker, cell)}
                                                    title={title}
                                                    aria-label={title}
                                                    className="group krsft-press flex h-full min-h-[44px] w-full cursor-pointer items-center justify-center px-5 py-3"
                                                >
                                                    {archivo
                                                        ? <DocumentTextIcon className={`size-5 transition-transform group-hover:scale-125 ${DOC_TEXT_COLOR[estado] ?? DOC_TEXT_COLOR.no_definido} ${estado === 'vencido' ? 'krsft-pulse-soft' : ''}`} />
                                                        : <DocumentPlusIcon className="size-5 text-gray-300 transition-all group-hover:scale-125 group-hover:text-primary" />}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {previewFile && createPortal(
            <FileViewerModal
                isOpen
                file={previewFile}
                getDownloadUrl={certFileUrl}
                onClose={() => setPreviewFile(null)}
            />,
            document.body,
        )}
        </>
    );
}
