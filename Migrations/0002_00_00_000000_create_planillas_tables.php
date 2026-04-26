<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Catálogo de Conceptos de Planilla
        Schema::create('rrhh_payroll_concepts', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 50)->unique();
            $table->string('nombre', 150);
            $table->enum('tipo', ['ingreso', 'descuento', 'aporte']);
            $table->text('formula_base')->nullable(); // Ej: base_mensual * 0.13
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });

        // 2. Registro Maestro de la Planilla Mensual
        Schema::create('rrhh_planillas', function (Blueprint $table) {
            $table->id();
            $table->string('periodo', 7); // Formato YYYY-MM
            $table->string('descripcion', 255)->nullable();
            $table->integer('dias_utiles')->default(30); 
            $table->enum('estado', ['borrador', 'aprobado', 'pagado'])->default('borrador');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            
            $table->unique('periodo');
        });

        // 3. Planilla particular de cada Trabajador
        Schema::create('rrhh_planilla_trabajadores', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('planilla_id');
            $table->unsignedBigInteger('trabajador_id');
            
            $table->decimal('dias_trabajados', 5, 2)->default(0); 
            $table->decimal('horas_trabajadas', 6, 2)->default(0);
            
            // Totales de la boleta de este trabajador
            $table->decimal('total_ingresos', 10, 2)->default(0);
            $table->decimal('total_descuentos', 10, 2)->default(0);
            $table->decimal('total_aportes', 10, 2)->default(0); // Aportes de la empresa (Ej: Essalud)
            $table->decimal('neto_a_pagar', 10, 2)->default(0);
            
            $table->text('observaciones')->nullable();
            $table->timestamps();

            // Relaciones
            $table->foreign('planilla_id')->references('id')->on('rrhh_planillas')->onDelete('cascade');
            $table->foreign('trabajador_id')->references('id')->on('trabajadores')->onDelete('cascade');
            
            $table->unique(['planilla_id', 'trabajador_id']);
        });

        // 4. Detalle de Boleta: Conceptos calculados por trabajador
        Schema::create('rrhh_planilla_detalles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('planilla_trabajador_id');
            $table->unsignedBigInteger('concepto_id');
            $table->decimal('monto_calculado', 10, 2)->default(0);
            
            $table->timestamps();

            $table->foreign('planilla_trabajador_id')->references('id')->on('rrhh_planilla_trabajadores')->onDelete('cascade');
            $table->foreign('concepto_id')->references('id')->on('rrhh_payroll_concepts')->onDelete('cascade');
            
            $table->unique(['planilla_trabajador_id', 'concepto_id'], 'uk_planilla_trabajador_concepto');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rrhh_planilla_detalles');
        Schema::dropIfExists('rrhh_planilla_trabajadores');
        Schema::dropIfExists('rrhh_planillas');
        Schema::dropIfExists('rrhh_payroll_concepts');
    }
};
