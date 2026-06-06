<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ssoma_worker_certifications')) {
            return;
        }

        Schema::create('ssoma_worker_certifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('trabajador_id');
            $table->unsignedBigInteger('certification_type_id');
            $table->date('fecha_emision')->nullable();
            $table->date('fecha_vencimiento')->nullable();
            $table->boolean('vencimiento_override')->default(false);
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->unique(['trabajador_id', 'certification_type_id'], 'swc_worker_cert_type_unique');
            $table->index('trabajador_id', 'swc_trabajador_idx');
            $table->index('certification_type_id', 'swc_cert_type_idx');

            $table->foreign('certification_type_id')
                ->references('id')
                ->on('ssoma_certification_types')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ssoma_worker_certifications');
    }
};
