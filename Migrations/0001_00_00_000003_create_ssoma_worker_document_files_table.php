<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ssoma_worker_document_files')) {
            return;
        }

        Schema::create('ssoma_worker_document_files', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('trabajador_id');
            $table->enum('tipo', ['SST', 'EMO', 'CAMO', 'EPP', 'DOC_SST']);
            $table->string('nombre_original');
            $table->string('path'); // ruta privada en storage/app/ssoma
            $table->unsignedBigInteger('size')->default(0);
            $table->string('mime', 100)->nullable();
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();
            $table->index(['trabajador_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ssoma_worker_document_files');
    }
};
