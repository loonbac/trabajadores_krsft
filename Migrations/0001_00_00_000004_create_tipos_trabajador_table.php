<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tipos_trabajador')) {
            return;
        }

        Schema::create('tipos_trabajador', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // Semilla con los tipos actuales para no romper datos existentes
        DB::table('tipos_trabajador')->insert([
            ['nombre' => 'Administrativo', 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'Campo',          'activo' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_trabajador');
    }
};
