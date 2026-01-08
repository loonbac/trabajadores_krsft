<?php

namespace Modulos_ERP\trabajadores_krsft\Models;

use Illuminate\Database\Eloquent\Model;

class Trabajador extends Model
{
    protected $table = 'trabajadores';

    protected $fillable = [
        'dni', 'nombres', 'apellido_paterno', 'apellido_materno', 'nombre_completo',
        'fecha_nacimiento', 'lugar_nacimiento', 'genero', 'estado_civil', 'sistema_pensiones',
        'telefono', 'email', 'direccion', 'distrito', 'provincia', 'departamento',
        'area_id', 'cargo', 'fecha_ingreso', 'fecha_cese', 'tipo_contrato', 'estado',
        'sueldo_basico', 'banco', 'numero_cuenta', 'tiene_antecedentes_penales',
        'tiene_antecedentes_policiales', 'tiene_sctr', 'tiene_epsrc',
        'contacto_emergencia_nombre', 'contacto_emergencia_telefono',
        'contacto_emergencia_parentesco', 'observaciones', 'created_by'
    ];

    protected $casts = [
        'fecha_nacimiento' => 'date',
        'fecha_ingreso' => 'date',
        'fecha_cese' => 'date',
        'sueldo_basico' => 'decimal:2',
        'tiene_antecedentes_penales' => 'boolean',
        'tiene_antecedentes_policiales' => 'boolean',
        'tiene_sctr' => 'boolean',
        'tiene_epsrc' => 'boolean',
    ];
}
