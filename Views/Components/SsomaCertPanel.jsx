/**
 * SsomaCertPanel — panel deslizante de Capacitaciones y Certificados.
 *
 * Se abre desde la tabla SSOMA (botón por fila). Entra deslizando de derecha
 * a izquierda flotando POR ENCIMA de la tabla, cubriendo las columnas de
 * documentos. Reusa CertificationsManager para ver/gestionar las certs.
 *
 * Animación enter+exit con transiciones CSS (transform) — sin keyframes nuevos.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CertificationsManager from './CertificationsManager';

export default function SsomaCertPanel({ worker, isOpen, onClose }) {
    const [render, setRender] = useState(isOpen);
    const [enter, setEnter] = useState(false);
    const rafRef = useRef(null);

    // Monta/desmonta con animación diferida.
    useEffect(() => {
        if (isOpen) {
            setRender(true);
            rafRef.current = requestAnimationFrame(() => setEnter(true));
            return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }
        setEnter(false);
        const t = setTimeout(() => setRender(false), 320);
        return () => clearTimeout(t);
    }, [isOpen]);

    // Escape cierra.
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Bloquea el scroll del body mientras está abierto.
    useEffect(() => {
        if (!render) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [render]);

    if (!render || !worker) return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm transition-opacity duration-300"
                style={{ opacity: enter ? 1 : 0 }}
                onClick={onClose}
            />

            <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[700px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out"
                style={{ transform: enter ? 'translateX(0)' : 'translateX(100%)' }}
            >
                <div className="flex-1 overflow-y-auto px-6 py-5 bg-gray-50">
                    <CertificationsManager
                        trabajadorId={worker.id}
                        workerName={worker.nombre}
                        onBack={onClose}
                    />
                </div>
            </div>
        </>,
        document.body,
    );
}
