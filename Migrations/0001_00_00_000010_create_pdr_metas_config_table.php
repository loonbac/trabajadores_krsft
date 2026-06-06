<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pdr_metas_config')) {
            return;
        }

        Schema::create('pdr_metas_config', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->string('slug', 150);
            $table->enum('tipo_frecuencia', ['diaria', 'semanal', 'mensual']);
            $table->unsignedInteger('cantidad_requerida')->default(1);
            $table->boolean('es_obligatoria')->default(false);
            $table->unsignedInteger('orden')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('slug', 'pdr_mc_slug_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdr_metas_config');
    }
};
