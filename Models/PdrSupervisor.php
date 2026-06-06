<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PdrSupervisor extends Model
{
    protected $table = 'pdr_supervisores';

    protected $fillable = [
        'trabajador_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function trabajador(): BelongsTo
    {
        return $this->belongsTo(Trabajador::class, 'trabajador_id');
    }

    public function metasAsignadas(): HasMany
    {
        return $this->hasMany(PdrMetaAsignada::class, 'supervisor_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
