import { useState, useRef, useEffect, memo } from 'react';

// ── Memoized custom select (rerender-memo) ──
const CustomSelect = memo(function CustomSelect({ value, onChange, options, placeholder = 'Seleccionar' }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

    // Close when clicking outside (client-event-listeners: single listener)
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
    };

    const handleToggle = () => setIsOpen(prev => !prev);

    return (
        <div className="custom-select-container" ref={containerRef}>
            <div
                className={`custom-select-trigger${isOpen ? ' open' : ''}`}
                onClick={handleToggle}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(); }}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span>{selectedLabel}</span>
                <svg
                    className={`select-arrow${isOpen ? ' rotated' : ''}`}
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </div>

            {isOpen ? (
                <div className="custom-select-options" role="listbox">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={`custom-option${option.value === value ? ' selected' : ''}`}
                            onClick={() => handleSelect(option.value)}
                            role="option"
                            aria-selected={option.value === value}
                        >
                            {option.label}
                            {option.value === value ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
});

export default CustomSelect;
