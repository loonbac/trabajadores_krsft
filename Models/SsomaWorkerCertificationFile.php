<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SsomaWorkerCertificationFile extends Model
{
    protected $table = 'ssoma_worker_certification_files';

    protected $fillable = [
        'trabajador_id',
        'certification_type_id',
        'nombre_original',
        'path',
        'size',
        'mime',
        'uploaded_by',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    public function certificationType(): BelongsTo
    {
        return $this->belongsTo(SsomaCertificationType::class, 'certification_type_id');
    }
}
