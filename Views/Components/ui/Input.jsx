import { forwardRef } from 'react';
import clsx from 'clsx';

/**
 * Input — HyperUI Input Simple (patrón 4.1).
 */
const Input = forwardRef((
    { label, name, type = 'text', value, onChange, placeholder, error, required = false, helper, className = '', ...props },
    ref,
) => {
    return (
        <div className={className}>
            <label className="block">
                <span className="text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="ml-1 text-red-500">*</span>}
                </span>
                <input
                    ref={ref}
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={clsx(
                        'mt-0.5 w-full rounded shadow-sm sm:text-sm transition-colors',
                        error
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-primary focus:ring-primary',
                    )}
                    {...props}
                />
            </label>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            {helper && !error && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
        </div>
    );
});

Input.displayName = 'Input';
export default Input;
