<?php

namespace Modulos_ERP\TrabajadoresKrsft\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SsomaWorkerCertification extends Model
{
    protected $table = 'ssoma_worker_certifications';

    protected $fillable = [
        'trabajador_id',
        'certification_type_id',
        'cargo',
        'fecha_emision',
        'fecha_vencimiento',
        'vencimiento_override',
        'notas',
    ];

    protected $casts = [
        'fecha_emision'        => 'date',
        'fecha_vencimiento'    => 'date',
        'vencimiento_override' => 'boolean',
    ];

    public function certificationType(): BelongsTo
    {
        return $this->belongsTo(SsomaCertificationType::class, 'certification_type_id');
    }

    /**
     * Calcula fecha_vencimiento sumando la vigencia (en meses) a la emisión.
     */
    public static function computeVencimiento(string $fechaEmision, int $vigenciaMeses): string
    {
        return Carbon::parse($fechaEmision)->addMonths($vigenciaMeses)->toDateString();
    }
}
