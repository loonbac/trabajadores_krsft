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
        Schema::create('trabajadores', function (Blueprint $table) {
            $table->id();
            
            // Identificación
            $table->string('dni', 20)->unique();
            $table->string('nombres', 100);
            $table->string('apellido_paterno', 100);
            $table->string('apellido_materno', 100)->nullable();
            $table->string('nombre_completo', 255)->nullable();
            
            // Datos personales
            $table->date('fecha_nacimiento')->nullable();
            $table->string('lugar_nacimiento', 100)->nullable();
            $table->enum('genero', ['M', 'F'])->default('M');
            $table->string('estado_civil', 50)->default('Soltero');
            $table->string('sistema_pensiones', 50)->nullable();
            
            // Contacto
            $table->string('telefono', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->text('direccion')->nullable();
            $table->string('distrito', 100)->nullable();
            $table->string('provincia', 100)->nullable();
            $table->string('departamento', 100)->nullable();
            
            // Información laboral
            $table->unsignedBigInteger('area_id')->nullable();
            $table->string('cargo', 100)->nullable();
            $table->date('fecha_ingreso');
            $table->date('fecha_cese')->nullable();
            $table->string('tipo_contrato', 50)->default('Indefinido');
            $table->enum('estado', ['Activo', 'Inactivo', 'Cesado', 'Vacaciones', 'Licencia'])->default('Activo');
            
            // Información financiera
            $table->decimal('sueldo_basico', 10, 2)->default(0);
            $table->string('banco', 100)->nullable();
            $table->string('numero_cuenta', 50)->nullable();
            
            // Documentación
            $table->boolean('tiene_antecedentes_penales')->default(false);
            $table->boolean('tiene_antecedentes_policiales')->default(false);
            $table->boolean('tiene_sctr')->default(false);
            $table->boolean('tiene_epsrc')->default(false);
            
            // Contacto de emergencia
            $table->string('contacto_emergencia_nombre', 100)->nullable();
            $table->string('contacto_emergencia_telefono', 20)->nullable();
            $table->string('contacto_emergencia_parentesco', 50)->nullable();
            
            // Otros
            $table->text('observaciones')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            
            $table->timestamps();
            
            // Índices
            $table->index('dni');
            $table->index('estado');
            $table->index('area_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trabajadores');
    }
};
