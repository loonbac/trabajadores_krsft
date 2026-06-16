import { useEffect, useMemo, useState } from 'react';
import {
    FlagIcon,
    PencilSquareIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Badge from './ui/Badge';

const EMPTY_FORM = {
    nombre: '',
    tipo_frecuencia: 'diaria',
    cantidad_requerida: 1,
    es_obligatoria: true,
    orden: 0,
};

const FREQUENCY_OPTIONS = [
    { value: 'diaria', label: 'Diaria' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'mensual', label: 'Mensual' },
];

export default function PdrMetasConfigModal({
    open,
    onClose,
    metasConfig,
    onCreate,
    onUpdate,
    onDeactivate,
    saving,
}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        if (open) {
            setForm(EMPTY_FORM);
            setEditingId(null);
        }
    }, [open]);

    const metas = useMemo(() => Array.isArray(metasConfig) ? metasConfig : [], [metasConfig]);
    const activeMetas = metas.filter((meta) => meta.is_active);
    const inactiveMetas = metas.filter((meta) => !meta.is_active);

    const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

    const startCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
    };

    const startEdit = (meta) => {
        setEditingId(meta.id);
        setForm({
            nombre: meta.nombre || '',
            tipo_frecuencia: meta.tipo_frecuencia || 'diaria',
            cantidad_requerida: meta.cantidad_requerida ?? 1,
            es_obligatoria: !!meta.es_obligatoria,
            orden: meta.orden ?? 0,
        });
    };

    const handleClose = () => {
        if (saving) return;
        setEditingId(null);
        setForm(EMPTY_FORM);
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            nombre: form.nombre.trim(),
            tipo_frecuencia: form.tipo_frecuencia,
            cantidad_requerida: form.cantidad_requerida,
            es_obligatoria: form.es_obligatoria,
            orden: form.orden,
        };

        if (!payload.nombre) return;

        const result = editingId
            ? await onUpdate(editingId, payload)
            : await onCreate(payload);

        if (result?.ok) {
            setEditingId(null);
            setForm(EMPTY_FORM);
        }
    };

    const handleDeactivate = async (meta) => {
        if (!window.confirm(`¿Desactivar la meta "${meta.nombre}"?`)) return;
        const result = await onDeactivate(meta.id);
        if (result?.ok && editingId === meta.id) {
            setEditingId(null);
            setForm(EMPTY_FORM);
        }
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Gestionar Metas PDR"
            titleIcon={<FlagIcon className="size-5 text-primary" />}
            size="xl"
            footer={(
                <>
                    <div className="mr-auto text-xs text-gray-500">
                        {metas.length} meta{metas.length === 1 ? '' : 's'} en total
                    </div>
                    <Button variant="secondary" onClick={handleClose} disabled={saving}>
                        Cerrar
                    </Button>
                </>
            )}
        >
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary-50 px-4 py-3">
                    <div>
                        <p className="text-sm font-medium text-primary-700">Metas configurables del PDR</p>
                        <p className="text-xs text-primary-600">
                            Desde aquí puede crear, editar y desactivar metas sin salir del panel PDR.
                        </p>
                    </div>
                    <Button variant="primary" size="sm" onClick={startCreate} disabled={saving}>
                        <PlusIcon className="mr-1.5 size-4" />
                        Nueva meta
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                    <div className="space-y-4">
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-800">Metas activas</h3>
                                <Badge variant="primary">{activeMetas.length}</Badge>
                            </div>

                            {activeMetas.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                                    No hay metas activas configuradas.
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                                    <ul className="divide-y divide-gray-100">
                                        {activeMetas.map((meta) => {
                                            const isEditing = editingId === meta.id;
                                            return (
                                                <li key={meta.id} className={`flex items-start justify-between gap-4 px-4 py-3 ${isEditing ? 'bg-primary-50/60' : ''}`}>
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="truncate text-sm font-medium text-gray-900">{meta.nombre}</p>
                                                            <Badge variant="primary">{meta.tipo_frecuencia}</Badge>
                                                            {meta.es_obligatoria ? <Badge variant="amber">Obligatoria</Badge> : <Badge variant="gray">Opcional</Badge>}
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            {meta.cantidad_requerida} requeridas · orden {meta.orden ?? 0}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <Button variant="secondary" size="sm" onClick={() => startEdit(meta)} disabled={saving}>
                                                            <PencilSquareIcon className="mr-1.5 size-4" />
                                                            Editar
                                                        </Button>
                                                        <Button variant="danger" size="sm" onClick={() => handleDeactivate(meta)} disabled={saving}>
                                                            <TrashIcon className="mr-1.5 size-4" />
                                                            Desactivar
                                                        </Button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </section>

                        {inactiveMetas.length > 0 && (
                            <section className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-800">Metas inactivas</h3>
                                    <Badge variant="gray">{inactiveMetas.length}</Badge>
                                </div>
                                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                                    <ul className="divide-y divide-gray-100">
                                        {inactiveMetas.map((meta) => (
                                            <li key={meta.id} className="flex items-start justify-between gap-4 px-4 py-3 opacity-80">
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="truncate text-sm font-medium text-gray-700">{meta.nombre}</p>
                                                        <Badge variant="gray">Inactiva</Badge>
                                                        <Badge variant="primary">{meta.tipo_frecuencia}</Badge>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        {meta.cantidad_requerida} requeridas · orden {meta.orden ?? 0}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </section>
                        )}
                    </div>

                    <section className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800">
                                    {editingId ? 'Editar meta' : 'Nueva meta'}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    El slug se genera automáticamente desde el nombre.
                                </p>
                            </div>
                            {editingId && (
                                <Button variant="ghost" size="sm" onClick={startCreate} disabled={saving}>
                                    Cancelar edición
                                </Button>
                            )}
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <Input
                                label="Nombre"
                                value={form.nombre}
                                onChange={(e) => setField('nombre', e.target.value)}
                                placeholder="Ej. Inspecciones diarias"
                                required
                            />

                            <Select
                                label="Frecuencia"
                                value={form.tipo_frecuencia}
                                onChange={(e) => setField('tipo_frecuencia', e.target.value)}
                                options={FREQUENCY_OPTIONS}
                                placeholder=""
                                required
                            />

                            <Input
                                label="Cantidad requerida"
                                type="number"
                                min="1"
                                value={form.cantidad_requerida}
                                onChange={(e) => setField('cantidad_requerida', e.target.value)}
                                required
                            />

                            <Input
                                label="Orden"
                                type="number"
                                min="0"
                                value={form.orden}
                                onChange={(e) => setField('orden', e.target.value)}
                                helper="Define el orden visual de la meta en el panel."
                            />

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={form.es_obligatoria}
                                    onChange={(e) => setField('es_obligatoria', e.target.checked)}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                Meta obligatoria
                            </label>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="secondary" type="button" onClick={handleClose} disabled={saving}>
                                    Cerrar
                                </Button>
                                <Button variant="primary" type="submit" loading={saving}>
                                    {editingId ? 'Guardar cambios' : 'Crear meta'}
                                </Button>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </Modal>
    );
}
