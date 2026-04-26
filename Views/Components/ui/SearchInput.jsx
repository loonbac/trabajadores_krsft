/**
 * SearchInput – Buscador con icono y botón de limpiar (teal accent).
 */
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function SearchInput({ value, onChange, placeholder = 'Buscar...', className = '' }) {
    return (
        <div className={`relative ${className}`}>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-10 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    <XMarkIcon className="size-4" />
                </button>
            )}
        </div>
    );
}
