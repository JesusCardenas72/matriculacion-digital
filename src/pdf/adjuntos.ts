/**
 * Preparación de los PDF adjuntados por el solicitante para fusionarlos con la
 * solicitud. La usan tanto la comprobación al adjuntar (App.handleFileChange)
 * como la generación final del PDF (App.buildPdfBytes), de modo que lo que el
 * usuario ve validado al adjuntar es exactamente lo que se envía.
 */

// IMPORTANTE: build `legacy` de pdf.js. El build por defecto de pdfjs-dist v6
// llama sin polyfill a APIs muy recientes (Uint8Array#toHex en el descifrado,
// Map#getOrInsertComputed, Math.sumPrecise…). En navegadores no actualizados
// el Modelo 046 (cifrado RC4 sin contraseña de usuario) fallaba con
// "hashOriginal.toHex is not a function" y acababa como página de aviso.
// El build legacy incluye los polyfills. No volver a importar 'pdfjs-dist'.
export const loadPdfJs = async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (!pdfjs.GlobalWorkerOptions.workerPort && !pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      // El worker se inlinea en el bundle (compatible con vite-plugin-singlefile)
      const PdfWorker = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&inline')).default;
      pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
    } catch {
      // Fallback: que pdfjs cree el worker por su cuenta a partir de un URL conocido
      try {
        const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      } catch { /* sin worker: pdfjs intentará el modo fake worker */ }
    }
  }
  return pdfjs;
};

const loadPdfLib = () => import('pdf-lib');

/** Resultado de preparar un PDF adjunto. */
export type PreparedPdf =
  /** PDF sin cifrar: sus páginas se copian tal cual (vectoriales) con pdf-lib. */
  | { kind: 'vector' }
  /** PDF cifrado/firmado: páginas rasterizadas con pdf.js, listas para incrustar. */
  | { kind: 'raster'; pngs: Uint8Array[] }
  /** PDF con contraseña de apertura real: hace falta que el usuario la introduzca. */
  | { kind: 'password' }
  /** No se ha podido convertir en páginas visibles (navegador, PDF dañado, XFA…). */
  | { kind: 'error'; message: string };

export const isPasswordError = (err: unknown): boolean =>
  !!err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'PasswordException';

export const errorMessage = (err: unknown): string => {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as { name?: unknown; message?: unknown };
    return `${String(e.name ?? 'Error')}: ${String(e.message)}`;
  }
  return String(err);
};

// pdf.js pinta el fondo a blanco (#ffffff) antes de dibujar el contenido de la
// página. Si tras renderizar no queda ningún píxel no-blanco, esa página se
// rasterizó vacía. Una página suelta en blanco es legítima (suele venir así en
// el origen) y se conserva; solo si TODAS salen vacías estamos ante el caso XFA
// (administración), cuyo contenido vive en una capa aparte y nunca se pinta.
const isCanvasBlank = (ctx: CanvasRenderingContext2D, w: number, h: number): boolean => {
  const { data } = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < data.length; i += 16) { // muestreo 1 de cada 4 píxeles
    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return false;
  }
  return true;
};

/** Rasteriza un PDF (firmado/encriptado/no incrustable) a PNGs página a página. */
export const rasterizePdfToPngs = async (buf: ArrayBuffer, password = ''): Promise<Uint8Array[]> => {
  const pdfjs = await loadPdfJs();
  // Copia: pdf.js transfiere el buffer al worker y lo deja inservible para el llamador.
  const task = pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)), password });
  const doc = await task.promise;
  const out: Uint8Array[] = [];
  let blankPages = 0;
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D no disponible');
      await page.render({ canvasContext: ctx, viewport, canvas: null }).promise;
      if (isCanvasBlank(ctx, canvas.width, canvas.height)) blankPages++;
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob falló'))), 'image/png')
      );
      out.push(new Uint8Array(await blob.arrayBuffer()));
      page.cleanup();
    }
  } finally {
    // pdfjs v6: el documento NO tiene destroy() (lanzaba TypeError y tiraba TODO el
    // rasterizado ya hecho al placeholder). Liberamos con cleanup(), que NO termina
    // el worker compartido (task.destroy() sí lo haría y rompería el rasterizado de
    // un segundo adjunto). En try para que liberar nunca aborte el resultado.
    try { doc.cleanup(); } catch { /* noop */ }
  }
  if (out.length === 0) throw new Error('El PDF no tiene páginas');
  if (blankPages === out.length) {
    // Todas las páginas se rasterizaron vacías (p.ej. PDF XFA): mejor pedir una
    // foto/captura que insertar páginas en blanco. Las vacías sueltas sí se conservan.
    throw new Error('Rasterizado en blanco en todas las páginas (posible formulario XFA)');
  }
  return out;
};

/**
 * Decide cómo se incluirá un PDF adjunto en la solicitud:
 *  1. Sin cifrar → copia vectorial con pdf-lib.
 *  2. Cifrado (aunque sea solo con restricciones de propietario, como el Modelo
 *     046) o no cargable por pdf-lib → rasterizado con pdf.js. `ignoreEncryption`
 *     de pdf-lib NO descifra: copiar sus páginas daría páginas en blanco.
 *  3. Contraseña de apertura real → 'password'. Cualquier otro fallo → 'error'.
 */
export const preparePdfAttachment = async (buf: ArrayBuffer, password = ''): Promise<PreparedPdf> => {
  try {
    const { PDFDocument } = await loadPdfLib();
    const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    if (!srcDoc.isEncrypted && srcDoc.getPageCount() > 0) return { kind: 'vector' };
  } catch {
    // PDF que pdf-lib no sabe leer: lo intentamos con pdf.js
  }
  try {
    return { kind: 'raster', pngs: await rasterizePdfToPngs(buf, password) };
  } catch (err) {
    if (isPasswordError(err)) return { kind: 'password' };
    console.error('[adjuntos] No se pudo rasterizar el PDF:', err);
    return { kind: 'error', message: errorMessage(err) };
  }
};

// Caracteres que admite la codificación WinAnsi de las fuentes estándar de pdf-lib.
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

/**
 * Adapta un texto para `drawText` con fuentes estándar (WinAnsi). pdf-lib lanza
 * si encuentra un carácter no codificable, lo que abortaría TODA la generación
 * del PDF. Caso real: los nombres de archivo de macOS/iOS llegan en forma NFD
 * («i» + tilde combinante), que no existe en WinAnsi; NFC lo recompone en «í».
 */
export const toWinAnsi = (text: string): string =>
  Array.from(text.normalize('NFC'), ch => {
    const c = ch.codePointAt(0)!;
    return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN_ANSI_EXTRA.includes(ch) ? ch : '?';
  }).join('');
