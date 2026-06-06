<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PdrHallazgo extends Model
{
    protected $table = 'pdr_hallazgos';

    protected $fillable = [
        'ejecucion_id',
        'tipo_hallazgo',
        'descripcion',
        'area',
        'estado_resolucion',
        'fecha_cierre',
    ];

    protected $casts = [
        'fecha_cierre' => 'datetime',
    ];

    public function ejecucion(): BelongsTo
    {
        return $this->belongsTo(PdrMetaEjecucion::class, 'ejecucion_id');
    }

    public function scopeAbiertos($query)
    {
        return $query->whereIn('estado_resolucion', ['abierto', 'en_proceso']);
    }

    public function scopeCerrados($query)
    {
        return $query->where('estado_resolucion', 'cerrado');
    }
}
