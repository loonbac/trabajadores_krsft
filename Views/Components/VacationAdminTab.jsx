import { CalendarDaysIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';

function SummaryCard({ title, value, icon, valueClass = 'text-gray-900' }) {
  return (
    <article className="flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <span className="inline-flex size-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">{icon}</span>
      </div>
      <p className={`mt-4 text-3xl font-bold ${valueClass}`}>{value}</p>
    </article>
  );
}

export default function VacationAdminTab({
  vacationSummary,
  vacationSearch,
  setVacationSearch,
  filteredVacationBalances,
  vacationForm,
  setVacationFormField,
  createVacationRequest,
  vacationRequests,
  updateVacationRequestStatus,
}) {
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">Registrar solicitud</h3>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-gray-600">
              Trabajador
              <select
                value={vacationForm.trabajador_id}
                onChange={(e) => setVacationFormField('trabajador_id', e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700"
              >
                <option value="">Seleccionar...</option>
                {filteredVacationBalances.map((w) => (
                  <option key={w.id} value={w.id}>{w.nombre} - {w.dni}</option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-gray-600">
              Tipo
              <select
                value={vacationForm.tipo}
                onChange={(e) => setVacationFormField('tipo', e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700"
              >
                <option value="vacaciones">Vacaciones</option>
                <option value="licencia_con_goce">Licencia con goce</option>
                <option value="licencia_sin_goce">Licencia sin goce</option>
                <option value="descanso_medico">Descanso medico</option>
              </select>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-gray-600">
                Fecha inicio
                <input
                  type="date"
                  value={vacationForm.fecha_inicio}
                  onChange={(e) => setVacationFormField('fecha_inicio', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700"
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                Fecha fin
                <input
                  type="date"
                  value={vacationForm.fecha_fin}
                  onChange={(e) => setVacationFormField('fecha_fin', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700"
                />
              </label>
            </div>

            <label className="block text-xs font-medium text-gray-600">
              Motivo / sustento
              <textarea
                value={vacationForm.motivo}
                onChange={(e) => setVacationFormField('motivo', e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm text-gray-700"
                placeholder="Detalle del caso y evidencia"
              />
            </label>

            <Button onClick={createVacationRequest} className="w-full justify-center">Registrar en bandeja</Button>
          </div>
        </article>

        <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryCard title="Trabajadores Activos" value={vacationSummary.activos} icon={<CalendarDaysIcon className="size-5" />} valueClass="text-primary" />
          <SummaryCard title="Dias Disponibles" value={vacationSummary.diasDisponibles} icon={<CheckCircleIcon className="size-5" />} valueClass="text-emerald-600" />
          <SummaryCard title="Solicitudes Pendientes" value={vacationSummary.solicitudesPendientes} icon={<ClockIcon className="size-5" />} valueClass="text-amber-600" />
          <SummaryCard title="Solicitudes Aprobadas" value={vacationSummary.solicitudesAprobadas} icon={<CheckCircleIcon className="size-5" />} valueClass="text-sky-600" />
        </div>
      </section>

      <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">Bandeja de solicitudes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Trabajador</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Rango</th>
                <th className="px-4 py-2 text-right">Dias</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vacationRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Sin solicitudes registradas.</td>
                </tr>
              )}
              {vacationRequests.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-gray-800">{r.trabajador_nombre}</td>
                  <td className="px-4 py-2 text-gray-600">{r.tipo}</td>
                  <td className="px-4 py-2 text-gray-600">{r.fecha_inicio} a {r.fecha_fin}</td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-700">{r.dias}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      r.estado === 'aprobada'
                        ? 'bg-emerald-100 text-emerald-700'
                        : r.estado === 'rechazada'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateVacationRequestStatus(r.id, 'aprobada')}
                        className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircleIcon className="size-3.5" /> Aprobar
                      </button>
                      <button
                        onClick={() => updateVacationRequestStatus(r.id, 'rechazada')}
                        className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        <XCircleIcon className="size-3.5" /> Rechazar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="flex-shrink-0 whitespace-nowrap text-xs font-bold uppercase tracking-wide text-gray-700">Saldos de vacaciones por trabajador</h3>
            <input
              type="text"
              value={vacationSearch}
              onChange={(e) => setVacationSearch(e.target.value)}
              placeholder="Buscar por nombre, DNI o cargo..."
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm sm:w-72"
            />
          </div>
        </div>
        <div className="max-h-[340px] overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Trabajador</th>
                <th className="px-4 py-2 text-left">Cargo</th>
                <th className="px-4 py-2 text-right">Acumulado</th>
                <th className="px-4 py-2 text-right">Aprobado</th>
                <th className="px-4 py-2 text-right">Pendiente</th>
                <th className="px-4 py-2 text-right">Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVacationBalances.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-2">
                    <p className="whitespace-nowrap font-semibold text-gray-800">{w.nombre}</p>
                    <p className="text-xs text-gray-500">DNI: {w.dni || '-'}</p>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{w.cargo}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{w.accruedDays}</td>
                  <td className="px-4 py-2 text-right text-sky-700">{w.approvedDays}</td>
                  <td className="px-4 py-2 text-right text-amber-700">{w.pendingDays}</td>
                  <td className="px-4 py-2 text-right font-semibold text-emerald-700">{w.availableDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
