<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;

class RrhhPlanillaTrabajador extends Model
{
    protected $table = 'rrhh_planilla_trabajadores';

    protected $fillable = [
        'planilla_id',
        'trabajador_id',
        'dias_trabajados',
        'horas_trabajadas',
        'total_ingresos',
        'total_descuentos',
        'total_aportes',
        'neto_a_pagar',
        'observaciones'
    ];

    protected $casts = [
        'dias_trabajados'  => 'decimal:2',
        'horas_trabajadas' => 'decimal:2',
        'total_ingresos'   => 'decimal:2',
        'total_descuentos' => 'decimal:2',
        'total_aportes'    => 'decimal:2',
        'neto_a_pagar'     => 'decimal:2',
    ];

    public function planilla()
    {
        return $this->belongsTo(RrhhPlanilla::class, 'planilla_id');
    }

    public function trabajador()
    {
        return $this->belongsTo(Trabajador::class, 'trabajador_id');
    }

    public function detalles()
    {
        return $this->hasMany(RrhhPlanillaDetalle::class, 'planilla_trabajador_id');
    }
}
