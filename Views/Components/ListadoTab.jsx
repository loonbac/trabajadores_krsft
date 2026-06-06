/**
 * ListadoTab — listado de trabajadores con la "fórmula" de la tabla SSOMA:
 * paginación (10/página), modo foco (ampliar al centro) y animaciones, para
 * mostrar más en menos espacio.
 *
 * Orquestador delgado: el estado de datos vive en useTrabajadoresData (llega por
 * props); aquí solo viven la paginación local y el modo foco (useFocusTable).
 */
import { useMemo, useState, useEffect } from 'react';
import {
    ArrowsPointingInIcon, ArrowsPointingOutIcon,
    ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';

import SearchInput from './ui/SearchInput';
import Select      from './ui/Select';
import TrabajadoresTable from './TrabajadoresTable';
import { useFocusTable } from '../hooks/useFocusTable';

const PAGE_SIZE = 10;

export default function ListadoTab({
    trabajadores, loading,
    searchQuery, setSearchQuery, filterCargo, setFilterCargo, uniqueCargos,
    onEdit, onDelete, openCreateModal,
    canCreate, canEdit, canDelete,
    focusBlocked = false,
}) {
    // ── Paginación (10/página, cliente) ──────────────────────────────────────
    const [page, setPage] = useState(0);
    const pageCount = Math.max(1, Math.ceil(trabajadores.length / PAGE_SIZE));
    const pageWorkers = useMemo(
        () => trabajadores.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
        [trabajadores, page],
    );
    // Volver a la primera página al cambiar búsqueda/filtros.
    useEffect(() => { setPage(0); }, [searchQuery, filterCargo]);
    // Clamp si la lista se achica (filtro/borrado) y la página actual ya no existe.
    useEffect(() => { setPage((p) => Math.min(p, pageCount - 1)); }, [pageCount]);

    // ── Modo foco (no se entra si carga, no hay filas o hay un modal abierto) ─
    const focusEnabled = !loading && trabajadores.length > 0 && !focusBlocked;
    const {
        focused, focusRender, focusEnter, goFocus,
        sectionRef, flipRef, baseScrollRef, onAreaWheel,
    } = useFocusTable(focusEnabled);

    return (
        <div ref={sectionRef} className="krsft-fade-in space-y-6">
            {focusRender && (
                <div
                    className="fixed inset-0 z-[60] bg-white/50 backdrop-blur-sm transition-opacity duration-300"
                    style={{ opacity: focusEnter ? 1 : 0 }}
                    onClick={() => goFocus(false)}
                />
            )}

            <div ref={flipRef} className="space-y-6 will-change-transform">
                {/* Filtros + botón Ampliar (modo foco) */}
                <div className="krsft-fade-up rounded-lg border-2 border-gray-200 bg-white p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Buscar por DNI o Nombre..."
                            className="flex-1"
                        />
                        <Select
                            value={filterCargo}
                            onChange={(e) => setFilterCargo(e.target.value)}
                            options={[
                                { value: '', label: 'Todos los cargos' },
                                ...uniqueCargos.map((c) => ({ value: c, label: c })),
                            ]}
                            placeholder=""
                            className="sm:w-52"
                        />
                        <button
                            type="button"
                            onClick={() => goFocus(!focused)}
                            title={focused ? 'Salir de la vista ampliada' : 'Ampliar tabla (modo foco)'}
                            className="krsft-hover-pop krsft-press inline-flex items-center justify-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            {focused
                                ? <><ArrowsPointingInIcon className="size-4" /> Reducir</>
                                : <><ArrowsPointingOutIcon className="size-4" /> Ampliar</>}
                        </button>
                    </div>
                </div>

                {/* Tabla paginada — onAreaWheel sale del foco al subir en el tope */}
                <div ref={baseScrollRef} onWheel={onAreaWheel}>
                    <TrabajadoresTable
                        trabajadores={pageWorkers}
                        loading={loading}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        openCreateModal={openCreateModal}
                        canCreate={canCreate}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        smoothWheel={false}
                    />
                </div>

                {/* Controles de paginación (10/página). */}
                {trabajadores.length > 0 && (
                    <div className="krsft-fade-up flex flex-col items-center justify-between gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 shadow-sm sm:flex-row">
                        <p className="text-xs text-gray-500">
                            Mostrando <span className="font-semibold text-gray-700">{page * PAGE_SIZE + 1}</span>
                            –<span className="font-semibold text-gray-700">{Math.min((page + 1) * PAGE_SIZE, trabajadores.length)}</span>
                            {' '}de <span className="font-semibold text-gray-700">{trabajadores.length}</span> trabajadores
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="krsft-press inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeftIcon className="size-4" /> Anterior
                            </button>
                            <span className="px-2 text-sm font-medium text-gray-600">Página {page + 1} de {pageCount}</span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                                disabled={page >= pageCount - 1}
                                className="krsft-press inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Siguiente <ChevronRightIcon className="size-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
