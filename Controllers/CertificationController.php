<?php

namespace Modulos_ERP\TrabajadoresKrsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Services\LogKrsftService;
use Modulos_ERP\TrabajadoresKrsft\Models\SsomaCertificationType;
use Modulos_ERP\TrabajadoresKrsft\Models\SsomaWorkerCertification;
use Modulos_ERP\TrabajadoresKrsft\Models\SsomaWorkerCertificationFile;
use Modulos_ERP\TrabajadoresKrsft\Models\SsomaWorkerDocument;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Capacitaciones y Certificados (sección SSOMA).
 *
 * Catálogo configurable de certificaciones (ssoma_certification_types) +
 * registro por trabajador (emisión / vencimiento) + archivos en disco
 * PRIVADO (storage/app/ssoma/{id}/cert/...), servidos por endpoint autenticado.
 *
 * Permisos: el segmento `certifications` exige `view_certificaciones` vía
 * middleware. La escritura exige además `manage_certificaciones` (assertCanManage).
 */
class CertificationController extends Controller
{
    private const DISK = 'local';

    private const MAX_KB = 8192;

    private const MIMES = 'pdf,jpg,jpeg,png';

    private const MANAGE_PERMISSION = 'module.trabajadoreskrsft.manage_certificaciones';

    /** Las acciones de escritura requieren el permiso de gestión. */
    private function assertCanManage(Request $request): void
    {
        abort_unless(
            $request->user()?->hasPermission(self::MANAGE_PERMISSION),
            403,
            'No tienes permiso para gestionar certificaciones.',
        );
    }

    private function downloadUrl(int $fileId): string
    {
        return "/api/trabajadoreskrsft/certifications/files/{$fileId}/download";
    }

    // ─────────────────────────── Lectura ───────────────────────────

    public function types(): JsonResponse
    {
        $tipos = SsomaCertificationType::where('activo', true)
            ->orderBy('orden')
            ->get(['id', 'codigo', 'nombre', 'vigencia_meses', 'orden']);

        return response()->json(['success' => true, 'data' => $tipos]);
    }

    /**
     * Matriz de cumplimiento de certificaciones por trabajador.
     *
     * Devuelve el catálogo de tipos + el estado de vigencia de cada
     * certificación agrupado por trabajador. Alimenta la vista de
     * Capacitaciones de la tabla SSOMA (swap de columnas) sin disparar
     * una petición por fila.
     */
    public function matrix(): JsonResponse
    {
        $tipos = SsomaCertificationType::where('activo', true)
            ->orderBy('orden')
            ->get(['id', 'codigo', 'nombre', 'vigencia_meses']);

        // Indexed by trabajador_id → array of cert cells keyed by certification_type_id.
        // Structure: $workers[$tid][$cid] = cell array (see below).
        $workers = [];

        // Fotocheck paths per worker (from ssoma_worker_profiles).
        // Stored at $workers[$tid]['_fotocheck'] so the frontend can use it for the
        // per-worker detail card without a separate request.
        $fotocheckByWorker = [];
        foreach (DB::table('ssoma_worker_profiles')->select('trabajador_id', 'fotocheck_path')->get() as $p) {
            $fotocheckByWorker[$p->trabajador_id] = $p->fotocheck_path;
        }

        // 1. Archivos primero: deja la celda con el más reciente + el conteo, para
        //    poder previsualizar desde la matriz aunque aún no tenga fechas cargadas.
        //    incompleto=true por defecto: tiene archivo pero aún no se sabe si hay fecha_emision.
        foreach (
            DB::table('ssoma_worker_certification_files')
                ->select('id', 'trabajador_id', 'certification_type_id', 'nombre_original', 'mime')
                ->orderByDesc('id')->get() as $f
        ) {
            $tid = $f->trabajador_id;
            $cid = $f->certification_type_id;
            if (!isset($workers[$tid][$cid])) {
                $workers[$tid][$cid] = [
                    'estado'            => 'no_definido',
                    'dias'              => 0,
                    'fecha_vencimiento' => null,
                    'fecha_emision'     => null,
                    'incompleto'        => true,
                    'cargo'             => null,
                    'archivo'           => [
                        'id'           => $f->id,
                        'nombre'       => $f->nombre_original,
                        'mime'         => $f->mime,
                        'download_url' => $this->downloadUrl($f->id),
                    ],
                    'archivos_count'    => 1,
                ];
            } else {
                $workers[$tid][$cid]['archivos_count']++;
            }
        }

        // 2. Estado de vigencia + cargo: superpone datos de la fila de certificación.
        //    Recomputa incompleto: archivo presente pero sin fecha_emision → true.
        foreach (
            DB::table('ssoma_worker_certifications')
                ->select('trabajador_id', 'certification_type_id', 'fecha_vencimiento', 'fecha_emision', 'cargo')
                ->get() as $cert
        ) {
            $tid = $cert->trabajador_id;
            $cid = $cert->certification_type_id;
            $fechaVenc = $cert->fecha_vencimiento ? substr($cert->fecha_vencimiento, 0, 10) : null;
            $fechaEmision = $cert->fecha_emision ? substr($cert->fecha_emision, 0, 10) : null;
            $estado = SsomaWorkerDocument::computeEstado($fechaVenc);
            $cell = $workers[$tid][$cid] ?? ['archivo' => null, 'archivos_count' => 0];
            $workers[$tid][$cid] = [
                'estado'            => $estado['estado'],
                'dias'              => $estado['dias'],
                'fecha_vencimiento' => $fechaVenc,
                'fecha_emision'     => $fechaEmision,
                'incompleto'        => ($cell['archivo'] !== null) && empty($fechaEmision),
                'cargo'             => $cert->cargo,
                'archivo'           => $cell['archivo'],
                'archivos_count'    => $cell['archivos_count'],
            ];
        }

        // 3. Inject fotocheck_path per worker at the top of their cert map,
        //    under the reserved key '_meta', so the frontend can read it without
        //    a separate SSOMA list request.
        foreach ($fotocheckByWorker as $tid => $path) {
            if (isset($workers[$tid])) {
                $workers[$tid]['_meta'] = ['fotocheck_path' => $path];
            }
        }

        return response()->json([
            'success' => true,
            'types'   => $tipos,
            'workers' => (object) $workers,
        ]);
    }

