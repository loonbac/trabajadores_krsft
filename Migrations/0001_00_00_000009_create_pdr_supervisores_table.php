<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pdr_supervisores')) {
            return;
        }

        Schema::create('pdr_supervisores', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('trabajador_id');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('trabajador_id', 'pdr_sup_trabajador_unique');

            $table->foreign('trabajador_id')
                ->references('id')
                ->on('trabajadores')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdr_supervisores');
    }
};
