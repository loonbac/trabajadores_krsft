<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('trabajadores') || Schema::hasColumn('trabajadores', 'origen')) {
            return;
        }

        Schema::table('trabajadores', function (Blueprint $table) {
            $table->enum('origen', ['interno', 'externo'])->default('interno')->after('estado');
            $table->index('origen');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('trabajadores') || !Schema::hasColumn('trabajadores', 'origen')) {
            return;
        }

        Schema::table('trabajadores', function (Blueprint $table) {
            $table->dropIndex(['origen']);
            $table->dropColumn('origen');
        });
    }
};
