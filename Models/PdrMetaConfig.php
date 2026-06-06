<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PdrMetaConfig extends Model
{
    protected $table = 'pdr_metas_config';

    protected $fillable = [
        'nombre',
        'slug',
        'tipo_frecuencia',
        'cantidad_requerida',
        'es_obligatoria',
        'orden',
        'is_active',
    ];

    protected $casts = [
        'cantidad_requerida' => 'integer',
        'es_obligatoria'     => 'boolean',
        'orden'              => 'integer',
        'is_active'          => 'boolean',
    ];

    public function metasAsignadas(): HasMany
    {
        return $this->hasMany(PdrMetaAsignada::class, 'meta_config_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('orden')->orderBy('nombre');
    }

    public function getFrecuenciaLabelAttribute(): string
    {
        return match ($this->tipo_frecuencia) {
            'diaria'   => 'Diaria',
            'semanal'  => 'Semanal',
            'mensual'  => 'Mensual',
            default    => $this->tipo_frecuencia,
        };
    }
}
