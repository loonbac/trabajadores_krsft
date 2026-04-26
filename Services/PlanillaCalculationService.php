<?php

namespace Modulos_ERP\TrabajadoresKrsft\Services;

use Modulos_ERP\TrabajadoresKrsft\Models\Trabajador;
use Modulos_ERP\TrabajadoresKrsft\Models\RrhhPlanilla;
use Modulos_ERP\TrabajadoresKrsft\Models\RrhhPlanillaTrabajador;
use Modulos_ERP\TrabajadoresKrsft\Models\RrhhPlanillaDetalle;
use Modulos_ERP\TrabajadoresKrsft\Models\RrhhPayrollConcept;
use Carbon\Carbon;

class PlanillaCalculationService
{
    /**
     * Retorna los conceptos activos agrupados por tipo.
     */
    public function getConceptosByTipo(): array
    {
        $conceptos = RrhhPayrollConcept::where('estado', true)->get()->groupBy('tipo');
        return [
            'ingresos'    => $conceptos->get('ingreso', collect()),
            'descuentos'  => $conceptos->get('descuento', collect()),
            'aportes'     => $conceptos->get('aporte', collect()),
        ];
    }

    /**
     * Calcular los días laborables reales del periodo hasta la fecha actual
     * (o hasta el último día del mes si ya cerró).
     *
     * Lógica real tomada del Excel: el mes tiene 30 días base.
     * Domingos del periodo se descartan como días no laborables.
     */
    public function calcularDiasReales(string $periodo): int
    {
        $inicio  = Carbon::parse($periodo . '-01');
        $hoy     = Carbon::now();
        $finMes  = $inicio->copy()->endOfMonth();

        // Si el mes ya terminó, usar el último día. Si aún está en curso, usar hoy.
        $corte = $hoy->lt($finMes) ? $hoy : $finMes;

        $diasLaborables = 0;
        $cursor = $inicio->copy();
        while ($cursor->lte($corte)) {
            // Solo contamos lunes a sábado (domingo = 0 en dayOfWeek)
            if ($cursor->dayOfWeek !== Carbon::SUNDAY) {
                $diasLaborables++;
            }
            $cursor->addDay();
        }

        return $diasLaborables;
    }

    /**
     * Evalúa una fórmula de concepto dado un contexto de variables del trabajador.
     *
     * Variables disponibles en las fórmulas:
     *   - base_mensual     → sueldo_basico
     *   - base_provisional → base de aportación (bruto + asig_familiar + vac_truncas)
     *   - base_salud       → base para EsSalud
     *   - horas_extra      → horas trabajadas por encima de la jornada normal
     *   - tarifa_hora      → sueldo_basico / 30 / 8
     *   - tasa_afp         → comisión AFP del trabajador (variable según AFP)
     */
    public function evaluarFormula(string $formula_base, array $ctx): float
    {
        $expression = $formula_base;

        foreach ($ctx as $var => $valor) {
            $expression = str_replace($var, (string) $valor, $expression);
        }

        // Evaluar de forma segura: solo se permite aritmética básica
        if (preg_match('/^[\d\s\.\+\-\*\/\(\)]+$/', $expression)) {
            return (float) eval("return ({$expression});");
        }

        return 0.0;
    }

