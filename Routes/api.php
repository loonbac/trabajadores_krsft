<?php

use Illuminate\Support\Facades\Route;

$moduleName = basename(dirname(__DIR__));
$ctrl = "Modulos_ERP\\{$moduleName}\\Controllers\\TrabajadorController";

Route::get('/list', "{$ctrl}@list");
Route::get('/stats', "{$ctrl}@stats");
Route::get('/{id}', "{$ctrl}@show");
Route::post('/create', "{$ctrl}@store");
Route::put('/{id}', "{$ctrl}@update");
Route::delete('/{id}', "{$ctrl}@destroy");

// Excel Routes
Route::get('/excel/template', "{$ctrl}@downloadTemplate");
Route::post('/excel/import', "{$ctrl}@importExcel");
Route::get('/excel/export', "{$ctrl}@exportExcel");
