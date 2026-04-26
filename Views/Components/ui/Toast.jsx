import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

/**
 * Toast – HyperUI notification (self-contained).
 */
export default function Toast({ show, message, type = 'success', duration = 4000, onHide }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (show) { setVisible(true); const t = setTimeout(() => { setVisible(false); onHide?.(); }, duration); return () => clearTimeout(t); }
        setVisible(false);
    }, [show, duration, onHide]);
    if (!visible) return null;

    const styles = {
        success: 'border-emerald-500 bg-emerald-50 text-emerald-700',
        error:   'border-red-500 bg-red-50 text-red-700',
        warning: 'border-amber-500 bg-amber-50 text-amber-700',
        info:    'border-blue-500 bg-blue-50 text-blue-700',
    };
    const icons = {
        success: <CheckCircleIcon className="size-5 shrink-0" />,
        error:   <XCircleIcon className="size-5 shrink-0" />,
        warning: <ExclamationTriangleIcon className="size-5 shrink-0" />,
        info:    <InformationCircleIcon className="size-5 shrink-0" />,
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            <div role="alert" className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${styles[type] || styles.success}`}>
                {icons[type]}
                <p className="text-sm font-medium">{message}</p>
            </div>
        </div>
    );
}
