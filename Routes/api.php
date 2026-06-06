<?php

use Illuminate\Support\Facades\Route;

$moduleName = basename(dirname(__DIR__));
$ctrl       = "Modulos_ERP\\{$moduleName}\\Controllers\\TrabajadorController";
$planCtrl   = "Modulos_ERP\\{$moduleName}\\Controllers\\PlanillaController";
$ssomaCtrl  = "Modulos_ERP\\{$moduleName}\\Controllers\\SsomaController";
$certCtrl   = "Modulos_ERP\\{$moduleName}\\Controllers\\CertificationController";
$pdrCtrl    = "Modulos_ERP\\{$moduleName}\\Controllers\\PdrController";

Route::middleware(['auth', 'verified', 'authorize.module:trabajadoreskrsft'])->group(function () use ($ctrl, $planCtrl, $ssomaCtrl, $certCtrl, $pdrCtrl) {
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

    // ─── SSOMA — cumplimiento documental (ANTES de wildcards /{id}) ─────────────
    Route::prefix('ssoma')->group(function () use ($ssomaCtrl) {
        Route::get('/list',   "{$ssomaCtrl}@list");
        Route::get('/stats',  "{$ssomaCtrl}@stats");
        Route::get('/tipos',  "{$ssomaCtrl}@tipos");
        Route::post('/tipos', "{$ssomaCtrl}@storeTipo");

        // Alta/edición de trabajador EXTERNO (gateado por view_ssoma)
        Route::post('/worker',      "{$ssomaCtrl}@storeWorker");
        Route::put('/{id}/worker',  "{$ssomaCtrl}@updateWorker");

        // Archivos (rutas literales ANTES de /{id})
        Route::get('/files/{fileId}/download', "{$ssomaCtrl}@downloadFile");
        Route::delete('/files/{fileId}',       "{$ssomaCtrl}@deleteFile");

        // Por trabajador
        Route::get('/{id}/files',      "{$ssomaCtrl}@listFiles");
        Route::post('/{id}/profile',   "{$ssomaCtrl}@saveProfile");
        Route::post('/{id}/files',     "{$ssomaCtrl}@uploadFile");
        Route::post('/{id}/fotocheck', "{$ssomaCtrl}@uploadFotocheck");
        Route::get('/{id}/fotocheck',  "{$ssomaCtrl}@showFotocheck");

        // Wildcard al final
        Route::get('/{id}',    "{$ssomaCtrl}@show");
        Route::delete('/{id}', "{$ssomaCtrl}@destroyWorker");
    });

    // ─── Capacitaciones y Certificados (ANTES de wildcards /{id}) ──────────────
    Route::prefix('certifications')->group(function () use ($certCtrl) {
        Route::get('/types',                   "{$certCtrl}@types");
        Route::get('/matrix',                  "{$certCtrl}@matrix");

        // Archivos (rutas literales ANTES de /{trabajadorId})
        Route::get('/files/{fileId}/download', "{$certCtrl}@downloadFile");
        Route::delete('/files/{fileId}',       "{$certCtrl}@deleteFile");

        // Por trabajador (wildcard al final del grupo)
        Route::get('/{trabajadorId}',          "{$certCtrl}@show");
        Route::post('/{trabajadorId}',         "{$certCtrl}@saveCert");
        Route::post('/{trabajadorId}/cargo',   "{$certCtrl}@saveCargo");
        Route::post('/{trabajadorId}/files',   "{$certCtrl}@uploadFile");
    });

    // ─── PDR — Metas para Supervisores (ANTES de wildcards /{id}) ─────────────
    Route::prefix('pdr')->group(function () use ($pdrCtrl) {
        // Meta config (catálogo)
        Route::get('/metas-config',            "{$pdrCtrl}@metasConfig");
        Route::post('/metas-config',           "{$pdrCtrl}@storeMetaConfig");
        Route::put('/metas-config/{id}',       "{$pdrCtrl}@updateMetaConfig");
        Route::delete('/metas-config/{id}',    "{$pdrCtrl}@destroyMetaConfig");

        // Supervisores
        Route::get('/supervisores',            "{$pdrCtrl}@supervisores");
        Route::post('/supervisores',           "{$pdrCtrl}@storeSupervisor");
        Route::delete('/supervisores/{id}',    "{$pdrCtrl}@destroySupervisor");

        // Asignaciones por periodo
        Route::get('/asignadas',               "{$pdrCtrl}@asignadas");
        Route::post('/asignadas/generar',      "{$pdrCtrl}@generarAsignadas");

        // Ejecuciones
        Route::post('/ejecuciones',                 "{$pdrCtrl}@storeEjecucion");
        Route::delete('/ejecuciones/{id}',          "{$pdrCtrl}@destroyEjecucion");
        Route::get('/ejecuciones/show/{id}',        "{$pdrCtrl}@showEjecucion");
        Route::get('/ejecuciones/{metaAsignadaId}', "{$pdrCtrl}@listEjecuciones");

        // Hallazgos
        Route::get('/hallazgos',               "{$pdrCtrl}@hallazgos");
        Route::patch('/hallazgos/{id}',        "{$pdrCtrl}@updateHallazgo");

        // Dashboard y pendientes
        Route::get('/resumen',                 "{$pdrCtrl}@resumen");
        Route::get('/resumen-supervisores',    "{$pdrCtrl}@resumenSupervisores");
        Route::get('/pendientes',              "{$pdrCtrl}@pendientes");

        // Archivos (rutas literales)
        Route::get('/files/{fileId}/download', "{$pdrCtrl}@downloadFile");
        Route::delete('/files/{fileId}',       "{$pdrCtrl}@deleteFile");
    });

    // ─── Trabajadores wildcards (AL FINAL para no capturar rutas nombradas) ─────
    Route::get('/{id}',    "{$ctrl}@show");
    Route::put('/{id}',    "{$ctrl}@update");
    Route::delete('/{id}', "{$ctrl}@destroy");
});
