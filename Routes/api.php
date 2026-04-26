<?php

use Illuminate\Support\Facades\Route;

$moduleName = basename(dirname(__DIR__));
$ctrl       = "Modulos_ERP\\{$moduleName}\\Controllers\\TrabajadorController";
$planCtrl   = "Modulos_ERP\\{$moduleName}\\Controllers\\PlanillaController";

// ─── Trabajadores (rutas sin wildcard) ─────────────────────────────────────
Route::get('/list', "{$ctrl}@list");
Route::get('/stats', "{$ctrl}@stats");
Route::post('/create', "{$ctrl}@store");

// Excel Routes
Route::get('/excel/template', "{$ctrl}@downloadTemplate");
Route::post('/excel/import', "{$ctrl}@importExcel");
Route::get('/excel/export', "{$ctrl}@exportExcel");

// ─── Planillas (ANTES de wildcards /{id} para evitar que sean capturadas) ────
Route::prefix('planillas')->group(function () use ($planCtrl) {
    // Conceptos de planilla (catálogo)
    Route::get('/conceptos',      "{$planCtrl}@conceptos");
    Route::post('/conceptos',     "{$planCtrl}@storeConcepto");
    Route::put('/conceptos/{id}', "{$planCtrl}@updateConcepto");

    // Planillas maestras
    Route::get('/',  "{$planCtrl}@index");
    Route::post('/', "{$planCtrl}@store");

    // Motor de cálculo y ajuste por trabajador
    Route::post('/{id}/calcular',                  "{$planCtrl}@calcular");
    Route::post('/{id}/trabajador/{trabajadorId}', "{$planCtrl}@calcularTrabajador");

    // Estado de la planilla
    Route::patch('/{id}/estado', "{$planCtrl}@cambiarEstado");

    // Boleta individual
    Route::get('/{id}/boleta/{trabajadorId}', "{$planCtrl}@boleta");

    // Detalle planilla (wildcard al final del grupo)
    Route::get('/{id}', "{$planCtrl}@show");
});

// ─── Trabajadores wildcards (AL FINAL para no capturar rutas nombradas) ─────
Route::get('/{id}',    "{$ctrl}@show");
Route::put('/{id}',    "{$ctrl}@update");
Route::delete('/{id}', "{$ctrl}@destroy");
