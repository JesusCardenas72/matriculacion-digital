import { describe, it, expect } from 'vitest';

describe('pdf_failed — verificación de código fuente', () => {
  it('debe contener el email de contacto en App.tsx', () => {
    const fs = require('fs');
    const src = fs.readFileSync('src/App.tsx', 'utf-8');
    expect(src).toContain('13004341.cpm@educastillalamancha.es');
  });

  it('debe contener el texto "pdf_failed" en App.tsx', () => {
    const fs = require('fs');
    const src = fs.readFileSync('src/App.tsx', 'utf-8');
    expect(src).toContain('pdf_failed');
  });

  it('debe contener la variable datosGuardados en App.tsx', () => {
    const fs = require('fs');
    const src = fs.readFileSync('src/App.tsx', 'utf-8');
    expect(src).toContain('datosGuardados');
  });

  it('tipo submitStatus debe incluir pdf_failed', async () => {
    // Verificar que en el useState existe 'pdf_failed'
    const fs = await import('fs');
    const src = fs.readFileSync('src/App.tsx', 'utf-8');
    const match = src.match(/submitStatus[^;]+('[^']+'\s*\|\s*)+[^;]+;/);
    expect(match).not.toBeNull();
    expect(src).toContain("'pdf_failed'");
  });
});
