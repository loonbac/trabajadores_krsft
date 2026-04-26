<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Seed de Conceptos base de Planilla.
 *
 * Cargados desde análisis de los Excels de Abril 2026:
 *  - EJE PV _ PLANILLA ABRIL 2026 (1).xlsx
 *  - PLANILLA 2026 CEYA (17).xlsx
 *
 * Fórmulas mapeadas directamente desde las columnas del Excel:
 *  - HORAS TRABAJADAS   = dias_trabajados * 8
 *  - REMUNERACION DIARIA = base_mensual / 30
 *  - MOVILIDAD          = tarifa_movilidad * dias_trabajados  (variable por tarifa, se registra como override)
 *  - ONP 13%            = base_provisional * 0.13
 *  - AFP 10%            = base_provisional * 0.10
 *  - SEGURO AFP 1.37%   = base_provisional * 0.0137
 *  - ESSALUD 9%         = base_salud * 0.09  (aporte empresa)
 *  - NETO A PAGAR       = total_ingresos - total_descuentos  (calculado automáticamente por el servicio)
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $conceptos = [
            // ── INGRESOS ────────────────────────────────────────────────────
            [
                'codigo'       => 'ING001',
                'nombre'       => 'Sueldo Básico',
                'tipo'         => 'ingreso',
                'formula_base' => 'base_mensual',        // El sueldo íntegro (ya proporcional en el servicio)
                'estado'       => 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'codigo'       => 'ING002',
                'nombre'       => 'Asignación Familiar',
                'tipo'         => 'ingreso',
                'formula_base' => '0',                   // Se activa por override cuando aplica (102.50)
                'estado'       => 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'codigo'       => 'ING020',
                'nombre'       => 'Horas Extra',
                'tipo'         => 'ingreso',
                'formula_base' => 'horas_extra * tarifa_hora * 1.25', // 25% recargo mínimo legal
                'estado'       => 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'codigo'       => 'ING030',
                'nombre'       => 'Movilidad Supeditada',
                'tipo'         => 'ingreso',
                'formula_base' => '0',                   // Varía por trabajador → se carga vía override
                'estado'       => 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'codigo'       => 'ING040',
                'nombre'       => 'Bono',
                'tipo'         => 'ingreso',
                'formula_base' => '0',                   // Override manual
                'estado'       => 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],

            // ── DESCUENTOS (trabajador) ─────────────────────────────────────
            [
                'codigo'       => 'DES010',
                'nombre'       => 'ONP 13%',
                'tipo'         => 'descuento',
                'formula_base' => 'base_provisional * 0.13',
                'estado'       => 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'codigo'       => 'DES020',
                'nombre'       => 'AFP Aportación 10%',
                'tipo'         => 'descuento',
                'formula_base' => 'base_provisional * tasa_afp',  // tasa_afp = 0.10 para AFP, 0.13 para ONP
                'estado'       => 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'codigo'       => 'DES021',
                'nombre'       => 'AFP Seguro 1.37%',
                'tipo'         => 'descuento',
                'formula_base' => 'base_provisional * 0.0137',
                'estado'       => 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'codigo'       => 'DES022',
                'nombre'       => 'AFP Comisión',
                'tipo'         => 'descuento',
                'formula_base' => '0',                   // Varía según AFP y tipo de comisión (override)
                'estado'       => 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'codigo'       => 'DES030',
                'nombre'       => 'Renta de Quinta',
                'tipo'         => 'descuento',
                'formula_base' => '0',                   // Aplica si supera 7 UIT anuales (override)
                'estado'       => 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],

            // ── APORTES (empleador, no afectan neto trabajador) ─────────────
            [
                'codigo'       => 'APP001',
                'nombre'       => 'EsSalud 9%',
                'tipo'         => 'aporte',
                'formula_base' => 'base_salud * 0.09',
                'estado'       => 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
        ];

        // Insertar solo si no existen (idempotente)
        foreach ($conceptos as $c) {
            DB::table('rrhh_payroll_concepts')
                ->updateOrInsert(['codigo' => $c['codigo']], $c);
        }
    }

    public function down(): void
    {
        $codigos = ['ING001','ING002','ING020','ING030','ING040','DES010','DES020','DES021','DES022','DES030','APP001'];
        DB::table('rrhh_payroll_concepts')->whereIn('codigo', $codigos)->delete();
    }
};
