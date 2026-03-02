import { forwardRef } from 'react';
import clsx from 'clsx';

/* ── Variantes y tamaños HyperUI ── */
const VARIANTS = {
    primary:   'bg-primary text-white hover:bg-primary-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger:    'bg-red-600 text-white hover:bg-red-700',
    ghost:     'bg-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900',
    success:   'bg-green-600 text-white hover:bg-green-700',
    warning:   'bg-amber-500 text-white hover:bg-amber-600',
};

const SIZES = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-sm',
};

const Button = forwardRef((
    { variant = 'primary', size = 'md', disabled = false, loading = false, type = 'button', onClick, children, className = '', ...props },
    ref,
) => {
    const isDisabled = disabled || loading;

    return (
        <button
            ref={ref}
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={clsx(
                'inline-flex items-center justify-center rounded font-medium transition-colors',
                VARIANTS[variant] ?? VARIANTS.primary,
                SIZES[size],
                isDisabled && 'opacity-50 cursor-not-allowed',
                className,
            )}
            {...props}
        >
            {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            {children}
        </button>
    );
});

Button.displayName = 'Button';
export default Button;
