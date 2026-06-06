import { useState } from 'react';
import {
    CalendarIcon,
    PlayCircleIcon,
    CheckBadgeIcon,
    BanknotesIcon,
    UserCircleIcon,
    ChevronRightIcon,
    ArrowLeftIcon,
    DocumentTextIcon,
    PlusCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { usePlanillasData } from '../hooks/usePlanillasData';
import { EJE_PV_REFERENCE_ROWS } from '../data/ejePvReferenceRows';
import Toast from './ui/Toast';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
    Number(n ?? 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

const num = (n, d = 2) => Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtDate = (v) => {
    if (!v) return '-';
    const raw = String(v);
    if (raw.includes('/')) return raw;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('es-PE');
};

const estadoBadge = (estado) => {
    const map = {
        borrador: 'bg-yellow-100 text-yellow-800',
        aprobado: 'bg-blue-100 text-blue-800',
        pagado:   'bg-green-100 text-green-800',
    };
    return map[estado] ?? 'bg-gray-100 text-gray-700';
};

const CEYA_REFERENCE_HEADERS = [
    'Nro',
    'DNI',
    'Apellidos y Nombres',
    'Fecha Ingreso',
    'Fecha Termino',
    'Cargo',
    'Dep. Actual',
    'Regimen Laboral',
    'Horas Trab.',
    'Dias Trab.',
    'Rem. Diaria',
    'Rem. Real',
    'Rem. Bruta',
    'Movilidad Supeditada',
    'Bono',
    'Total Ingresos',
    'Rem. para Aport.',
    'AFP - ONP',
    'CUSPP',
    'ONP 13%',
    'AFP 10%',
    'AFP Seg 1.37%',
    'Comision',
    'Renta de Quinta',
    'Total Deduccion',
    'Neto a Pagar',
    'Essalud',
    'Primera Quincena',
    'Categoria',
];

const CEYA_REFERENCE_ROWS = [
    {
        nro: 1,
        nombre: 'ALAYO ANICAMA LUIS EDUARDO',
        dni: '73173003',
        fechaIngreso: '01/04/2026',
        fechaTermino: '-',
        cargo: 'SUPERVISOR DE CAMPO',
        depActual: 'OFICINA',
        regimen: 'MICRO',
        dias: 24,
        horas: 192,
        remDiaria: '76.00',
        remReal: '2,800.00',
        remBruta: '2,280.00',
        movilidad: '480.00',
        bono: '40.00',
        onp: '0.00',
        afp: '228.00',
        seguro: '31.24',
        cuspp: '343301LAAYCO',
        comision: '0.00',
        renta: '0.00',
        ingresos: '2,800.00',
        deduccion: '259.24',
        neto: '2,540.76',
        essalud: '205.20',
        primeraQuincena: '1,270.38',
        categoria: '20.00',
    },
    {
        nro: 2,
        nombre: 'HUAMANI BARBOZA LAURA ESTEFANY',
        dni: '75837909',
        fechaIngreso: '01/11/2025',
        fechaTermino: '-',
        cargo: 'AUXILIAR DE OFICINA',
        depActual: 'OFICINA',
        regimen: 'MICRO',
        dias: 24,
        horas: 192,
        remDiaria: '38.33',
        remReal: '1,300.00',
        remBruta: '1,150.00',
        movilidad: '120.00',
        bono: '30.00',
        onp: '0.00',
        afp: '115.00',
        seguro: '15.76',
        cuspp: '676960LHBMB7',
        comision: '0.00',
        renta: '0.00',
        ingresos: '1,280.00',
        deduccion: '130.76',
        neto: '1,169.25',
        essalud: '103.50',
        primeraQuincena: '584.62',
        categoria: '5.00',
    },
    {
        nro: 3,
        nombre: 'OJEDA VASQUEZ EMILY MASIEL',
        dni: '72448242',
        fechaIngreso: '01/07/2025',
        fechaTermino: '-',
        cargo: 'AUXILIAR DE OFICINA',
        depActual: 'OFICINA',
        regimen: 'MICRO',
        dias: 24,
        horas: 192,
        remDiaria: '37.67',
        remReal: '1,260.00',
        remBruta: '1,130.00',
        movilidad: '120.00',
        bono: '10.00',
        onp: '0.00',
        afp: '113.00',
        seguro: '15.48',
        cuspp: '682520EOVDQ2',
        comision: '0.00',
        renta: '0.00',
        ingresos: '1,260.00',
        deduccion: '128.48',
        neto: '1,131.52',
        essalud: '101.70',
        primeraQuincena: '565.76',
        categoria: '5.00',
    },
    {
        nro: 4,
        nombre: 'REYES INCA FRANCO RAUL',
        dni: '72891594',
        fechaIngreso: '01/10/2025',
        fechaTermino: '-',
        cargo: 'ASISTENTE DE CALIDAD',
        depActual: 'OFICINA',
        regimen: 'MICRO',
        dias: 24,
        horas: 192,
        remDiaria: '38.67',
        remReal: '1,400.00',
        remBruta: '1,160.00',
        movilidad: '240.00',
        bono: '0.00',
        onp: '150.80',
        afp: '0.00',
        seguro: '0.00',
        cuspp: '-',
        comision: '0.00',
        renta: '0.00',
        ingresos: '1,400.00',
        deduccion: '150.80',
        neto: '1,249.20',
        essalud: '104.40',
        primeraQuincena: '624.60',
        categoria: '10.00',
    },
    {
        nro: 5,
        nombre: 'ULLOA VALDIVIA JOSE EDUARDO',
        dni: '73422723',
        fechaIngreso: '01/05/2025',
        fechaTermino: '-',
        cargo: 'INGENIERO, CONTROLES',
        depActual: 'OFICINA',
        regimen: 'MICRO',
        dias: 24,
        horas: 192,
        remDiaria: '46.67',
        remReal: '1,600.00',
        remBruta: '1,400.00',
        movilidad: '120.00',
        bono: '80.00',
        onp: '0.00',
        afp: '140.00',
        seguro: '19.18',
        cuspp: '667451JUVOD9',
        comision: '0.00',
        renta: '0.00',
        ingresos: '1,600.00',
        deduccion: '159.18',
        neto: '1,440.82',
        essalud: '126.00',
        primeraQuincena: '720.41',
        categoria: '5.00',
    },
    {
        nro: 6,
        nombre: 'VILLANUEVA FERNANDEZ BRYAN DANIEL',
        dni: '75540934',
        fechaIngreso: '10/02/2025',
        fechaTermino: '-',
        cargo: 'INGENIERO, ORGANIZACION',
        depActual: 'OFICINA',
        regimen: 'MICRO',
        dias: 24,
        horas: 192,
        remDiaria: '50.00',
        remReal: '1,900.00',
        remBruta: '1,500.00',
        movilidad: '336.00',
        bono: '64.00',
        onp: '0.00',
        afp: '150.00',
        seguro: '20.55',
        cuspp: '673711BVFLN9',
        comision: '0.00',
        renta: '0.00',
        ingresos: '1,900.00',
        deduccion: '170.55',
        neto: '1,729.45',
        essalud: '107.10',
        primeraQuincena: '864.73',
        categoria: '14.00',
    },
    {
        nro: 7,
        nombre: 'ZENTENO PAUCAR DENIS FLAVIO',
        dni: '48382673',
        fechaIngreso: '01/05/2024',
        fechaTermino: '-',
        cargo: 'TESORERO',
        depActual: 'OFICINA',
        regimen: 'MICRO',
        dias: 24,
        horas: 192,
        remDiaria: '37.67',
        remReal: '1,260.00',
        remBruta: '1,130.00',
        movilidad: '120.00',
        bono: '10.00',
        onp: '0.00',
        afp: '113.00',
        seguro: '15.48',
        cuspp: '645951DZPTC8',
        comision: '0.00',
        renta: '0.00',
        ingresos: '1,260.00',
        deduccion: '128.48',
        neto: '1,131.52',
        essalud: '101.70',
        primeraQuincena: '565.76',
        categoria: '5.00',
    },
];

const CEYA_MARZO_MOVILIDAD = [
    { cargo: 'PROYECTISTA', valor: 18.0 },
    { cargo: 'AGENTE. COMPRAS / D', valor: 14.0 },
    { cargo: 'AFENTE. COMPRAS / AU', valor: 5.0 },
    { cargo: 'SUPERV. CAMP./ING CO', valor: 10.0 },
];

const CEYA_MARZO_IMPUESTO = {
    essalud: 844.2,
    onp: 150.8,
    total: 995.0,
};

const CEYA_MARZO_AFP = {
    total: 976.68,
    detalle: [
        { afp: 'INTEGRA', total: 717.45 },
        { afp: 'PROFUTURO', total: 128.48 },
        { afp: 'PRIMA', total: 259.24 },
    ],
};

const EJE_REFERENCE_HEADERS = [
    'Nro Vista',
    'DNI',
    'Apellidos y Nombres',
    'Fecha Ingreso',
    'Fecha Termino',
    'Cargo',
    'Dept.',
    'Regimen',
    'Horas',
    'Dias',
    'Rem. Diaria',
    'Rem. Real',
    'Rem. Bruta',
    'Movilidad',
    'Bono',
    'Total Ingreso',
    'AFP/ONP',
    'CUSPP',
    'ONP 13%',
    'AFP 10%',
    'Seguro',
    'Comision',
    'Renta 5ta',
    'Total Descuento',
    'Neto Referencial',
    'Essalud',
    'Categoria',
];

const isEjeWorkerIncluded = (row) => {
    const fechaTermino = String(row?.fechaTermino ?? '-').trim();
    const dept = String(row?.dept ?? '').trim();
    return fechaTermino === '-' && dept !== '' && dept !== '-';
};

const EJE_REFERENCE_TOTAL = EJE_PV_REFERENCE_ROWS.length;
const EJE_REFERENCE_ROWS = EJE_PV_REFERENCE_ROWS.filter(isEjeWorkerIncluded);

const EJE_MOVILIDAD_TARIFARIO = [
    { cargo: 'OBREROS', valor: 5.0 },
    { cargo: 'COORDINADOR', valor: 10.0 },
    { cargo: 'OPERARIO', valor: 14.0 },
    { cargo: 'ADM. / PDR', valor: 18.0 },
    { cargo: 'SUPERV. CAMPO I', valor: 20.0 },
    { cargo: 'SUPERV. CAMPO II', valor: 25.0 },
    { cargo: 'PREV. DE RIESGO', valor: 30.0 },
    { cargo: 'JEFES', valor: 40.0 },
];

const parseMoney = (v) => Number(String(v ?? '0').replaceAll(',', '')) || 0;

const EJE_SUMMARY = EJE_REFERENCE_ROWS.reduce((acc, row) => {
    const essalud = parseMoney(row.essalud);
    const onp = parseMoney(row.onp);
    const renta = parseMoney(row.renta);
    const afp = parseMoney(row.afp) + parseMoney(row.seguro) + parseMoney(row.comision);
    const key = String(row.afpOnp || 'SIN AFP').toUpperCase();

    acc.impuestos.essalud += essalud;
    acc.impuestos.onp += onp;
    acc.impuestos.renta += renta;

    if (!acc.afpDetalle[key]) acc.afpDetalle[key] = 0;
    acc.afpDetalle[key] += afp;
    return acc;
}, {
    impuestos: { essalud: 0, onp: 0, renta: 0 },
    afpDetalle: {},
});

const EJE_AFP_ROWS = Object.entries(EJE_SUMMARY.afpDetalle)
    .map(([afp, total]) => ({ afp, total }))
    .sort((a, b) => b.total - a.total);

const EJE_IMPUESTO_TOTAL =
    EJE_SUMMARY.impuestos.essalud
    + EJE_SUMMARY.impuestos.onp
    + EJE_SUMMARY.impuestos.renta;

// ─── Boleta Modal ────────────────────────────────────────────────────────────
function BoletaModal({ boleta, onClose }) {
    if (!boleta) return null;
    const { registro, agrupada, nombrePersona } = boleta;
    const trab = registro?.trabajador ?? {};
    const plan = registro?.planilla ?? {};

    return (
        <div className="krsft-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="krsft-slide-in-right w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-teal-100 uppercase tracking-wider">Boleta de Pago</p>
                        <h2 className="text-white font-semibold text-lg">{trab.nombre_completo ?? nombrePersona}</h2>
                        <p className="text-teal-100 text-sm">{plan.descripcion ?? plan.periodo} · DNI {trab.dni ?? '—'}</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <XMarkIcon className="size-6" />
                    </button>
                </div>

                {/* Días y horas */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50 border-b">
                    {[
                        { label: 'Días Trab.', val: registro?.dias_trabajados ?? '—' },
                        { label: 'Horas',      val: registro?.horas_trabajadas ?? '—' },
                        { label: 'Sueldo Base', val: fmt(trab.sueldo_basico) },
                    ].map(({ label, val }) => (
                        <div key={label} className="py-3 text-center">
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="font-semibold text-gray-800">{val}</p>
                        </div>
                    ))}
                </div>

                {/* Detalles */}
                <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                    {[
                        { titulo: '+ Ingresos',   items: agrupada?.ingresos,   color: 'text-green-600' },
                        { titulo: '- Descuentos', items: agrupada?.descuentos, color: 'text-red-600' },
                        { titulo: 'Aportes Emp.', items: agrupada?.aportes,    color: 'text-blue-600' },
                    ].map(({ titulo, items, color }) =>
                        items && [...items].length > 0 ? (
                            <div key={titulo}>
                                <p className={`text-xs font-bold uppercase tracking-wider ${color} mb-1`}>{titulo}</p>
                                <div className="rounded-lg border border-gray-100 overflow-hidden">
                                    {[...items].map((det) => (
                                        <div key={det.id} className="flex justify-between items-center px-4 py-2 even:bg-gray-50">
                                            <span className="text-sm text-gray-700">{det.concepto?.nombre ?? '—'}</span>
                                            <span className="text-sm font-medium tabular-nums">{fmt(det.monto_calculado)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null
                    )}
                </div>

                {/* Totales */}
                <div className="border-t px-6 py-4 bg-gray-50 grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total Ingresos',   val: fmt(registro?.total_ingresos),   cls: 'text-green-600' },
                        { label: 'Total Descuentos', val: fmt(registro?.total_descuentos), cls: 'text-red-600' },
                        { label: 'NETO A PAGAR',     val: fmt(registro?.neto_a_pagar),     cls: 'text-teal-700 font-bold text-lg' },
                    ].map(({ label, val, cls }) => (
                        <div key={label} className="text-center">
                            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                            <p className={cls}>{val}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Modal Crear Planilla ────────────────────────────────────────────────────
function CrearPlanillaModal({ show, form, onChange, onSubmit, onClose, saving }) {
    if (!show) return null;

    return (
        <div className="krsft-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="krsft-slide-in-right w-full max-w-md rounded-xl bg-white shadow-xl overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b">
                    <h3 className="font-semibold text-gray-800">Nueva Planilla</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="size-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Periodo <span className="text-red-500">*</span></label>
                        <input
                            type="month"
                            value={form.periodo}
                            onChange={e => onChange('periodo', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">Los días laborables reales se calculan automáticamente.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <input
                            type="text"
                            value={form.descripcion}
                            onChange={e => onChange('descripcion', e.target.value)}
                            placeholder="Ej: Planilla Abril 2026"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancelar</button>
                    <button
                        onClick={onSubmit}
                        disabled={saving || !form.periodo}
                        className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? 'Guardando...' : 'Crear Planilla'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── VISTA: Detalle planilla ─────────────────────────────────────────────────
function PlanillaDetalle({ planilla, onBack, onCalcular, onCambiarEstado, onVerBoleta, calculating }) {
    const totales = planilla.totales ?? {};
    const trabajadores = planilla.trabajadores ?? [];

    const buildExcelView = (pt) => {
        const getMontoConcepto = (codigo) => {
            const detalle = (pt.detalles ?? []).find((d) => d?.concepto?.codigo === codigo);
            return Number(detalle?.monto_calculado ?? 0);
        };

        const t = pt.trabajador ?? {};
        const dias = Number(pt.dias_trabajados ?? 0);
        const horas = Number(pt.horas_trabajadas ?? dias * 8);
        const sueldoBase = Number(t.sueldo_basico ?? 0);
        const remDiaria = dias > 0 ? sueldoBase / 30 : 0;
        const remReal = Number(sueldoBase);
        const remBruta = getMontoConcepto('ING001');
        const asigFamiliar = getMontoConcepto('ING002');
        const horasExtra = getMontoConcepto('ING020');
        const movilidad = getMontoConcepto('ING030');
        const bono = getMontoConcepto('ING040');
        const totalIngresos = Number(pt.total_ingresos ?? 0);
        const totalDescuentos = Number(pt.total_descuentos ?? 0);
        const totalAportes = Number(pt.total_aportes ?? 0);
        const neto = Number(pt.neto_a_pagar ?? totalIngresos - totalDescuentos);

        const onp = getMontoConcepto('DES010');
        const afpAporte = getMontoConcepto('DES020');
        const afpSeguro = getMontoConcepto('DES021');
        const comision = getMontoConcepto('DES022');
        const rentaQuinta = getMontoConcepto('DES030');
        const essalud = getMontoConcepto('APP001');
        const baseProvisional = onp > 0
            ? onp / 0.13
            : (afpAporte > 0 ? afpAporte / 0.1 : (remBruta + asigFamiliar));

        const primeraQuincena = Number(pt.primera_quincena ?? neto / 2);
        const categoria = Number(pt.categoria ?? 0);

        return {
            t,
            dias,
            horas,
            sueldoBase,
            remDiaria,
            remReal,
            remBruta,
            asigFamiliar,
            horasExtra,
            totalIngresos,
            totalDescuentos,
            totalAportes,
            neto,
            movilidad,
            bono,
            baseProvisional,
            onp,
            afpAporte,
            afpSeguro,
            essalud,
            primeraQuincena,
            categoria,
            comision,
            rentaQuinta,
            fechaIngreso: fmtDate(t.fecha_ingreso),
            fechaTermino: fmtDate(t.fecha_cese),
            depActual: t.departamento || 'OFICINA',
            regimenLaboral: t.tipo_trabajador || 'MICRO',
            cuspp: t.cuspp || '-',
        };
    };

    return (
        <div className="space-y-6">
            {/* Back + header */}
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-teal-600 transition-colors">
                    <ArrowLeftIcon className="size-4" /> Volver
                </button>
                <div className="flex-1 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">{planilla.descripcion ?? planilla.periodo}</h2>
                        <p className="text-sm text-gray-500">Periodo {planilla.periodo} · {trabajadores.length} trabajadores</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoBadge(planilla.estado)}`}>
                            {planilla.estado}
                        </span>
                        {planilla.estado === 'borrador' && (
                            <button
                                onClick={() => onCalcular(planilla.id)}
                                disabled={calculating}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700 disabled:opacity-50"
                            >
                                <PlayCircleIcon className="size-4" />
                                {calculating ? 'Calculando...' : 'Calcular Planilla'}
                            </button>
                        )}
                        {planilla.estado === 'borrador' && (
                            <button
                                onClick={() => onCambiarEstado(planilla.id, 'aprobado')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                            >
                                <CheckBadgeIcon className="size-4" /> Aprobar
                            </button>
                        )}
                        {planilla.estado === 'aprobado' && (
                            <button
                                onClick={() => onCambiarEstado(planilla.id, 'pagado')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                            >
                                <BanknotesIcon className="size-4" /> Marcar Pagado
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Totales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Neto a Pagar',     val: fmt(totales.neto_a_pagar),     cls: 'text-teal-700 text-2xl' },
                    { label: 'Total Ingresos',   val: fmt(totales.total_ingresos),   cls: 'text-green-600 text-xl' },
                    { label: 'Total Descuentos', val: fmt(totales.total_descuentos), cls: 'text-red-600 text-xl' },
                    { label: 'Trabajadores',     val: totales.num_trabajadores ?? trabajadores.length, cls: 'text-gray-700 text-2xl' },
                ].map(({ label, val, cls }) => (
                    <div key={label} className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <p className={`font-bold ${cls}`}>{val}</p>
                    </div>
                ))}
            </div>

            {/* Cuadro estilo Excel CEYA */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Cuadro Referencial Tipo Excel (CEYA)</p>
                    <p className="mt-1 text-xs text-gray-500">Neto = Total Ingresos - Total Deduccion | Horas = Dias x 8 | Rem. Diaria = Sueldo/30</p>
                </div>
                <div className="overflow-auto">
                <table className="min-w-[2600px] text-sm divide-y divide-gray-100 whitespace-nowrap">
                    <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-4 py-3 text-left">Nro</th>
                            <th className="px-4 py-3 text-left">DNI</th>
                            <th className="px-4 py-3 text-left">Apellidos y Nombres</th>
                            <th className="px-4 py-3 text-left">Fecha Ingreso</th>
                            <th className="px-4 py-3 text-left">Fecha Termino</th>
                            <th className="px-4 py-3 text-left">Cargo</th>
                            <th className="px-4 py-3 text-left">Dep. Actual</th>
                            <th className="px-4 py-3 text-left">Regimen Laboral</th>
                            <th className="px-4 py-3 text-center">Horas</th>
                            <th className="px-4 py-3 text-center">Días</th>
                            <th className="px-4 py-3 text-right">Rem. Diaria</th>
                            <th className="px-4 py-3 text-right">Rem. Real</th>
                            <th className="px-4 py-3 text-right">Rem. Bruta</th>
                            <th className="px-4 py-3 text-right">Movilidad</th>
                            <th className="px-4 py-3 text-right">Bono</th>
                            <th className="px-4 py-3 text-right">Total Ingresos</th>
                            <th className="px-4 py-3 text-right">Rem. para Aport.</th>
                            <th className="px-4 py-3 text-left">AFP - ONP</th>
                            <th className="px-4 py-3 text-left">CUSPP</th>
                            <th className="px-4 py-3 text-right">ONP 13%</th>
                            <th className="px-4 py-3 text-right">AFP 10%</th>
                            <th className="px-4 py-3 text-right">AFP Seg 1.37%</th>
                            <th className="px-4 py-3 text-right">Comision</th>
                            <th className="px-4 py-3 text-right">Renta 5ta</th>
                            <th className="px-4 py-3 text-right">Total Deduccion</th>
                            <th className="px-4 py-3 text-right">Aportes Emp.</th>
                            <th className="px-4 py-3 text-right font-bold text-teal-700">Neto a Pagar</th>
                            <th className="px-4 py-3 text-right">Essalud</th>
                            <th className="px-4 py-3 text-right">Primera Quincena</th>
                            <th className="px-4 py-3 text-right">Categoria</th>
                            <th className="px-4 py-3 text-center">Boleta</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {trabajadores.length === 0 && (
                            <tr>
                                <td colSpan={30} className="py-10 text-center text-gray-400">
                                    Sin datos. Presiona <strong>Calcular Planilla</strong> para generar los montos.
                                </td>
                            </tr>
                        )}
                        {trabajadores.map((pt, idx) => {
                            const r = buildExcelView(pt);
                            const t = r.t;
                            return (
                                <tr key={pt.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-center text-gray-500 tabular-nums">{idx + 1}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{t.dni ?? '—'}</td>
                                    <td className="px-4 py-3 min-w-[280px]">
                                        <div className="flex items-center gap-2">
                                            <UserCircleIcon className="size-7 text-gray-300 shrink-0" />
                                            <div>
                                                <p className="font-medium text-gray-800 whitespace-nowrap">{t.nombre_completo ?? '—'}</p>
                                                <p className="text-xs text-gray-400">Sueldo base: {fmt(r.sueldoBase)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{r.fechaIngreso}</td>
                                    <td className="px-4 py-3 text-gray-600">{r.fechaTermino}</td>
                                    <td className="px-4 py-3 text-gray-600">{t.cargo ?? '—'}</td>
                                    <td className="px-4 py-3 text-gray-600">{r.depActual}</td>
                                    <td className="px-4 py-3 text-gray-600">{r.regimenLaboral}</td>
                                    <td className="px-4 py-3 text-center tabular-nums">{r.horas}</td>
                                    <td className="px-4 py-3 text-center tabular-nums">{r.dias}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmt(r.remDiaria)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmt(r.remReal)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmt(r.remBruta)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmt(r.movilidad)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmt(r.bono)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-green-600 whitespace-nowrap">{fmt(r.totalIngresos)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmt(r.baseProvisional)}</td>
                                    <td className="px-4 py-3 text-gray-600">{t.sistema_pensiones ?? '—'}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.cuspp}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-red-500 whitespace-nowrap">{fmt(r.onp)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-red-500 whitespace-nowrap">{fmt(r.afpAporte)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-red-500 whitespace-nowrap">{fmt(r.afpSeguro)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-red-500 whitespace-nowrap">{fmt(r.comision)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-red-500 whitespace-nowrap">{fmt(r.rentaQuinta)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-red-500 whitespace-nowrap">{fmt(r.totalDescuentos)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-blue-600 whitespace-nowrap">{fmt(r.totalAportes)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums font-bold text-teal-700 whitespace-nowrap">{fmt(r.neto)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-blue-600 whitespace-nowrap">{fmt(r.essalud)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmt(r.primeraQuincena)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{num(r.categoria)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => onVerBoleta(planilla.id, t.id, t.nombre_completo)}
                                            className="text-teal-600 hover:text-teal-800 transition-colors"
                                            title="Ver boleta"
                                        >
                                            <DocumentTextIcon className="size-5 mx-auto" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500">
                    Nota: ONP/AFP/Seguro en este cuadro son referenciales para lectura del modelo Excel. El valor final oficial se toma de la boleta calculada por el backend.
                </div>
            </div>
        </div>
    );
}

// ─── VISTA: Lista de planillas ───────────────────────────────────────────────
function PlanillaLista({ planillas, loading, onAbrir, onCrear }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-700">Planillas Mensuales</h2>
                <button
                    onClick={onCrear}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700"
                >
                    <PlusCircleIcon className="size-4" /> Nueva Planilla
                </button>
            </div>

            {loading && (
                <div className="py-16 text-center text-gray-400">Cargando...</div>
            )}

            {!loading && planillas.length === 0 && (
                <div className="space-y-5">
                    <div className="py-10 text-center">
                        <CalendarIcon className="size-12 mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-500 font-medium">No hay planillas registradas.</p>
                        <p className="text-gray-400 text-sm mt-1">Crea la primera planilla del mes para comenzar.</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Cuadro Referencial Tipo Excel CEYA (vista previa)</p>
                            <p className="mt-1 text-xs text-gray-500">Se muestra como referencia para entender calculos. Los datos reales aparecen cuando crees y calcules una planilla.</p>
                        </div>
                        <div className="overflow-auto">
                            <table className="min-w-[2800px] text-sm divide-y divide-gray-100 whitespace-nowrap">
                                <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        {CEYA_REFERENCE_HEADERS.map((h) => (
                                            <th key={h} className="px-4 py-3 text-left">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {CEYA_REFERENCE_ROWS.map((r) => (
                                        <tr key={r.dni} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-center tabular-nums">{r.nro}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.dni}</td>
                                            <td className="px-4 py-3 font-medium text-gray-700 min-w-[280px] whitespace-nowrap">{r.nombre}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.fechaIngreso}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.fechaTermino}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.cargo}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.depActual}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.regimen}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{r.horas}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{r.dias}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.remDiaria}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.remReal}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.remBruta}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.movilidad}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.bono}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-green-600">S/ {r.ingresos}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.base ?? r.remBruta}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.onp !== '0.00' ? 'ONP' : 'PRIMA'}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.cuspp}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.onp}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.afp}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.seguro}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.comision}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.renta}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.deduccion}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-blue-600">S/ {r.essalud}</td>
                                            <td className="px-4 py-3 text-right tabular-nums font-bold text-teal-700">S/ {r.neto}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.primeraQuincena}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{r.categoria}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t border-gray-100 bg-gray-50 p-4">
                            <div className="grid gap-4 lg:grid-cols-3">
                                <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
                                    <div
                                        className="w-full border-b border-blue-900 px-3 py-2 text-sm font-bold uppercase tracking-wide text-white"
                                        style={{ backgroundColor: '#1d4ed8' }}
                                    >
                                        Movilidad
                                    </div>
                                    <table className="w-full text-xs">
                                        <tbody>
                                            {CEYA_MARZO_MOVILIDAD.map((item) => (
                                                <tr key={item.cargo} className="border-b border-gray-100 last:border-b-0">
                                                    <td className="px-3 py-1.5 text-gray-700">{item.cargo}</td>
                                                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">{num(item.valor, 2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
                                    <div
                                        className="w-full border-b border-blue-900 px-3 py-2 text-sm font-bold uppercase tracking-wide text-white"
                                        style={{ backgroundColor: '#1d4ed8' }}
                                    >
                                        Impuesto por pagar - Marzo 2026
                                    </div>
                                    <table className="w-full text-xs">
                                        <tbody>
                                            <tr className="border-b border-gray-100">
                                                <td className="px-3 py-1.5 font-semibold text-gray-800">Essalud por pagar</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">{fmt(CEYA_MARZO_IMPUESTO.essalud)}</td>
                                            </tr>
                                            <tr className="border-b border-gray-100">
                                                <td className="px-3 py-1.5 font-semibold text-gray-800">ONP por pagar</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">{fmt(CEYA_MARZO_IMPUESTO.onp)}</td>
                                            </tr>
                                            <tr className="bg-yellow-200">
                                                <td className="px-3 py-1.5 font-bold text-gray-900">Total a pagar</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums font-bold text-gray-900">{fmt(CEYA_MARZO_IMPUESTO.total)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
                                    <div
                                        className="w-full border-b border-blue-900 px-3 py-2 text-sm font-bold uppercase tracking-wide text-white"
                                        style={{ backgroundColor: '#1d4ed8' }}
                                    >
                                        AFP por pagar: {fmt(CEYA_MARZO_AFP.total)}
                                    </div>
                                    <table className="w-full text-xs">
                                        <tbody>
                                            {CEYA_MARZO_AFP.detalle.map((item) => (
                                                <tr key={item.afp} className="border-b border-gray-100 last:border-b-0">
                                                    <td className="px-3 py-1.5 text-gray-700">{item.afp}</td>
                                                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">{fmt(item.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Cuadro Referencial EJE PV Abril 2026 (separado)</p>
                            <p className="mt-1 text-xs text-gray-500">Fuente: hoja 01 del Excel EJE PV. Mostrando {EJE_REFERENCE_ROWS.length} de {EJE_REFERENCE_TOTAL} filas (solo activos con departamento valido), separado del CEYA para evitar mezclar reglas entre plantillas.</p>
                        </div>
                        <div className="overflow-auto">
                            <table className="min-w-[2800px] text-sm divide-y divide-gray-100 whitespace-nowrap">
                                <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        {EJE_REFERENCE_HEADERS.map((h) => (
                                            <th key={h} className="px-4 py-3 text-left">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {EJE_REFERENCE_ROWS.map((r, idx) => (
                                        <tr key={`${r.nro}-${r.dni}`} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-center tabular-nums" title={`Nro Excel: ${r.nro}`}>{idx + 1}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.dni}</td>
                                            <td className="px-4 py-3 font-medium text-gray-700 min-w-[320px] whitespace-nowrap">{r.nombre}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.fechaIngreso}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.fechaTermino}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.cargo}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.dept}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.regimen}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{r.horas}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{r.dias}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.remDiaria}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.remReal}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.remBruta}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.movilidad}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">S/ {r.bono}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-green-600">S/ {r.ingreso}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.afpOnp}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.cuspp}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.onp}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.afp}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.seguro}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.comision}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.renta}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-red-500">S/ {r.descuento}</td>
                                            <td className="px-4 py-3 text-right tabular-nums font-bold text-teal-700">S/ {r.neto}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-blue-600">S/ {r.essalud}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{r.categoria}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t border-gray-100 bg-gray-50 p-4">
                            <div className="grid gap-4 lg:grid-cols-3">
                                <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
                                    <div
                                        className="w-full border-b border-blue-900 px-3 py-2 text-sm font-bold uppercase tracking-wide text-white"
                                        style={{ backgroundColor: '#1d4ed8' }}
                                    >
                                        Movilidad
                                    </div>
                                    <table className="w-full text-xs">
                                        <tbody>
                                            {EJE_MOVILIDAD_TARIFARIO.map((item) => (
                                                <tr key={item.cargo} className="border-b border-gray-100 last:border-b-0">
                                                    <td className="px-3 py-1.5 text-gray-700">{item.cargo}</td>
                                                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">{num(item.valor, 2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
                                    <div
                                        className="w-full border-b border-blue-900 px-3 py-2 text-sm font-bold uppercase tracking-wide text-white"
                                        style={{ backgroundColor: '#1d4ed8' }}
                                    >
                                        Impuesto por pagar - Abril 2026
                                    </div>
                                    <table className="w-full text-xs">
                                        <tbody>
                                            <tr className="border-b border-gray-100">
                                                <td className="px-3 py-1.5 text-gray-700">Essalud</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">{fmt(EJE_SUMMARY.impuestos.essalud)}</td>
                                            </tr>
                                            <tr className="border-b border-gray-100">
                                                <td className="px-3 py-1.5 text-gray-700">ONP</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">{fmt(EJE_SUMMARY.impuestos.onp)}</td>
                                            </tr>
                                            <tr className="border-b border-gray-100">
                                                <td className="px-3 py-1.5 text-gray-700">Renta 5ta</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">{fmt(EJE_SUMMARY.impuestos.renta)}</td>
                                            </tr>
                                            <tr>
                                                <td className="px-3 py-1.5 font-semibold text-gray-800">Total a pagar</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-gray-900">{fmt(EJE_IMPUESTO_TOTAL)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
                                    <div
                                        className="w-full border-b border-blue-900 px-3 py-2 text-sm font-bold uppercase tracking-wide text-white"
                                        style={{ backgroundColor: '#1d4ed8' }}
                                    >
                                        AFP por pagar
                                    </div>
                                    <table className="w-full text-xs">
                                        <tbody>
                                            {EJE_AFP_ROWS.map((item) => (
                                                <tr key={item.afp} className="border-b border-gray-100 last:border-b-0">
                                                    <td className="px-3 py-1.5 text-gray-700">{item.afp}</td>
                                                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">{fmt(item.total)}</td>
                                                </tr>
                                            ))}
                                            <tr>
                                                <td className="px-3 py-1.5 font-semibold text-gray-800">Total AFP</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-gray-900">
                                                    {fmt(EJE_AFP_ROWS.reduce((acc, item) => acc + item.total, 0))}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-3">
                {planillas.map((p) => (
                    <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group"
                        onClick={() => onAbrir(p)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center size-10 rounded-full bg-teal-50 text-teal-600 shrink-0">
                                <CalendarIcon className="size-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">{p.descripcion ?? p.periodo}</p>
                                <p className="text-xs text-gray-400">
                                    Periodo: {p.periodo} · {p.trabajadores_count ?? 0} trabajadores
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoBadge(p.estado)}`}>
                                {p.estado}
                            </span>
                            <ChevronRightIcon className="size-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function PlanillaMensualManager() {
    const p = usePlanillasData();

    return (
        <div className="space-y-6">
            {/* Vista: detalle o lista */}
            {p.selected ? (
                <PlanillaDetalle
                    planilla={p.selected}
                    onBack={p.cerrarPlanilla}
                    onCalcular={p.calcularPlanilla}
                    onCambiarEstado={p.cambiarEstado}
                    onVerBoleta={p.verBoleta}
                    calculating={p.calculating}
                />
            ) : (
                <PlanillaLista
                    planillas={p.planillas}
                    loading={p.loading}
                    onAbrir={p.abrirPlanilla}
                    onCrear={() => p.setShowCrearModal(true)}
                />
            )}

            {/* Modal crear */}
            <CrearPlanillaModal
                show={p.showCrearModal}
                form={p.crearForm}
                onChange={(k, v) => p.setCrearForm(f => ({ ...f, [k]: v }))}
                onSubmit={p.crearPlanilla}
                onClose={() => p.setShowCrearModal(false)}
                saving={p.saving}
            />

            {/* Modal boleta */}
            {p.showBoleta && (
                <BoletaModal
                    boleta={p.boleta}
                    onClose={() => p.setShowBoleta(false)}
                />
            )}

            {/* Toast */}
            <Toast show={p.toast.show} message={p.toast.message} type={p.toast.type} />
        </div>
    );
}