    public function show($trabajadorId): JsonResponse
    {
        if (!DB::table('trabajadores')->where('id', $trabajadorId)->exists()) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        $tipos = SsomaCertificationType::where('activo', true)->orderBy('orden')->get();

        $certRows = SsomaWorkerCertification::where('trabajador_id', $trabajadorId)
            ->get()
            ->keyBy('certification_type_id');

        $filesByType = [];
        foreach (
            SsomaWorkerCertificationFile::where('trabajador_id', $trabajadorId)
                ->orderByDesc('id')
                ->get() as $f
        ) {
            $filesByType[$f->certification_type_id][] = [
                'id'           => $f->id,
                'nombre'       => $f->nombre_original,
                'mime'         => $f->mime,
                'size'         => (int) $f->size,
                'download_url' => $this->downloadUrl($f->id),
            ];
        }

        $data = $tipos->map(function (SsomaCertificationType $tipo) use ($certRows, $filesByType) {
            $cert = $certRows->get($tipo->id);
            $fechaEmision = $cert?->fecha_emision?->toDateString();
            $fechaVenc = $cert?->fecha_vencimiento?->toDateString();
            $estado = SsomaWorkerDocument::computeEstado($fechaVenc);

            return [
                'certification_type_id' => $tipo->id,
                'codigo'                => $tipo->codigo,
                'nombre'                => $tipo->nombre,
                'vigencia_meses'        => $tipo->vigencia_meses,
                'cert'                  => [
                    'id'                   => $cert?->id,
                    'fecha_emision'        => $fechaEmision,
                    'fecha_vencimiento'    => $fechaVenc,
                    'vencimiento_override' => (bool) ($cert?->vencimiento_override ?? false),
                    'notas'                => $cert?->notas,
                ],
                'estado'                => $estado['estado'],
                'dias'                  => $estado['dias'],
                'archivos'              => $filesByType[$tipo->id] ?? [],
            ];
        });

        return response()->json(['success' => true, 'data' => $data]);
    }

    // ─────────────────────────── Escritura ───────────────────────────

