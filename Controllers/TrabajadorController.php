<?php

namespace Modulos_ERP\TrabajadoresKrsft\Controllers;

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

        if ($request->filled('cargo')) {
            $query->where('cargo', $request->cargo);
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
     * Descargar plantilla para importación (XLSX real)
     */
    public function downloadTemplate()
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Plantilla Trabajadores');

        // Headers - Las 4 columnas solicitadas
        $headers = [
            'A1' => 'APELLIDOS Y NOMBRES',
            'B1' => 'DNI',
            'C1' => 'CARGO',
            'D1' => 'ESTADO'
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        // Estilo para headers
        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '667EEA'],
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
            ],
        ];
        $sheet->getStyle('A1:D1')->applyFromArray($headerStyle);

        // Fila de ejemplo
        $sheet->setCellValue('A2', 'PEREZ GARCIA, JUAN CARLOS');
        $sheet->setCellValue('B2', '12345678');
        $sheet->setCellValue('C2', 'Analista de Sistemas');
        $sheet->setCellValue('D2', 'Activo');

        // Fila de ejemplo 2 (cesado)
        $sheet->setCellValue('A3', 'LOPEZ RODRIGUEZ, MARIA');
        $sheet->setCellValue('B3', '87654321');
        $sheet->setCellValue('C3', 'Asistente Administrativo');
        $sheet->setCellValue('D3', 'Cesado');

        // Validación de datos para columna ESTADO
        $validation = $sheet->getCell('D4')->getDataValidation();
        $validation->setType(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::TYPE_LIST);
        $validation->setErrorStyle(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::STYLE_INFORMATION);
        $validation->setAllowBlank(false);
        $validation->setShowDropDown(true);
        $validation->setFormula1('"Activo,Cesado"');
        
        // Aplicar validación a toda la columna D (filas 2-1000)
        for ($row = 2; $row <= 100; $row++) {
            $sheet->getCell("D{$row}")->setDataValidation(clone $validation);
        }

        // Ajustar ancho de columnas
        $sheet->getColumnDimension('A')->setWidth(35);
        $sheet->getColumnDimension('B')->setWidth(12);
        $sheet->getColumnDimension('C')->setWidth(30);
        $sheet->getColumnDimension('D')->setWidth(12);

        // Crear archivo XLSX
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        
        $filename = 'plantilla_trabajadores.xlsx';
        $tempFile = tempnam(sys_get_temp_dir(), 'xlsx');
        $writer->save($tempFile);

        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
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
     * Importar trabajadores desde Excel (XLSX)
     */
    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls'
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        
        try {
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
            $sheet = $spreadsheet->getActiveSheet();
            $data = $sheet->toArray();
            
            // Remove header row
            $header = array_shift($data);
            
            // Map headers to indices (flexible matching)
            $headerMap = [];
            foreach ($header as $index => $col) {
                $col = strtolower(trim($col ?? ''));
                if (str_contains($col, 'apellidos') || str_contains($col, 'nombre')) {
                    $headerMap['nombre_completo'] = $index;
                } elseif (str_contains($col, 'dni')) {
                    $headerMap['dni'] = $index;
                } elseif (str_contains($col, 'cargo')) {
                    $headerMap['cargo'] = $index;
                } elseif (str_contains($col, 'estado')) {
                    $headerMap['estado'] = $index;
                }
            }

            $imported = 0;
            $errors = [];
            $rowNum = 2; // Start after header

            foreach ($data as $row) {
                // Skip empty rows
                if (empty(array_filter($row))) {
                    $rowNum++;
                    continue;
                }

                try {
                    // Get values using map with fallback
                    $nombreCompleto = $row[$headerMap['nombre_completo'] ?? 0] ?? null;
                    $dni = $row[$headerMap['dni'] ?? 1] ?? null;
                    $cargo = $row[$headerMap['cargo'] ?? 2] ?? null;
                    $cargo = !empty($cargo) ? trim($cargo) : null; // Allow empty CARGO
                    $estado = $row[$headerMap['estado'] ?? 3] ?? 'Activo';
                    
                    if (empty($dni) || empty($nombreCompleto)) {
                        throw new \Exception('Datos incompletos (DNI o Nombre)');
                    }

                    // Parse nombre_completo to extract apellidos y nombres
                    // Format expected: "APELLIDO_PATERNO APELLIDO_MATERNO, NOMBRES"
                    $nombres = '';
                    $apellidoPaterno = '';
                    $apellidoMaterno = '';
                    
                    if (str_contains($nombreCompleto, ',')) {
                        $parts = explode(',', $nombreCompleto);
                        $apellidos = trim($parts[0] ?? '');
                        $nombres = trim($parts[1] ?? '');
                        
                        $apellidoParts = explode(' ', $apellidos);
                        $apellidoPaterno = $apellidoParts[0] ?? '';
                        $apellidoMaterno = $apellidoParts[1] ?? '';
                    } else {
                        // If no comma, treat as full name
                        $nombreCompleto = trim($nombreCompleto);
                        $parts = explode(' ', $nombreCompleto);
                        if (count($parts) >= 3) {
                            $apellidoPaterno = $parts[0] ?? '';
                            $apellidoMaterno = $parts[1] ?? '';
                            $nombres = implode(' ', array_slice($parts, 2));
                        } else {
                            $apellidoPaterno = $parts[0] ?? '';
                            $nombres = implode(' ', array_slice($parts, 1));
                        }
                    }

                    // Check duplicate DNI
                    if (DB::table($this->table)->where('dni', $dni)->exists()) {
                        throw new \Exception('DNI ya existe');
                    }

                    // Normalize estado
                    $estadoNormalizado = strtolower(trim($estado));
                    if (str_contains($estadoNormalizado, 'activo')) {
                        $estado = 'Activo';
                    } elseif (str_contains($estadoNormalizado, 'cesado') || str_contains($estadoNormalizado, 'inactivo')) {
                        $estado = 'Cesado';
                    } else {
                        $estado = 'Activo';
                    }
                    
                    DB::table($this->table)->insert([
                        'dni' => $dni,
                        'nombres' => $nombres,
                        'apellido_paterno' => $apellidoPaterno,
                        'apellido_materno' => $apellidoMaterno,
                        'nombre_completo' => $nombreCompleto,
                        'cargo' => $cargo,
                        'estado' => $estado,
                        'fecha_ingreso' => now(),
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
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al leer el archivo: ' . $e->getMessage()
            ], 500);
        }
    }
}
