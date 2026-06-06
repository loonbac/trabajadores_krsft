<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ssoma_worker_documents')) {
            return;
        }

        Schema::create('ssoma_worker_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('trabajador_id');
            $table->enum('tipo', ['SST', 'EMO', 'CAMO', 'EPP', 'DOC_SST']);
            $table->date('fecha_emision')->nullable();
            $table->date('fecha_vencimiento')->nullable();
            $table->text('notas')->nullable();
            $table->timestamps();
            $table->index(['trabajador_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ssoma_worker_documents');
    }
};
