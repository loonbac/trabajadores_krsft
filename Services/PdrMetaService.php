<?php

namespace Modulos_ERP\TrabajadoresKrsft\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Modulos_ERP\TrabajadoresKrsft\Models\PdrHallazgo;
use Modulos_ERP\TrabajadoresKrsft\Models\PdrMetaAsignada;
use Modulos_ERP\TrabajadoresKrsft\Models\PdrMetaConfig;
use Modulos_ERP\TrabajadoresKrsft\Models\PdrMetaEjecucion;
use Modulos_ERP\TrabajadoresKrsft\Models\PdrSupervisor;

class PdrMetaService
{
    /**
     * Generate period assignments for all active supervisors × active meta configs.
     * Idempotent: skips existing (supervisor, config, period) combinations.
     *
     * El loop se ejecuta dentro de una transacción y se traga la UniqueConstraint
     * residual como no-op para que un dashboard GET (que dispara esto en cada
     * mutación del PDR) nunca pueda devolver 500.
     *
     * @return int Number of new assignments created
     */
    public function generarMetasPeriodo(Carbon $fecha, ?int $supervisorId = null): int
    {
        $supervisores = PdrSupervisor::active()
            ->when($supervisorId, fn ($q) => $q->where('id', $supervisorId))
            ->get();

        $configs = PdrMetaConfig::active()->get();
        $created = 0;

        DB::transaction(function () use ($supervisores, $configs, $fecha, &$created) {
            foreach ($supervisores as $supervisor) {
                foreach ($configs as $config) {
                    // Fechas como Y-m-d para evitar drift de hora/timezone y matchear
                    // exactamente lo guardado en BD.
                    $inicio = $this->inicioPeriodo($fecha, $config->tipo_frecuencia)->toDateString();
                    $fin    = $this->finPeriodo($fecha, $config->tipo_frecuencia)->toDateString();

                    // firstOrCreate es atómico: la constraint única pdr_asignada_periodo_unique
                    // evita duplicados aunque el check + create manual no.
                    try {
                        $asignada = PdrMetaAsignada::firstOrCreate(
                            [
                                'supervisor_id'   => $supervisor->id,
                                'meta_config_id'  => $config->id,
                                'periodo_inicio'  => $inicio,
                                'periodo_fin'     => $fin,
                            ],
                            [
                                'estado'          => 'pendiente',
                                'progreso_actual' => 0,
                            ]
                        );

                        if ($asignada->wasRecentlyCreated) {
                            $created++;
                        }
                    } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
                        // Carrera con otro request o fila huérfana pre-fix:
                        // contamos la fila sobreviviente como existente y seguimos.
                        continue;
                    }
                }
            }
        });

        return $created;
    }

    /**
     * Calculate period start date based on frequency.
     */
    public function inicioPeriodo(Carbon $fecha, string $frecuencia): Carbon
    {
        return match ($frecuencia) {
            'diaria'   => $fecha->copy()->startOfDay(),
            'semanal'  => $fecha->copy()->startOfWeek(Carbon::MONDAY),
            'mensual'  => $fecha->copy()->startOfMonth(),
            default    => $fecha->copy()->startOfDay(),
        };
    }

    /**
     * Calculate period end date based on frequency.
     */
    public function finPeriodo(Carbon $fecha, string $frecuencia): Carbon
    {
        return match ($frecuencia) {
            'diaria'   => $fecha->copy()->endOfDay(),
            'semanal'  => $fecha->copy()->endOfWeek(Carbon::SUNDAY),
            'mensual'  => $fecha->copy()->endOfMonth(),
            default    => $fecha->copy()->endOfDay(),
        };
    }

    /**
     * Record an execution against a meta assignment.
     * Wraps creation + progress update in a transaction.
     */
    public function registrarEjecucion(array $data): PdrMetaEjecucion
    {
        return DB::transaction(function () use ($data) {
            $ejecucion = PdrMetaEjecucion::create($data);
            $this->actualizarProgreso($ejecucion->meta_asignada_id);

            return $ejecucion;
        });
    }

    /**
     * Auto-create a hallazgo when execution estado is observado or critico.
     */
    public function autoCreateHallazgo(PdrMetaEjecucion $ejecucion): ?PdrHallazgo
    {
        if (! in_array($ejecucion->estado, ['observado', 'critico'])) {
            return null;
        }

        return PdrHallazgo::create([
            'ejecucion_id'        => $ejecucion->id,
            'tipo_hallazgo'       => $ejecucion->estado,
            'descripcion'         => $ejecucion->observaciones ?? 'Hallazgo detectado durante la ejecución',
            'area'                => $ejecucion->area,
            'estado_resolucion'   => 'abierto',
        ]);
    }

    /**
     * Recalculate progress and estado for a meta assignment.
     */
    public function actualizarProgreso(int $metaAsignadaId): void
    {
        $asignada = PdrMetaAsignada::with('metaConfig')->find($metaAsignadaId);

        if (! $asignada || ! $asignada->metaConfig) {
            return;
        }

        $total = $asignada->ejecuciones()->count();
        $requerida = $asignada->metaConfig->cantidad_requerida;

        $asignada->progreso_actual = $total;

        if ($total >= $requerida) {
            $asignada->estado = 'cumplida';
        } elseif ($total > 0) {
            $asignada->estado = 'parcial';
        } else {
            $asignada->estado = 'pendiente';
        }

        $asignada->save();
    }

    /**
     * Compute KPI summary for a supervisor (or global if supervisorId is null).
     */
    public function resumenSupervisor(?int $supervisorId, Carbon $desde, Carbon $hasta): array
    {
        $query = PdrMetaAsignada::with('metaConfig')
            ->where('periodo_inicio', '>=', $desde)
            ->where('periodo_fin', '<=', $hasta);

        if ($supervisorId) {
            $query->where('supervisor_id', $supervisorId);
        }

        $asignadas = $query->get();

        return [
            'total'     => $asignadas->count(),
            'cumplidas' => $asignadas->where('estado', 'cumplida')->count(),
            'parciales' => $asignadas->where('estado', 'parcial')->count(),
            'pendientes' => $asignadas->where('estado', 'pendiente')->count(),
            'vencidas'  => $asignadas->where('estado', 'vencida')->count(),
            'detalle'   => $asignadas->groupBy('metaConfig.slug')->map(fn ($group) => [
                'meta'      => $group->first()->metaConfig?->nombre,
                'asignadas' => $group->count(),
                'cumplidas' => $group->where('estado', 'cumplida')->count(),
            ]),
        ];
    }

    /**
     * Mark past-due assignments as vencida.
     *
     * @return int Number of assignments marked
     */
    public function marcarVencidas(): int
    {
        $hoy = Carbon::today();

        return PdrMetaAsignada::where('estado', 'pendiente')
            ->where('periodo_fin', '<', $hoy)
            ->update(['estado' => 'vencida']);
    }
}
