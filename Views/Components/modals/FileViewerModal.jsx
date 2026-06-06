/**
 * FileViewerModal — Modal para visualizar archivos (imágenes, PDF, Word, Excel, DWG/DXF, video)
 *
 * PDF: usa PDF.js de Mozilla directo sobre canvas (sin wrappers).
 * Word: usa @eigenpal/docx-js-editor.
 * Excel: usa SheetJS (xlsx) para parsear y renderizar tablas.
 * DWG/DXF: usa @cadview/core + @cadview/dwg (Canvas 2D con pan/zoom integrado).
 *
 * Copiado desde marketplace_modules/proyectoskrsft (kit autocontenido por módulo).
 *
 * @param {{
 *   isOpen: boolean,
 *   file: { original_name: string, mime_type: string, id: number },
 *   getDownloadUrl: (fileId: number) => string,
 *   onClose: () => void,
 * }} props
 */
import { memo, useState, useCallback, useEffect, useRef, lazy, Suspense, Component } from 'react';
import clsx from 'clsx';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
} from '@heroicons/react/24/outline';

// ── PDF.js (Mozilla) — worker como blob inline (same-origin, sin CORS) ───
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerRaw from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';

const workerBlob = new Blob([pdfjsWorkerRaw], { type: 'application/javascript' });
pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);

// ── Lazy-load DocxEditor ───
const DocxEditor = lazy(() =>
  import('@eigenpal/docx-js-editor').then((mod) => ({ default: mod.DocxEditor }))
);

