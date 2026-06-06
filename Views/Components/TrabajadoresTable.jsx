/**
 * TrabajadoresTable – HyperUI Table §2.3 with avatars, badges and button group actions.
 */
import { memo } from 'react';
import { PencilSquareIcon, TrashIcon, UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { formatDate, getInitials } from '../utils';

const ESTADO_VARIANT = {
    Activo: 'emerald',
    Inactivo: 'red',
    Cesado: 'red',
    Vacaciones: 'amber',
    Licencia: 'blue',
};

let wheelTarget = 0;
let wheelCurrent = 0;
let wheelFrame = null;

const stepSmoothWheel = () => {
    const remaining = wheelTarget - wheelCurrent;

    if (Math.abs(remaining) < 0.5) {
        window.scrollBy({ top: remaining, left: 0, behavior: 'auto' });
        wheelTarget = 0;
        wheelCurrent = 0;
        wheelFrame = null;
        return;
    }

    const move = remaining * 0.24;
    window.scrollBy({ top: move, left: 0, behavior: 'auto' });
    wheelCurrent += move;
    wheelFrame = window.requestAnimationFrame(stepSmoothWheel);
};

const forwardVerticalWheel = (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    wheelTarget += event.deltaY;

    if (!wheelFrame) {
        wheelFrame = window.requestAnimationFrame(stepSmoothWheel);
    }
};

const TrabajadoresTable = memo(function TrabajadoresTable({ trabajadores, loading, onEdit, onDelete, openCreateModal, canCreate, canEdit, canDelete, smoothWheel = true }) {
    /* Loading */
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <svg className="mx-auto size-10 animate-spin text-primary mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm">Cargando trabajadores...</p>
            </div>
        );
    }

    /* Empty state */
    if (trabajadores.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto">
                <UserGroupIcon className="mx-auto size-20 text-gray-300 mb-6" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">No hay trabajadores registrados</h2>
                <p className="text-sm text-gray-500 mb-6">Comienza agregando el primer trabajador al sistema.</p>
                {canCreate && (
                    <Button variant="primary" onClick={openCreateModal} className="w-full gap-2">
                        <PlusIcon className="size-5" />
                        Agregar primer trabajador
                    </Button>
                )}
            </div>
        );
    }

    /* Table */
    return (
        <div
            className="krsft-fade-up hide-scrollbar overflow-x-auto rounded-lg border-2 border-gray-300"
            onWheel={smoothWheel ? forwardVerticalWheel : undefined}
        >
            <table className="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
                <thead className="text-left">
                    <tr>
                        <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">Trabajador</th>
                        <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900 text-center">DNI</th>
                        <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900 text-center">Cargo</th>
                        <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900 text-center">Fecha Ingreso</th>
                        <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900 text-center">Estado</th>
                        <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {trabajadores.map((t, i) => (
                        <tr
                            key={t.id}
                            className="krsft-fade-up transition-colors hover:bg-primary-50/40"
                            style={{ '--krsft-delay': `${Math.min(i * 30, 600)}ms` }}
                        >
                            {/* Worker avatar + name */}
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                                        {getInitials(t)}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {t.nombre_completo || `${t.apellido_paterno || ''} ${t.apellido_materno || ''}, ${t.nombres || ''}`.trim()}
                                        </p>
                                        <p className="text-xs text-gray-500">{t.email || 'Sin email'}</p>
                                    </div>
                                </div>
                            </td>
                            {/* DNI */}
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                                <span className="font-mono text-sm text-gray-600 font-medium">{t.dni}</span>
                            </td>
                            {/* Cargo */}
                            <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-700">{t.cargo || '-'}</td>
                            {/* Fecha Ingreso */}
                            <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-700">{formatDate(t.fecha_ingreso)}</td>
                            {/* Estado */}
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                                <Badge variant={ESTADO_VARIANT[t.estado] || 'gray'}>{t.estado}</Badge>
                            </td>
                            {/* Actions — HyperUI §8.2 Button Group */}
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                                <span className="inline-flex -space-x-px overflow-hidden rounded-md border border-gray-300 bg-white">
                                    {canEdit && (
                                        <button
                                            onClick={() => onEdit(t)}
                                            className="inline-block border-e border-gray-300 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-200"
                                            title="Editar"
                                        >
                                            <PencilSquareIcon className="size-4" />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() => onDelete(t)}
                                            className="inline-block px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-red-200"
                                            title="Eliminar"
                                        >
                                            <TrashIcon className="size-4" />
                                        </button>
                                    )}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

export default TrabajadoresTable;
