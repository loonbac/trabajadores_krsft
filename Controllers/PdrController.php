<?php

namespace Modulos_ERP\TrabajadoresKrsft\Controllers;

use App\Http\Controllers\Controller;
use App\Services\LogKrsftService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modulos_ERP\TrabajadoresKrsft\Models\PdrEjecucionFile;
use Modulos_ERP\TrabajadoresKrsft\Models\PdrHallazgo;
use Modulos_ERP\TrabajadoresKrsft\Models\PdrMetaAsignada;
use Modulos_ERP\TrabajadoresKrsft\Models\PdrMetaConfig;
use Modulos_ERP\TrabajadoresKrsft\Models\PdrMetaEjecucion;
use Modulos_ERP\TrabajadoresKrsft\Models\PdrSupervisor;
use Modulos_ERP\TrabajadoresKrsft\Services\PdrMetaService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PDR — Plan de Resultados para Supervisores.
 *
 * Gestiona metas configurables, supervisores, asignaciones por periodo,
 * ejecuciones con archivos, hallazgos y dashboard KPI.
 *
 * Permisos: segmento `pdr` → view_pdr (lectura).
 * Escritura: manage_pdr_config, manage_pdr_supervisors, execute_pdr, manage_pdr_hallazgos.
 */
class PdrController extends Controller
{
    private const DISK = 'local';

    private const MAX_KB = 10240; // 10 MB

    private const MIMES = 'jpeg,png,pdf,xlsx';

    public function __construct(
        private readonly PdrMetaService $metaService,
    ) {}

    // ─────────────────────────── Meta Config ───────────────────────────

    public function metasConfig(Request $request): JsonResponse
    {
        $metas = PdrMetaConfig::ordered()->get();

        return response()->json(['success' => true, 'data' => $metas]);
    }

