/**
 * DeleteConfirmModal – Confirmation dialog with danger styling (HyperUI style).
 */
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function DeleteConfirmModal({ show, onClose, onConfirm, deleting, itemToDelete }) {
    if (!itemToDelete) return null;

    return (
        <Modal open={show} onClose={onClose} size="sm">
            <div className="text-center py-4">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-100">
                    <ExclamationTriangleIcon className="size-7 text-red-600" />
                </div>

                <h2 className="text-lg font-bold text-gray-900">¿Estás seguro?</h2>
                <p className="mt-2 text-sm text-pretty text-gray-500 leading-relaxed">
                    Estás a punto de eliminar a{' '}
                    <strong className="font-semibold text-gray-900">{itemToDelete.nombre_completo || itemToDelete.nombres}</strong>.
                    Esta acción no se puede deshacer.
                </p>

                <footer className="mt-6 flex gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={deleting} className="flex-1">
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={onConfirm} loading={deleting} className="flex-1">
                        {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                    </Button>
                </footer>
            </div>
        </Modal>
    );
}
