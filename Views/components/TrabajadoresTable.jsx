import { memo } from 'react';
import { EditIcon, TrashIcon, TeamIcon } from './Icons';

// ── Memoized table component (rerender-memo: extract expensive work into memoized components) ──
const TrabajadoresTable = memo(function TrabajadoresTable({
    trabajadores,
    loading,
    onEdit,
    onDelete,
    formatDate,
    getInitials,
    badgeClasses,
    openCreateModal
}) {
    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner" />
                <p>Cargando trabajadores...</p>
            </div>
        );
    }

    if (trabajadores.length === 0) {
        return (
            <div className="empty-state">
                {TeamIcon}
                <p>No hay trabajadores registrados</p>
                <button onClick={openCreateModal} className="btn-primary">
                    Agregar primer trabajador
                </button>
            </div>
        );
    }

    return (
        <div className="table-responsive">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Trabajador</th>
                        <th>DNI</th>
                        <th>Cargo</th>
                        <th>Fecha Ingreso</th>
                        <th>Estado</th>
                        <th className="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {trabajadores.map(t => (
                        <tr key={t.id} className="table-row">
                            <td>
                                <div className="worker-info-cell">
                                    <div className="worker-avatar">
                                        {getInitials(t)}
                                    </div>
                                    <div className="worker-details">
                                        <div className="worker-name">
                                            {t.nombre_completo || `${t.apellido_paterno} ${t.apellido_materno || ''}, ${t.nombres}`.trim()}
                                        </div>
                                        <div className="worker-meta">{t.email || 'Sin email'}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="mono-text">{t.dni}</td>
                            <td>
                                <span className="cargo-type">{t.cargo || '-'}</span>
                            </td>
                            <td>{formatDate(t.fecha_ingreso)}</td>
                            <td>
                                <span className={`badge-pill ${badgeClasses[t.estado] || 'badge-default'}`}>
                                    {t.estado}
                                </span>
                            </td>
                            <td className="actions-cell">
                                <div className="actions-group">
                                    <button
                                        onClick={() => onEdit(t)}
                                        className="btn-icon btn-icon--edit"
                                        title="Editar"
                                    >
                                        {EditIcon}
                                    </button>
                                    <button
                                        onClick={() => onDelete(t)}
                                        className="btn-icon btn-icon--delete"
                                        title="Eliminar"
                                    >
                                        {TrashIcon}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

export default TrabajadoresTable;
