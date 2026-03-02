/**
 * DeleteConfirmModal – Confirmation dialog with danger styling.
 */
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function DeleteConfirmModal({ show, onClose, onConfirm, deleting, itemToDelete }) {
    if (!itemToDelete) return null;

    return (
        <Modal open={show} onClose={onClose} size="sm">
            <div className="text-center py-4">
                <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-red-100">
                    <ExclamationTriangleIcon className="size-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">¿Estás seguro?</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                    Estás a punto de eliminar a{' '}
                    <strong className="font-semibold text-gray-900">{itemToDelete.nombre_completo || itemToDelete.nombres}</strong>.
                    Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={deleting} className="flex-1">Cancelar</Button>
                    <Button variant="danger" onClick={onConfirm} loading={deleting} className="flex-1">
                        {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
