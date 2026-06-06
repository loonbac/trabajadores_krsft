/**
 * TrabajadoresIndex – Orchestrator (HyperUI layout).
 * All state lives in useTrabajadoresData hook; UI in modular components.
 */
import { useEffect } from 'react';
import {
    PlusIcon, ListBulletIcon, ArrowUpTrayIcon, BuildingOffice2Icon, CalendarDaysIcon,
    ClipboardDocumentListIcon, ShieldCheckIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';

import { useTrabajadoresData } from './hooks/useTrabajadoresData';

/* UI kit */
import Button      from './Components/ui/Button';
import Toast       from './Components/ui/Toast';

/* Feature components */
import PageHeader               from './Components/PageHeader';
import TopStats                 from './Components/TopStats';
import ListadoTab               from './Components/ListadoTab';
import ImportTab                from './Components/ImportTab';
import RrhhTab                  from './Components/RrhhTab';
import VacationAdminTab         from './Components/VacationAdminTab';
import PlanillaMensualManager   from './Components/PlanillaMensualManager';
import SsomaTab                 from './Components/SsomaTab';
import PdrMetasTab              from './Components/PdrMetasTab';
import WorkerFormModal          from './Components/modals/WorkerFormModal';
import DeleteConfirmModal       from './Components/modals/DeleteConfirmModal';

export default function TrabajadoresIndex({ auth: authFromProps = null }) {
    const auth = authFromProps ?? null;
    const d = useTrabajadoresData(auth);
    const showImportTab = d.permissions.import || d.permissions.export;

    useEffect(() => {
        document.documentElement.classList.add('hide-page-scrollbar');
        document.body.classList.add('hide-page-scrollbar');
        return () => {
            document.documentElement.classList.remove('hide-page-scrollbar');
            document.body.classList.remove('hide-page-scrollbar');
        };
    }, []);

    return (
        <div className="min-h-screen overflow-x-hidden bg-gray-50">
            <div className="w-full px-12 py-4 space-y-6">

                {/* ── Header ── */}
                <PageHeader
                    title="RECURSOS HUMANOS"
                    subtitle="Base operativa de personal, cumplimiento y planilla"
                    icon={<BuildingOffice2Icon className="size-7" />}
                >
                    {(d.activeTab === 'ssoma' ? d.permissions.view_ssoma : d.permissions.create) && (
                        <Button
                            variant="primary"
                            onClick={() => d.openCreateModal(d.activeTab === 'ssoma' ? 'ssoma' : 'general')}
                            className="gap-2"
                        >
                            <PlusIcon className="size-5" />
                            Nuevo Trabajador
                        </Button>
                    )}
                </PageHeader>

                {/* ── Stats (contextual: SSOMA reemplaza los cards genéricos) ── */}
                <TopStats activeTab={d.activeTab} stats={d.stats} />

                {/* ── Tabs ── */}
                <div className="krsft-fade-up border-b border-gray-200" style={{ '--krsft-delay': '120ms' }}>
                    <div className="-mb-px flex gap-1" role="tablist">
                        {d.permissions.view_listado && (
                            <button
                                role="tab" aria-selected={d.activeTab === 'list'}
                                onClick={() => d.setActiveTab('list')}
                                className={`flex min-h-10 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                    d.activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <ListBulletIcon className="size-4" /> Listado
                            </button>
                        )}
                        {d.permissions.view_rrhh && (
                            <button
                                role="tab" aria-selected={d.activeTab === 'rrhh'}
                                onClick={() => d.setActiveTab('rrhh')}
                                className={`flex min-h-10 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                    d.activeTab === 'rrhh' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <BuildingOffice2Icon className="size-4" /> Centro RRHH
                            </button>
                        )}
                        {d.permissions.view_vacaciones && (
                            <button
                                role="tab" aria-selected={d.activeTab === 'vacaciones'}
                                onClick={() => d.setActiveTab('vacaciones')}
                                className={`flex min-h-10 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                    d.activeTab === 'vacaciones' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <CalendarDaysIcon className="size-4" /> Vacaciones
                            </button>
                        )}
                        {d.permissions.view_planillas && (
                            <button
                                role="tab" aria-selected={d.activeTab === 'planillas'}
                                onClick={() => d.setActiveTab('planillas')}
                                className={`flex min-h-10 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                    d.activeTab === 'planillas' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <ClipboardDocumentListIcon className="size-4" /> Planillas
                            </button>
                        )}
                        {d.permissions.view_ssoma && (
                            <button
                                role="tab" aria-selected={d.activeTab === 'ssoma'}
                                onClick={() => d.setActiveTab('ssoma')}
                                className={`flex min-h-10 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                    d.activeTab === 'ssoma' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <ShieldCheckIcon className="size-4" /> SSOMA
                            </button>
                        )}
                        {d.permissions.view_pdr && (
                            <button
                                role="tab" aria-selected={d.activeTab === 'pdr'}
                                onClick={() => d.setActiveTab('pdr')}
                                className={`flex min-h-10 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                    d.activeTab === 'pdr' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <ChartBarIcon className="size-4" /> Metas PDR
                            </button>
                        )}
                        {showImportTab && (
                            <button
                                role="tab" aria-selected={d.activeTab === 'import'}
                                onClick={() => d.setActiveTab('import')}
                                className={`flex min-h-10 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                    d.activeTab === 'import' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <ArrowUpTrayIcon className="size-4" /> Importar Excel
                            </button>
                        )}
                    </div>
                </div>

                {/* ── List tab ── */}
                {d.activeTab === 'list' && (
                    <ListadoTab
                        trabajadores={d.filteredTrabajadores}
                        loading={d.loading}
                        searchQuery={d.searchQuery}
                        setSearchQuery={d.setSearchQuery}
                        filterCargo={d.filterCargo}
                        setFilterCargo={d.setFilterCargo}
                        uniqueCargos={d.uniqueCargos}
                        onEdit={d.editTrabajador}
                        onDelete={d.confirmDelete}
                        openCreateModal={d.openCreateModal}
                        canCreate={d.permissions.create}
                        canEdit={d.permissions.update}
                        canDelete={d.permissions.delete}
                        focusBlocked={d.showModal || d.showDeleteModal}
                    />
                )}

                {/* ── RRHH tab ── */}
                {d.activeTab === 'rrhh' && (
                    <div className="krsft-fade-in">
                        <RrhhTab
                            rrhhOverview={d.rrhhOverview}
                            payrollConcepts={d.payrollConcepts}
                            payrollFormulaModel={d.payrollFormulaModel}
                            payrollExcelSnapshot={d.payrollExcelSnapshot}
                            legalParameters={d.legalParameters}
                            plamePreview={d.plamePreview}
                        />
                    </div>
                )}

                {/* ── Vacation admin tab ── */}
                {d.activeTab === 'vacaciones' && (
                    <div className="krsft-fade-in">
                        <VacationAdminTab
                            vacationSummary={d.vacationSummary}
                            vacationSearch={d.vacationSearch}
                            setVacationSearch={d.setVacationSearch}
                            filteredVacationBalances={d.filteredVacationBalances}
                            vacationForm={d.vacationForm}
                            setVacationFormField={d.setVacationFormField}
                            createVacationRequest={d.createVacationRequest}
                            vacationRequests={d.vacationRequests}
                            updateVacationRequestStatus={d.updateVacationRequestStatus}
                        />
                    </div>
                )}

                {/* ── Planillas tab ── */}
                {d.activeTab === 'planillas' && (
                    <div className="krsft-fade-in">
                        <PlanillaMensualManager />
                    </div>
                )}

                {/* ── SSOMA tab ── */}
                {d.activeTab === 'ssoma' && (
                    <SsomaTab
                        onEdit={(trabajador) => d.editTrabajador(trabajador, 'ssoma')}
                    />
                )}

                {/* ── PDR Metas tab ── */}
                {d.activeTab === 'pdr' && (
                    <div className="krsft-fade-in">
                        <PdrMetasTab />
                    </div>
                )}

                {/* ── Import tab ── */}
                {showImportTab && d.activeTab === 'import' && (
                    <div className="krsft-fade-in">
                    <ImportTab
                        selectedFile={d.selectedFile}       setSelectedFile={d.setSelectedFile}
                        dragging={d.dragging}               importing={d.importing}
                        downloadingTemplate={d.downloadingTemplate}
                        importResults={d.importResults}     fileInputRef={d.fileInputRef}
                        downloadTemplate={d.downloadTemplate}
                        handleFileSelect={d.handleFileSelect}
                        handleDrop={d.handleDrop}           importExcel={d.importExcel}
                        handleDragOver={d.handleDragOver}   handleDragLeave={d.handleDragLeave}
                        canImport={d.permissions.import}
                        canExport={d.permissions.export}
                    />
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            <WorkerFormModal
                show={d.showModal}    onClose={d.closeModal}
                editingId={d.editingId} form={d.form}
                onChange={d.handleFormChange}
                submitWorker={d.submitWorker}
                refreshWorkers={d.refreshWorkers}
                showToast={d.showToast}
                modalContext={d.modalContext}
            />
            <DeleteConfirmModal
                show={d.showDeleteModal}   onClose={d.closeDeleteModal}
                onConfirm={d.handleDeleteConfirmed}
                deleting={d.deleting}      itemToDelete={d.itemToDelete}
            />

            {/* ── Toast ── */}
            <Toast show={d.toast.show} message={d.toast.message} type={d.toast.type} />
        </div>
    );
}
