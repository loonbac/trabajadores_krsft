<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Illuminate\Database\Eloquent\Model;

class SsomaWorkerDocumentFile extends Model
{
    protected $table = 'ssoma_worker_document_files';

    protected $fillable = [
        'trabajador_id',
        'tipo',
        'nombre_original',
        'path',
        'size',
        'mime',
        'uploaded_by',
    ];

    protected $casts = [
        'size' => 'integer',
    ];
}
