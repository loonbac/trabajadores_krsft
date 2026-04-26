import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Modal — HyperUI-aligned portal modal.
 */
export default function Modal({
    open,
    onClose,
    title,
    titleIcon,
    children,
    footer,
    size = 'md',
}) {
    if (!open) return null;

    const widths = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-3xl',
        xl: 'max-w-5xl',
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`w-full ${widths[size]} max-h-[90vh] flex flex-col rounded-lg bg-white shadow-2xl border-2 border-gray-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
                        <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900">
                            {titleIcon}
                            {title}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Cerrar"
                        >
                            <XMarkIcon className="size-5" />
                        </button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
                {footer && (
                    <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
