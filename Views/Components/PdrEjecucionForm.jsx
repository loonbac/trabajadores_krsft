import { useState, useRef } from 'react';
import { PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Select from './ui/Select';

const ESTADO_OPTIONS = [
    { value: 'conforme', label: 'Conforme' },
    { value: 'observado', label: 'Observado' },
    { value: 'critico', label: 'Critico' },
];

/**
 * PdrEjecucionForm — Form for recording a PDR meta execution.
 */
export default function PdrEjecucionForm({ meta, tipoEjecucion, onSubmit, onCancel, saving }) {
    const [estado, setEstado] = useState('conforme');
    const [area, setArea] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [files, setFiles] = useState([]);
    const fileRef = useRef(null);

    const config = meta?.meta_config;

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files || []);
        setFiles(prev => [...prev, ...selected].slice(0, 5));
    };

    const removeFile = (idx) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('meta_asignada_id', meta.id);
        fd.append('tipo_ejecucion', tipoEjecucion);
        fd.append('estado', estado);
        if (area) fd.append('area', area);
        if (observaciones) fd.append('observaciones', observaciones);
        files.forEach(f => fd.append('files[]', f));

        const result = await onSubmit(fd);
        if (result) {
            setEstado('conforme');
            setArea('');
            setObservaciones('');
            setFiles([]);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">
                Registrar ejecucion — {config?.nombre ?? 'Meta'}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
                Tipo: {tipoEjecucion} | Progreso: {meta?.progreso_actual ?? 0}/{config?.cantidad_requerida ?? 0}
            </p>

            <div className="mt-4 space-y-3">
                <Select
                    label="Estado"
                    name="estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    options={ESTADO_OPTIONS}
                    placeholder=""
                    required
                />

                <div>
                    <label className="block">
                        <span className="text-sm font-medium text-gray-700">Area</span>
                        <input
                            type="text"
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            placeholder="Area o sector..."
                            maxLength={200}
                            className="mt-0.5 w-full rounded border border-gray-300 text-sm transition-colors focus:border-primary focus:ring-primary"
                        />
                    </label>
                </div>

                <div>
                    <label className="block">
                        <span className="text-sm font-medium text-gray-700">Observaciones</span>
                        <textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="Observaciones..."
                            className="mt-0.5 w-full rounded border border-gray-300 text-sm transition-colors focus:border-primary focus:ring-primary"
                        />
                    </label>
                </div>

                <div>
                    <span className="block text-sm font-medium text-gray-700">Archivos (max 5)</span>
                    <div className="mt-1 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            <PaperClipIcon className="size-4" /> Adjuntar
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            multiple
                            accept=".jpeg,.jpg,.png,.pdf,.xlsx"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <span className="text-xs text-gray-400">jpeg, png, pdf, xlsx (max 10MB c/u)</span>
                    </div>
                    {files.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {files.map((f, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                    <PaperClipIcon className="size-3.5 text-gray-400" />
                                    <span className="truncate">{f.name}</span>
                                    <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                                        <XMarkIcon className="size-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
                <Button type="submit" variant="primary" loading={saving}>
                    Registrar
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancelar
                </Button>
            </div>
        </form>
    );
}
