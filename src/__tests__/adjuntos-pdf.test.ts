// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { preparePdfAttachment, toWinAnsi } from '../pdf/adjuntos';

// PDF SINTÉTICO (sin datos personales) con el mismo cifrado que el Modelo 046 de
// la JCCM: PDF 1.3, RC4 40 bits (V1/R2), contraseña de usuario vacía, P=-44,
// Helvetica sin incrustar, 2 páginas. Con el build por defecto de pdfjs-dist v6
// fallaba en navegadores no actualizados con "hashOriginal.toHex is not a function".
const FIXTURE = path.resolve(__dirname, 'fixtures/modelo046-prueba-cifrado.pdf');

const listSourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : listSourceFiles(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });

describe('adjuntos PDF — build legacy de pdf.js', () => {
  it('ningún fichero de src importa el build moderno de pdfjs-dist', () => {
    const offenders = listSourceFiles(path.resolve(__dirname, '..')).filter(f => {
      const src = fs.readFileSync(f, 'utf-8');
      return /(?:from\s*|import\(\s*)['"]pdfjs-dist(\/build\/[^'"]*)?['"]/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it('src/pdf/adjuntos.ts carga pdf.js y su worker desde legacy/', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../pdf/adjuntos.ts'), 'utf-8');
    expect(src).toContain("import('pdfjs-dist/legacy/build/pdf.mjs')");
    expect(src).toContain("pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&inline");
  });

  it('el build legacy descifra el PDF tipo Modelo 046 (RC4, sin contraseña de usuario)', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(fs.readFileSync(FIXTURE));
    const task = pdfjs.getDocument({ data, password: '' });
    const doc = await task.promise;
    expect(doc.numPages).toBe(2);
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const text = (await page.getTextContent()).items.map(it => ('str' in it ? it.str : '')).join(' ');
      expect(text).toContain('MODELO 046');
    }
    await task.destroy(); // pdfjs v6: destroy() vive en la loading task, no en el documento
  });
});

describe('preparePdfAttachment', () => {
  it('un PDF sin cifrar se copia en vectorial', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const bytes = await doc.save();
    const result = await preparePdfAttachment(bytes.slice().buffer);
    expect(result.kind).toBe('vector');
  });

  it('un PDF cifrado NO se copia en vectorial (se rasteriza o se informa del error real)', async () => {
    const buf = fs.readFileSync(FIXTURE);
    const result = await preparePdfAttachment(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    // En Node no hay canvas: aquí solo comprobamos que va por la ruta de pdf.js
    // y que el fallo trae un mensaje legible (no "protegido con contraseña").
    expect(result.kind).not.toBe('vector');
    expect(result.kind).not.toBe('password');
    if (result.kind === 'error') expect(result.message).not.toMatch(/toHex|getOrInsertComputed/);
  });

  it('un PDF con contraseña de apertura real pide la contraseña', async () => {
    const buf = fs.readFileSync(path.resolve(__dirname, 'fixtures/prueba-con-contrasena.pdf'));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    expect((await preparePdfAttachment(ab)).kind).toBe('password');
    expect((await preparePdfAttachment(ab, 'incorrecta')).kind).toBe('password');
    // Con la contraseña correcta (1234) ya NO es 'password' (en Node falla luego por no haber canvas)
    expect((await preparePdfAttachment(ab, '1234')).kind).not.toBe('password');
  });
});

describe('toWinAnsi (texto para drawText de pdf-lib)', () => {
  it('recompone nombres NFD de macOS/iOS («i» + tilde combinante → «í»)', () => {
    expect(toWinAnsi('matrícula 046.pdf')).toBe('matrícula 046.pdf');
  });

  it('conserva caracteres WinAnsi y sustituye los no codificables', () => {
    expect(toWinAnsi('Pago – 30 € «ñ»')).toBe('Pago – 30 € «ñ»');
    expect(toWinAnsi('justificante 📄.pdf')).toBe('justificante ?.pdf');
  });
});