    public function saveCert(Request $request, $trabajadorId): JsonResponse
    {
        $this->assertCanManage($request);

        if (!DB::table('trabajadores')->where('id', $trabajadorId)->exists()) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        $validated = $request->validate([
            'certification_type_id' => 'required|exists:ssoma_certification_types,id',
            'fecha_emision'         => 'nullable|date',
            'fecha_vencimiento'     => 'nullable|date',
            'vencimiento_override'  => 'boolean',
            'notas'                 => 'nullable|string|max:500',
        ]);

        $tipo = SsomaCertificationType::findOrFail($validated['certification_type_id']);

        $override = (bool) ($validated['vencimiento_override'] ?? false);
        $fechaEmision = $validated['fecha_emision'] ?? null;
        $fechaVenc = $validated['fecha_vencimiento'] ?? null;

        if ($fechaEmision && !$override) {
            // Vencimiento autoritativo: emisión + vigencia del tipo.
            $fechaVenc = SsomaWorkerCertification::computeVencimiento($fechaEmision, $tipo->vigencia_meses);
        } elseif (!$override) {
            // Sin emisión y sin override → no hay vencimiento calculable.
            $fechaVenc = null;
        }

        $cert = SsomaWorkerCertification::updateOrCreate(
            ['trabajador_id' => $trabajadorId, 'certification_type_id' => $tipo->id],
            [
                'fecha_emision'        => $fechaEmision ?: null,
                'fecha_vencimiento'    => $fechaVenc ?: null,
                'vencimiento_override' => $override,
                'notas'                => $validated['notas'] ?? null,
            ],
        );

        $estado = SsomaWorkerDocument::computeEstado($cert->fecha_vencimiento?->toDateString());

        return response()->json([
            'success' => true,
            'data'    => [
                'cert_id'              => $cert->id,
                'fecha_emision'        => $cert->fecha_emision?->toDateString(),
                'fecha_vencimiento'    => $cert->fecha_vencimiento?->toDateString(),
                'vencimiento_override' => $cert->vencimiento_override,
                'estado'               => $estado['estado'],
                'dias'                 => $estado['dias'],
            ],
        ]);
    }

