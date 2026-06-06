<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PdrEjecucionFile extends Model
{
    protected $table = 'pdr_ejecucion_files';

    protected $fillable = [
        'ejecucion_id',
        'original_name',
        'stored_name',
        'mime_type',
        'size_bytes',
        'disk',
        'path',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
    ];

    public function ejecucion(): BelongsTo
    {
        return $this->belongsTo(PdrMetaEjecucion::class, 'ejecucion_id');
    }
}
