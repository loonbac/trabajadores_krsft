<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pdr_ejecucion_files')) {
            return;
        }

        Schema::create('pdr_ejecucion_files', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ejecucion_id');
            $table->string('original_name', 255);
            $table->string('stored_name', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->string('disk', 50)->default('local');
            $table->string('path', 500);
            $table->timestamps();

            $table->index('ejecucion_id', 'pdr_ef_ejecucion_idx');

            $table->foreign('ejecucion_id')
                ->references('id')
                ->on('pdr_metas_ejecuciones')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdr_ejecucion_files');
    }
};
