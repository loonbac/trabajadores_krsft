/**
 * TopStats — fila de tarjetas de estadísticas arriba del listado.
 *
 * Tamaño de cada card (definido en StatsCard): alto mínimo 104px (`min-h-[104px]`),
 * ancho = 1/3 del contenedor (grid de 3 columnas iguales, `gap-4` = 16px). Icono
 * 48px (`size-12`), valor `text-2xl`, título `text-base`, padding `px-5 py-4`.
 *
 * Contextual: en la pestaña SSOMA se reemplaza por SsomaTopStats; en el resto
 * muestra 3 cards genéricas (Total / Activo / Inactivos) con animación escalonada.
 */
import { UserGroupIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

import StatsCard     from './ui/StatsCard';
import SsomaTopStats from './SsomaTopStats';

export default function TopStats({ activeTab, stats }) {
    if (activeTab === 'ssoma') return <SsomaTopStats />;

    return (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div className="min-w-0 krsft-fade-up" style={{ '--krsft-delay': '0ms' }}>
                <StatsCard title="Total Personal"    value={stats.total}     icon={<UserGroupIcon  className="size-8" />} iconBg="bg-blue-100"    iconColor="text-blue-600"    />
            </div>
            <div className="min-w-0 krsft-fade-up" style={{ '--krsft-delay': '90ms' }}>
                <StatsCard title="Personal Activo"   value={stats.activos}   icon={<CheckCircleIcon className="size-8" />} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            </div>
            <div className="min-w-0 krsft-fade-up" style={{ '--krsft-delay': '180ms' }}>
                <StatsCard title="Inactivos / Cesados" value={stats.inactivos} icon={<XCircleIcon className="size-8" />} iconBg="bg-red-100"     iconColor="text-red-600"     />
            </div>
        </div>
    );
}
