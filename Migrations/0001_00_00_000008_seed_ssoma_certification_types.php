<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('ssoma_certification_types')) {
            return;
        }

        if (DB::table('ssoma_certification_types')->count() > 0) {
            return;
        }

        $tipos = [
            ['codigo' => 'emergencia',         'nombre' => 'Emergencia'],
            ['codigo' => 'frio_caliente',      'nombre' => 'Frio Caliente'],
            ['codigo' => 'equipos_poder',      'nombre' => 'Equipos de Poder'],
            ['codigo' => 'excavacion_manual',  'nombre' => 'Excavacion Manual'],
            ['codigo' => 'antiderrumbe_zanja', 'nombre' => 'Antiderrumbe Zanja'],
            ['codigo' => 'altura_escalera',    'nombre' => 'Altura Escalera'],
            ['codigo' => 'altura_andamio',     'nombre' => 'Altura Andamio'],
            ['codigo' => 'armado_andamios',    'nombre' => 'Armado de Andamios'],
            ['codigo' => 'izaje',              'nombre' => 'Izaje'],
            ['codigo' => 'loto',               'nombre' => 'Loto'],
        ];

        $rows = [];
        foreach ($tipos as $i => $tipo) {
            $rows[] = [
                'codigo'         => $tipo['codigo'],
                'nombre'         => $tipo['nombre'],
                'vigencia_meses' => 12,
                'activo'         => true,
                'orden'          => $i + 1,
                'created_at'     => now(),
                'updated_at'     => now(),
            ];
        }

        DB::table('ssoma_certification_types')->insert($rows);
    }

    public function down(): void
    {
        if (Schema::hasTable('ssoma_certification_types')) {
            DB::table('ssoma_certification_types')->truncate();
        }
    }
};
