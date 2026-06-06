<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ssoma_worker_profiles')) {
            return;
        }

        Schema::create('ssoma_worker_profiles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('trabajador_id')->unique();
            $table->string('ubicacion', 150)->nullable();
            $table->string('supervisor', 150)->nullable();
            $table->enum('aptitud_medica', ['apto', 'observado', 'no_apto', 'no_definido'])
                ->default('no_definido');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ssoma_worker_profiles');
    }
};