// ── ErrorBoundary para DocxEditor ───
class DocxErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn('DocxEditor error capturado por boundary:', err?.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

// ── Bloquear Google Fonts para fuentes inexistentes (Aptos) ───
const BLOCKED_FONT_FAMILIES = /aptos/i;
function useBlockGoogleFonts(active) {
  useEffect(() => {
    if (!active) return;
    const styleId = '__aptos-font-fallback';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @font-face { font-family: 'Aptos'; src: local('Inter'), local('Segoe UI'), local('Arial'); font-weight: 400; }
        @font-face { font-family: 'Aptos'; src: local('Inter'), local('Segoe UI'), local('Arial'); font-weight: 700; }
        @font-face { font-family: 'Aptos Display'; src: local('Inter'), local('Segoe UI'), local('Arial'); font-weight: 400; }
        @font-face { font-family: 'Aptos Display'; src: local('Inter'), local('Segoe UI'), local('Arial'); font-weight: 700; }
      `;
      document.head.prepend(style);
    }
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
            const href = node.href || '';
            if (href.includes('fonts.googleapis.com') && BLOCKED_FONT_FAMILIES.test(decodeURIComponent(href))) {
              node.remove();
            }
          }
        }
      }
    });
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, [active]);
}

// ── Página individual del PDF ───
function PdfPage({ pdfDoc, pageNum, scale }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    let task = null;

    pdfDoc.getPage(pageNum).then((pdfPage) => {
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      task = pdfPage.render({ canvasContext: ctx, viewport });
      task.promise.catch((err) => {
        if (err?.name !== 'RenderingCancelledException') console.error('Error render página', pageNum, err);
      });
    });

    return () => {
      cancelled = true;
      if (task) task.cancel();
    };
  }, [pdfDoc, pageNum, scale]);

  return (
    <div className="mb-4 shadow-lg">
      <canvas ref={canvasRef} className="bg-white block" style={{ maxWidth: 'none' }} />
    </div>
  );
}

// ── PDF Viewer — todas las páginas en cascada con scroll ───
function PdfCanvasViewer({ pdfData, scale }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);

  // Cargar documento PDF desde ArrayBuffer (copia para evitar detached buffer al reabrir)
  useEffect(() => {
    let cancelled = false;
    const data = new Uint8Array(pdfData.slice(0));

    pdfjsLib.getDocument({ data }).promise.then((doc) => {
      if (!cancelled) {
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      }
    }).catch((err) => console.error('Error cargando PDF:', err));

    return () => { cancelled = true; };
  }, [pdfData]);

  return (
    <div className="w-full h-full overflow-auto bg-gray-200">
      <div className="min-w-fit flex flex-col items-center py-4 px-4">
        {pdfDoc && Array.from({ length: totalPages }, (_, i) => (
          <PdfPage key={i} pdfDoc={pdfDoc} pageNum={i + 1} scale={scale} />
        ))}
      </div>
    </div>
  );
}

// ── Excel Viewer — tablas con pestañas por hoja ───
function ExcelViewer({ sheets }) {
  const [activeSheet, setActiveSheet] = useState(0);
  const sheetNames = Object.keys(sheets);
  const rows = sheets[sheetNames[activeSheet]] || [];

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      {/* Tabs de hojas */}
      {sheetNames.length > 1 && (
        <div className="flex border-b border-gray-200 bg-gray-50 px-2 pt-2 shrink-0 overflow-x-auto">
          {sheetNames.map((name, idx) => (
            <button
              key={name}
              onClick={() => setActiveSheet(idx)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-t-md border border-b-0 mr-0.5 transition-colors whitespace-nowrap',
                idx === activeSheet
                  ? 'bg-white text-teal-700 border-gray-200'
                  : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200 hover:text-gray-700'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">Hoja vacía</div>
        ) : (
          <table className="border-collapse text-xs w-max min-w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="bg-gray-100 border border-gray-200 px-2 py-1 text-gray-400 font-medium min-w-[32px] text-center">#</th>
                {rows[0]?.map((_, ci) => (
                  <th key={ci} className="bg-gray-100 border border-gray-200 px-2 py-1 text-gray-500 font-medium min-w-[80px] text-center">
                    {colLetter(ci)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                  <td className="bg-gray-100 border border-gray-200 px-2 py-0.5 text-gray-400 font-medium text-center tabular-nums">{ri + 1}</td>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-gray-200 px-2 py-0.5 text-gray-700 whitespace-nowrap">
                      {cell ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── DWG/DXF Viewer — canvas con pan/zoom integrado (@cadview) ───
function DwgViewer({ buffer }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const [loadError, setLoadError] = useState(null);

  // Crear viewer y cargar el archivo
  useEffect(() => {
    if (!buffer || !canvasRef.current) return;
    let destroyed = false;

    (async () => {
      try {
        const { CadViewer } = await import('@cadview/core');
        const { dwgConverter } = await import('@cadview/dwg');
        if (destroyed) return;

        const viewer = new CadViewer(canvasRef.current, {
          theme: 'dark',
          initialTool: 'pan',
          formatConverters: [dwgConverter],
        });
        viewerRef.current = viewer;

        await viewer.loadBuffer(buffer);
        if (destroyed) return;
        viewer.fitToView();
      } catch (err) {
        console.error('Error cargando DWG/DXF:', err);
        if (!destroyed) setLoadError(err.message || 'Error al cargar el plano');
      }
    })();

    return () => {
      destroyed = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [buffer]);

  // Resize observer para mantener el canvas al tamaño del contenedor
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      if (viewerRef.current) viewerRef.current.fitToView();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    return () => ro.disconnect();
  }, []);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-center">
        <div className="text-5xl mb-4">📐</div>
        <p className="text-gray-400 text-sm">{loadError}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

/** Convierte índice de columna a letra(s): 0→A, 25→Z, 26→AA */
function colLetter(idx) {
  let s = '';
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

// ── Componente principal ───
function FileViewerModal({ isOpen, file, getDownloadUrl, onClose }) {
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [docError, setDocError] = useState(false);
  const [parsedDoc, setParsedDoc] = useState(null);
  const [docxCssLoaded, setDocxCssLoaded] = useState(false);
  const [pdfBuffer, setPdfBuffer] = useState(null);
  const [pdfScale, setPdfScale] = useState(1.5);
  const [xlsxSheets, setXlsxSheets] = useState(null);
  const [dwgBuffer, setDwgBuffer] = useState(null);

  const pdfZoomIn = useCallback(() => setPdfScale((s) => Math.min(s + 0.3, 5)), []);
  const pdfZoomOut = useCallback(() => setPdfScale((s) => Math.max(s - 0.3, 0.5)), []);
  const pdfResetZoom = useCallback(() => setPdfScale(1.5), []);

  // Bloquear scroll del fondo (body + html) y aislar el wheel/touch: con un
  // listener nativo en el root cortamos la propagación a window, así listeners
  // globales detrás (p.ej. el modo foco de SsomaTab) no se disparan. Solo
  // scrollea el contenido del modal.
  const rootRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const el = rootRef.current;
    const stop = (e) => e.stopPropagation();
    el?.addEventListener('wheel', stop, { passive: false });
    el?.addEventListener('touchmove', stop, { passive: false });
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      el?.removeEventListener('wheel', stop);
      el?.removeEventListener('touchmove', stop);
    };
  }, [isOpen]);

  const isWord = !!(file?.mime_type && (
    file.mime_type.includes('wordprocessingml') || file.mime_type.includes('msword')
  ));
  const isExcel = !!(file?.mime_type && (
    file.mime_type.includes('spreadsheetml') || file.mime_type.includes('ms-excel') || file.mime_type.includes('msexcel')
  ));
  const isDwg = !!(file?.mime_type && (
    file.mime_type.includes('dwg') || file.mime_type.includes('autocad') || file.mime_type.includes('acad')
  )) || !!(file?.original_name && /\.(dwg|dxf)$/i.test(file.original_name));

  useBlockGoogleFonts(isOpen && isWord);

  // Cargar DOCX
  useEffect(() => {
    if (!isOpen || !file || !isWord) return;
    let cancelled = false;
    setIsLoading(true);
    setDocError(false);
    setParsedDoc(null);

    if (!docxCssLoaded) {
      import('@eigenpal/docx-js-editor/styles.css')
        .then(() => { if (!cancelled) setDocxCssLoaded(true); })
        .catch(() => {});
    }

    (async () => {
      try {
        const res = await fetch(getDownloadUrl(file.id));
        if (!res.ok) throw new Error('No se pudo descargar');
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        const { parseDocx } = await import('@eigenpal/docx-js-editor');
        const doc = await parseDocx(buffer, { preloadFonts: false });
        if (cancelled) return;
        setParsedDoc(doc);
        setIsLoading(false);
      } catch (err) {
        console.error('Error docx:', err);
        if (!cancelled) { setDocError(true); setIsLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, file, getDownloadUrl, isWord]);

  // Cargar Excel (.xlsx)
  useEffect(() => {
    if (!isOpen || !file || !isExcel) return;
    let cancelled = false;
    setIsLoading(true);
    setDocError(false);
    setXlsxSheets(null);

    (async () => {
      try {
        const res = await fetch(getDownloadUrl(file.id));
        if (!res.ok) throw new Error('No se pudo descargar el archivo Excel');
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const XLSX = (await import('xlsx-js-style')).default || (await import('xlsx-js-style'));
        const wb = XLSX.read(buf, { type: 'array' });
        const result = {};
        for (const name of wb.SheetNames) {
          const ws = wb.Sheets[name];
          // Convertir a array de arrays, manteniendo celdas vacías
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          // Normalizar: todas las filas al mismo ancho
          const maxCols = data.reduce((max, row) => Math.max(max, row.length), 0);
          result[name] = data.map((row) => {
            const r = [...row];
            while (r.length < maxCols) r.push('');
            return r;
          });
        }
        if (!cancelled) { setXlsxSheets(result); setIsLoading(false); }
      } catch (err) {
        console.error('Error Excel:', err);
        if (!cancelled) { setDocError(true); setIsLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, file, getDownloadUrl, isExcel]);

  // Cargar DWG/DXF
  useEffect(() => {
    if (!isOpen || !file || !isDwg) return;
    let cancelled = false;
    setIsLoading(true);
    setDocError(false);
    setDwgBuffer(null);

    (async () => {
      try {
        const res = await fetch(getDownloadUrl(file.id));
        if (!res.ok) throw new Error('No se pudo descargar el archivo DWG');
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        setDwgBuffer(buf);
        setIsLoading(false);
      } catch (err) {
        console.error('Error DWG:', err);
        if (!cancelled) { setDocError(true); setIsLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, file, getDownloadUrl, isDwg]);

  // Cargar PDF como ArrayBuffer
  useEffect(() => {
    const isPdf = file?.mime_type?.includes('pdf');
    if (!isOpen || !file || !isPdf) return;
    let cancelled = false;
    setIsLoading(true);
    setDocError(false);
    setPdfBuffer(null);

    (async () => {
      try {
        const res = await fetch(getDownloadUrl(file.id));
        if (!res.ok) throw new Error('No se pudo descargar el PDF');
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        setPdfBuffer(buf);
        setIsLoading(false);
      } catch (err) {
        console.error('Error PDF:', err);
        if (!cancelled) { setDocError(true); setIsLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, file, getDownloadUrl]);

  // ── Handlers de imagen (zoom/pan) ───
  const handleZoomIn = useCallback(() => setZoom((p) => Math.min(p + 20, 300)), []);
  const handleZoomOut = useCallback(() => setZoom((p) => Math.max(p - 20, 50)), []);
  const resetZoom = useCallback(() => { setZoom(100); setPosition({ x: 0, y: 0 }); }, []);

  const handleMouseDown = useCallback((e) => {
    if (zoom > 100) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      e.preventDefault();
    }
  }, [zoom, position]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && zoom > 100) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseLeave = useCallback(() => setIsDragging(false), []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((p) => Math.max(50, Math.min(300, p + (e.deltaY > 0 ? -10 : 10))));
  }, []);

  if (!isOpen || !file) return null;

  const isDwgRender = isDwg;
  const isImage = !isDwgRender && file.mime_type?.startsWith('image/');
  const isPdf = file.mime_type?.includes('pdf');
  const isVideo = file.mime_type?.startsWith('video/');
  const isExcelRender = isExcel;

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-11/12 max-w-7xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3 shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate">{file.original_name}</h3>
          </div>

          {/* Zoom PDF — solo visible cuando hay PDF cargado */}
          {isPdf && pdfBuffer && (
            <div className="flex items-center gap-1.5 mx-4">
              <button onClick={pdfZoomOut} disabled={pdfScale <= 0.5} className={clsx('rounded-lg p-1.5 transition-colors', pdfScale <= 0.5 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200')} title="Zoom out">
                <MagnifyingGlassMinusIcon className="size-4" />
              </button>
              <span className="text-xs font-medium text-gray-600 min-w-[40px] text-center">{Math.round(pdfScale * 100)}%</span>
              <button onClick={pdfZoomIn} disabled={pdfScale >= 5} className={clsx('rounded-lg p-1.5 transition-colors', pdfScale >= 5 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200')} title="Zoom in">
                <MagnifyingGlassPlusIcon className="size-4" />
              </button>
              <button onClick={pdfResetZoom} className="rounded-lg px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
                Ajustar
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={getDownloadUrl(file.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              title="Descargar"
            >
              <ArrowDownTrayIcon className="size-4" />
              Descargar
            </a>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Cerrar"
            >
              <XMarkIcon className="size-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className={clsx(
            'flex-1 overflow-hidden flex flex-col items-center justify-center',
            isPdf ? 'min-h-[600px]' : 'min-h-[400px]',
            isWord ? 'bg-gray-200' : isPdf ? 'bg-gray-100' : isExcelRender ? 'bg-white' : isDwgRender ? 'bg-gray-900' : 'bg-gray-900',
            isImage && zoom > 100 && (isDragging ? 'cursor-grabbing' : 'cursor-grab')
          )}
          onMouseDown={isImage ? handleMouseDown : undefined}
          onMouseMove={isImage ? handleMouseMove : undefined}
          onMouseUp={isImage ? handleMouseUp : undefined}
          onMouseLeave={isImage ? handleMouseLeave : undefined}
          onWheel={isImage ? handleWheel : undefined}
        >
          {/* Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <svg className={clsx('size-8 animate-spin', isWord || isPdf ? 'text-gray-400' : 'text-white')} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {isImage ? (
            <img
              src={getDownloadUrl(file.id)}
              alt={file.original_name}
              onLoad={() => setIsLoading(false)}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
              className="max-w-full max-h-full object-contain select-none pointer-events-none"
              draggable={false}
            />
          ) : isPdf ? (
            docError ? (
              <ErrorFallback label="No se pudo cargar el PDF" downloadUrl={getDownloadUrl(file.id)} buttonLabel="Descargar PDF" />
            ) : pdfBuffer ? (
              <PdfCanvasViewer pdfData={pdfBuffer} scale={pdfScale} />
            ) : null
          ) : isDwgRender ? (
            docError ? (
              <ErrorFallback label="No se pudo cargar el plano DWG/DXF." downloadUrl={getDownloadUrl(file.id)} buttonLabel="Descargar archivo" />
            ) : dwgBuffer ? (
              <DwgViewer buffer={dwgBuffer} />
            ) : null
          ) : isExcelRender ? (
            docError ? (
              <ErrorFallback label="No se pudo cargar el archivo Excel." downloadUrl={getDownloadUrl(file.id)} buttonLabel="Descargar Excel" />
            ) : xlsxSheets ? (
              <ExcelViewer sheets={xlsxSheets} />
            ) : null
          ) : isWord ? (
            docError ? (
              <ErrorFallback label="No se pudo previsualizar este documento." downloadUrl={getDownloadUrl(file.id)} buttonLabel="Descargar archivo" />
            ) : parsedDoc ? (
              <Suspense fallback={<Spinner className="text-gray-400" />}>
                <DocxErrorBoundary fallback={<ErrorFallback label="Error al renderizar el documento." downloadUrl={getDownloadUrl(file.id)} buttonLabel="Descargar archivo" />}>
                  <div className="w-full h-full overflow-auto">
                    <DocxEditor documentBuffer={parsedDoc} mode="viewing" showToolbar={false} showRuler={false} showZoomControl={false} showPrintButton={false} />
                  </div>
                </DocxErrorBoundary>
              </Suspense>
            ) : null
          ) : isVideo ? (
            <video src={getDownloadUrl(file.id)} controls className="max-w-full max-h-full object-contain" onLoadedData={() => setIsLoading(false)} />
          ) : (
            <ErrorFallback label="No se puede previsualizar este tipo de archivo" downloadUrl={getDownloadUrl(file.id)} buttonLabel="Descargar archivo" />
          )}
        </div>

        {/* Zoom controls para imágenes */}
        {isImage && (
          <div className="flex items-center justify-center border-t border-gray-200 bg-gray-50 px-5 py-3 shrink-0 gap-2">
            <button onClick={handleZoomOut} disabled={zoom <= 50} className={clsx('rounded-lg p-1.5 transition-colors', zoom <= 50 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200')} title="Zoom out">
              <MagnifyingGlassMinusIcon className="size-4" />
            </button>
            <div className="flex items-center gap-2 mx-2">
              <input type="range" min="50" max="300" step="10" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-32 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer" />
              <span className="text-xs font-medium text-gray-600 min-w-[45px] text-right">{zoom}%</span>
            </div>
            <button onClick={handleZoomIn} disabled={zoom >= 300} className={clsx('rounded-lg p-1.5 transition-colors', zoom >= 300 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200')} title="Zoom in">
              <MagnifyingGlassPlusIcon className="size-4" />
            </button>
            <button onClick={resetZoom} className="ml-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
              Ajustar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───
function Spinner({ className = 'text-white' }) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg className={clsx('size-8 animate-spin', className)} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

function ErrorFallback({ label, downloadUrl, buttonLabel }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10">
      <div className="text-5xl mb-4">📄</div>
      <p className="text-gray-500 text-sm mb-4">{label}</p>
      <a href={downloadUrl} className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors">
        <ArrowDownTrayIcon className="size-4" />
        {buttonLabel}
      </a>
    </div>
  );
}

export default memo(FileViewerModal);
