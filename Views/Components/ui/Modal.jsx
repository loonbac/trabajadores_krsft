import { useEffect } from 'react';
import { createPortal } from 'react-dom';

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
    bodyClassName = 'overflow-y-auto',
}) {
    useEffect(() => {
        if (!open) return undefined;

        const prevBody = document.body.style.overflow;
        const prevHtml = document.documentElement.style.overflow;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);

        return () => {
            document.body.style.overflow = prevBody;
            document.documentElement.style.overflow = prevHtml;
            document.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    const widths = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-3xl',
        xl: 'max-w-5xl',
        '2xl': 'max-w-6xl',
    };

    return createPortal(
        <div
            className="krsft-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
            onClick={() => onClose?.()}
        >
            <div
                className={`krsft-slide-in-right flex max-h-[90vh] min-h-0 w-full flex-col rounded-lg border-2 border-gray-200 bg-white shadow-2xl ${widths[size]}`}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
                        <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900">
                            {titleIcon}
                            {title}
                        </h2>
                    </div>
                )}
                <div className={`flex-1 min-h-0 px-6 py-4 ${bodyClassName}`}>{children}</div>
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
