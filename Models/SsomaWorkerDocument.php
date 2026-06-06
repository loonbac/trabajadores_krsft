<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class SsomaWorkerDocument extends Model
{
    protected $table = 'ssoma_worker_documents';

    protected $fillable = [
        'trabajador_id',
        'tipo',
        'fecha_emision',
        'fecha_vencimiento',
        'notas',
    ];

    protected $casts = [
        'fecha_emision'     => 'date',
        'fecha_vencimiento' => 'date',
    ];

    /**
     * Computa el estado de vencimiento dado fecha_vencimiento.
     *
     * @param  string|null $fechaVencimiento
     * @return array{estado: string, dias: int}
     */
    public static function computeEstado(?string $fechaVencimiento): array
    {
        if (empty($fechaVencimiento)) {
            return ['estado' => 'no_definido', 'dias' => 0];
        }

        $hoy    = Carbon::today();
        $vence  = Carbon::parse($fechaVencimiento)->startOfDay();
        $limite = $hoy->copy()->addDays(30);

        if ($vence->lt($hoy)) {
            return ['estado' => 'vencido', 'dias' => (int) abs($hoy->diffInDays($vence))];
        }

        if ($vence->lte($limite)) {
            return ['estado' => 'por_vencer', 'dias' => (int) $hoy->diffInDays($vence)];
        }

        return ['estado' => 'vigente', 'dias' => 0];
    }
}
