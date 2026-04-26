import {
  CalendarDaysIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';

function MetricCard({ title, value, accent = 'text-primary', icon }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
          {icon}
        </span>
      </div>
      <p className={`mt-3 text-2xl font-bold ${accent}`}>{value}</p>
    </article>
  );
}

export default function RrhhTab({
  rrhhOverview,
  payrollConcepts,
  payrollFormulaModel,
  payrollExcelSnapshot,
  legalParameters,
  plamePreview,
}) {
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Personal Activo"
          value={rrhhOverview.activeWorkers}
          accent="text-emerald-600"
          icon={<ShieldCheckIcon className="size-5" />}
        />
        <MetricCard
          title="Saldo Vacacional Est."
          value={`${rrhhOverview.estimatedVacationPool} dias`}
          accent="text-amber-600"
          icon={<CalendarDaysIcon className="size-5" />}
        />
        <MetricCard
          title="Pendientes Planilla"
          value={rrhhOverview.missingPayrollData}
          accent="text-rose-600"
          icon={<DocumentTextIcon className="size-5" />}
        />
        <MetricCard
          title="Pendientes PLAME"
          value={rrhhOverview.missingPlameData}
          accent="text-sky-600"
          icon={<DocumentTextIcon className="size-5" />}
        />
        <MetricCard
          title="Cumplimiento RRHH"
          value={`${rrhhOverview.complianceScore}%`}
          accent="text-primary"
          icon={<ScaleIcon className="size-5" />}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">Conceptos de Planilla</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Codigo</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Formula base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollConcepts.map((c) => (
                  <tr key={c.code}>
                    <td className="px-4 py-2 font-semibold text-gray-700">{c.code}</td>
                    <td className="px-4 py-2 text-gray-700">{c.name}</td>
                    <td className="px-4 py-2 text-gray-600">{c.type}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{c.formula}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">Parametros Legales 2026</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Parametro</th>
                  <th className="px-4 py-2 text-left">Valor</th>
                  <th className="px-4 py-2 text-left">Vigencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {legalParameters.map((p) => (
                  <tr key={p.code}>
                    <td className="px-4 py-2 text-gray-700">{p.name}</td>
                    <td className="px-4 py-2 font-semibold text-gray-800">{p.value} {p.unit}</td>
                    <td className="px-4 py-2 text-gray-600">{p.valid_from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">Preview PLAME / T-Registro</h3>
          <p className="mt-1 text-xs text-gray-500">Validacion previa de campos obligatorios para exportacion del periodo.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">DNI</th>
                <th className="px-4 py-2 text-left">Trabajador</th>
                <th className="px-4 py-2 text-left">Periodo</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plamePreview.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{row.dni}</td>
                  <td className="px-4 py-2 text-gray-700">{row.name}</td>
                  <td className="px-4 py-2 text-gray-600">{row.period}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.status === 'listo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {row.issues.length ? row.issues.join(', ') : 'Completo'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">Motor de Calculo (segun Excel de Planilla)</h3>
            <p className="mt-1 text-xs text-gray-500">Reglas derivadas de formulas reales del archivo de planilla.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Concepto</th>
                  <th className="px-4 py-2 text-left">Regla</th>
                  <th className="px-4 py-2 text-left">Referencia Excel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollFormulaModel.map((m) => (
                  <tr key={m.key}>
                    <td className="px-4 py-2 font-semibold text-gray-700">{m.label}</td>
                    <td className="px-4 py-2 text-gray-600">{m.formula}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{m.excelReference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">Conciliacion Excel vs Base RRHH</h3>
            <p className="mt-1 text-xs text-gray-500">Fuente: {payrollExcelSnapshot.sourceFile}</p>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                <p className="text-xs uppercase tracking-wide text-gray-500">En Excel</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{payrollExcelSnapshot.workersInExcel}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Coinciden</p>
                <p className="mt-1 text-xl font-bold text-emerald-700">{payrollExcelSnapshot.workersMatchedByDni}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xs uppercase tracking-wide text-amber-700">Nuevos/Faltantes</p>
                <p className="mt-1 text-xl font-bold text-amber-700">{payrollExcelSnapshot.workersMissingInDb}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Trabajadores no presentes en padrón</p>
              <div className="mt-2 space-y-1.5">
                {payrollExcelSnapshot.missingWorkers.map((w) => (
                  <div key={w.dni} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                    <span className="font-medium text-gray-700">{w.nombre}</span>
                    <span className="font-mono text-xs text-gray-500">{w.dni}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Total Remuneracion</p>
                <p className="mt-1 text-lg font-bold text-gray-900">S/ {payrollExcelSnapshot.remuneracionTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Neto a Pagar</p>
                <p className="mt-1 text-lg font-bold text-primary">S/ {payrollExcelSnapshot.netoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Distribucion Sistema de Pensiones</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {payrollExcelSnapshot.pensionDistribution.map((p) => (
                  <span key={p.system} className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {p.system}: {p.workers}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      <article className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600 shadow-sm">
        La seccion RRHH aplica tus plantillas: vacaciones y ausencias, catalogo de planilla, layout PLAME/T-Registro,
        parametros legales y trazabilidad de cumplimiento. El siguiente paso es persistir solicitudes ARCO y licencias en tablas dedicadas.
      </article>
    </div>
  );
}
