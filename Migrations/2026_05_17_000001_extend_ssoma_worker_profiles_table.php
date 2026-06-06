<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('ssoma_worker_profiles')) {
            return;
        }

        Schema::table('ssoma_worker_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('ssoma_worker_profiles', 'modalidad')) {
                $table->enum('modalidad', ['Oficina', 'Campo', 'Visita'])->nullable()->after('supervisor');
            }
            if (!Schema::hasColumn('ssoma_worker_profiles', 'fotocheck_path')) {
                $table->string('fotocheck_path')->nullable()->after('modalidad');
            }
        });

        // Ampliar enum aptitud_medica (MySQL): añade 'apto_restriccion'
        DB::statement(
            "ALTER TABLE ssoma_worker_profiles MODIFY COLUMN aptitud_medica "
            . "ENUM('apto','apto_restriccion','observado','no_apto','no_definido') "
            . "NOT NULL DEFAULT 'no_definido'"
        );
    }

    public function down(): void
    {
        if (!Schema::hasTable('ssoma_worker_profiles')) {
            return;
        }

        Schema::table('ssoma_worker_profiles', function (Blueprint $table) {
            foreach (['modalidad', 'fotocheck_path'] as $col) {
                if (Schema::hasColumn('ssoma_worker_profiles', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        DB::statement(
            "ALTER TABLE ssoma_worker_profiles MODIFY COLUMN aptitud_medica "
            . "ENUM('apto','observado','no_apto','no_definido') "
            . "NOT NULL DEFAULT 'no_definido'"
        );
    }
};
