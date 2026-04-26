<?php

namespace Modulos_ERP\TrabajadoresKrsft\Controllers;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Modulos_ERP\TrabajadoresKrsft\Models\RrhhPlanilla;
use Modulos_ERP\TrabajadoresKrsft\Models\RrhhPlanillaTrabajador;
use Modulos_ERP\TrabajadoresKrsft\Models\RrhhPayrollConcept;
use Modulos_ERP\TrabajadoresKrsft\Models\Trabajador;
use Modulos_ERP\TrabajadoresKrsft\Services\PlanillaCalculationService;

class PlanillaController extends Controller
{
    public function __construct(private PlanillaCalculationService $calculationService) {}

    // ─── Planillas ──────────────────────────────────────────────────────────

    /**
     * GET /api/trabajadoreskrsft/planillas
     * Lista todas las planillas con su resumen.
     */
    public function index(Request $request)
    {
        $planillas = RrhhPlanilla::withCount('trabajadores')
            ->orderByDesc('periodo')
            ->paginate(12);

        return response()->json([
            'success'   => true,
            'planillas' => $planillas,
        ]);
    }

    /**
     * POST /api/trabajadoreskrsft/planillas
     * Crea una planilla nueva (estado: borrador).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'periodo'     => 'required|string|regex:/^\d{4}-\d{2}$/|unique:rrhh_planillas,periodo',
            'descripcion' => 'nullable|string|max:255',
            'dias_utiles' => 'nullable|integer|min:1|max:31',
        ]);

        $diasReales = $this->calculationService->calcularDiasReales($data['periodo']);

        $planilla = RrhhPlanilla::create([
            'periodo'     => $data['periodo'],
            'descripcion' => $data['descripcion'] ?? "Planilla {$data['periodo']}",
            'dias_utiles' => $data['dias_utiles'] ?? $diasReales,
            'estado'      => 'borrador',
            'created_by'  => auth()->id(),
        ]);

        return response()->json([
            'success'  => true,
            'message'  => 'Planilla creada correctamente.',
            'planilla' => $planilla,
        ]);
    }

    /**
     * GET /api/trabajadoreskrsft/planillas/{id}
     * Detalle de una planilla con todos sus trabajadores y totales.
     */
    public function show(int $id)
    {
        $planilla = RrhhPlanilla::with([
            'trabajadores.trabajador:id,dni,nombre_completo,cargo,sistema_pensiones,sueldo_basico,fecha_ingreso,fecha_cese,departamento,tipo_trabajador',
            'trabajadores.detalles.concepto',
        ])->findOrFail($id);

        $totales = [
            'total_ingresos'   => $planilla->trabajadores->sum('total_ingresos'),
            'total_descuentos' => $planilla->trabajadores->sum('total_descuentos'),
            'total_aportes'    => $planilla->trabajadores->sum('total_aportes'),
            'neto_a_pagar'     => $planilla->trabajadores->sum('neto_a_pagar'),
            'num_trabajadores' => $planilla->trabajadores->count(),
        ];

        return response()->json([
            'success'  => true,
            'planilla' => $planilla,
            'totales'  => $totales,
        ]);
    }

    /**
     * POST /api/trabajadoreskrsft/planillas/{id}/calcular
     * Ejecuta el motor de cálculo para todos los trabajadores activos.
     *
     * Body opcional: { "overrides": { "DNI": { "dias": 20, "horas_extra": 4 } } }
     */
    public function calcular(Request $request, int $id)
    {
        $planilla = RrhhPlanilla::findOrFail($id);

        if ($planilla->estado === 'pagado') {
            return response()->json([
                'success' => false,
                'message' => 'No se puede recalcular una planilla ya pagada.',
            ], 422);
        }

        $overridesPorDni = $request->input('overrides', []);

        $resultado = $this->calculationService->calcularPlanillaCompleta($planilla, $overridesPorDni);

        return response()->json([
            'success'    => true,
            'message'    => "Planilla calculada: {$resultado['procesados']} trabajadores procesados.",
            'procesados' => $resultado['procesados'],
            'errores'    => $resultado['errores'],
        ]);
    }

