<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PdrMetaEjecucion extends Model
{
    protected $table = 'pdr_metas_ejecuciones';

    protected $fillable = [
        'meta_asignada_id',
        'tipo_ejecucion',
        'datos_json',
        'estado',
        'observaciones',
        'area',
        'fecha_ejecucion',
    ];

    protected $casts = [
        'datos_json'      => 'array',
        'fecha_ejecucion' => 'datetime',
    ];

    public function metaAsignada(): BelongsTo
    {
        return $this->belongsTo(PdrMetaAsignada::class, 'meta_asignada_id');
    }

    public function hallazgos(): HasMany
    {
        return $this->hasMany(PdrHallazgo::class, 'ejecucion_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(PdrEjecucionFile::class, 'ejecucion_id');
    }

    public function scopeConHallazgo($query)
    {
        return $query->whereIn('estado', ['observado', 'critico']);
    }
}
