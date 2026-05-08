import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { TutorialPdf } from './src/TutorialPdf.tsx';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generatePdf() {
  const blob = await pdf(React.createElement(TutorialPdf)).toBlob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  const outputPath = join(process.cwd(), 'TUTORIAL_FORMULARIO_MATRICULA_v3.pdf');
  writeFileSync(outputPath, buffer);
  console.log(`PDF generado: ${outputPath}`);
}

generatePdf().catch(console.error);
