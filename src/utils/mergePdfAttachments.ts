// Browser-only: converts GIF / WebP / BMP to PNG bytes via canvas.
// JPEG and PNG are embedded directly from their original bytes — no canvas needed.
export function imageToPngBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      c.toBlob(blob => {
        if (!blob) { reject(new Error('canvas.toBlob devolvió null')); return; }
        blob.arrayBuffer().then(ab => resolve(new Uint8Array(ab))).catch(reject);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo cargar la imagen "${file.name}"`));
    };
    img.src = url;
  });
}

// Merges attachment files as new pages into an existing PDF document.
// Throws descriptive per-file errors so the user knows exactly what failed and why.
export async function mergePdfAttachments(
  mainBytes: Uint8Array,
  attachments: File[],
): Promise<Uint8Array> {
  if (attachments.length === 0) return mainBytes;

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.load(mainBytes);
  const A4W = 595.28, A4H = 841.89;
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const file of attachments) {
    if (file.type === 'application/pdf') {
      try {
        const srcDoc = await PDFDocument.load(await file.arrayBuffer());
        const copied = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        copied.forEach(pg => pdfDoc.addPage(pg));
      } catch {
        throw new Error(
          `No se pudo adjuntar el archivo "${file.name}". Si es un PDF protegido con contraseña, elimínalo de los adjuntos, desbloquéalo y vuelve a adjuntarlo.`,
        );
      }
    } else if (file.type.startsWith('image/')) {
      try {
        const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
        const isPng  = file.type === 'image/png';

        let embImg;
        if (isJpeg) {
          embImg = await pdfDoc.embedJpg(await file.arrayBuffer());
        } else if (isPng) {
          // Direct embedding — no canvas conversion needed for native PNG
          embImg = await pdfDoc.embedPng(await file.arrayBuffer());
        } else {
          // GIF, WebP, BMP → rasterise to PNG via canvas
          embImg = await pdfDoc.embedPng(await imageToPngBytes(file));
        }

        const { width: iW, height: iH } = embImg;
        const fit = Math.min((A4W - 40) / iW, (A4H - 40) / iH);
        const pg = pdfDoc.addPage([A4W, A4H]);
        pg.drawImage(embImg, {
          x: (A4W - iW * fit) / 2,
          y: (A4H - iH * fit) / 2,
          width: iW * fit,
          height: iH * fit,
        });
        pg.drawText(file.name, { x: 20, y: 14, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
      } catch (e) {
        // Only re-throw if already formatted by this function (avoid swallowing internal errors)
        if (e instanceof Error && e.message.startsWith('No se pudo adjuntar la imagen')) throw e;
        throw new Error(
          `No se pudo adjuntar la imagen "${file.name}". Prueba a convertirla a JPG o PNG e intenta de nuevo.`,
        );
      }
    }
  }

  return pdfDoc.save();
}
