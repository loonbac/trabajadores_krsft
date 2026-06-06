<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pdr_hallazgos')) {
            return;
        }

        Schema::create('pdr_hallazgos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ejecucion_id');
            $table->enum('tipo_hallazgo', ['observado', 'critico']);
            $table->text('descripcion');
            $table->string('area', 200)->nullable();
            $table->enum('estado_resolucion', ['abierto', 'en_proceso', 'cerrado'])->default('abierto');
            $table->dateTime('fecha_cierre')->nullable();
            $table->timestamps();

            $table->index('estado_resolucion', 'pdr_hall_estado_res_idx');
            $table->index('ejecucion_id', 'pdr_hall_ejecucion_idx');

            $table->foreign('ejecucion_id')
                ->references('id')
                ->on('pdr_metas_ejecuciones')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdr_hallazgos');
    }
};