    /**
     * Assign or clear the cargo (emisor/receptor/vigia) for a worker's certification.
     *
     * Gate: setting a non-null cargo requires at least one uploaded file for that
     * (worker, cert type) pair. Clearing (null) is always allowed.
     */
    public function saveCargo(Request $request, $trabajadorId): JsonResponse
    {
        $this->assertCanManage($request);

        if (!DB::table('trabajadores')->where('id', $trabajadorId)->exists()) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        $validated = $request->validate([
            'certification_type_id' => 'required|exists:ssoma_certification_types,id',
            'cargo'                 => 'nullable|in:emisor,receptor,vigia',
        ]);

        $certTypeId = $validated['certification_type_id'];
        $cargo      = $validated['cargo'] ?? null;

        // Gate: a non-null cargo requires at least one uploaded document AND a recorded fecha_emision.
        if ($cargo !== null) {
            $hasFile = SsomaWorkerCertificationFile::where('trabajador_id', $trabajadorId)
                ->where('certification_type_id', $certTypeId)
                ->exists();

            $cert = SsomaWorkerCertification::where('trabajador_id', $trabajadorId)
                ->where('certification_type_id', $certTypeId)
                ->first();

            if (!$hasFile || !$cert || empty($cert->fecha_emision)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe subir el documento y registrar la fecha de emisión antes de asignar un cargo.',
                    'errors'  => ['cargo' => ['Debe subir el documento y registrar la fecha de emisión antes de asignar un cargo.']],
                ], 422);
            }
        }

        if ($cargo === null) {
            // Limpiar: solo actualiza una fila existente, no crea una fila fantasma
            // (cert sin fechas ni cargo) para un par sin registro previo.
            $cert = SsomaWorkerCertification::where('trabajador_id', $trabajadorId)
                ->where('certification_type_id', $certTypeId)
                ->first();
            $cert?->update(['cargo' => null]);
        } else {
            $cert = SsomaWorkerCertification::updateOrCreate(
                ['trabajador_id' => $trabajadorId, 'certification_type_id' => $certTypeId],
                ['cargo' => $cargo],
            );
        }

        app(LogKrsftService::class)->log(
            module: 'trabajadoreskrsft',
            action: $cargo === null ? 'cargo_removido' : 'cargo_asignado',
            message: $cargo === null
                ? "Cargo removido del trabajador #{$trabajadorId} en certificación #{$certTypeId}"
                : "Cargo '{$cargo}' asignado al trabajador #{$trabajadorId} en certificación #{$certTypeId}",
            level: 'info',
            userId: $request->user()?->id,
            userName: $request->user()?->name,
            extra: [
                'trabajador_id'         => $trabajadorId,
                'certification_type_id' => $certTypeId,
                'cargo'                 => $cargo,
            ],
        );

        return response()->json([
            'success' => true,
            'data'    => [
                'cert_id'               => $cert?->id,
                'trabajador_id'         => (int) $trabajadorId,
                'certification_type_id' => $certTypeId,
                'cargo'                 => $cert?->cargo,
            ],
        ]);
    }

    public function uploadFile(Request $request, $trabajadorId): JsonResponse
    {
        $this->assertCanManage($request);

        if (!DB::table('trabajadores')->where('id', $trabajadorId)->exists()) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        // fecha_emision es OPCIONAL al subir: el flujo lógico es subir el documento
        // primero y completar la fecha después. Sin fecha → queda en borrador
        // (incompleto) y se exige completarla luego (gate de cargo + señal visual).
        // Si la fecha llega ahora (orden inverso), también se persiste sin problema.
        $request->validate([
            'certification_type_id' => 'required|exists:ssoma_certification_types,id',
            'fecha_emision'         => 'nullable|date',
            'file'                  => 'required|file|mimes:' . self::MIMES . '|max:' . self::MAX_KB,
        ]);

        $tipo = SsomaCertificationType::findOrFail($request->certification_type_id);

        $file = $request->file('file');
        $ext = $file->getClientOriginalExtension();
        $name = Str::uuid()->toString() . '.' . $ext;
        $path = $file->storeAs("ssoma/{$trabajadorId}/cert/{$tipo->codigo}", $name, self::DISK);

        // File row + (opcional) upsert de fecha son atómicos: si algo falla, no
        // debe quedar ni la fila de archivo ni el archivo en disco (sin huérfanos).
        try {
            [$row, $cert] = DB::transaction(function () use ($request, $trabajadorId, $tipo, $file, $path) {
                $row = SsomaWorkerCertificationFile::create([
                    'trabajador_id'         => $trabajadorId,
                    'certification_type_id' => $tipo->id,
                    'nombre_original'       => $file->getClientOriginalName(),
                    'path'                  => $path,
                    'size'                  => $file->getSize(),
                    'mime'                  => $file->getClientMimeType(),
                    'uploaded_by'           => $request->user()?->id,
                ]);

                // Solo toca las fechas del cert si llegó fecha_emision. Si no llegó,
                // no crea fila fantasma ni pisa una fecha ya existente (orden inverso).
                $cert = null;
                if ($request->filled('fecha_emision')) {
                    $cert = SsomaWorkerCertification::firstOrNew([
                        'trabajador_id'         => $trabajadorId,
                        'certification_type_id' => $tipo->id,
                    ]);
                    $cert->fecha_emision = $request->fecha_emision;
                    if (!($cert->vencimiento_override ?? false)) {
                        $cert->fecha_vencimiento = SsomaWorkerCertification::computeVencimiento(
                            $request->fecha_emision,
                            $tipo->vigencia_meses,
                        );
                    }
                    $cert->save();
                }

                return [$row, $cert];
            });
        } catch (\Throwable $e) {
            Storage::disk(self::DISK)->delete($path);
            throw $e;
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'                => $row->id,
                'nombre'            => $row->nombre_original,
                'mime'              => $row->mime,
                'size'              => $row->size,
                'download_url'      => $this->downloadUrl($row->id),
                'fecha_emision'     => $cert?->fecha_emision?->toDateString(),
                'fecha_vencimiento' => $cert?->fecha_vencimiento?->toDateString(),
            ],
        ]);
    }

    public function deleteFile(Request $request, $fileId): JsonResponse
    {
        $this->assertCanManage($request);

        $file = SsomaWorkerCertificationFile::find($fileId);
        if (!$file) {
            return response()->json(['success' => false, 'message' => 'Archivo no encontrado'], 404);
        }

        Storage::disk(self::DISK)->delete($file->path);
        $file->delete();

        return response()->json(['success' => true, 'message' => 'Archivo eliminado']);
    }

    public function downloadFile($fileId): StreamedResponse
    {
        $file = SsomaWorkerCertificationFile::findOrFail($fileId);
        abort_unless(Storage::disk(self::DISK)->exists($file->path), 404, 'Archivo no disponible');

        return Storage::disk(self::DISK)->download($file->path, $file->nombre_original);
    }
}
