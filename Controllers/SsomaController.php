<?php

namespace Modulos_ERP\TrabajadoresKrsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modulos_ERP\TrabajadoresKrsft\Models\SsomaWorkerDocument;
use Modulos_ERP\TrabajadoresKrsft\Models\SsomaWorkerDocumentFile;
use Modulos_ERP\TrabajadoresKrsft\Models\SsomaWorkerProfile;
use Modulos_ERP\TrabajadoresKrsft\Models\TipoTrabajador;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * SSOMA — Cumplimiento documental de trabajadores.
 *
 * Lee `trabajadores` (mismo módulo) + tablas propias ssoma_worker_*.
 * Archivos en disco PRIVADO (storage/app/ssoma), servidos por endpoint
 * autenticado + permiso de módulo.
 */
class SsomaController extends Controller
{
    private array $docTypes = ['SST', 'EMO', 'CAMO', 'EPP', 'DOC_SST'];

    private const DISK = 'local';

    private const MAX_KB = 8192;

    private const MIMES = 'pdf,jpg,jpeg,png';

    // ─────────────────────────── Lectura ───────────────────────────

    public function list(Request $request): JsonResponse
    {
        $query = DB::table('trabajadores')
            ->select(
                'trabajadores.id',
                'trabajadores.dni',
                'trabajadores.nombre_completo',
                'trabajadores.tipo_trabajador',
                'trabajadores.cargo',
                'trabajadores.estado',
                'trabajadores.origen',
                'trabajadores.fecha_ingreso',
                'p.ubicacion',
                'p.supervisor',
                'p.modalidad',
                'p.aptitud_medica',
                'p.fotocheck_path',
            )
            ->leftJoin('ssoma_worker_profiles as p', 'p.trabajador_id', '=', 'trabajadores.id');

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('trabajadores.dni', 'like', $search)
                  ->orWhere('trabajadores.nombre_completo', 'like', $search);
            });
        }

        if ($request->filled('tipo')) {
            $query->where('trabajadores.tipo_trabajador', $request->tipo);
        }
        if ($request->filled('estado')) {
            $query->where('trabajadores.estado', $request->estado);
        }
        if ($request->filled('aptitud')) {
            $query->where('p.aptitud_medica', $request->aptitud);
        }
        if ($request->filled('modalidad')) {
            $query->where('p.modalidad', $request->modalidad);
        }

        $trabajadores = $query->orderBy('trabajadores.nombre_completo')->get();
        $ids = $trabajadores->pluck('id')->all();

        $docsByWorker = [];
        foreach (DB::table('ssoma_worker_documents')->whereIn('trabajador_id', $ids)->get() as $doc) {
            $docsByWorker[$doc->trabajador_id][$doc->tipo] = $doc;
        }

        $fileCounts = [];
        foreach (
            DB::table('ssoma_worker_document_files')
                ->select('trabajador_id', 'tipo', DB::raw('COUNT(*) as c'))
                ->whereIn('trabajador_id', $ids)
                ->groupBy('trabajador_id', 'tipo')
                ->get() as $fc
        ) {
            $fileCounts[$fc->trabajador_id][$fc->tipo] = (int) $fc->c;
        }

        $vigenciaFilter = $request->input('vigencia');

        $data = $trabajadores->map(function ($t) use ($docsByWorker, $fileCounts) {
            $documentos = [];
            foreach ($this->docTypes as $tipo) {
                $doc = $docsByWorker[$t->id][$tipo] ?? null;
                $fechaVenc = $doc ? $doc->fecha_vencimiento : null;
                $estado = SsomaWorkerDocument::computeEstado($fechaVenc);
                $documentos[$tipo] = [
                    'estado'            => $estado['estado'],
                    'dias'              => $estado['dias'],
                    'fecha_vencimiento' => $fechaVenc,
                    'archivos'          => $fileCounts[$t->id][$tipo] ?? 0,
                ];
            }

            return [
                'id'             => $t->id,
                'dni'            => $t->dni,
                'nombre'         => $t->nombre_completo,
                'tipo'           => $t->tipo_trabajador,
                'cargo'          => $t->cargo,
                'estado_laboral' => $t->estado,
                'origen'         => $t->origen ?? 'interno',
                'ubicacion'      => $t->ubicacion,
                'supervisor'     => $t->supervisor,
                'modalidad'      => $t->modalidad,
                'aptitud_medica' => $t->aptitud_medica ?? 'no_definido',
                'fotocheck'      => !empty($t->fotocheck_path),
                'documentos'     => $documentos,
            ];
        });

        if (in_array($vigenciaFilter, ['vigente', 'por_vencer', 'vencido', 'no_definido'], true)) {
            $data = $data->filter(function ($w) use ($vigenciaFilter) {
                foreach ($w['documentos'] as $d) {
                    if ($d['estado'] === $vigenciaFilter) {
                        return true;
                    }
                }
                return false;
            });
        }

        $data = $data->values()->all();

        return response()->json(['success' => true, 'data' => $data, 'total' => count($data)]);
    }

    public function stats(): JsonResponse
    {
        $total = DB::table('trabajadores')->count();

        $docsVencidos = 0;
        $docsPorVencer = 0;
        foreach (DB::table('ssoma_worker_documents')->get() as $doc) {
            $estado = SsomaWorkerDocument::computeEstado($doc->fecha_vencimiento);
            if ($estado['estado'] === 'vencido') {
                $docsVencidos++;
            } elseif ($estado['estado'] === 'por_vencer') {
                $docsPorVencer++;
            }
        }

        $trabajadoresObservados = DB::table('ssoma_worker_profiles')
            ->whereIn('aptitud_medica', ['observado', 'apto_restriccion'])
            ->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'total'                   => $total,
                'docs_vencidos'           => $docsVencidos,
                'docs_por_vencer'         => $docsPorVencer,
                'trabajadores_observados' => $trabajadoresObservados,
            ],
        ]);
    }

    public function show($id): JsonResponse
    {
        $trabajador = DB::table('trabajadores')->where('id', $id)->first();
        if (!$trabajador) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        $profile = DB::table('ssoma_worker_profiles')->where('trabajador_id', $id)->first();
        $docRows = DB::table('ssoma_worker_documents')->where('trabajador_id', $id)->get()->keyBy('tipo');

        $filesByTipo = [];
        foreach (DB::table('ssoma_worker_document_files')->where('trabajador_id', $id)->orderByDesc('id')->get() as $f) {
            $filesByTipo[$f->tipo][] = [
                'id'           => $f->id,
                'nombre'       => $f->nombre_original,
                'mime'         => $f->mime,
                'size'         => (int) $f->size,
                'download_url' => "/api/trabajadoreskrsft/ssoma/files/{$f->id}/download",
            ];
        }

        $documentos = [];
        foreach ($this->docTypes as $tipo) {
            $doc = $docRows[$tipo] ?? null;
            $fechaVenc = $doc ? $doc->fecha_vencimiento : null;
            $estado = SsomaWorkerDocument::computeEstado($fechaVenc);
            $documentos[] = [
                'tipo'              => $tipo,
                'estado'            => $estado['estado'],
                'dias'              => $estado['dias'],
                'fecha_vencimiento' => $fechaVenc,
                'notas'             => $doc ? $doc->notas : null,
                'archivos'          => $filesByTipo[$tipo] ?? [],
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'             => $trabajador->id,
                'dni'            => $trabajador->dni,
                'nombre'         => $trabajador->nombre_completo,
                'tipo'           => $trabajador->tipo_trabajador,
                'cargo'          => $trabajador->cargo,
                'estado_laboral' => $trabajador->estado,
                'origen'         => $trabajador->origen ?? 'interno',
                'trabajador'     => $trabajador,
                'fecha_ingreso'  => $trabajador->fecha_ingreso,
                'ubicacion'      => $profile->ubicacion ?? null,
                'supervisor'     => $profile->supervisor ?? null,
                'modalidad'      => $profile->modalidad ?? null,
                'aptitud_medica' => $profile->aptitud_medica ?? 'no_definido',
                'fotocheck_url'  => !empty($profile->fotocheck_path)
                    ? "/api/trabajadoreskrsft/ssoma/{$id}/fotocheck"
                    : null,
                'documentos'     => $documentos,
            ],
        ]);
    }

    // ─────────────────────────── Escritura ───────────────────────────

    public function saveProfile(Request $request, $id): JsonResponse
    {
        if (!DB::table('trabajadores')->where('id', $id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        $validated = $request->validate([
            'aptitud_medica' => 'nullable|in:apto,apto_restriccion,observado,no_apto,no_definido',
            'modalidad'      => 'nullable|in:Oficina,Campo,Visita',
            'supervisor'     => 'nullable|string|max:150',
            'ubicacion'      => 'nullable|string|max:150',
            'documentos'     => 'nullable|array',
        ]);

        SsomaWorkerProfile::updateOrCreate(
            ['trabajador_id' => $id],
            [
                'aptitud_medica' => $validated['aptitud_medica'] ?? 'no_definido',
                'modalidad'      => $validated['modalidad'] ?? null,
                'supervisor'     => $validated['supervisor'] ?? null,
                'ubicacion'      => $validated['ubicacion'] ?? null,
            ],
        );

        $documentos = $request->input('documentos', []);
        foreach ($this->docTypes as $tipo) {
            if (!array_key_exists($tipo, $documentos)) {
                continue;
            }
            $fechaVenc = $documentos[$tipo]['fecha_vencimiento'] ?? null;
            DB::table('ssoma_worker_documents')->updateOrInsert(
                ['trabajador_id' => $id, 'tipo' => $tipo],
                ['fecha_vencimiento' => $fechaVenc ?: null, 'updated_at' => now(), 'created_at' => now()],
            );
        }

        return response()->json(['success' => true, 'message' => 'Datos SSOMA guardados']);
    }

    public function uploadFile(Request $request, $id): JsonResponse
    {
        if (!DB::table('trabajadores')->where('id', $id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        $request->validate([
            'tipo' => 'required|in:SST,EMO,CAMO,EPP,DOC_SST',
            'file' => 'required|file|mimes:' . self::MIMES . '|max:' . self::MAX_KB,
        ]);

        $file = $request->file('file');
        $ext = $file->getClientOriginalExtension();
        $name = Str::uuid()->toString() . '.' . $ext;
        $path = $file->storeAs("ssoma/{$id}/{$request->tipo}", $name, self::DISK);

        $row = SsomaWorkerDocumentFile::create([
            'trabajador_id'   => $id,
            'tipo'            => $request->tipo,
            'nombre_original' => $file->getClientOriginalName(),
            'path'            => $path,
            'size'            => $file->getSize(),
            'mime'            => $file->getClientMimeType(),
            'uploaded_by'     => $request->user()?->id,
        ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'id'           => $row->id,
                'tipo'         => $row->tipo,
                'nombre'       => $row->nombre_original,
                'mime'         => $row->mime,
                'size'         => $row->size,
                'download_url' => "/api/trabajadoreskrsft/ssoma/files/{$row->id}/download",
            ],
        ]);
    }

    public function listFiles($id): JsonResponse
    {
        $files = DB::table('ssoma_worker_document_files')
            ->where('trabajador_id', $id)
            ->orderByDesc('id')
            ->get()
            ->groupBy('tipo')
            ->map(fn ($g) => $g->map(fn ($f) => [
                'id'           => $f->id,
                'nombre'       => $f->nombre_original,
                'mime'         => $f->mime,
                'size'         => (int) $f->size,
                'download_url' => "/api/trabajadoreskrsft/ssoma/files/{$f->id}/download",
            ])->values());

        return response()->json(['success' => true, 'data' => $files]);
    }

    public function deleteFile($fileId): JsonResponse
    {
        $file = SsomaWorkerDocumentFile::find($fileId);
        if (!$file) {
            return response()->json(['success' => false, 'message' => 'Archivo no encontrado'], 404);
        }

        Storage::disk(self::DISK)->delete($file->path);
        $file->delete();

        return response()->json(['success' => true, 'message' => 'Archivo eliminado']);
    }

    public function downloadFile($fileId): StreamedResponse
    {
        $file = SsomaWorkerDocumentFile::findOrFail($fileId);
        abort_unless(Storage::disk(self::DISK)->exists($file->path), 404, 'Archivo no disponible');

        return Storage::disk(self::DISK)->download($file->path, $file->nombre_original);
    }

    public function uploadFotocheck(Request $request, $id): JsonResponse
    {
        if (!DB::table('trabajadores')->where('id', $id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        $request->validate([
            'file' => 'required|file|mimes:jpg,jpeg,png|max:' . self::MAX_KB,
        ]);

        $profile = SsomaWorkerProfile::firstOrNew(['trabajador_id' => $id]);
        if ($profile->fotocheck_path && Storage::disk(self::DISK)->exists($profile->fotocheck_path)) {
            Storage::disk(self::DISK)->delete($profile->fotocheck_path);
        }

        $file = $request->file('file');
        $name = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs("ssoma/{$id}/fotocheck", $name, self::DISK);

        $profile->fotocheck_path = $path;
        if (!$profile->exists) {
            $profile->aptitud_medica = $profile->aptitud_medica ?? 'no_definido';
        }
        $profile->save();

        return response()->json([
            'success' => true,
            'data'    => ['fotocheck_url' => "/api/trabajadoreskrsft/ssoma/{$id}/fotocheck"],
        ]);
    }

    public function showFotocheck($id): StreamedResponse
    {
        $profile = SsomaWorkerProfile::where('trabajador_id', $id)->firstOrFail();
        abort_unless(
            $profile->fotocheck_path && Storage::disk(self::DISK)->exists($profile->fotocheck_path),
            404,
            'Sin fotocheck'
        );

        return Storage::disk(self::DISK)->response($profile->fotocheck_path);
    }

    // ─────────────────────────── Tipos de trabajador ───────────────────────────

    public function tipos(): JsonResponse
    {
        $tipos = TipoTrabajador::where('activo', true)->orderBy('nombre')->pluck('nombre');

        return response()->json(['success' => true, 'data' => $tipos]);
    }

    public function storeTipo(Request $request): JsonResponse
    {
        $validated = $request->validate(['nombre' => 'required|string|max:100']);
        $nombre = trim($validated['nombre']);

        $tipo = TipoTrabajador::firstOrCreate(['nombre' => $nombre], ['activo' => true]);

        return response()->json(['success' => true, 'data' => ['nombre' => $tipo->nombre]], 201);
    }

    private function workerPayload(Request $request): array
    {
        $nombreCompleto = trim(
            ($request->apellido_paterno ?? '') . ' ' .
            ($request->apellido_materno ?? '') . ', ' .
            ($request->nombres ?? '')
        );

        return [
            'dni'                            => $request->dni,
            'nombres'                        => $request->nombres,
            'apellido_paterno'               => $request->apellido_paterno,
            'apellido_materno'               => $request->apellido_materno,
            'nombre_completo'                => $nombreCompleto,
            'fecha_nacimiento'               => $request->fecha_nacimiento ?: null,
            'genero'                         => $request->genero ?? 'M',
            'estado_civil'                   => $request->estado_civil ?? 'Soltero',
            'sistema_pensiones'              => $request->sistema_pensiones,
            'telefono'                       => $request->telefono,
            'email'                          => $request->email,
            'direccion'                      => $request->direccion,
            'cargo'                          => $request->cargo,
            'tipo_trabajador'                => $request->tipo_trabajador ?? 'Administrativo',
            'fecha_ingreso'                  => $request->fecha_ingreso,
            'tipo_contrato'                  => $request->tipo_contrato ?? 'Indefinido',
            'estado'                         => $request->estado ?? 'Activo',
            'sueldo_basico'                  => $request->sueldo_basico ?? 0,
            'contacto_emergencia_nombre'     => $request->contacto_emergencia_nombre,
            'contacto_emergencia_telefono'   => $request->contacto_emergencia_telefono,
            'contacto_emergencia_parentesco' => $request->contacto_emergencia_parentesco,
            'observaciones'                  => $request->observaciones,
        ];
    }

    /** Crea un trabajador EXTERNO (gateado por view_ssoma vía middleware). */
    public function storeWorker(Request $request): JsonResponse
    {
        $request->validate([
            'dni'              => 'required|string|max:20|unique:trabajadores,dni',
            'nombres'          => 'required|string|max:100',
            'apellido_paterno' => 'required|string|max:100',
            'fecha_ingreso'    => 'required|date',
        ]);

        $data = $this->workerPayload($request);
        $data['origen']     = 'externo';
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('trabajadores')->insertGetId($data);

        return response()->json(['success' => true, 'trabajador_id' => $id], 201);
    }

    /** Edita un trabajador EXTERNO (gateado por view_ssoma). Internos no. */
    public function updateWorker(Request $request, $id): JsonResponse
    {
        $trabajador = DB::table('trabajadores')->where('id', $id)->first();
        if (!$trabajador) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }
        if (($trabajador->origen ?? 'interno') !== 'externo') {
            return response()->json([
                'success' => false,
                'message' => 'Solo se editan datos personales de trabajadores externos desde SSOMA.',
            ], 403);
        }

        $request->validate([
            'dni'              => "required|string|max:20|unique:trabajadores,dni,{$id}",
            'nombres'          => 'required|string|max:100',
            'apellido_paterno' => 'required|string|max:100',
            'fecha_ingreso'    => 'required|date',
        ]);

        $data = $this->workerPayload($request);
        $data['updated_at'] = now();
        DB::table('trabajadores')->where('id', $id)->update($data);

        return response()->json(['success' => true, 'trabajador_id' => $id]);
    }

    /**
     * Elimina un trabajador EXTERNO (y su data SSOMA + archivos).
     * Solo accesible con permiso view_ssoma (middleware authorize.module).
     * Los internos NO se borran desde acá.
     */
    public function destroyWorker($id): JsonResponse
    {
        $trabajador = DB::table('trabajadores')->where('id', $id)->first();
        if (!$trabajador) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        if (($trabajador->origen ?? 'interno') !== 'externo') {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden eliminar trabajadores externos desde SSOMA.',
            ], 403);
        }

        foreach (DB::table('ssoma_worker_document_files')->where('trabajador_id', $id)->get() as $f) {
            Storage::disk(self::DISK)->delete($f->path);
        }
        $profile = DB::table('ssoma_worker_profiles')->where('trabajador_id', $id)->first();
        if ($profile && !empty($profile->fotocheck_path)) {
            Storage::disk(self::DISK)->delete($profile->fotocheck_path);
        }

        DB::table('ssoma_worker_document_files')->where('trabajador_id', $id)->delete();
        DB::table('ssoma_worker_documents')->where('trabajador_id', $id)->delete();
        DB::table('ssoma_worker_profiles')->where('trabajador_id', $id)->delete();
        DB::table('trabajadores')->where('id', $id)->delete();

        return response()->json(['success' => true, 'message' => 'Trabajador externo eliminado']);
    }
}
