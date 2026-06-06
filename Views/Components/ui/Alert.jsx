import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const ICONS = {
    success: CheckCircleIcon,
    error:   ExclamationCircleIcon,
    warning: ExclamationTriangleIcon,
    info:    InformationCircleIcon,
};

const STYLES = {
    success: 'border-emerald-500 bg-emerald-50 text-emerald-800',
    error:   'border-red-500 bg-red-50 text-red-800',
    warning: 'border-amber-500 bg-amber-50 text-amber-800',
    info:    'border-blue-500 bg-blue-50 text-blue-800',
};

const ICON_STYLES = {
    success: 'text-emerald-600',
    error:   'text-red-600',
    warning: 'text-amber-600',
    info:    'text-blue-600',
};

/**
 * Alert — HyperUI-style alert con icono, mensaje y cierre opcional.
 *
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string|ReactNode} message
 * @param {Function}         onClose
 * @param {string}           className
 */
export default function Alert({ type = 'info', message, onClose, className = '' }) {
    const Icon = ICONS[type];

    return (
        <div
            role="alert"
            className={clsx(
                'flex items-start gap-3 rounded-lg border-l-4 p-4',
                STYLES[type],
                className,
            )}
        >
            <Icon className={clsx('size-5 shrink-0 mt-0.5', ICON_STYLES[type])} />
            <div className="flex-1 text-sm">{message}</div>
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded p-1 transition-colors hover:bg-black/5"
                    aria-label="Cerrar"
                >
                    <XMarkIcon className="size-5" />
                </button>
            )}
        </div>
    );
}
