<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;

class RrhhPlanillaDetalle extends Model
{
    protected $table = 'rrhh_planilla_detalles';

    protected $fillable = [
        'planilla_trabajador_id',
        'concepto_id',
        'monto_calculado'
    ];

    protected $casts = [
        'monto_calculado' => 'decimal:2',
    ];

    public function trabajadorPlanilla()
    {
        return $this->belongsTo(RrhhPlanillaTrabajador::class, 'planilla_trabajador_id');
    }

    public function concepto()
    {
        return $this->belongsTo(RrhhPayrollConcept::class, 'concepto_id');
    }
}
