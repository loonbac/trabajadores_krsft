import clsx from 'clsx';
import { UserCircleIcon, CheckCircleIcon, ClockIcon, XCircleIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * PdrSupervisoresResumen — Grid de supervisores con su progreso mensual.
 * Click en una card => entra al detalle de ese supervisor (onSelect).
 */
function calcPct(data) {
    if (!data || data.total === 0) return 0;
    return Math.round(((data.cumplidas + data.parciales * 0.5) / data.total) * 100);
}

const barColor = (pct) => (pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500');
const pctText = (pct) => (pct >= 80 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700');

export default function PdrSupervisoresResumen({ supervisores = [], onSelect }) {
    if (supervisores.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <UserCircleIcon className="mx-auto size-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No hay supervisores activos en el sistema PDR.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {supervisores.map((s) => {
                const m = s.mensual || {};
                const pct = calcPct(m);
                return (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelect(s.id)}
                        className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-primary hover:bg-primary-50"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-800">
                                    {s.nombre_completo || `Supervisor #${s.id}`}
                                </p>
                                {s.cargo && <p className="truncate text-xs text-gray-500">{s.cargo}</p>}
                            </div>
                            <ChevronRightIcon className="size-4 shrink-0 text-gray-300 transition-colors group-hover:text-primary" />
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-gray-500">Progreso del mes</span>
                            <span className={clsx('text-lg font-bold', pctText(pct))}>{pct}%</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div className={clsx('h-full rounded-full transition-all duration-500', barColor(pct))} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                                <CheckCircleIcon className="size-3.5 text-emerald-500" />
                                {m.cumplidas ?? 0}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <ClockIcon className="size-3.5 text-amber-500" />
                                {m.parciales ?? 0}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <XCircleIcon className="size-3.5 text-red-500" />
                                {m.vencidas ?? 0}
                            </span>
                            <span className="ml-auto text-gray-400">{m.total ?? 0} metas</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
