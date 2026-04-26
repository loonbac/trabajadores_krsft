/**
 * ImportTab – 3-step Excel import section (HyperUI patterns, primary accent).
 */
import { ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';

export default function ImportTab({
    selectedFile, setSelectedFile, dragging, importing,
    downloadingTemplate, importResults, fileInputRef,
    downloadTemplate, handleFileSelect, handleDrop, importExcel,
    handleDragOver, handleDragLeave,
    canImport, canExport,
}) {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="rounded-lg border-2 border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 text-center">Importación Masiva de Trabajadores</h2>
                <p className="mt-1 text-sm text-gray-500 text-center mb-8">Sigue estos 3 pasos para importar múltiples trabajadores a la vez</p>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Step 1: Download Template */}
                    <div className="flex flex-col gap-4 rounded-lg border-2 border-gray-300 bg-gray-50 p-6 transition-colors hover:border-primary-400 shadow-sm">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white font-bold text-xl self-start shadow-sm">1</span>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-gray-900 mb-2">Descargar Plantilla</h3>
                            <p className="text-sm text-gray-500 mb-4">Descarga la plantilla Excel con el formato requerido</p>
                            <Button variant="success" onClick={downloadTemplate} loading={downloadingTemplate} disabled={!canExport} className="w-full gap-2">
                                <ArrowDownTrayIcon className="size-5" />
                                {downloadingTemplate ? 'Descargando...' : 'Descargar Plantilla'}
                            </Button>
                        </div>
                    </div>

                    {/* Step 2: Fill Data */}
                    <div className="flex flex-col gap-4 rounded-lg border-2 border-gray-300 bg-gray-50 p-6 transition-colors hover:border-primary-400 shadow-sm">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white font-bold text-xl self-start shadow-sm">2</span>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-gray-900 mb-2">Completar Datos</h3>
                            <p className="text-sm text-gray-500 mb-3">Rellena la plantilla con los datos de los trabajadores (CSV)</p>
                            <ul className="space-y-1.5">
                                <li className="text-xs text-gray-500">• Guardar como CSV (Delimitado por comas)</li>
                                <li className="text-xs text-gray-500">• DNI (8 dígitos), Nombre y Estado obligatorios</li>
                                <li className="text-xs text-gray-500">• Estado debe ser: Activo o Cesado</li>
                            </ul>
                        </div>
                    </div>

                    {/* Step 3: Upload */}
                    <div className="flex flex-col gap-4 rounded-lg border-2 border-gray-300 bg-gray-50 p-6 transition-colors hover:border-primary-400 shadow-sm">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white font-bold text-xl self-start shadow-sm">3</span>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-gray-900 mb-2">Subir Archivo</h3>
                            <p className="text-sm text-gray-500 mb-3">Selecciona el archivo CSV completado</p>

                            {/* Drag/drop zone */}
                            <div
                                className={`rounded border-2 border-dashed p-6 text-center transition-colors ${
                                    dragging ? 'border-primary bg-primary-50' : 'border-gray-300 bg-white hover:border-gray-400'
                                }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={canImport ? handleDrop : undefined}
                            >
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="sr-only" />
                                {selectedFile ? (
                                    <div className="flex items-center gap-3 text-left">
                                        <DocumentIcon className="size-10 shrink-0 text-primary" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{selectedFile.name}</p>
                                            <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                        <button onClick={() => setSelectedFile(null)} className="shrink-0 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">Cambiar</button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => canImport && fileInputRef.current?.click()} className="flex flex-col items-center gap-2 w-full cursor-pointer focus:outline-none" disabled={!canImport}>
                                        <ArrowUpTrayIcon className="size-10 text-primary mx-auto" />
                                        <p className="text-sm text-gray-500">Arrastra el archivo aquí o haz clic para seleccionar</p>
                                        <span className="mt-1 inline-block rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">Formatos: .xlsx, .xls</span>
                                    </button>
                                )}
                            </div>

                            {selectedFile && canImport && (
                                <Button variant="success" onClick={importExcel} loading={importing} className="mt-4 w-full gap-2">
                                    <ArrowUpTrayIcon className="size-5" />
                                    {importing ? 'Importando...' : 'Comenzar Importación'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Import Results */}
                {importResults && (
                    <div className="mt-8 rounded-lg border-2 border-gray-300 bg-gray-50 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Resultados de Importación</h3>
                        <p className="text-sm text-gray-700">
                            <span className="font-bold text-emerald-600">{importResults.imported}</span> de{' '}
                            <span className="font-bold text-gray-900">{importResults.total}</span> registros importados
                        </p>
                        {importResults.errors?.length > 0 && (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                                <h4 className="text-sm font-bold text-red-700 mb-3">Errores encontrados:</h4>
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {importResults.errors.map((error, i) => (
                                        <div key={i} className="flex flex-wrap gap-2 rounded border-l-4 border-red-500 bg-white p-2.5 text-sm">
                                            <span className="font-mono text-xs font-semibold text-gray-500">Fila {error.row}</span>
                                            {error.dni && <span className="font-mono text-xs text-gray-400">(DNI: {error.dni})</span>}
                                            <span className="text-red-600">{error.error}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
