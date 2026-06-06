import clsx from 'clsx';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Badge from './ui/Badge';

const ESTADO_VARIANT = {
    pendiente: 'gray',
    parcial: 'amber',
    cumplida: 'emerald',
    vencida: 'red',
};

const ESTADO_LABEL = {
    pendiente: 'Pendiente',
    parcial: 'Parcial',
    cumplida: 'Cumplida',
    vencida: 'Vencida',
};

/**
 * PdrPendientesList — List of pending meta assignments for the supervisor.
 */
export default function PdrPendientesList({ pendientes, onSelect, loading }) {
    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
                        <div className="h-4 w-32 rounded bg-gray-200" />
                        <div className="mt-2 h-3 w-48 rounded bg-gray-100" />
                    </div>
                ))}
            </div>
        );
    }

    if (!pendientes || pendientes.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <p className="text-sm text-gray-500">No hay metas pendientes para este periodo.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {pendientes.map((meta) => {
                const config = meta.meta_config;
                const requerida = config?.cantidad_requerida ?? 0;
                const progreso = meta.progreso_actual ?? 0;
                const pct = requerida > 0 ? Math.round((progreso / requerida) * 100) : 0;

                return (
                    <button
                        key={meta.id}
                        type="button"
                        onClick={() => onSelect(meta)}
                        className="flex w-full items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary-50/30"
                    >
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium text-gray-900">
                                    {config?.nombre ?? 'Meta sin nombre'}
                                </span>
                                <Badge variant={ESTADO_VARIANT[meta.estado] ?? 'gray'}>
                                    {ESTADO_LABEL[meta.estado] ?? meta.estado}
                                </Badge>
                            </div>
                            <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                                <span>{config?.tipo_frecuencia ?? '-'}</span>
                                <span className="text-gray-300">|</span>
                                <span>Progreso: {progreso}/{requerida}</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-gray-100">
                                <div
                                    className={clsx(
                                        'h-full rounded-full transition-all',
                                        pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-primary' : 'bg-gray-300',
                                    )}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                            </div>
                        </div>
                        <ChevronRightIcon className="size-5 shrink-0 text-gray-400" />
                    </button>
                );
            })}
        </div>
    );
}
