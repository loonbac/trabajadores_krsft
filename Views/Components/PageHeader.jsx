/**
 * PageHeader – Module header with back button, icon and title (teal accent).
 */
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';

export default function PageHeader({ title, subtitle, icon, children }) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
                <Button variant="primary" size="md" onClick={() => window.history.back()} className="gap-2">
                    <ArrowLeftIcon className="size-4" />
                    Volver
                </Button>
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white [&>svg]:size-7">
                        {icon}
                    </span>
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-bold tracking-tight text-gray-900">{title}</h1>
                        {subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}
                    </div>
                </div>
            </div>
            {children && <div className="ms-auto flex items-center gap-2">{children}</div>}
        </header>
    );
}
