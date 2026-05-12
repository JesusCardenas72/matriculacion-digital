# GeneraciónMatriculaPDV

Módulo autocontenido de generación de PDFs para la **Solicitud de Matrícula** del Conservatorio Profesional de Música "Marcos Redondo" (Ciudad Real).

Incluye:
- **MatriculaPdf**: componente React-PDF con el formato oficial de la solicitud.
- **TutorialPdf**: componente React-PDF con el tutorial del formulario.
- **Lógica de ensamblado**: función `buildPdfBytes` que genera el PDF principal y, opcionalmente, adjunta archivos (imágenes/PDF) como páginas extra usando `pdf-lib`.
- **Tipos y constantes**: `EnrollmentFormData`, tasas, validaciones (`validateDNI`, `validateEmail`, etc.).

---

## Instalación

Copia esta carpeta (`GeneraciónMatriculaPDV`) en tu proyecto e instala las dependencias:

```bash
npm install @react-pdf/renderer pdf-lib react
# o
yarn add @react-pdf/renderer pdf-lib react
```

> **Nota:** `@react-pdf/renderer` requiere configuración especial en algunos bundlers (Vite, Webpack, etc.). Si usas **Vite**, asegúrate de tener `vite-plugin-singlefile` o la configuración adecuada para manejar las fuentes internas de `@react-pdf/renderer`.

---

## Uso rápido

```tsx
import { buildPdfBytes, EnrollmentFormData } from './GeneraciónMatriculaPDV/src';

const formData: EnrollmentFormData = {
  nombre: 'Juan',
  apellidos: 'Pérez García',
  dni: '12345678Z',
  fechaNacimiento: '2010-05-15',
  domicilio: 'Calle Mayor, 1',
  localidad: 'Ciudad Real',
  provincia: 'Ciudad Real',
  codigoPostal: '13001',
  email: 'juan@ejemplo.com',
  telefono: '612345678',
  horaSalidaEstudios: '17 h',
  disponibilidadManana: true,
  autorizacionImagen: true,
  tutor1Nombre: '',
  tutor1Dni: '',
  tutor2Nombre: '',
  tutor2Dni: '',
  tipoEnsenanza: 'profesional',
  curso: '3º',
  especialidad: 'Piano',
  asignaturaPendiente1: '',
  perfilProfesional: '',
  formaPago: 'unico',
  familiaNumerosa: false,
  tipoReduccion: 'ninguna',
  matriculaHonor: false,
  esPrimerAno: false,
  importeTotal: '348.00',
};

async function descargarPdf() {
  const { bytes, filename } = await buildPdfBytes({
    formData,
    academicYear: '2026 / 2027',
    submitTimestamp: new Date(),
    asignaturasCursoActual: [
      { MATERIA: 'PIA301', DESCRIPCION: 'Piano III' },
      { MATERIA: 'LEN301', DESCRIPCION: 'Lenguaje Musical III' },
    ],
    selectedPendingSubjects: [],
    calculation: {
      details: {
        reductionLabel: 'Ninguna',
        serviciosGenerales: 10,
        aperturaExpediente: 0,
        curso: 348,
        asignaturasPendientes: 0,
        matriculaHonorDiscount: 0,
        multiplier: 1,
        convalidacionDiscount: 0,
        convalidacionCount: 0,
      },
    },
    requestNumber: 'CR-2026-0042',
    attachments: [], // opcional: array de File
  });

  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## API

### `buildPdfBytes(opts: BuildPdfOptions): Promise<{ bytes: Uint8Array; filename: string }>`

Genera el PDF de matrícula. Si `attachments` contiene archivos, los incrusta como páginas adicionales.

**Parámetros:**
- `formData`: datos del alumno (`EnrollmentFormData`).
- `academicYear`: string, ej. `"2026 / 2027"`.
- `submitTimestamp`: `Date` de envío.
- `asignaturasCursoActual`: asignaturas del curso actual (`{ MATERIA, DESCRIPCION }[]`).
- `selectedPendingSubjects`: asignaturas pendientes (`{ id, materiaId, label }[]`).
- `calculation`: resultado del cálculo de tasas (puede ser `null`).
- `requestNumber`: número de solicitud (opcional).
- `attachments`: array de `File` (imágenes o PDFs) para anexar.

### `generateTutorialPdf(): Promise<Blob>`

Genera el PDF del tutorial.

### `uint8ToBase64(bytes: Uint8Array): string`

Codifica los bytes del PDF a Base64 (útil para enviar a APIs).

### Tipos exportados

- `EnrollmentFormData`
- `PendingSubject`
- `CurrentSubject`
- `CalcResult`
- `MatriculaPdfProps`
- `BuildPdfOptions`

### Constantes y validaciones

- `FEES`: tasas por enseñanza y curso.
- `ARTICLE_TEXTS`: textos legales.
- `REDUCCION_LABEL`: etiquetas de reducción.
- `validateDNI(dni: string): string | null`
- `validateEmail(email: string): string | null`
- `validateCP(cp: string): string | null`
- `validateTelefono(tel: string): string | null`
- `sanitize(value: string): string`

---

## Estructura de carpetas

```
GeneraciónMatriculaPDV/
├── package.json
├── README.md
├── assets/
│   ├── logo_cpm.png
│   └── logo_jccm.png
└── src/
    ├── index.ts           # Punto de entrada (re-exports)
    ├── types.ts           # Tipos TypeScript
    ├── constants.ts       # Tasas, validaciones, textos legales
    ├── MatriculaPdf.tsx   # Componente React-PDF de la solicitud
    ├── TutorialPdf.tsx    # Componente React-PDF del tutorial
    └── generatePdf.ts     # Lógica de generación y adjuntos
```

---

## Personalización

- **Logos**: reemplaza `assets/logo_cpm.png` y `assets/logo_jccm.png` por los de tu centro.
- **Colores / Estilos**: modifica las constantes de color y `StyleSheet.create` en `MatriculaPdf.tsx`.
- **Tasas**: actualiza `FEES` en `constants.ts`.
- **Textos legales**: actualiza `ARTICLE_TEXTS` en `constants.ts`.

---

## Dependencias principales

- `@react-pdf/renderer` ^4.3.2
- `pdf-lib` ^1.17.1
- `react` ^19.0.0

---

## Licencia

Mismo licenciamiento que el proyecto original.
