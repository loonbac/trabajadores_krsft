<?php

namespace Modulos_ERP\trabajadores_krsft\Services;

use Illuminate\Support\Facades\DB;

class TrabajadorService
{
    public function getActiveWorkers(): array
    {
        return DB::table('trabajadores')->where('estado', 'Activo')->get()->toArray();
    }

    public function getWorkerById(int $id): ?object
    {
        return DB::table('trabajadores')->find($id);
    }

    public function getCount(): int
    {
        return DB::table('trabajadores')->count();
    }
}
