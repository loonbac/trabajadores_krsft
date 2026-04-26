<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;

class RrhhPlanilla extends Model
{
    protected $table = 'rrhh_planillas';

    protected $fillable = [
        'periodo',
        'descripcion',
        'dias_utiles',
        'estado',
        'created_by'
    ];

    public function trabajadores()
    {
        return $this->hasMany(RrhhPlanillaTrabajador::class, 'planilla_id');
    }
}