    /**
     * Calcula y persiste la planilla completa para un trabajador en un periodo.
     *
     * @param RrhhPlanilla $planilla
     * @param Trabajador   $trabajador
     * @param float        $diasTrabajados  Días reales trabajados (puede venir de asistencia o manual)
     * @param float        $horasExtra      Horas extra (por defecto 0)
     * @param array        $overrides       Montos manuales por concepto ['codigo_concepto' => monto]
     * @return RrhhPlanillaTrabajador
     */
    public function calcular(
        RrhhPlanilla $planilla,
        Trabajador   $trabajador,
        float        $diasTrabajados,
        float        $horasExtra = 0.0,
        array        $overrides  = []
    ): RrhhPlanillaTrabajador {

        $sueldoBasico  = (float) $trabajador->sueldo_basico;
        $diasUtiles    = max($planilla->dias_utiles, 1);
        $tarifa_hora   = round($sueldoBasico / 30 / 8, 6);

        // Determinar tasa AFP según sistema de pensiones del trabajador
        $tasa_afp = $this->tasaAfp($trabajador->sistema_pensiones ?? '');

        // ─── Contexto de cálculo ─────────────────────────────────────────────
        // Remuneración proporcional a días trabajados
        $remuneracion_proporcional = round($sueldoBasico * ($diasTrabajados / 30), 2);

        // Asignación familiar (S/ 112.50 mensual, 10% de la RMV 2026: S/ 1,025)
        $asignacion_familiar = $this->tieneAsignacionFamiliar($trabajador) ? 102.50 : 0.0;

        // Vacaciones truncas y gratificación trunca se calculan solo si hay cese,
        // por simplicidad se dejan en 0 en planilla mensual corriente.
        $vac_truncas = 0.0;

        $base_provisional = $remuneracion_proporcional + $asignacion_familiar + $vac_truncas;
        $base_salud       = $base_provisional; // EsSalud usa misma base

        $ctx = [
            'base_mensual'     => $sueldoBasico,
            'base_provisional' => $base_provisional,
            'base_salud'       => $base_salud,
            'horas_extra'      => $horasExtra,
            'tarifa_hora'      => $tarifa_hora,
            'tasa_afp'         => $tasa_afp,
            'dias_trabajados'  => $diasTrabajados,
        ];

        // ─── Calcular conceptos ─────────────────────────────────────────────
        $conceptos = RrhhPayrollConcept::where('estado', true)->get();

        $totalIngresos   = 0.0;
        $totalDescuentos = 0.0;
        $totalAportes    = 0.0;
        $detalles        = [];

        foreach ($conceptos as $concepto) {
            // Permite sobreescribir un monto manualmente
            if (isset($overrides[$concepto->codigo])) {
                $monto = (float) $overrides[$concepto->codigo];
            } elseif ($concepto->formula_base) {
                $monto = $this->evaluarFormula($concepto->formula_base, $ctx);
            } else {
                $monto = 0.0;
            }

            $monto = round($monto, 2);

            // Acumular según tipo
            match ($concepto->tipo) {
                'ingreso'   => $totalIngresos   += $monto,
                'descuento' => $totalDescuentos += $monto,
                'aporte'    => $totalAportes    += $monto,
            };

            $detalles[] = [
                'concepto_id'     => $concepto->id,
                'monto_calculado' => $monto,
            ];
        }

        $netoPagar = round($totalIngresos - $totalDescuentos, 2);

        // ─── Persistir planilla del trabajador ────────────────────────────
        /** @var RrhhPlanillaTrabajador $registro */
        $registro = RrhhPlanillaTrabajador::updateOrCreate(
            [
                'planilla_id'    => $planilla->id,
                'trabajador_id'  => $trabajador->id,
            ],
            [
                'dias_trabajados'  => $diasTrabajados,
                'horas_trabajadas' => round($diasTrabajados * 8 + $horasExtra, 2),
                'total_ingresos'   => $totalIngresos,
                'total_descuentos' => $totalDescuentos,
                'total_aportes'    => $totalAportes,
                'neto_a_pagar'     => $netoPagar,
            ]
        );

        // Borrar detalles previos y reinsertar
        $registro->detalles()->delete();

        foreach ($detalles as $detalle) {
            RrhhPlanillaDetalle::create([
                'planilla_trabajador_id' => $registro->id,
                'concepto_id'            => $detalle['concepto_id'],
                'monto_calculado'        => $detalle['monto_calculado'],
            ]);
        }

        return $registro->load(['detalles.concepto', 'trabajador']);
    }

    /**
     * Calcular la planilla completa para TODOS los trabajadores activos del periodo.
     * Usa días reales hasta hoy si el mes no ha cerrado.
     *
     * @return array  [ 'procesados' => n, 'errores' => [...] ]
     */
    public function calcularPlanillaCompleta(RrhhPlanilla $planilla, array $overridesPorDni = []): array
    {
        $trabajadores = Trabajador::where('estado', 'Activo')->get();
        $procesados   = 0;
        $errores      = [];

        $diasReales = $this->calcularDiasReales($planilla->periodo);

        foreach ($trabajadores as $trabajador) {
            try {
                $dias     = $overridesPorDni[$trabajador->dni]['dias'] ?? $diasReales;
                $hExtra   = $overridesPorDni[$trabajador->dni]['horas_extra'] ?? 0;
                $overrides = $overridesPorDni[$trabajador->dni]['overrides'] ?? [];

                $this->calcular($planilla, $trabajador, $dias, $hExtra, $overrides);
                $procesados++;
            } catch (\Throwable $e) {
                $errores[] = [
                    'dni'   => $trabajador->dni,
                    'nombre'=> $trabajador->nombre_completo,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return compact('procesados', 'errores');
    }

    // ─── Helpers privados ──────────────────────────────────────────────────

    /**
     * Retorna la tasa porcentual de AFP según afiliación.
     * Estructura vigente Perú 2026:
     *  - ONP : 13%
     *  - AFP (aportación obligatoria): 10%
     *  - Seguro AFP: 1.37%
     *  - Comisión AFP (mixta Integra ref.): 0% — se puede parametrizar
     */
    private function tasaAfp(string $sistema): float
    {
        return match (true) {
            str_contains(strtolower($sistema), 'onp')      => 0.13,
            str_contains(strtolower($sistema), 'integra')  => 0.10,
            str_contains(strtolower($sistema), 'prima')    => 0.10,
            str_contains(strtolower($sistema), 'profuturo')=> 0.10,
            str_contains(strtolower($sistema), 'habitat')  => 0.10,
            default                                        => 0.10,
        };
    }

    /**
     * Determina si el trabajador tiene asignación familiar
     * (placeholder: en producción leer campo específico del trabajador).
     */
    private function tieneAsignacionFamiliar(Trabajador $trabajador): bool
    {
        // TODO: agregar campo `tiene_asignacion_familiar` a la tabla de trabajadores
        return false;
    }
}
