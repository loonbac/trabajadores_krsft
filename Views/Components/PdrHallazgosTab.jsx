import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Select from './ui/Select';

const ESTADO_RESOLUCION_VARIANT = {
    abierto: 'red',
    en_proceso: 'amber',
    cerrado: 'emerald',
};

const ESTADO_RESOLUCION_LABEL = {
    abierto: 'Abierto',
    en_proceso: 'En Proceso',
    cerrado: 'Cerrado',
};

const FILTER_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'abierto', label: 'Abiertos' },
    { value: 'en_proceso', label: 'En Proceso' },
    { value: 'cerrado', label: 'Cerrados' },
];

/**
 * PdrHallazgosTab — Hallazgos sub-tab with filter and resolution actions.
 */
export default function PdrHallazgosTab({ hallazgos, onUpdateEstado, canManage }) {
    const [filter, setFilter] = useState('');

    const filtered = filter
        ? hallazgos.filter(h => h.estado_resolucion === filter)
        : hallazgos;

    if (!hallazgos || hallazgos.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <ExclamationTriangleIcon className="mx-auto size-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No hay hallazgos registrados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <Select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    options={FILTER_OPTIONS}
                    placeholder=""
                    className="w-44"
                />
                <span className="text-xs text-gray-500">{filtered.length} hallazgo(s)</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr className="*:px-3 *:py-2 *:text-left *:text-xs *:font-medium *:uppercase *:tracking-wide *:text-gray-500">
                            <th>Tipo</th>
                            <th>Descripcion</th>
                            <th>Area</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                            {canManage && <th>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map((h) => (
                            <tr key={h.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-700">{h.tipo_hallazgo ?? '-'}</td>
                                <td className="max-w-[280px] truncate px-3 py-2 text-gray-700">{h.descripcion ?? '-'}</td>
                                <td className="px-3 py-2 text-gray-700">{h.area ?? '-'}</td>
                                <td className="px-3 py-2">
                                    <Badge variant={ESTADO_RESOLUCION_VARIANT[h.estado_resolucion] ?? 'gray'}>
                                        {ESTADO_RESOLUCION_LABEL[h.estado_resolucion] ?? h.estado_resolucion}
                                    </Badge>
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-500">
                                    {h.created_at ? new Date(h.created_at).toLocaleDateString('es-PE') : '-'}
                                </td>
                                {canManage && (
                                    <td className="px-3 py-2">
                                        {h.estado_resolucion !== 'cerrado' && (
                                            <div className="flex gap-1">
                                                {h.estado_resolucion === 'abierto' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onUpdateEstado(h.id, 'en_proceso')}
                                                        className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
                                                    >
                                                        En Proceso
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateEstado(h.id, 'cerrado')}
                                                    className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                                                >
                                                    Cerrar
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
