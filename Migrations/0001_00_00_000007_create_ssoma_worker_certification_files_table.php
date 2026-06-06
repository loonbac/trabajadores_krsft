<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ssoma_worker_certification_files')) {
            return;
        }

        Schema::create('ssoma_worker_certification_files', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('trabajador_id');
            $table->unsignedBigInteger('certification_type_id');
            $table->string('nombre_original');
            $table->string('path'); // ruta privada en storage/app/ssoma
            $table->unsignedBigInteger('size')->default(0);
            $table->string('mime', 100)->nullable();
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();

            $table->index(['trabajador_id', 'certification_type_id'], 'swcf_worker_cert_type_idx');

            $table->foreign('certification_type_id')
                ->references('id')
                ->on('ssoma_certification_types')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ssoma_worker_certification_files');
    }
};
