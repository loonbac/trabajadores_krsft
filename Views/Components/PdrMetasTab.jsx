import { useMemo, useState } from 'react';
import {
    ClipboardDocumentCheckIcon,
    MegaphoneIcon,
    ShieldExclamationIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon,
    UserGroupIcon,
    FlagIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { usePdrMetasData } from '../hooks/usePdrMetasData';
import { usePage } from '@inertiajs/react';

import PdrStatsHeader from './PdrStatsHeader';
import PdrPendientesList from './PdrPendientesList';
import PdrEjecucionForm from './PdrEjecucionForm';
import PdrHallazgosTab from './PdrHallazgosTab';
import PdrSupervisoresModal from './PdrSupervisoresModal';
import PdrMetasConfigModal from './PdrMetasConfigModal';
import PdrSupervisoresResumen from './PdrSupervisoresResumen';
import Toast from './ui/Toast';
import Button from './ui/Button';

/* Mapa de iconos por slug conocido; fallback genérico para metas nuevas. */
const ICON_BY_SLUG = {
    inspecciones: ClipboardDocumentCheckIcon,
    charlas: MegaphoneIcon,
    charla_seguridad: MegaphoneIcon,
    ats: ShieldExclamationIcon,
    reportes: DocumentTextIcon,
};

/**
 * PdrMetasTab — Orchestrator for PDR metas panel.
 * All state lives in usePdrMetasData hook; UI in modular components.
 */
export default function PdrMetasTab() {
    const { auth } = usePage().props;
    const d = usePdrMetasData(auth);
    const [supervisoresOpen, setSupervisoresOpen] = useState(false);
    const [metasConfigOpen, setMetasConfigOpen] = useState(false);

    /* Sub-tabs dinámicos derivados de metasConfig (no hardcoded).
       Sin supervisor seleccionado, solo HALLAZGOS está visible
       (los tabs de meta requieren contexto por supervisor). */
    const dynamicMetaTabs = useMemo(() => {
        return (d.metasConfig || [])
            .filter((m) => m.is_active)
            .slice()
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
            .map((m) => ({
                key: m.slug,
                label: m.nombre,
                icon: ICON_BY_SLUG[m.slug] ?? DocumentTextIcon,
            }));
    }, [d.metasConfig]);

    const subTabs = useMemo(() => {
        if (!d.supervisorId) {
            return [{ key: 'hallazgos', label: 'HALLAZGOS', icon: ExclamationTriangleIcon }];
        }
        return [
            ...dynamicMetaTabs,
            { key: 'hallazgos', label: 'HALLAZGOS', icon: ExclamationTriangleIcon },
        ];
    }, [d.supervisorId, dynamicMetaTabs]);

    const canManageSupervisors = d.permissions.manageSupervisors;
    const canManageConfig = d.permissions.manageConfig;

    const adminHeader = (canManageSupervisors || canManageConfig) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
            {canManageConfig && (
                <Button variant="secondary" size="sm" onClick={() => setMetasConfigOpen(true)}>
                    <FlagIcon className="mr-1.5 size-4" />
                    Gestionar Metas
                </Button>
            )}
            {canManageSupervisors && (
                <Button variant="primary" size="sm" onClick={() => setSupervisoresOpen(true)}>
                    <UserGroupIcon className="mr-1.5 size-4" />
                    Gestionar Supervisores
                </Button>
            )}
        </div>
    );

    const supervisoresModal = canManageSupervisors && (
        <PdrSupervisoresModal
            size="2xl"
            open={supervisoresOpen}
            onClose={() => setSupervisoresOpen(false)}
            supervisores={d.supervisores}
            trabajadores={d.trabajadores}
            onCreateBatch={d.createSupervisorsBatch}
            onDeleteBatch={d.deleteSupervisorsBatch}
            onFetchTrabajadores={d.fetchTrabajadores}
            saving={d.saving}
        />
    );

    const metasConfigModal = canManageConfig && (
        <PdrMetasConfigModal
            open={metasConfigOpen}
            onClose={() => setMetasConfigOpen(false)}
            metasConfig={d.metasConfig}
            onCreate={d.createMetaConfig}
            onUpdate={d.updateMetaConfig}
            onDeactivate={d.deactivateMetaConfig}
            saving={d.saving}
        />
    );

    if (d.loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <svg className="size-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="mt-4 text-sm text-gray-500">Cargando metas PDR...</p>
            </div>
        );
    }

    const selected = d.supervisorId
        ? (d.supervisores.find(s => s.id === d.supervisorId) || d.supervisoresResumen.find(s => s.id === d.supervisorId))
        : null;
    const selectedNombre = selected?.nombre_completo || (d.supervisorId ? `Supervisor #${d.supervisorId}` : null);

    return (
        <div className="space-y-6">
            {/* Header: botón volver (en detalle) + gestión (admin) */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {d.supervisorId ? (
                    <button
                        type="button"
                        onClick={() => { d.setSupervisorId(null); d.setSelectedMeta(null); }}
                        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-primary"
                    >
                        <ArrowLeftIcon className="size-4" />
                        Todos los supervisores
                    </button>
                ) : <span />}
                {adminHeader}
            </div>

            {/* Nombre del supervisor en vista de detalle */}
            {selectedNombre && (
                <h2 className="text-base font-semibold text-gray-800">{selectedNombre}</h2>
            )}

            {/* Stats header — global cuando no hay supervisor seleccionado */}
            <PdrStatsHeader resumen={d.resumen} />

            {d.supervisorId ? (
                <>
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-700">Metas Pendientes</h3>
                        <PdrPendientesList
                            pendientes={d.pendientes}
                            onSelect={(meta) => d.setSelectedMeta(meta)}
                            loading={false}
                        />
                    </div>

                    {/* Execution form (when a meta is selected) */}
                    {d.selectedMeta && d.activeSubTab !== 'hallazgos' && (
                        <PdrEjecucionForm
                            meta={d.selectedMeta}
                            tipoEjecucion={d.activeSubTab}
                            onSubmit={d.registrarEjecucion}
                            onCancel={() => d.setSelectedMeta(null)}
                            saving={d.saving}
                        />
                    )}
                </>
            ) : (
                /* Vista general: grid de supervisores con su progreso */
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">Supervisores</h3>
                    <PdrSupervisoresResumen
                        supervisores={d.supervisoresResumen}
                        onSelect={(id) => d.setSupervisorId(id)}
                    />
                </div>
            )}

            {/* Sub-tabs — dinámicos desde metasConfig cuando hay supervisor; HALLAZGOS siempre al final */}
            <div className="border-b border-gray-200">
                <div className="-mb-px flex gap-1 overflow-x-auto" role="tablist">
                    {subTabs.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            role="tab"
                            aria-selected={d.activeSubTab === key}
                            onClick={() => {
                                d.setActiveSubTab(key);
                                if (key !== 'hallazgos') d.setSelectedMeta(null);
                            }}
                            className={`flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                d.activeSubTab === key
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            <Icon className="size-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Hallazgos tab content — default en vista general (sin supervisor) */}
            {(d.activeSubTab === 'hallazgos' || !d.supervisorId) && (
                <PdrHallazgosTab
                    hallazgos={d.hallazgos}
                    onUpdateEstado={d.updateHallazgo}
                    canManage={d.permissions.manageHallazgos}
                />
            )}

            {supervisoresModal}
            {metasConfigModal}
            <Toast show={d.toast.show} message={d.toast.message} type={d.toast.type} />
        </div>
    );
}
