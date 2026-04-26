<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;

class RrhhPayrollConcept extends Model
{
    protected $table = 'rrhh_payroll_concepts';

    protected $fillable = [
        'codigo',
        'nombre',
        'tipo',
        'formula_base',
        'estado'
    ];

    protected $casts = [
        'estado' => 'boolean',
    ];

    public function detalles()
    {
        return $this->hasMany(RrhhPlanillaDetalle::class, 'concepto_id');
    }
}
