import { useEffect, useState, useCallback } from 'react';
import { UsersIcon, ExclamationTriangleIcon, ClockIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import StatsCard from './ui/StatsCard';
import { SSOMA_POLLING_MS } from './ssomaSection';

const API = '/api/trabajadoreskrsft/ssoma';

/**
 * Cards superiores de la sección SSOMA — reemplazan los cards genéricos de
 * personal cuando el tab SSOMA está activo. Fetch propio + polling 30s.
 */
export default function SsomaTopStats() {
    const [stats, setStats] = useState(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`${API}/stats`, { cache: 'no-store' });
            const json = await res.json();
            if (json.success) setStats(json.data);
        } catch {
            // silencioso
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const t = setInterval(fetchStats, SSOMA_POLLING_MS);
        return () => clearInterval(t);
    }, [fetchStats]);

    return (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <div className="min-w-0 krsft-fade-up" style={{ '--krsft-delay': '0ms' }}>
                <StatsCard title="Total Trabajadores" value={stats?.total ?? 0}
                    icon={<UsersIcon className="size-6" />} iconBg="bg-blue-100" iconColor="text-blue-600" />
            </div>
            <div className="min-w-0 krsft-fade-up" style={{ '--krsft-delay': '90ms' }}>
                <StatsCard title="Docs Vencidos" value={stats?.docs_vencidos ?? 0}
                    icon={<ExclamationTriangleIcon className="size-6" />} iconBg="bg-red-100" iconColor="text-red-600" />
            </div>
            <div className="min-w-0 krsft-fade-up" style={{ '--krsft-delay': '180ms' }}>
                <StatsCard title="Por Vencer" value={stats?.docs_por_vencer ?? 0}
                    icon={<ClockIcon className="size-6" />} iconBg="bg-amber-100" iconColor="text-amber-600" />
            </div>
            <div className="min-w-0 krsft-fade-up" style={{ '--krsft-delay': '270ms' }}>
                <StatsCard title="Observados" value={stats?.trabajadores_observados ?? 0}
                    icon={<ShieldExclamationIcon className="size-6" />} iconBg="bg-amber-100" iconColor="text-amber-600" />
            </div>
        </div>
    );
}
