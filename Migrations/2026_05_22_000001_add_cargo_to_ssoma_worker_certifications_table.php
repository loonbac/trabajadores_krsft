<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('ssoma_worker_certifications')) {
            return;
        }

        Schema::table('ssoma_worker_certifications', function (Blueprint $table) {
            if (!Schema::hasColumn('ssoma_worker_certifications', 'cargo')) {
                $table->enum('cargo', ['emisor', 'receptor', 'vigia'])
                    ->nullable()
                    ->default(null)
                    ->after('certification_type_id');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('ssoma_worker_certifications')) {
            return;
        }

        Schema::table('ssoma_worker_certifications', function (Blueprint $table) {
            if (Schema::hasColumn('ssoma_worker_certifications', 'cargo')) {
                $table->dropColumn('cargo');
            }
        });
    }
};