    public function storeMetaConfig(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre'             => 'required|string|max:255',
            'slug'               => 'required|string|max:255|unique:pdr_metas_config,slug',
            'tipo_frecuencia'    => 'required|in:diaria,semanal,mensual',
            'cantidad_requerida' => 'required|integer|min:1',
            'es_obligatoria'     => 'boolean',
            'orden'              => 'integer|min:0',
        ]);

        $meta = PdrMetaConfig::create([
            'nombre'             => $validated['nombre'],
            'slug'               => $validated['slug'],
            'tipo_frecuencia'    => $validated['tipo_frecuencia'],
            'cantidad_requerida' => $validated['cantidad_requerida'],
            'es_obligatoria'     => $validated['es_obligatoria'] ?? false,
            'orden'              => $validated['orden'] ?? 0,
            'is_active'          => true,
        ]);

        app(LogKrsftService::class)->log(
            module: 'trabajadoreskrsft',
            action: 'pdr_meta_creada',
            message: "Meta PDR creada: {$meta->nombre} ({$meta->tipo_frecuencia}, cantidad={$meta->cantidad_requerida})",
            level: 'info',
            userId: $request->user()?->id,
            userName: $request->user()?->name,
            extra: ['meta_config_id' => $meta->id, 'slug' => $meta->slug],
        );

        return response()->json(['success' => true, 'data' => $meta], 201);
    }

    public function updateMetaConfig(Request $request, int $id): JsonResponse
    {
        $meta = PdrMetaConfig::find($id);

        if (! $meta) {
            return response()->json(['success' => false, 'message' => 'Meta no encontrada'], 404);
        }

        $validated = $request->validate([
            'nombre'             => 'string|max:255',
            'slug'               => "string|max:255|unique:pdr_metas_config,slug,{$id}",
            'tipo_frecuencia'    => 'in:diaria,semanal,mensual',
            'cantidad_requerida' => 'integer|min:1',
            'es_obligatoria'     => 'boolean',
            'orden'              => 'integer|min:0',
            'is_active'          => 'boolean',
        ]);

        // Handle boolean fields correctly (cast from string "true"/"false"/"1"/"0")
        foreach (['es_obligatoria', 'is_active'] as $boolField) {
            if (array_key_exists($boolField, $validated)) {
                $validated[$boolField] = filter_var($validated[$boolField], FILTER_VALIDATE_BOOLEAN);
            }
        }

        $meta->update($validated);

        app(LogKrsftService::class)->log(
            module: 'trabajadoreskrsft',
            action: 'pdr_meta_actualizada',
            message: "Meta PDR actualizada: {$meta->nombre} (id={$id})",
            level: 'info',
            userId: $request->user()?->id,
            userName: $request->user()?->name,
            extra: ['meta_config_id' => $id, 'changes' => $validated],
        );

        return response()->json(['success' => true, 'data' => $meta->fresh()]);
    }

    public function destroyMetaConfig(Request $request, int $id): JsonResponse
    {
        $meta = PdrMetaConfig::find($id);

        if (! $meta) {
            return response()->json(['success' => false, 'message' => 'Meta no encontrada'], 404);
        }

        $meta->update(['is_active' => false]);

        app(LogKrsftService::class)->log(
            module: 'trabajadoreskrsft',
            action: 'pdr_meta_eliminada',
            message: "Meta PDR desactivada: {$meta->nombre} (id={$id})",
            level: 'info',
            userId: $request->user()?->id,
            userName: $request->user()?->name,
            extra: ['meta_config_id' => $id],
        );

        return response()->json(['success' => true, 'message' => 'Meta desactivada']);
    }

    // ─────────────────────────── Supervisores ───────────────────────────

    public function supervisores(Request $request): JsonResponse
    {
        $query = PdrSupervisor::with('trabajador');

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $supervisores = $query->get()->map(function (PdrSupervisor $s) {
            $t = $s->trabajador;

            return [
                'id'              => $s->id,
                'trabajador_id'   => $s->trabajador_id,
                'is_active'       => $s->is_active,
                'nombre_completo' => $t?->nombre_completo,
                'dni'             => $t?->dni,
                'cargo'           => $t?->cargo,
                'created_at'      => $s->created_at,
            ];
        });

        return response()->json(['success' => true, 'data' => $supervisores]);
    }

    public function storeSupervisor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'trabajador_id' => 'required|integer|exists:trabajadores,id',
        ]);

        $exists = PdrSupervisor::where('trabajador_id', $validated['trabajador_id'])->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Este trabajador ya está registrado como supervisor',
            ], 422);
        }

        $supervisor = PdrSupervisor::create([
            'trabajador_id' => $validated['trabajador_id'],
            'is_active'     => true,
        ]);

        // Auto-generate metas for current period
        $this->metaService->generarMetasPeriodo(Carbon::now(), $supervisor->id);

        $supervisor->load('trabajador');

        app(LogKrsftService::class)->log(
            module: 'trabajadoreskrsft',
            action: 'pdr_supervisor_registrado',
            message: "Supervisor PDR registrado: {$supervisor->trabajador?->nombre_completo} (trabajador_id={$validated['trabajador_id']})",
            level: 'info',
            userId: $request->user()?->id,
            userName: $request->user()?->name,
            extra: ['supervisor_id' => $supervisor->id, 'trabajador_id' => $validated['trabajador_id']],
        );

        return response()->json(['success' => true, 'data' => $supervisor], 201);
    }

    public function destroySupervisor(Request $request, int $id): JsonResponse
    {
        $supervisor = PdrSupervisor::find($id);

        if (! $supervisor) {
            return response()->json(['success' => false, 'message' => 'Supervisor no encontrado'], 404);
        }

        $supervisor->update(['is_active' => false]);

        app(LogKrsftService::class)->log(
            module: 'trabajadoreskrsft',
            action: 'pdr_supervisor_desactivado',
            message: "Supervisor PDR desactivado: id={$id}",
            level: 'info',
            userId: $request->user()?->id,
            userName: $request->user()?->name,
            extra: ['supervisor_id' => $id],
        );

        return response()->json(['success' => true, 'message' => 'Supervisor desactivado']);
    }

    // ─────────────────────────── Asignaciones ───────────────────────────

    public function asignadas(Request $request): JsonResponse
    {
        $query = PdrMetaAsignada::with(['supervisor.trabajador', 'metaConfig']);

        if ($request->filled('supervisor_id')) {
            $query->where('supervisor_id', $request->supervisor_id);
        }
        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('desde')) {
            $query->where('periodo_inicio', '>=', $request->desde);
        }
        if ($request->filled('hasta')) {
            $query->where('periodo_fin', '<=', $request->hasta);
        }

        $asignadas = $query->orderByDesc('periodo_inicio')->get();

        return response()->json(['success' => true, 'data' => $asignadas]);
    }

    public function generarAsignadas(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fecha'         => 'nullable|date',
            'supervisor_id' => 'nullable|integer|exists:pdr_supervisores,id',
        ]);

        $fecha = isset($validated['fecha'])
            ? Carbon::parse($validated['fecha'])
            : Carbon::now();

        $created = $this->metaService->generarMetasPeriodo($fecha, $validated['supervisor_id'] ?? null);

        // Count total possible to compute skipped
        $supervisorCount = PdrSupervisor::active()
            ->when($validated['supervisor_id'] ?? null, fn ($q) => $q->where('id', $validated['supervisor_id']))
            ->count();
        $configCount = PdrMetaConfig::active()->count();
        $totalPossible = $supervisorCount * $configCount;
        $skipped = $totalPossible - $created;

        app(LogKrsftService::class)->log(
            module: 'trabajadoreskrsft',
            action: 'pdr_asignacion_generada',
            message: "Asignaciones PDR generadas: {$created} creadas, {$skipped} omitidas (fecha={$fecha->toDateString()})",
            level: 'info',
            userId: $request->user()?->id,
            userName: $request->user()?->name,
            extra: ['created' => $created, 'skipped' => $skipped, 'fecha' => $fecha->toDateString()],
        );

        return response()->json([
            'success' => true,
            'created' => $created,
            'skipped' => $skipped,
        ], 201);
    }

    // ─────────────────────────── Ejecuciones ───────────────────────────

    public function listEjecuciones(Request $request, int $metaAsignadaId): JsonResponse
    {
        $ejecuciones = PdrMetaEjecucion::with(['files', 'hallazgos'])
            ->where('meta_asignada_id', $metaAsignadaId)
            ->orderByDesc('fecha_ejecucion')
            ->get();

        return response()->json(['success' => true, 'data' => $ejecuciones]);
    }

    public function storeEjecucion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'meta_asignada_id' => 'required|exists:pdr_metas_asignadas,id',
            'tipo_ejecucion'   => 'required|string|max:100',
            'datos_json'       => 'nullable|array',
            'estado'           => 'required|in:conforme,observado,critico',
            'observaciones'    => 'nullable|string|max:2000',
            'area'             => 'nullable|string|max:200',
            'fecha_ejecucion'  => 'nullable|date',
            'files'            => 'nullable|array|max:5',
            'files.*'          => 'file|max:' . self::MAX_KB . '|mimes:' . self::MIMES,
        ]);

        $asignada = PdrMetaAsignada::find($validated['meta_asignada_id']);

        if (! $asignada) {
            return response()->json(['success' => false, 'message' => 'Asignación no encontrada'], 404);
        }

        // Build execution data
        $ejecucionData = [
            'meta_asignada_id' => $validated['meta_asignada_id'],
            'tipo_ejecucion'   => $validated['tipo_ejecucion'],
            'datos_json'       => $validated['datos_json'] ?? null,
            'estado'           => $validated['estado'],
            'observaciones'    => $validated['observaciones'] ?? null,
            'area'             => $validated['area'] ?? null,
            'fecha_ejecucion'  => $validated['fecha_ejecucion'] ?? now(),
        ];

        // Use service to create execution (handles transaction + progress update)
        $ejecucion = $this->metaService->registrarEjecucion($ejecucionData);

        // Auto-create Hallazgo if estado is observado or critico
        if (in_array($ejecucion->estado, ['observado', 'critico'])) {
            $this->metaService->autoCreateHallazgo($ejecucion);
        }

        // Process file uploads
        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $this->storeFile($ejecucion->id, $file);
            }
        }

        app(LogKrsftService::class)->log(
            module: 'trabajadoreskrsft',
            action: 'pdr_ejecucion_registrada',
            message: "Ejecución PDR registrada: meta_asignada_id={$ejecucion->meta_asignada_id}, estado={$ejecucion->estado}",
            level: 'info',
            userId: $request->user()?->id,
            userName: $request->user()?->name,
            extra: [
                'ejecucion_id'     => $ejecucion->id,
                'meta_asignada_id' => $ejecucion->meta_asignada_id,
                'estado'           => $ejecucion->estado,
            ],
        );

        $ejecucion->load(['files', 'hallazgos', 'metaAsignada.metaConfig', 'metaAsignada.supervisor.trabajador']);

        return response()->json(['success' => true, 'data' => $ejecucion], 201);
    }

    public function showEjecucion(Request $request, int $id): JsonResponse
    {
        $ejecucion = PdrMetaEjecucion::with([
            'files',
            'hallazgos',
            'metaAsignada.metaConfig',
            'metaAsignada.supervisor.trabajador',
        ])->find($id);

        if (! $ejecucion) {
            return response()->json(['success' => false, 'message' => 'Ejecución no encontrada'], 404);
        }

        return response()->json(['success' => true, 'data' => $ejecucion]);
    }

    public function destroyEjecucion(Request $request, int $id): JsonResponse
    {
        $ejecucion = PdrMetaEjecucion::with('files')->find($id);

        if (! $ejecucion) {
            return response()->json(['success' => false, 'message' => 'Ejecución no encontrada'], 404);
        }

        $metaAsignadaId = $ejecucion->meta_asignada_id;

        \Illuminate\Support\Facades\DB::transaction(function () use ($ejecucion) {
            // Delete files from storage
            foreach ($ejecucion->files as $file) {
                Storage::disk(self::DISK)->delete($file->path);
                $file->delete();
            }

            // Delete associated hallazgos
            $ejecucion->hallazgos()->delete();

            // Delete the execution
            $ejecucion->delete();
        });

        // Recalculate progress for the parent assignment
        $this->metaService->actualizarProgreso($metaAsignadaId);

        app(LogKrsftService::class)->log(
            module: 'trabajadoreskrsft',
            action: 'pdr_ejecucion_eliminada',
            message: "Ejecución PDR eliminada: id={$id}, meta_asignada_id={$metaAsignadaId}",
            level: 'warning',
            userId: $request->user()?->id,
            userName: $request->user()?->name,
            extra: ['ejecucion_id' => $id, 'meta_asignada_id' => $metaAsignadaId],
        );

        return response()->json(['success' => true, 'message' => 'Ejecución eliminada']);
    }

    // ─────────────────────────── Hallazgos ───────────────────────────

    public function hallazgos(Request $request): JsonResponse
    {
        $query = PdrHallazgo::with([
            'ejecucion.metaAsignada.supervisor.trabajador',
            'ejecucion.metaAsignada.metaConfig',
        ]);

        if ($request->filled('estado_resolucion')) {
            $query->where('estado_resolucion', $request->estado_resolucion);
        }
        if ($request->filled('tipo_hallazgo')) {
            $query->where('tipo_hallazgo', $request->tipo_hallazgo);
        }
        if ($request->filled('supervisor_id')) {
            $query->whereHas('ejecucion.metaAsignada', function ($q) use ($request) {
                $q->where('supervisor_id', $request->supervisor_id);
            });
        }

        $hallazgos = $query->orderByDesc('created_at')->get();

        return response()->json(['success' => true, 'data' => $hallazgos]);
    }

    public function updateHallazgo(Request $request, int $id): JsonResponse
    {
        $hallazgo = PdrHallazgo::find($id);

        if (! $hallazgo) {
            return response()->json(['success' => false, 'message' => 'Hallazgo no encontrado'], 404);
        }

        $validated = $request->validate([
            'descripcion'        => 'nullable|string|max:2000',
            'area'               => 'nullable|string|max:200',
            'estado_resolucion'  => 'required|in:abierto,en_proceso,cerrado',
        ]);

        // Guard: cannot reopen a closed hallazgo
        if ($hallazgo->estado_resolucion === 'cerrado' && $validated['estado_resolucion'] !== 'cerrado') {
            return response()->json([
                'success' => false,
                'message' => 'No se puede reabrir un hallazgo cerrado',
            ], 422);
        }

        $updateData = [];

        if (array_key_exists('descripcion', $validated)) {
            $updateData['descripcion'] = $validated['descripcion'];
        }
        if (array_key_exists('area', $validated)) {
            $updateData['area'] = $validated['area'];
        }

        $updateData['estado_resolucion'] = $validated['estado_resolucion'];

        // Auto-set fecha_cierre when closing
        if ($validated['estado_resolucion'] === 'cerrado' && $hallazgo->estado_resolucion !== 'cerrado') {
            $updateData['fecha_cierre'] = now();
        }

        $hallazgo->update($updateData);

        app(LogKrsftService::class)->log(
            module: 'trabajadoreskrsft',
            action: 'pdr_hallazgo_resuelto',
            message: "Hallazgo PDR actualizado: id={$id}, estado={$validated['estado_resolucion']}",
            level: $validated['estado_resolucion'] === 'cerrado' ? 'info' : 'warning',
            userId: $request->user()?->id,
            userName: $request->user()?->name,
            extra: ['hallazgo_id' => $id, 'estado_resolucion' => $validated['estado_resolucion']],
        );

        return response()->json(['success' => true, 'data' => $hallazgo->fresh()]);
    }

    // ─────────────────────────── Dashboard ───────────────────────────

    public function resumen(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supervisor_id' => 'nullable|integer|exists:pdr_supervisores,id',
            'desde'         => 'nullable|date',
            'hasta'         => 'nullable|date',
        ]);

        $supervisorId = $validated['supervisor_id'] ?? null;
        $desde = isset($validated['desde']) ? Carbon::parse($validated['desde']) : Carbon::now()->startOfMonth();
        $hasta = isset($validated['hasta']) ? Carbon::parse($validated['hasta']) : Carbon::now()->endOfMonth();


        // Monthly range (null supervisor_id = global aggregate)
        $mensual = $this->metaService->resumenSupervisor($supervisorId, $desde, $hasta);

        // Daily (today)
        $hoyInicio = Carbon::now()->startOfDay();
        $hoyFin = Carbon::now()->endOfDay();
        $diario = $this->metaService->resumenSupervisor($supervisorId, $hoyInicio, $hoyFin);

        // Hallazgos summary (filter by supervisor when provided, otherwise all)
        $hallazgosQuery = PdrHallazgo::when($supervisorId, function ($q) use ($supervisorId) {
            $q->whereHas('ejecucion.metaAsignada', function ($sub) use ($supervisorId) {
                $sub->where('supervisor_id', $supervisorId);
            });
        });

        $hallazgos = [
            'abiertos'   => (clone $hallazgosQuery)->where('estado_resolucion', 'abierto')->count(),
            'en_proceso' => (clone $hallazgosQuery)->where('estado_resolucion', 'en_proceso')->count(),
            'cerrados'   => (clone $hallazgosQuery)->where('estado_resolucion', 'cerrado')->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => [
                'mensual'   => $mensual,
                'diario'    => $diario,
                'hallazgos' => $hallazgos,
            ],
        ]);
    }

    /**
     * Resumen por supervisor — lista de supervisores activos con su progreso
     * mensual y diario. Alimenta el grid de la vista general (sin dropdown).
     */
    public function resumenSupervisores(Request $request): JsonResponse
    {
        $desde     = Carbon::now()->startOfMonth();
        $hasta     = Carbon::now()->endOfMonth();
        $hoyInicio = Carbon::now()->startOfDay();
        $hoyFin    = Carbon::now()->endOfDay();


        $supervisores = PdrSupervisor::with('trabajador')
            ->where('is_active', true)
            ->get()
            ->map(function (PdrSupervisor $s) use ($desde, $hasta, $hoyInicio, $hoyFin) {
                $t = $s->trabajador;

                return [
                    'id'              => $s->id,
                    'trabajador_id'   => $s->trabajador_id,
                    'nombre_completo' => $t?->nombre_completo,
                    'dni'             => $t?->dni,
                    'cargo'           => $t?->cargo,
                    'mensual'         => $this->metaService->resumenSupervisor($s->id, $desde, $hasta),
                    'diario'          => $this->metaService->resumenSupervisor($s->id, $hoyInicio, $hoyFin),
                ];
            });

        return response()->json(['success' => true, 'data' => $supervisores]);
    }

    public function pendientes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supervisor_id' => 'required|integer|exists:pdr_supervisores,id',
        ]);

        $hoy = Carbon::now()->startOfDay();

        $pendientes = PdrMetaAsignada::with(['metaConfig', 'supervisor.trabajador'])
            ->where('supervisor_id', $validated['supervisor_id'])
            ->whereIn('estado', ['pendiente', 'parcial'])
            ->where('periodo_fin', '>=', $hoy)
            ->orderBy('periodo_fin')
            ->get();

        return response()->json(['success' => true, 'data' => $pendientes]);
    }

    // ─────────────────────────── Archivos ───────────────────────────

    public function downloadFile(int $fileId): StreamedResponse|JsonResponse
    {
        $file = PdrEjecucionFile::find($fileId);

        if (! $file || ! Storage::disk(self::DISK)->exists($file->path)) {
            return response()->json(['success' => false, 'message' => 'Archivo no encontrado'], 404);
        }

        return Storage::disk(self::DISK)->download($file->path, $file->original_name, [
            'Content-Type' => $file->mime_type,
        ]);
    }

    public function deleteFile(Request $request, int $fileId): JsonResponse
    {
        $file = PdrEjecucionFile::find($fileId);

        if (! $file) {
            return response()->json(['success' => false, 'message' => 'Archivo no encontrado'], 404);
        }

        Storage::disk(self::DISK)->delete($file->path);
        $file->delete();

        return response()->json(['success' => true, 'message' => 'Archivo eliminado']);
    }

    // ─────────────────────────── Helpers ───────────────────────────

    /**
     * Store a single file for an execution.
     */
    protected function storeFile(int $ejecucionId, $file): PdrEjecucionFile
    {
        $storedName = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path       = "pdr/{$ejecucionId}/{$storedName}";

        $file->storeAs("pdr/{$ejecucionId}", $storedName, self::DISK);

        return PdrEjecucionFile::create([
            'ejecucion_id'  => $ejecucionId,
            'original_name' => $file->getClientOriginalName(),
            'stored_name'   => $storedName,
            'mime_type'     => $file->getMimeType(),
            'size_bytes'    => $file->getSize(),
            'disk'          => self::DISK,
            'path'          => $path,
        ]);
    }
}
