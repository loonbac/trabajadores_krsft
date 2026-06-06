// SSOMA — constantes y helpers de la sección de cumplimiento documental.
// Las variantes mapean al vocabulario del Badge local de trabajadores
// (variant: success/warning/danger/blue/gray — NO neutral/info).

export const SSOMA_POLLING_MS = 10000;

export const SSOMA_DOC_TYPES = ['SST', 'EMO', 'CAMO', 'EPP', 'DOC_SST'];

export const DOC_LABELS = {
    SST:     'SST Inducción',
    EMO:     'EMO Médico',
    CAMO:    'CAMO Capacitación',
    EPP:     'EPP Entrega',
    DOC_SST: 'Doc SST',
};

export const DOC_DOT = {
    vigente:     'bg-emerald-500',
    por_vencer:  'bg-amber-500',
    vencido:     'bg-red-500',
    no_definido: 'bg-gray-300',
};

export const DOC_TEXT_COLOR = {
    vigente:     'text-emerald-600',
    por_vencer:  'text-amber-600',
    vencido:     'text-red-600',
    no_definido: 'text-gray-400',
};

export const APTITUD_LABELS = {
    apto:             'Apto',
    apto_restriccion: 'Apto con restricciones',
    observado:        'Observado',
    no_apto:          'No Apto',
    no_definido:      'No Definido',
};

export const APTITUD_VARIANT = {
    apto:             'success',
    apto_restriccion: 'amber',
    observado:        'warning',
    no_apto:          'danger',
    no_definido:      'gray',
};

// Selector exclusivo de la ficha (3 opciones del spec)
export const APTITUD_OPTIONS = [
    { value: 'apto',             label: 'Apto' },
    { value: 'apto_restriccion', label: 'Apto con restricciones' },
    { value: 'observado',        label: 'Observado' },
];

export const MODALIDAD_OPTIONS = ['Oficina', 'Campo', 'Visita'];

// ── Capacitaciones y Certificados ──────────────────────────────────────────
// Catálogo de respaldo para el display mientras carga el API (la fuente de
// verdad es ssoma_certification_types, expuesto por /certifications/types).
export const CERT_CODES = [
    'emergencia', 'frio_caliente', 'equipos_poder', 'excavacion_manual',
    'antiderrumbe_zanja', 'altura_escalera', 'altura_andamio',
    'armado_andamios', 'izaje', 'loto',
];

export const CERT_LABELS = {
    emergencia:         'Emergencia',
    frio_caliente:      'Frio Caliente',
    equipos_poder:      'Equipos de Poder',
    excavacion_manual:  'Excavacion Manual',
    antiderrumbe_zanja: 'Antiderrumbe Zanja',
    altura_escalera:    'Altura Escalera',
    altura_andamio:     'Altura Andamio',
    armado_andamios:    'Armado de Andamios',
    izaje:              'Izaje',
    loto:               'Loto',
};

// Mirror cliente de SsomaWorkerCertification::computeVencimiento (preview).
// NOTA: Date.setMonth desborda distinto a Carbon::addMonths (ej. 31-ene + 1 mes
// → 3-mar en JS vs 28-feb en Carbon). El backend es la autoridad; esto solo
// pinta una estimación antes de guardar.
export function computeVencimientoFromEmision(fechaEmision, vigenciaMeses) {
    if (!fechaEmision || !vigenciaMeses) return '';
    const d = new Date(fechaEmision);
    if (isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + Number(vigenciaMeses));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Mirror cliente de SsomaWorkerDocument::computeEstado (regla 30 días).
export function computeVigencia(fechaVencimiento) {
    if (!fechaVencimiento) return { estado: 'no_definido', dias: 0 };
    const venc = new Date(fechaVencimiento);
    if (isNaN(venc.getTime())) return { estado: 'no_definido', dias: 0 };
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    venc.setHours(0, 0, 0, 0);
    const MS = 86400000;
    const diff = Math.round((venc - hoy) / MS);
    if (diff < 0) return { estado: 'vencido', dias: Math.abs(diff) };
    if (diff <= 30) return { estado: 'por_vencer', dias: diff };
    return { estado: 'vigente', dias: 0 };
}

export const ESTADO_LABORAL_VARIANT = {
    Activo:     'success',
    Inactivo:   'danger',
    Cesado:     'danger',
    Vacaciones: 'warning',
    Licencia:   'blue',
};

export function formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    const dd   = String(date.getUTCDate()).padStart(2, '0');
    const mm   = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = date.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export function docEstadoText(estado, dias) {
    switch (estado) {
        case 'vigente':    return 'Vigente';
        case 'por_vencer': return `Por Vencer (${dias} días)`;
        case 'vencido':    return `Vencido (hace ${dias} días)`;
        default:           return 'No Definido';
    }
}

// Texto de hover para los iconos de la matriz: muestra la fecha de vencimiento
// y cuánto falta / cuánto pasó. `dias` solo trae valor en por_vencer/vencido.
export function vencimientoTooltip(estado, dias, fechaVencimiento) {
    const f = formatDate(fechaVencimiento);
    switch (estado) {
        case 'vigente':    return `Vence ${f}`;
        case 'por_vencer': return `Vence ${f} — en ${dias} día${dias === 1 ? '' : 's'}`;
        case 'vencido':    return `Vencido el ${f} — hace ${dias} día${dias === 1 ? '' : 's'}`;
        default:           return 'Sin fecha de vencimiento';
    }
}

export function initials(nombre) {
    if (!nombre) return '?';
    return nombre
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}
