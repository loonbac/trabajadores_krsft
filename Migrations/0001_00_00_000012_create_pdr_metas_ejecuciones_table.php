<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pdr_metas_ejecuciones')) {
            return;
        }

        Schema::create('pdr_metas_ejecuciones', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('meta_asignada_id');
            $table->string('tipo_ejecucion', 100);
            $table->json('datos_json')->nullable();
            $table->enum('estado', ['conforme', 'observado', 'critico']);
            $table->text('observaciones')->nullable();
            $table->string('area', 200)->nullable();
            $table->dateTime('fecha_ejecucion');
            $table->timestamps();

            $table->index(['meta_asignada_id', 'fecha_ejecucion'], 'pdr_me_meta_fecha_idx');

            $table->foreign('meta_asignada_id')
                ->references('id')
                ->on('pdr_metas_asignadas')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdr_metas_ejecuciones');
    }
};
