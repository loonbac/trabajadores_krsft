<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PdrMetaAsignada extends Model
{
    protected $table = 'pdr_metas_asignadas';

    protected $fillable = [
        'supervisor_id',
        'meta_config_id',
        'periodo_inicio',
        'periodo_fin',
        'estado',
        'progreso_actual',
    ];

    protected $casts = [
        'periodo_inicio'  => 'date',
        'periodo_fin'     => 'date',
        'progreso_actual' => 'integer',
    ];

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(PdrSupervisor::class, 'supervisor_id');
    }

    public function metaConfig(): BelongsTo
    {
        return $this->belongsTo(PdrMetaConfig::class, 'meta_config_id');
    }

    public function ejecuciones(): HasMany
    {
        return $this->hasMany(PdrMetaEjecucion::class, 'meta_asignada_id');
    }

    public function scopeForPeriod($query, $start, $end)
    {
        return $query->where('periodo_inicio', $start)
                     ->where('periodo_fin', $end);
    }

    public function scopePendiente($query)
    {
        return $query->where('estado', 'pendiente');
    }

    public function getPorcentajeCumplimientoAttribute(): float
    {
        $requerida = $this->metaConfig?->cantidad_requerida ?? 1;

        if ($requerida <= 0) {
            return 0.0;
        }

        return round(min($this->progreso_actual / $requerida, 1.0) * 100, 1);
    }
}
