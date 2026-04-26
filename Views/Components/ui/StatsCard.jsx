import clsx from 'clsx';

/**
 * StatsCard — HyperUI Stat Card (patrón 3.4 con icono grande).
 */
export default function StatsCard({
    title,
    value,
    icon,
    iconBg = 'bg-blue-100',
    iconColor = 'text-blue-600',
    className = '',
}) {
    return (
        <article
            className={clsx(
                'flex min-h-[104px] items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm min-w-0 w-full max-w-full',
                className,
            )}
        >
            <span className={clsx('flex size-12 shrink-0 items-center justify-center rounded-xl', iconBg, iconColor, '[&>svg]:size-6 [&>svg]:flex-shrink-0')}>
                {icon}
            </span>
            <div className="min-w-0 flex flex-1 items-center gap-3 overflow-hidden">
                <p className="shrink-0 text-2xl font-bold leading-none text-gray-900">{value}</p>
                <p className="truncate text-base font-medium leading-none text-gray-600">{title}</p>
            </div>
        </article>
    );
}
