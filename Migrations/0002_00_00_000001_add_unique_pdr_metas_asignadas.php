<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Garantiza el UNIQUE INDEX (supervisor_id, meta_config_id, periodo_inicio)
     * en pdr_metas_asignadas para que firstOrCreate() sea atómico bajo
     * concurrencia (no duplicados por race condition entre check + create).
     *
     * Idempotente: si el índice ya existe (ej. BD dev donde se creó por SQL
     * directo), no falla.
     */
    public function up(): void
    {
        if (! Schema::hasTable('pdr_metas_asignadas')) {
            return;
        }

        if (Schema::hasIndex('pdr_metas_asignadas', 'pdr_asignada_periodo_unique')) {
            return;
        }

        Schema::table('pdr_metas_asignadas', function (Blueprint $table) {
            $table->unique(
                ['supervisor_id', 'meta_config_id', 'periodo_inicio'],
                'pdr_asignada_periodo_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('pdr_metas_asignadas', function (Blueprint $table) {
            $table->dropUnique('pdr_asignada_periodo_unique');
        });
    }
};
