<?php

// The folder name determines the namespace dynamically
// Example: If folder is "trabajadores_krsft", namespace becomes:
// Modulos_ERP\trabajadores_krsft\Controllers

namespace Modulos_ERP\trabajadores_krsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TrabajadorController extends Controller
{
    protected $table = 'trabajadores';

    public function index()
    {
        // Render from module's Views folder
        // Format: ModuleName/ViewName -> Modulos_ERP/ModuleName/Views/ViewName.vue
        $moduleName = basename(dirname(__DIR__));
        return Inertia::render("{$moduleName}/Index");
    }

    public function list(Request $request)
    {
        $query = DB::table($this->table);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('dni', 'like', "%{$search}%")
                  ->orWhere('nombre_completo', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $trabajadores = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'trabajadores' => $trabajadores,
            'workers' => $trabajadores
        ]);
    }

    public function show($id)
    {
        $trabajador = DB::table($this->table)->find($id);

        if (!$trabajador) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        return response()->json(['success' => true, 'trabajador' => $trabajador]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'dni' => 'required|string|max:20|unique:trabajadores,dni',
            'nombres' => 'required|string|max:100',
            'apellido_paterno' => 'required|string|max:100',
            'fecha_ingreso' => 'required|date',
        ]);

        try {
            $nombreCompleto = trim(
                ($request->apellido_paterno ?? '') . ' ' .
                ($request->apellido_materno ?? '') . ', ' .
                ($request->nombres ?? '')
            );

            $id = DB::table($this->table)->insertGetId([
                'dni' => $request->dni,
                'nombres' => $request->nombres,
                'apellido_paterno' => $request->apellido_paterno,
                'apellido_materno' => $request->apellido_materno,
                'nombre_completo' => $nombreCompleto,
                'fecha_nacimiento' => $request->fecha_nacimiento,
                'lugar_nacimiento' => $request->lugar_nacimiento,
                'genero' => $request->genero ?? 'M',
                'estado_civil' => $request->estado_civil ?? 'Soltero',
                'sistema_pensiones' => $request->sistema_pensiones,
                'telefono' => $request->telefono,
                'email' => $request->email,
                'direccion' => $request->direccion,
                'distrito' => $request->distrito,
                'provincia' => $request->provincia,
                'departamento' => $request->departamento,
                'area_id' => $request->area_id,
                'cargo' => $request->cargo,
                'fecha_ingreso' => $request->fecha_ingreso,
                'fecha_cese' => $request->fecha_cese,
                'tipo_contrato' => $request->tipo_contrato ?? 'Indefinido',
                'estado' => $request->estado ?? 'Activo',
                'sueldo_basico' => $request->sueldo_basico ?? 0,
                'banco' => $request->banco,
                'numero_cuenta' => $request->numero_cuenta,
                'tiene_antecedentes_penales' => $request->tiene_antecedentes_penales ?? false,
                'tiene_antecedentes_policiales' => $request->tiene_antecedentes_policiales ?? false,
                'tiene_sctr' => $request->tiene_sctr ?? false,
                'tiene_epsrc' => $request->tiene_epsrc ?? false,
                'contacto_emergencia_nombre' => $request->contacto_emergencia_nombre,
                'contacto_emergencia_telefono' => $request->contacto_emergencia_telefono,
                'contacto_emergencia_parentesco' => $request->contacto_emergencia_parentesco,
                'observaciones' => $request->observaciones,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Trabajador creado exitosamente',
                'trabajador_id' => $id
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $trabajador = DB::table($this->table)->find($id);

        if (!$trabajador) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        try {
            $data = $request->except(['_token', '_method']);
            $data['nombre_completo'] = trim(
                ($request->apellido_paterno ?? '') . ' ' .
                ($request->apellido_materno ?? '') . ', ' .
                ($request->nombres ?? '')
            );
            $data['updated_at'] = now();

            DB::table($this->table)->where('id', $id)->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Trabajador actualizado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $trabajador = DB::table($this->table)->find($id);

        if (!$trabajador) {
            return response()->json(['success' => false, 'message' => 'Trabajador no encontrado'], 404);
        }

        try {
            DB::table($this->table)->where('id', $id)->delete();
            return response()->json(['success' => true, 'message' => 'Trabajador eliminado exitosamente']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function stats()
    {
        $total = DB::table($this->table)->count();
        $activos = DB::table($this->table)->where('estado', 'Activo')->count();
        $inactivos = $total - $activos;

        return response()->json([
            'success' => true,
            'stats' => ['total' => $total, 'activos' => $activos, 'inactivos' => $inactivos]
        ]);
    }

    /**
     * Descargar plantilla para importación (CSV con BOM para Excel)
     */
    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="plantilla_trabajadores.csv"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ];

        $columns = [
            'DNI', 
            'Nombres', 
            'Apellido Paterno', 
            'Apellido Materno', 
            'Fecha Nacimiento (YYYY-MM-DD)', 
            'Cargo', 
            'Fecha Ingreso (YYYY-MM-DD)', 
            'Estado',
            'Email',
            'Telefono'
        ];

        $callback = function() use ($columns) {
            $file = fopen('php://output', 'w');
            
            // UTF-8 BOM para que Excel lo lea correctamente
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // Usar punto y coma como delimitador (mejor para Excel en español)
            fputcsv($file, $columns, ';');
            
            // Fila de ejemplo
            fputcsv($file, [
                '12345678', 
                'Juan', 
                'Perez', 
                'Gomez', 
                '1990-01-01', 
                'Asistente', 
                date('Y-m-d'), 
                'Activo', 
                'juan@example.com', 
                '999888777'
            ], ';');
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Exportar trabajadores
     */
    public function exportExcel()
    {
        $headers = [
            'Content-Type' => 'application/vnd.ms-excel',
            'Content-Disposition' => 'attachment; filename="trabajadores_' . date('Y-m-d') . '.csv"',
        ];

        $callback = function() {
            $file = fopen('php://output', 'w');
            
            // Cabeceras
            fputcsv($file, [
                'ID',
                'DNI',
                'Nombre Completo',
                'Cargo',
                'Area',
                'Fecha Ingreso',
                'Estado',
                'Email',
                'Telefono'
            ]);

            // Datos
            $query = DB::table($this->table)->orderBy('created_at', 'desc');
            
            $query->chunk(100, function($rows) use ($file) {
                foreach ($rows as $row) {
                    fputcsv($file, [
                        $row->id,
                        $row->dni,
                        $row->nombre_completo,
                        $row->cargo,
                        $row->area_id, // Idealmente hacer join con areas
                        $row->fecha_ingreso,
                        $row->estado,
                        $row->email,
                        $row->telefono
                    ]);
                }
            });

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Importar trabajadores desde Excel (CSV)
     */
    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls'
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        
        // Simple CSV parsing
        $data = array_map('str_getcsv', file($path));
        $header = array_shift($data); // Remove header
        
        // Map header indices
        $headerMap = [];
        foreach ($header as $index => $col) {
            $col = strtolower(trim($col));
            if (str_contains($col, 'dni')) $headerMap['dni'] = $index;
            elseif (str_contains($col, 'nombres')) $headerMap['nombres'] = $index;
            elseif (str_contains($col, 'paterno')) $headerMap['paterno'] = $index;
            elseif (str_contains($col, 'materno')) $headerMap['materno'] = $index;
            elseif (str_contains($col, 'nacimiento')) $headerMap['nacimiento'] = $index;
            elseif (str_contains($col, 'cargo')) $headerMap['cargo'] = $index;
            elseif (str_contains($col, 'ingreso')) $headerMap['ingreso'] = $index;
            elseif (str_contains($col, 'estado')) $headerMap['estado'] = $index;
            elseif (str_contains($col, 'email')) $headerMap['email'] = $index;
            elseif (str_contains($col, 'telefono')) $headerMap['telefono'] = $index;
        }

        $imported = 0;
        $errors = [];
        $rowNum = 2; // Start after header

        foreach ($data as $row) {
            // Skip empty rows
            if (count($row) < 3) {
                $rowNum++;
                continue;
            }

            try {
                // Get values using map or fallback to default indices
                $dni = $row[$headerMap['dni'] ?? 0] ?? null;
                $nombres = $row[$headerMap['nombres'] ?? 1] ?? null;
                $paterno = $row[$headerMap['paterno'] ?? 2] ?? null;
                $materno = $row[$headerMap['materno'] ?? 3] ?? '';
                
                if (empty($dni) || empty($nombres) || empty($paterno)) {
                    throw new \Exception('Datos incompletos (DNI, Nombre o Apellido)');
                }

                // Check duplicate
                if (DB::table($this->table)->where('dni', $dni)->exists()) {
                    throw new \Exception('DNI ya existe');
                }

                $nombreCompleto = trim("$paterno $materno, $nombres");
                
                DB::table($this->table)->insert([
                    'dni' => $dni,
                    'nombres' => $nombres,
                    'apellido_paterno' => $paterno,
                    'apellido_materno' => $materno,
                    'nombre_completo' => $nombreCompleto,
                    'fecha_nacimiento' => $row[$headerMap['nacimiento'] ?? 4] ?? null,
                    'cargo' => $row[$headerMap['cargo'] ?? 5] ?? null,
                    'fecha_ingreso' => $row[$headerMap['ingreso'] ?? 6] ?? now(),
                    'estado' => $row[$headerMap['estado'] ?? 7] ?? 'Activo',
                    'email' => $row[$headerMap['email'] ?? 8] ?? null,
                    'telefono' => $row[$headerMap['telefono'] ?? 9] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $imported++;

            } catch (\Exception $e) {
                $errors[] = [
                    'row' => $rowNum,
                    'dni' => $dni ?? '---',
                    'error' => $e->getMessage()
                ];
            }
            
            $rowNum++;
        }

        return response()->json([
            'success' => true,
            'total' => count($data),
            'imported' => $imported,
            'errors' => $errors
        ]);
    }
}
