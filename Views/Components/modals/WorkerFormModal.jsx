/**
 * WorkerFormModal – Create/Edit form using the module's Modal + Input + Select UI kit.
 */
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import {
    GENERO_OPTIONS, ESTADO_CIVIL_OPTIONS,
    TIPO_CONTRATO_OPTIONS, ESTADO_OPTIONS, PENSIONES_OPTIONS,
} from '../../utils';

function SectionDivider({ label }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-gray-500">{label}</span>
            <span className="h-px flex-1 bg-gray-200" />
        </div>
    );
}

export default function WorkerFormModal({ show, onClose, editingId, form, onChange, onSubmit, saving }) {
    return (
        <Modal
            open={show}
            onClose={onClose}
            title={editingId ? 'Editar Trabajador' : 'Nuevo Trabajador'}
            size="xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="worker-form" loading={saving}>
                        {saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Registrar')}
                    </Button>
                </>
            }
        >
            <p className="text-sm text-gray-500 mb-4">Complete los campos requeridos (*) para registrar al trabajador.</p>
            <form onSubmit={onSubmit} id="worker-form">
                {/* ── Datos Personales ── */}
                <SectionDivider label="Datos Personales" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                    <Input label="DNI / CE" name="dni" value={form.dni} onChange={onChange} required maxLength="12" placeholder="12345678" />
                    <Input label="Nombres" name="nombres" value={form.nombres} onChange={onChange} required placeholder="Juan Carlos" />
                    <Input label="Apellido Paterno" name="apellido_paterno" value={form.apellido_paterno} onChange={onChange} required placeholder="García" />
                    <Input label="Apellido Materno" name="apellido_materno" value={form.apellido_materno || ''} onChange={onChange} placeholder="López" />
                    <Input label="Fecha de Nacimiento" name="fecha_nacimiento" value={form.fecha_nacimiento || ''} onChange={onChange} type="date" />
                    <Select label="Género" name="genero" value={form.genero} onChange={onChange} options={GENERO_OPTIONS} placeholder="" />
                    <Select label="Estado Civil" name="estado_civil" value={form.estado_civil} onChange={onChange} options={ESTADO_CIVIL_OPTIONS} placeholder="" />
                    <Input label="Teléfono" name="telefono" value={form.telefono || ''} onChange={onChange} type="tel" placeholder="999888777" />
                    <Input label="Email" name="email" value={form.email || ''} onChange={onChange} type="email" placeholder="correo@empresa.com" className="sm:col-span-2 lg:col-span-1" />
                    <div className="sm:col-span-2 lg:col-span-3">
                        <Input label="Dirección" name="direccion" value={form.direccion || ''} onChange={onChange} placeholder="Av. Principal 123" />
                    </div>
                </div>

                {/* ── Datos Laborales ── */}
                <SectionDivider label="Datos Laborales" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                    <Input label="Cargo" name="cargo" value={form.cargo || ''} onChange={onChange} required placeholder="Analista" />
                    <Input label="Fecha de Ingreso" name="fecha_ingreso" value={form.fecha_ingreso || ''} onChange={onChange} type="date" required />
                    <Select label="Tipo de Contrato" name="tipo_contrato" value={form.tipo_contrato} onChange={onChange} options={TIPO_CONTRATO_OPTIONS} placeholder="" />
                    <Select label="Estado" name="estado" value={form.estado} onChange={onChange} options={ESTADO_OPTIONS} placeholder="" />
                    <Input label="Sueldo Básico" name="sueldo_basico" value={form.sueldo_basico || ''} onChange={onChange} type="number" step="0.01" placeholder="2500.00" />
                    <Select label="Sistema de Pensiones" name="sistema_pensiones" value={form.sistema_pensiones || ''} onChange={onChange} options={PENSIONES_OPTIONS} />
                </div>

                {/* ── Contacto de Emergencia ── */}
                <SectionDivider label="Contacto de Emergencia" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
                    <Input label="Nombre" name="contacto_emergencia_nombre" value={form.contacto_emergencia_nombre || ''} onChange={onChange} placeholder="María García" />
                    <Input label="Teléfono" name="contacto_emergencia_telefono" value={form.contacto_emergencia_telefono || ''} onChange={onChange} type="tel" placeholder="999111222" />
                    <Input label="Parentesco" name="contacto_emergencia_parentesco" value={form.contacto_emergencia_parentesco || ''} onChange={onChange} placeholder="Esposa" />
                </div>

                {/* ── Observaciones ── */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">Observaciones</label>
                    <textarea
                        name="observaciones"
                        value={form.observaciones || ''}
                        onChange={onChange}
                        rows="3"
                        placeholder="Notas adicionales..."
                        className="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                </div>
            </form>
        </Modal>
    );
}
