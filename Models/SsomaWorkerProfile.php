<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;

class SsomaWorkerProfile extends Model
{
    protected $table = 'ssoma_worker_profiles';

    protected $fillable = [
        'trabajador_id',
        'ubicacion',
        'supervisor',
        'modalidad',
        'aptitud_medica',
        'fotocheck_path',
    ];
}
