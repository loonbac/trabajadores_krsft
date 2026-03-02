/**
 * TrabajadoresIndex – Orchestrator (HyperUI layout).
 * All state lives in useTrabajadoresData hook; UI in modular components.
 */
import {
    UserGroupIcon, CheckCircleIcon, XCircleIcon,
    PlusIcon, ListBulletIcon, ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';

import { useTrabajadoresData } from './hooks/useTrabajadoresData';

/* UI kit */
import StatsCard   from './Components/ui/StatsCard';
import SearchInput from './Components/ui/SearchInput';
import Select      from './Components/ui/Select';
import Button      from './Components/ui/Button';
import Toast       from './Components/ui/Toast';

/* Feature components */
import PageHeader          from './Components/PageHeader';
import TrabajadoresTable   from './Components/TrabajadoresTable';
import ImportTab           from './Components/ImportTab';
import WorkerFormModal     from './Components/modals/WorkerFormModal';
import DeleteConfirmModal  from './Components/modals/DeleteConfirmModal';

export default function TrabajadoresIndex() {
    const d = useTrabajadoresData();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="w-full px-12 py-4 space-y-6">

                {/* ── Header ── */}
                <PageHeader
                    title="GESTIÓN DE TRABAJADORES"
                    subtitle="Administre el personal y la información laboral"
                    icon={<UserGroupIcon className="size-7" />}
                >
                    <Button variant="primary" onClick={d.openCreateModal} className="gap-2">
                        <PlusIcon className="size-5" />
                        Nuevo Trabajador
                    </Button>
                </PageHeader>

                {/* ── Stats ── */}
                <div className="grid gap-4 sm:grid-cols-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    <div className="min-w-0">
                        <StatsCard title="Total Personal"    value={d.stats.total}     icon={<UserGroupIcon  className="size-8" />} iconBg="bg-blue-100"    iconColor="text-blue-600"    />
                    </div>
                    <div className="min-w-0">
                        <StatsCard title="Personal Activo"   value={d.stats.activos}   icon={<CheckCircleIcon className="size-8" />} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                        <StatsCard title="Inactivos / Cesados" value={d.stats.inactivos} icon={<XCircleIcon className="size-8" />} iconBg="bg-red-100"     iconColor="text-red-600"     />
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="border-b border-gray-200">
                    <div className="-mb-px flex gap-1" role="tablist">
                        <button
                            role="tab" aria-selected={d.activeTab === 'list'}
                            onClick={() => d.setActiveTab('list')}
                            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                d.activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <ListBulletIcon className="size-4" /> Listado
                        </button>
                        <button
                            role="tab" aria-selected={d.activeTab === 'import'}
                            onClick={() => d.setActiveTab('import')}
                            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                d.activeTab === 'import' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <ArrowUpTrayIcon className="size-4" /> Importar Excel
                        </button>
                    </div>
                </div>

                {/* ── List tab ── */}
                {d.activeTab === 'list' && (
                    <>
                        {/* Filters */}
                        <div className="rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <SearchInput
                                    value={d.searchQuery}
                                    onChange={d.setSearchQuery}
                                    placeholder="Buscar por DNI o Nombre..."
                                    className="flex-1"
                                />
                                <Select
                                    value={d.filterCargo}
                                    onChange={(e) => d.setFilterCargo(e.target.value)}
                                    options={[
                                        { value: '', label: 'Todos los cargos' },
                                        ...d.uniqueCargos.map(c => ({ value: c, label: c })),
                                    ]}
                                    placeholder=""
                                    className="sm:w-52"
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <TrabajadoresTable
                            trabajadores={d.filteredTrabajadores}
                            loading={d.loading}
                            onEdit={d.editTrabajador}
                            onDelete={d.confirmDelete}
                            openCreateModal={d.openCreateModal}
                        />
                    </>
                )}

                {/* ── Import tab ── */}
                {d.activeTab === 'import' && (
                    <ImportTab
                        selectedFile={d.selectedFile}       setSelectedFile={d.setSelectedFile}
                        dragging={d.dragging}               importing={d.importing}
                        downloadingTemplate={d.downloadingTemplate}
                        importResults={d.importResults}     fileInputRef={d.fileInputRef}
                        downloadTemplate={d.downloadTemplate}
                        handleFileSelect={d.handleFileSelect}
                        handleDrop={d.handleDrop}           importExcel={d.importExcel}
                        handleDragOver={d.handleDragOver}   handleDragLeave={d.handleDragLeave}
                    />
                )}
            </div>

            {/* ── Modals ── */}
            <WorkerFormModal
                show={d.showModal}    onClose={d.closeModal}
                editingId={d.editingId} form={d.form}
                onChange={d.handleFormChange} onSubmit={d.saveTrabajador}
                saving={d.saving}
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
