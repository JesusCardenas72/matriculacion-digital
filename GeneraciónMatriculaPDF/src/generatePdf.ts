import { pdf } from '@react-pdf/renderer';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { MatriculaPdf } from './MatriculaPdf';
import { TutorialPdf } from './TutorialPdf';
import { EnrollmentFormData } from './types';

export interface PendingSubject { id: string; materiaId: string; label: string; }
export interface CurrentSubject { MATERIA: string; DESCRIPCION: string; }

export type CalcResult = {
  details: {
    reductionLabel: string;
    serviciosGenerales: number;
    aperturaExpediente: number;
    curso: number;
    asignaturasPendientes: number;
    matriculaHonorDiscount: number;
    multiplier: number;
    convalidacionDiscount: number;
    convalidacionCount: number;
  };
} | null;

export interface BuildPdfOptions {
  formData: EnrollmentFormData;
  academicYear: string;
  submitTimestamp: Date;
  asignaturasCursoActual: CurrentSubject[];
  selectedPendingSubjects: PendingSubject[];
  calculation: CalcResult;
  requestNumber?: string;
  attachments?: File[];
}

const A4W = 595.28;
const A4H = 841.89;

/** Convierte una imagen (File) a bytes PNG (Uint8Array). Útil para pdf-lib. */
export const imageToPngBytes = (file: File): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      fetch(c.toDataURL('image/png'))
        .then(r => r.arrayBuffer())
        .then(ab => resolve(new Uint8Array(ab)))
        .catch(reject);
    };
    img.onerror = (err) => { URL.revokeObjectURL(url); reject(err); };
    img.src = url;
  });

/** Genera el PDF de matrícula. Si hay adjuntos, los incluye como páginas extra usando pdf-lib. */
export const buildPdfBytes = async (opts: BuildPdfOptions): Promise<{ bytes: Uint8Array; filename: string }> => {
  const {
    formData,
    academicYear,
    submitTimestamp,
    asignaturasCursoActual,
    selectedPendingSubjects,
    calculation,
    requestNumber,
    attachments = [],
  } = opts;

  const mainBlob = await pdf(
    <MatriculaPdf
      formData={formData}
      academicYear={academicYear}
      submitTimestamp={submitTimestamp}
      asignaturasCursoActual={asignaturasCursoActual}
      selectedPendingSubjects={selectedPendingSubjects}
      calculation={calculation}
      requestNumber={requestNumber}
    />
  ).toBlob();

  const ds = submitTimestamp.toLocaleDateString('es-ES').replace(/\//g, '-');
  const hs = submitTimestamp.toLocaleTimeString('es-ES').replace(/:/g, '-');
  const filename = `SOLICITUD_${ds}_${hs}.pdf`;

  if (attachments.length === 0) {
    return { bytes: new Uint8Array(await mainBlob.arrayBuffer()), filename };
  }

  const mainBytes = new Uint8Array(await mainBlob.arrayBuffer());
  const pdfDoc = await PDFDocument.load(mainBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const file of attachments) {
    if (file.type === 'application/pdf') {
      const srcDoc = await PDFDocument.load(await file.arrayBuffer());
      const copied = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copied.forEach(pg => pdfDoc.addPage(pg));
    } else if (file.type.startsWith('image/')) {
      const embImg =
        file.type === 'image/jpeg'
          ? await pdfDoc.embedJpg(await file.arrayBuffer())
          : await pdfDoc.embedPng(await imageToPngBytes(file));
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
    }
  }

  return { bytes: await pdfDoc.save(), filename };
};

/** Genera el PDF del tutorial. */
export const generateTutorialPdf = async (): Promise<Blob> => {
  return pdf(<TutorialPdf />).toBlob();
};

/** Codifica Uint8Array a Base64 de forma segura (por chunks). */
export const uint8ToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};
