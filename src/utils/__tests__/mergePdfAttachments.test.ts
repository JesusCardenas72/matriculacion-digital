import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergePdfAttachments, imageToPngBytes } from '../mergePdfAttachments';

// ── Test fixtures ─────────────────────────────────────────────────────────────

// 1×1 white PNG (minimal valid PNG)
const MINIMAL_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVQI12NgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==';

// 1×1 white JPEG (minimal valid JPEG)
const MINIMAL_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAR' +
  'CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/a' +
  'AAwDAQACEQMRAD8AJQAB/9k=';

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

const MINIMAL_PNG  = b64ToBytes(MINIMAL_PNG_B64);
const MINIMAL_JPEG = b64ToBytes(MINIMAL_JPEG_B64);

async function makeMinimalPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage();
  return doc.save();
}

function makeFile(name: string, type: string, bytes: Uint8Array): File {
  return new File([bytes], name, { type });
}

// ── mergePdfAttachments ───────────────────────────────────────────────────────

describe('mergePdfAttachments', () => {
  let mainPdfBytes: Uint8Array;

  beforeEach(async () => {
    mainPdfBytes = await makeMinimalPdf();
  });

  // ── Sin adjuntos ─────────────────────────────────────────────────────────

  it('devuelve los bytes originales sin modificar cuando no hay adjuntos', async () => {
    const result = await mergePdfAttachments(mainPdfBytes, []);
    expect(result).toBe(mainPdfBytes);
  });

  // ── Adjunto PDF válido ───────────────────────────────────────────────────

  it('añade las páginas de un PDF adjunto válido', async () => {
    const attachBytes = await makeMinimalPdf();
    const file = makeFile('doc.pdf', 'application/pdf', attachBytes);

    const result = await mergePdfAttachments(mainPdfBytes, [file]);
    const doc = await PDFDocument.load(result);

    expect(doc.getPageCount()).toBe(2); // 1 principal + 1 adjunta
  });

  it('añade múltiples páginas de un PDF adjunto con varias páginas', async () => {
    const multiDoc = await PDFDocument.create();
    multiDoc.addPage(); multiDoc.addPage(); multiDoc.addPage();
    const attachBytes = await multiDoc.save();
    const file = makeFile('multi.pdf', 'application/pdf', attachBytes);

    const result = await mergePdfAttachments(mainPdfBytes, [file]);
    const doc = await PDFDocument.load(result);

    expect(doc.getPageCount()).toBe(4); // 1 + 3
  });

  // ── PDF protegido / corrupto ─────────────────────────────────────────────

  it('lanza error descriptivo para PDF corrupto o protegido', async () => {
    const corruptBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF" incompleto
    const file = makeFile('protegido.pdf', 'application/pdf', corruptBytes);

    await expect(mergePdfAttachments(mainPdfBytes, [file])).rejects.toThrow(
      'No se pudo adjuntar el archivo "protegido.pdf"',
    );
  });

  it('el error de PDF protegido incluye el nombre del archivo exacto', async () => {
    const corruptBytes = new Uint8Array([0x00, 0x01, 0x02]);
    const file = makeFile('mi_dni_escaneado.pdf', 'application/pdf', corruptBytes);

    await expect(mergePdfAttachments(mainPdfBytes, [file])).rejects.toThrow(
      '"mi_dni_escaneado.pdf"',
    );
  });

  it('el error de PDF protegido incluye instrucciones de desbloqueo', async () => {
    const corruptBytes = new Uint8Array([0x00]);
    const file = makeFile('cert.pdf', 'application/pdf', corruptBytes);

    await expect(mergePdfAttachments(mainPdfBytes, [file])).rejects.toThrow(
      'contraseña',
    );
  });

  // ── Imagen PNG ───────────────────────────────────────────────────────────

  it('incrusta una imagen PNG como nueva página', async () => {
    const file = makeFile('foto.png', 'image/png', MINIMAL_PNG);

    const result = await mergePdfAttachments(mainPdfBytes, [file]);
    const doc = await PDFDocument.load(result);

    expect(doc.getPageCount()).toBe(2);
  });

  it('PNG se incrusta directamente sin pasar por canvas', async () => {
    // Verificamos que imageToPngBytes (que usa canvas) NO es llamada para PNG
    const spy = vi.spyOn(await import('../mergePdfAttachments'), 'imageToPngBytes');
    const file = makeFile('foto.png', 'image/png', MINIMAL_PNG);

    await mergePdfAttachments(mainPdfBytes, [file]);

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // ── Imagen JPEG ──────────────────────────────────────────────────────────

  it('incrusta una imagen JPEG como nueva página', async () => {
    const file = makeFile('foto.jpg', 'image/jpeg', MINIMAL_JPEG);

    const result = await mergePdfAttachments(mainPdfBytes, [file]);
    const doc = await PDFDocument.load(result);

    expect(doc.getPageCount()).toBe(2);
  });

  it('JPEG con tipo image/jpg (no estándar) también se incrusta directamente', async () => {
    // Algunos sistemas reportan image/jpg en lugar de image/jpeg
    const spy = vi.spyOn(await import('../mergePdfAttachments'), 'imageToPngBytes');
    const file = makeFile('foto.jpg', 'image/jpg', MINIMAL_JPEG);

    await mergePdfAttachments(mainPdfBytes, [file]);

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // ── Imagen corrupta ──────────────────────────────────────────────────────

  it('lanza error descriptivo para PNG corrupto con nombre del archivo y sugerencia', async () => {
    const corruptBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // cabecera PNG incompleta
    const file = makeFile('roto.png', 'image/png', corruptBytes);

    await expect(mergePdfAttachments(mainPdfBytes, [file])).rejects.toMatchObject({
      message: expect.stringContaining('"roto.png"'),
    });
    await expect(mergePdfAttachments(mainPdfBytes, [file])).rejects.toMatchObject({
      message: expect.stringContaining('JPG o PNG'),
    });
  });

  it('el error de imagen incluye sugerencia de convertir a JPG/PNG', async () => {
    const corruptBytes = new Uint8Array([0x00, 0x01]);
    const file = makeFile('animacion.gif', 'image/gif', corruptBytes);

    // Mocks mínimos de canvas para el path GIF → canvas → PNG
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock'),
      revokeObjectURL: vi.fn(),
    });
    class MockImageError {
      onerror: ((e: Event) => void) | null = null;
      set src(_: string) { setTimeout(() => this.onerror?.(new Event('error')), 0); }
    }
    vi.stubGlobal('Image', MockImageError);

    await expect(mergePdfAttachments(mainPdfBytes, [file])).rejects.toThrow(
      'JPG o PNG',
    );

    vi.unstubAllGlobals();
  });

  // ── Múltiples adjuntos ───────────────────────────────────────────────────

  it('procesa múltiples adjuntos de tipos distintos en orden', async () => {
    const pdfBytes = await makeMinimalPdf();
    const files = [
      makeFile('foto.png',  'image/png',       MINIMAL_PNG),
      makeFile('foto.jpg',  'image/jpeg',       MINIMAL_JPEG),
      makeFile('doc.pdf',   'application/pdf',  pdfBytes),
    ];

    const result = await mergePdfAttachments(mainPdfBytes, files);
    const doc = await PDFDocument.load(result);

    expect(doc.getPageCount()).toBe(4); // 1 principal + 1 PNG + 1 JPEG + 1 PDF
  });

  it('el primer adjunto inválido lanza error con su nombre y detiene el proceso', async () => {
    const corruptBytes = new Uint8Array([0x00]);
    const files = [
      makeFile('bueno.pdf',  'application/pdf', await makeMinimalPdf()),
      makeFile('malo.pdf',   'application/pdf', corruptBytes),
      makeFile('bueno2.pdf', 'application/pdf', await makeMinimalPdf()),
    ];

    await expect(mergePdfAttachments(mainPdfBytes, files)).rejects.toThrow(
      '"malo.pdf"',
    );
  });
});

// ── imageToPngBytes ───────────────────────────────────────────────────────────

describe('imageToPngBytes', () => {
  it('rechaza con mensaje descriptivo si la imagen no puede cargarse', async () => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock'),
      revokeObjectURL: vi.fn(),
    });

    class MockImageError {
      onerror: ((e: Event) => void) | null = null;
      set src(_: string) { setTimeout(() => this.onerror?.(new Event('error')), 0); }
    }
    vi.stubGlobal('Image', MockImageError);

    const file = makeFile('roto.webp', 'image/webp', new Uint8Array([0x00]));

    await expect(imageToPngBytes(file)).rejects.toThrow(
      'No se pudo cargar la imagen "roto.webp"',
    );

    vi.unstubAllGlobals();
  });

  it('usa canvas.toBlob (no toDataURL) para generar los bytes PNG', async () => {
    const mockPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const mockBlob = new Blob([mockPngBytes], { type: 'image/png' });
    const toBlobMock = vi.fn().mockImplementation((cb: BlobCallback) => cb(mockBlob));
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
      toBlob: toBlobMock,
    };

    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:mock'), revokeObjectURL: vi.fn() });

    class MockImageLoad {
      naturalWidth = 1;
      naturalHeight = 1;
      onload: ((e: Event) => void) | null = null;
      set src(_: string) { setTimeout(() => this.onload?.(new Event('load')), 0); }
    }
    vi.stubGlobal('Image', MockImageLoad);

    vi.spyOn(document, 'createElement').mockImplementation(tag =>
      tag === 'canvas' ? mockCanvas as unknown as HTMLCanvasElement : document.createElement(tag),
    );

    const file = makeFile('imagen.gif', 'image/gif', new Uint8Array([0x47, 0x49, 0x46]));
    await imageToPngBytes(file);

    expect(toBlobMock).toHaveBeenCalledWith(expect.any(Function), 'image/png');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
