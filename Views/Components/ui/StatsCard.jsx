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
                'flex items-center gap-[14px] rounded-lg border border-gray-100 bg-white p-[22px] min-w-0 w-full max-w-full',
                className,
            )}
        >
            <span className={clsx('rounded-full p-[14px] flex-shrink-0 flex items-center justify-center', iconBg, iconColor, '[&>svg]:size-7 [&>svg]:flex-shrink-0')}>
                {icon}
            </span>
            <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-[22px] font-medium text-gray-900 truncate whitespace-nowrap">{value}</p>
                <p className="text-[13px] text-gray-500 truncate whitespace-nowrap">{title}</p>
            </div>
        </article>
    );
}