    /**
     * POST /api/trabajadoreskrsft/planillas/{id}/trabajador/{trabajadorId}
     * Recalcula la planilla de un trabajador específico (ajuste manual de días).
     */
    public function calcularTrabajador(Request $request, int $id, int $trabajadorId)
    {
        $planilla    = RrhhPlanilla::findOrFail($id);
        $trabajador  = Trabajador::findOrFail($trabajadorId);

        if ($planilla->estado === 'pagado') {
            return response()->json(['success' => false, 'message' => 'Planilla ya pagada.'], 422);
        }

        $data = $request->validate([
            'dias_trabajados' => 'required|numeric|min:0|max:31',
            'horas_extra'     => 'nullable|numeric|min:0',
            'overrides'       => 'nullable|array',
        ]);

        $registro = $this->calculationService->calcular(
            $planilla,
            $trabajador,
            (float) $data['dias_trabajados'],
            (float) ($data['horas_extra'] ?? 0),
            $data['overrides'] ?? []
        );

        return response()->json([
            'success'  => true,
            'message'  => 'Trabajador recalculado.',
            'registro' => $registro,
        ]);
    }

    /**
     * PATCH /api/trabajadoreskrsft/planillas/{id}/estado
     * Cambia el estado de la planilla: borrador → aprobado → pagado.
     */
    public function cambiarEstado(Request $request, int $id)
    {
        $planilla = RrhhPlanilla::findOrFail($id);
        $data     = $request->validate([
            'estado' => 'required|in:borrador,aprobado,pagado',
        ]);

        $transicionesValidas = [
            'borrador' => ['aprobado'],
            'aprobado' => ['pagado', 'borrador'],
            'pagado'   => [],
        ];

        if (!in_array($data['estado'], $transicionesValidas[$planilla->estado])) {
            return response()->json([
                'success' => false,
                'message' => "No se puede pasar de '{$planilla->estado}' a '{$data['estado']}'.",
            ], 422);
        }

        $planilla->update(['estado' => $data['estado']]);

        return response()->json([
            'success'  => true,
            'message'  => "Planilla marcada como {$data['estado']}.",
            'planilla' => $planilla,
        ]);
    }

    /**
     * GET /api/trabajadoreskrsft/planillas/{id}/boleta/{trabajadorId}
     * Devuelve la boleta detallada de un trabajador en el periodo.
     */
    public function boleta(int $id, int $trabajadorId)
    {
        $registro = RrhhPlanillaTrabajador::with([
            'trabajador:id,dni,nombre_completo,cargo,sistema_pensiones,sueldo_basico,banco,numero_cuenta',
            'planilla:id,periodo,descripcion',
            'detalles.concepto',
        ])
        ->where('planilla_id', $id)
        ->where('trabajador_id', $trabajadorId)
        ->firstOrFail();

        // Agrupar detalles por tipo de concepto
        $boletaAgrupada = [
            'ingresos'   => $registro->detalles->filter(fn($d) => $d->concepto->tipo === 'ingreso'),
            'descuentos' => $registro->detalles->filter(fn($d) => $d->concepto->tipo === 'descuento'),
            'aportes'    => $registro->detalles->filter(fn($d) => $d->concepto->tipo === 'aporte'),
        ];

        return response()->json([
            'success'         => true,
            'registro'        => $registro,
            'boleta_agrupada' => $boletaAgrupada,
        ]);
    }

    // ─── Conceptos de Planilla ─────────────────────────────────────────────

    /**
     * GET /api/trabajadoreskrsft/planillas/conceptos
     */
    public function conceptos()
    {
        $conceptos = RrhhPayrollConcept::orderBy('tipo')->orderBy('codigo')->get();

        return response()->json([
            'success'   => true,
            'conceptos' => $conceptos,
        ]);
    }

    /**
     * POST /api/trabajadoreskrsft/planillas/conceptos
     */
    public function storeConcepto(Request $request)
    {
        $data = $request->validate([
            'codigo'       => 'required|string|max:50|unique:rrhh_payroll_concepts,codigo',
            'nombre'       => 'required|string|max:150',
            'tipo'         => 'required|in:ingreso,descuento,aporte',
            'formula_base' => 'nullable|string',
            'estado'       => 'nullable|boolean',
        ]);

        $concepto = RrhhPayrollConcept::create($data);

        return response()->json(['success' => true, 'concepto' => $concepto]);
    }

    /**
     * PUT /api/trabajadoreskrsft/planillas/conceptos/{id}
     */
    public function updateConcepto(Request $request, int $id)
    {
        $concepto = RrhhPayrollConcept::findOrFail($id);

        $data = $request->validate([
            'nombre'       => 'sometimes|string|max:150',
            'tipo'         => 'sometimes|in:ingreso,descuento,aporte',
            'formula_base' => 'nullable|string',
            'estado'       => 'nullable|boolean',
        ]);

        $concepto->update($data);

        return response()->json(['success' => true, 'concepto' => $concepto]);
    }
}
