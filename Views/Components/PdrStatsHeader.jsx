import clsx from 'clsx';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

/**
 * PdrStatsHeader — Daily and monthly progress display for PDR metas.
 */
export default function PdrStatsHeader({ resumen }) {
    if (!resumen) {
        return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[1, 2].map(i => (
                    <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5">
                        <div className="h-4 w-24 rounded bg-gray-200" />
                        <div className="mt-3 h-8 w-16 rounded bg-gray-200" />
                    </div>
                ))}
            </div>
        );
    }

    const { diario, mensual } = resumen;

    const calcPct = (data) => {
        if (!data || data.total === 0) return 0;
        return Math.round(((data.cumplidas + data.parciales * 0.5) / data.total) * 100);
    };

    const pctColor = (pct) => {
        if (pct >= 80) return 'bg-emerald-500';
        if (pct >= 50) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const pctText = (pct) => {
        if (pct >= 80) return 'text-emerald-700';
        if (pct >= 50) return 'text-amber-700';
        return 'text-red-700';
    };

    const renderCard = (label, data) => {
        const pct = calcPct(data);
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-600">{label}</h3>
                    <span className={clsx('text-2xl font-bold', pctText(pct))}>{pct}%</span>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                        className={clsx('h-full rounded-full transition-all duration-500', pctColor(pct))}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                </div>
                {data && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                            <CheckCircleIcon className="size-3.5 text-emerald-500" />
                            {data.cumplidas} cumplidas
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <ClockIcon className="size-3.5 text-amber-500" />
                            {data.parciales} parciales
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <ExclamationTriangleIcon className="size-3.5 text-gray-400" />
                            {data.pendientes} pendientes
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <XCircleIcon className="size-3.5 text-red-500" />
                            {data.vencidas} vencidas
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderCard('Progreso del dia', diario)}
            {renderCard('Progreso del mes', mensual)}
        </div>
    );
}
