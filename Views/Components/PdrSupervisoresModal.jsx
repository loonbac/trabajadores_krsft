import { useEffect, useMemo, useState } from 'react';
import {
    UserGroupIcon,
    UsersIcon,
    ShieldCheckIcon,
    MagnifyingGlassIcon,
    ChevronRightIcon,
    ChevronDoubleRightIcon,
    ChevronLeftIcon,
    ChevronDoubleLeftIcon,
} from '@heroicons/react/24/outline';
import Modal from './ui/Modal';
import Button from './ui/Button';

/**
 * PdrSupervisoresModal — Dual-list transfer between trabajadores ↔ supervisores.
 * Multi-select with checkboxes; arrow buttons move selection or all.
 */
export default function PdrSupervisoresModal({
    open,
    onClose,
    supervisores,
    trabajadores,
    onCreateBatch,
    onDeleteBatch,
    onFetchTrabajadores,
    saving,
}) {
    const [leftChecked, setLeftChecked] = useState(new Set());
    const [rightChecked, setRightChecked] = useState(new Set());
    const [leftSearch, setLeftSearch] = useState('');
    const [rightSearch, setRightSearch] = useState('');
    const [pulseLeft, setPulseLeft] = useState(false);
    const [pulseRight, setPulseRight] = useState(false);

    useEffect(() => {
        if (open) {
            onFetchTrabajadores?.();
            setLeftChecked(new Set());
            setRightChecked(new Set());
            setLeftSearch('');
            setRightSearch('');
        }
    }, [open, onFetchTrabajadores]);

    const supervisorTrabajadorIds = useMemo(
        () => new Set(supervisores.filter(s => s.is_active).map(s => s.trabajador_id)),
        [supervisores],
    );

    const leftItems = useMemo(() => {
        const term = leftSearch.trim().toLowerCase();
        return trabajadores
            .filter(t => !supervisorTrabajadorIds.has(t.id))
            .filter(t => {
                if (!term) return true;
                return (
                    String(t.nombre_completo || '').toLowerCase().includes(term)
                    || String(t.dni || '').toLowerCase().includes(term)
                    || String(t.cargo || '').toLowerCase().includes(term)
                );
            });
    }, [trabajadores, supervisorTrabajadorIds, leftSearch]);

    const rightItems = useMemo(() => {
        const term = rightSearch.trim().toLowerCase();
        return supervisores
            .filter(s => s.is_active)
            .filter(s => {
                if (!term) return true;
                return (
                    String(s.nombre_completo || '').toLowerCase().includes(term)
                    || String(s.dni || '').toLowerCase().includes(term)
                    || String(s.cargo || '').toLowerCase().includes(term)
                );
            });
    }, [supervisores, rightSearch]);

    const toggle = (setFn, currentSet, id) => {
        const next = new Set(currentSet);
        if (next.has(id)) next.delete(id); else next.add(id);
        setFn(next);
    };

    const allLeftSelected = leftItems.length > 0 && leftItems.every(t => leftChecked.has(t.id));
    const allRightSelected = rightItems.length > 0 && rightItems.every(s => rightChecked.has(s.id));

    const toggleAllLeft = () => {
        if (allLeftSelected) setLeftChecked(new Set());
        else setLeftChecked(new Set(leftItems.map(t => t.id)));
    };
    const toggleAllRight = () => {
        if (allRightSelected) setRightChecked(new Set());
        else setRightChecked(new Set(rightItems.map(s => s.id)));
    };

    const flashRight = () => { setPulseRight(true); setTimeout(() => setPulseRight(false), 600); };
    const flashLeft = () => { setPulseLeft(true); setTimeout(() => setPulseLeft(false), 600); };

    // Move selected left → right (register selected trabajadores as supervisores)
    const moveSelectedRight = async () => {
        const ids = [...leftChecked].filter(id => leftItems.some(t => t.id === id));
        if (ids.length === 0) return;
        const result = await onCreateBatch(ids);
        if (result.ok > 0) flashRight();
        setLeftChecked(new Set());
    };

    // Move ALL filtered left → right
    const moveAllRight = async () => {
        const ids = leftItems.map(t => t.id);
        if (ids.length === 0) return;
        const result = await onCreateBatch(ids);
        if (result.ok > 0) flashRight();
        setLeftChecked(new Set());
    };

    // Move selected right → left (deactivate selected supervisores)
    const moveSelectedLeft = async () => {
        const ids = [...rightChecked].filter(id => rightItems.some(s => s.id === id));
        if (ids.length === 0) return;
        const result = await onDeleteBatch(ids);
        if (result.ok > 0) flashLeft();
        setRightChecked(new Set());
    };

    // Move ALL filtered right → left
    const moveAllLeft = async () => {
        const ids = rightItems.map(s => s.id);
        if (ids.length === 0) return;
        if (!window.confirm(`Desactivar ${ids.length} supervisor${ids.length === 1 ? '' : 'es'}?`)) return;
        const result = await onDeleteBatch(ids);
        if (result.ok > 0) flashLeft();
        setRightChecked(new Set());
    };

    const leftCount = leftChecked.size;
    const rightCount = rightChecked.size;

    const handleClose = () => { if (!saving) onClose(); };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            size="2xl"
            bodyClassName="overflow-hidden"
            title="Gestionar Supervisores PDR"
            titleIcon={<UserGroupIcon className="size-5 text-primary" />}
            footer={
                <>
                    <span className="mr-auto text-xs text-gray-500">
                        Selección: {leftCount + rightCount} item{leftCount + rightCount === 1 ? '' : 's'}
                    </span>
                    <Button variant="secondary" onClick={handleClose} disabled={saving}>Cerrar</Button>
                </>
            }
        >
            <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-4">
                {/* ── LEFT: Trabajadores disponibles ── */}
                <div
                    className={`krsft-fade-up flex min-h-0 flex-col overflow-hidden rounded-lg border-2 transition-colors ${
                        pulseLeft ? 'border-emerald-400 bg-emerald-50/40' : 'border-gray-200 bg-white'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <UsersIcon className="size-4 shrink-0 text-gray-500" />
                            <h3 className="truncate text-sm font-semibold text-gray-800">Trabajadores</h3>
                        </div>
                        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {leftItems.length}
                        </span>
                    </div>

                    <div className="border-b border-gray-100 px-3 py-2">
                        <div className="krsft-glow-ring relative rounded">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={leftSearch}
                                onChange={(e) => setLeftSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full rounded border-gray-300 pl-8 py-1.5 text-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                        <input
                            type="checkbox"
                            checked={allLeftSelected}
                            onChange={toggleAllLeft}
                            className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        Seleccionar todo ({leftCount}/{leftItems.length})
                    </label>

                    <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-gray-50">
                        {leftItems.length === 0 ? (
                            <li className="krsft-fade-in px-4 py-10 text-center text-sm text-gray-400">
                                {trabajadores.length === 0 ? 'Cargando...' : 'Sin trabajadores disponibles'}
                            </li>
                        ) : (
                            leftItems.map((t, idx) => {
                                const checked = leftChecked.has(t.id);
                                return (
                                    <li
                                        key={t.id}
                                        className="krsft-fade-up"
                                        style={{ '--krsft-delay': `${Math.min(idx, 12) * 25}ms` }}
                                    >
                                        <label
                                            className={`krsft-press flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-all ${
                                                checked
                                                    ? 'bg-primary-50 ring-1 ring-inset ring-primary/30'
                                                    : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggle(setLeftChecked, leftChecked, t.id)}
                                                className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-gray-900">
                                                    {t.nombre_completo || `Trabajador #${t.id}`}
                                                </p>
                                                <p className="truncate text-xs text-gray-500">
                                                    DNI {t.dni || '—'}{t.cargo ? ` · ${t.cargo}` : ''}
                                                </p>
                                            </div>
                                        </label>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>

                {/* ── CENTER: Action buttons ── */}
                <div className="krsft-scale-in flex shrink-0 flex-col items-center justify-center gap-2 px-1 py-4">
                    <ArrowBtn
                        title="Mover todos los visibles a la derecha"
                        onClick={moveAllRight}
                        disabled={saving || leftItems.length === 0}
                        Icon={ChevronDoubleRightIcon}
                    />
                    <ArrowBtn
                        title="Mover seleccionados a la derecha"
                        onClick={moveSelectedRight}
                        disabled={saving || leftCount === 0}
                        Icon={ChevronRightIcon}
                        highlight={leftCount > 0}
                        badge={leftCount > 0 ? leftCount : null}
                    />
                    <div className="my-1 h-px w-8 bg-gray-200" />
                    <ArrowBtn
                        title="Devolver seleccionados a la izquierda"
                        onClick={moveSelectedLeft}
                        disabled={saving || rightCount === 0}
                        Icon={ChevronLeftIcon}
                        highlight={rightCount > 0}
                        badge={rightCount > 0 ? rightCount : null}
                        variant="danger"
                    />
                    <ArrowBtn
                        title="Devolver todos los visibles a la izquierda"
                        onClick={moveAllLeft}
                        disabled={saving || rightItems.length === 0}
                        Icon={ChevronDoubleLeftIcon}
                        variant="danger"
                    />
                </div>

                {/* ── RIGHT: Supervisores PDR ── */}
                <div
                    className={`krsft-fade-up flex min-h-0 flex-col overflow-hidden rounded-lg border-2 transition-colors ${
                        pulseRight ? 'border-emerald-400 bg-emerald-50/40' : 'border-gray-200 bg-white'
                    }`}
                    style={{ '--krsft-delay': '80ms' }}
                >
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
                            <h3 className="truncate text-sm font-semibold text-gray-800">Supervisores PDR</h3>
                        </div>
                        <span className="inline-flex items-center rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">
                            {rightItems.length}
                        </span>
                    </div>

                    <div className="border-b border-gray-100 px-3 py-2">
                        <div className="krsft-glow-ring relative rounded">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={rightSearch}
                                onChange={(e) => setRightSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full rounded border-gray-300 pl-8 py-1.5 text-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                        <input
                            type="checkbox"
                            checked={allRightSelected}
                            onChange={toggleAllRight}
                            className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        Seleccionar todo ({rightCount}/{rightItems.length})
                    </label>

                    <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-gray-50">
                        {rightItems.length === 0 ? (
                            <li className="krsft-fade-in px-4 py-10 text-center text-sm text-gray-400">
                                Sin supervisores registrados
                            </li>
                        ) : (
                            rightItems.map((s, idx) => {
                                const checked = rightChecked.has(s.id);
                                return (
                                    <li
                                        key={s.id}
                                        className="krsft-fade-up"
                                        style={{ '--krsft-delay': `${Math.min(idx, 12) * 25}ms` }}
                                    >
                                        <label
                                            className={`krsft-press flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-all ${
                                                checked
                                                    ? 'bg-red-50 ring-1 ring-inset ring-red-300'
                                                    : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggle(setRightChecked, rightChecked, s.id)}
                                                className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-gray-900">
                                                    {s.nombre_completo || `Supervisor #${s.id}`}
                                                </p>
                                                <p className="truncate text-xs text-gray-500">
                                                    DNI {s.dni || '—'}{s.cargo ? ` · ${s.cargo}` : ''}
                                                </p>
                                            </div>
                                        </label>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            </div>

        </Modal>
    );
}

function ArrowBtn({ Icon, onClick, disabled, title, highlight, badge, variant = 'primary' }) {
    const base = 'krsft-press krsft-hover-pop relative inline-flex size-10 items-center justify-center rounded-md border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';
    const styles = disabled
        ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
        : variant === 'danger'
            ? `border-red-300 bg-white text-red-600 hover:bg-red-50 hover:border-red-500 focus-visible:ring-red-400 ${highlight ? 'krsft-pulse-soft' : ''}`
            : `border-primary/40 bg-white text-primary hover:bg-primary-50 hover:border-primary focus-visible:ring-primary/40 ${highlight ? 'krsft-pulse-soft' : ''}`;

    return (
        <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
            <Icon className="size-5" />
            {badge != null && (
                <span className={`krsft-scale-in absolute -right-2 -top-2 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                    variant === 'danger' ? 'bg-red-600' : 'bg-primary'
                }`}>
                    {badge}
                </span>
            )}
        </button>
    );
}
