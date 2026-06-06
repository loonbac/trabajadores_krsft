<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SsomaCertificationType extends Model
{
    protected $table = 'ssoma_certification_types';

    protected $fillable = [
        'codigo',
        'nombre',
        'vigencia_meses',
        'activo',
        'orden',
    ];

    protected $casts = [
        'vigencia_meses' => 'integer',
        'activo'         => 'boolean',
        'orden'          => 'integer',
    ];

    public function workerCertifications(): HasMany
    {
        return $this->hasMany(SsomaWorkerCertification::class, 'certification_type_id');
    }
}
