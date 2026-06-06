import clsx from 'clsx';
import { InboxIcon } from '@heroicons/react/24/outline';

/**
 * EmptyState — HyperUI Empty State (patrón 12).
 *
 * @param {string}    title   – Título del estado vacío
 * @param {string}    message – Descripción
 * @param {ReactNode} icon    – Icono personalizado (usa InboxIcon por defecto)
 * @param {ReactNode} action  – Botón o acción
 * @param {string}    className
 */
export default function EmptyState({
    title = 'Sin datos',
    message = 'No se encontraron registros.',
    icon,
    action,
    className = '',
}) {
    return (
        <div className={clsx('flex flex-col items-center justify-center py-12 text-center', className)}>
            <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400">
                {icon ?? <InboxIcon className="size-8" />}
            </div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
