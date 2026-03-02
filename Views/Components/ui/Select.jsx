import { forwardRef } from 'react';
import clsx from 'clsx';

/**
 * Select — HyperUI Select Simple (patrón 5.1).
 */
const Select = forwardRef((
    { label, name, value, onChange, options = [], placeholder = 'Seleccionar...', error, required = false, helper, className = '', children, ...props },
    ref,
) => {
    return (
        <div className={className}>
            <label className="block">
                <span className="text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="ml-1 text-red-500">*</span>}
                </span>
                <select
                    ref={ref}
                    name={name}
                    value={value}
                    onChange={onChange}
                    className={clsx(
                        'mt-0.5 w-full rounded shadow-sm sm:text-sm transition-colors',
                        error
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-primary focus:ring-primary',
                    )}
                    {...props}
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {children
                        ? children
                        : options.map((opt, i) => (
                            <option key={opt.value ?? i} value={opt.value}>{opt.label}</option>
                        ))
                    }
                </select>
            </label>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            {helper && !error && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
        </div>
    );
});

Select.displayName = 'Select';
export default Select;
