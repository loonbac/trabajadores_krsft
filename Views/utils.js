/**
 * Trabajadores – Constants & pure helper functions.
 */
import { formatDate as _fmtDate } from '@/services/DateTimeService';

export const POLLING_MS = 3000;
export const CACHE_PREFIX = 'trabajadores_v1_';

export const DEFAULT_FORM = {
  dni: '', nombres: '', apellido_paterno: '', apellido_materno: '',
  fecha_nacimiento: '', genero: 'M', estado_civil: 'Soltero',
  telefono: '', email: '', direccion: '', cargo: '', tipo_trabajador: 'Administrativo',
  fecha_ingreso: '', tipo_contrato: 'Indefinido', estado: 'Activo',
  sueldo_basico: '', sistema_pensiones: '',
  contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
  contacto_emergencia_parentesco: '', observaciones: '',
};

export const GENERO_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
];

export const ESTADO_CIVIL_OPTIONS = [
  { value: 'Soltero', label: 'Soltero' },
  { value: 'Casado', label: 'Casado' },
  { value: 'Divorciado', label: 'Divorciado' },
  { value: 'Viudo', label: 'Viudo' },
];

export const TIPO_CONTRATO_OPTIONS = [
  { value: 'Indefinido', label: 'Indefinido' },
  { value: 'Plazo Fijo', label: 'Plazo Fijo' },
  { value: 'Temporal', label: 'Temporal' },
  { value: 'Practicas', label: 'Prácticas' },
];

export const ESTADO_OPTIONS = [
  { value: 'Activo', label: 'Activo' },
  { value: 'Inactivo', label: 'Inactivo' },
  { value: 'Cesado', label: 'Cesado' },
  { value: 'Vacaciones', label: 'Vacaciones' },
  { value: 'Licencia', label: 'Licencia' },
];

export const TIPO_TRABAJADOR_OPTIONS = [
  { value: 'Administrativo', label: 'Administrativo' },
  { value: 'Campo', label: 'Campo' },
];

export const PENSIONES_OPTIONS = [
  { value: '', label: 'Sin asignar' },
  { value: 'ONP', label: 'ONP' },
  { value: 'AFP Integra', label: 'AFP Integra' },
  { value: 'AFP Prima', label: 'AFP Prima' },
  { value: 'AFP Profuturo', label: 'AFP Profuturo' },
  { value: 'AFP Habitat', label: 'AFP Habitat' },
];

/* ── Pure helpers ── */

export function getModuleName() {
  return window.location.pathname.split('/')[1] || 'trabajadoreskrsft';
}

export function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

export function formatDate(date) {
  if (!date) return '-';
  return _fmtDate(date);
}

export function getInitials(t) {
  const first = t.nombres?.charAt(0) || '';
  const last = t.apellido_paterno?.charAt(0) || '';
  return (first + last).toUpperCase() || 'XX';
}

/* ── Cache ── */

export function saveToCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota */ }
}

export function loadFromCache(key) {
  try {
    const c = localStorage.getItem(CACHE_PREFIX + key);
    if (c) return JSON.parse(c).data;
  } catch { /* parse */ }
  return null;
}
