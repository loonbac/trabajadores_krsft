<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El UNIQUE INDEX previo era (supervisor_id, meta_config_id, periodo_inicio)
     * y dejaba afuera periodo_fin, así que cambiar la frecuencia (diaria ↔ semanal
     * ↔ mensual) producía el mismo periodo_inicio con un periodo_fin distinto y
     * explotaba la constraint al reintentar el INSERT dentro de
     * PdrMetaService::generarMetasPeriodo() (típicamente disparado desde los GET
     * de resumen/resumen-supervisores que se llaman desde el frontend en cada
     * mutación). El error se manifiesta como 500 en PUT /api/trabajadoreskrsft/{id}
     * cuando la vista refresca el dashboard.
     *
     * 1) Deduplica filas existentes (queda la de menor id por grupo inicio).
     * 2) Recrea el índice incluyendo periodo_fin.
     *
     * Idempotente: si la constraint nueva ya existe, sale sin tocar nada.
     */
    public function up(): void
    {
        if (! Schema::hasTable('pdr_metas_asignadas')) {
            return;
        }

        // 1) Deduplicar: conservar la fila con el menor id por (supervisor, config, inicio).
        //    Las duplicadas no tienen periodo_fin distinto de la superviviente salvo en
        //    filas huérfanas generadas por el bug original (ya limpiadas en el paso
        //    previo del módulo).
        DB::statement(<<<'SQL'
            DELETE a FROM `pdr_metas_asignadas` a
            INNER JOIN `pdr_metas_asignadas` b
                ON a.`supervisor_id`   = b.`supervisor_id`
               AND a.`meta_config_id`  = b.`meta_config_id`
               AND a.`periodo_inicio`  = b.`periodo_inicio`
               AND a.`id` > b.`id`
        SQL);

        // 2) Recrear la unique con periodo_fin incluido.
        if (Schema::hasIndex('pdr_metas_asignadas', 'pdr_asignada_periodo_unique')) {
            Schema::table('pdr_metas_asignadas', function ($table) {
                $table->dropUnique('pdr_asignada_periodo_unique');
            });
        }

        Schema::table('pdr_metas_asignadas', function ($table) {
            $table->unique(
                ['supervisor_id', 'meta_config_id', 'periodo_inicio', 'periodo_fin'],
                'pdr_asignada_periodo_unique'
            );
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('pdr_metas_asignadas')) {
            return;
        }

        if (Schema::hasIndex('pdr_metas_asignadas', 'pdr_asignada_periodo_unique')) {
            Schema::table('pdr_metas_asignadas', function ($table) {
                $table->dropUnique('pdr_asignada_periodo_unique');
            });
        }

        Schema::table('pdr_metas_asignadas', function ($table) {
            $table->unique(
                ['supervisor_id', 'meta_config_id', 'periodo_inicio'],
                'pdr_asignada_periodo_unique'
            );
        });
    }
};
