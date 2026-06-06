<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pdr_metas_asignadas')) {
            return;
        }

        Schema::create('pdr_metas_asignadas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('supervisor_id');
            $table->unsignedBigInteger('meta_config_id');
            $table->date('periodo_inicio');
            $table->date('periodo_fin');
            $table->enum('estado', ['pendiente', 'parcial', 'cumplida', 'vencida'])->default('pendiente');
            $table->unsignedInteger('progreso_actual')->default(0);
            $table->timestamps();

            $table->index(['supervisor_id', 'periodo_inicio', 'periodo_fin'], 'pdr_ma_sup_periodo_idx');
            $table->index('estado', 'pdr_ma_estado_idx');

            $table->foreign('supervisor_id')
                ->references('id')
                ->on('pdr_supervisores')
                ->cascadeOnDelete();

            $table->foreign('meta_config_id')
                ->references('id')
                ->on('pdr_metas_config')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdr_metas_asignadas');
    }
};
