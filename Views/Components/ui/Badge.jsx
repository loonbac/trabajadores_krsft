import clsx from 'clsx';

/* ── Mapas de estilos HyperUI ── */
const SOLID = {
    primary:  'bg-primary-50 text-primary-700',
    blue:     'bg-blue-100 text-blue-700',
    purple:   'bg-purple-100 text-purple-700',
    green:    'bg-green-100 text-green-700',
    gray:     'bg-gray-100 text-gray-700',
    red:      'bg-red-100 text-red-700',
    yellow:   'bg-yellow-100 text-yellow-700',
    cyan:     'bg-cyan-100 text-cyan-700',
    emerald:  'bg-emerald-100 text-emerald-700',
    amber:    'bg-amber-100 text-amber-700',
    success:  'bg-emerald-100 text-emerald-700',
    danger:   'bg-red-100 text-red-700',
    warning:  'bg-amber-100 text-amber-700',
};

const BORDER = {
    primary:  'border border-primary text-primary-700',
    blue:     'border border-blue-500 text-blue-700',
    purple:   'border border-purple-500 text-purple-700',
    green:    'border border-green-500 text-green-700',
    gray:     'border border-gray-500 text-gray-700',
    red:      'border border-red-500 text-red-700',
    yellow:   'border border-yellow-500 text-yellow-700',
    cyan:     'border border-cyan-500 text-cyan-700',
    emerald:  'border border-emerald-500 text-emerald-700',
    amber:    'border border-amber-500 text-amber-700',
    success:  'border border-emerald-500 text-emerald-700',
    danger:   'border border-red-500 text-red-700',
    warning:  'border border-amber-500 text-amber-700',
};

const DOT = {
    primary:  'bg-primary',
    blue:     'bg-blue-500',
    purple:   'bg-purple-500',
    green:    'bg-green-500',
    gray:     'bg-gray-500',
    red:      'bg-red-500',
    yellow:   'bg-yellow-500',
    cyan:     'bg-cyan-500',
    emerald:  'bg-emerald-500',
    amber:    'bg-amber-500',
    success:  'bg-emerald-500',
    danger:   'bg-red-500',
    warning:  'bg-amber-500',
};

export default function Badge({
    children,
    variant = 'primary',
    border = false,
    dot = false,
    icon = null,
    onDismiss,
    className = '',
}) {
    const palette = border ? BORDER : SOLID;

    return (
        <span
            className={clsx(
                'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm whitespace-nowrap',
                palette[variant] || palette.primary,
                className,
            )}
        >
            {dot && (
                <span className={clsx('-ms-1 me-1.5 size-1.5 rounded-full', DOT[variant] || DOT.primary)} />
            )}
            {icon && <span className="-ms-1 me-1.5 size-4">{icon}</span>}
            {children}
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    className="ms-1.5 -me-1 inline-block rounded-full p-0.5 transition hover:opacity-75"
                >
                    <span className="sr-only">Eliminar</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </span>
    );
}
