# AGENTS.md — Matriculación Digital

## Memoria del proyecto: bóveda de Obsidian (OBLIGATORIO)

La memoria viva de esta app es la bóveda de Obsidian
**`G:\Mi unidad\##.Obsidian\MatriculacionDigital`** (índice: `Inicio.md`).

- **Al empezar cualquier tarea**, lee `Inicio.md` y las notas relacionadas antes
  de explorar el código: arquitectura, flujo de envío, flows, Dataverse, reglas,
  historial de bugs y pendientes están ahí.
- **Al terminar cualquier cambio relevante** (funcionalidad, bug, decisión,
  flow, columna de Dataverse, versión), actualiza la nota correspondiente o
  crea una nueva y enlázala desde `Inicio.md` (actualiza también su fecha).
  Formato: título `# …`, línea `Tags: #…`, enlaces `[[Nota]]`, en español.
- Si el código y la bóveda no coinciden, manda el código: corrige la nota.
- **Nunca** copies a la bóveda URLs firmadas (`sig=`), contraseñas ni datos
  personales de alumnos (la carpeta se sincroniza con Google Drive).
- Nombres de nota sin `? : * " < > |` (Windows).

## Project Layout

Monorepo with three Vite React apps and a shared package. No workspace manager — each has its own `node_modules` and `package.json`.

| Package | Path | Dev port | Purpose |
|---------|------|----------|---------|
| Main app | `.` | 3000 | Enrollment form + PDF generation |
| `calculadora-tasas` | `calculadora-tasas/` | 3001 | Fee calculator |
| `plan-estudios` | `plan-estudios/` | 3002 | Study plan viewer |
| `shared` | `shared/` | — | Types, fee logic, subject helpers (`@conservatorio/shared`) |

## Whitespace policy en inputs (REGLA INMUTABLE)

Solo los campos en `NO_WHITESPACE_FIELDS` (`src/constants/index.ts`) eliminan
espacios: **DNI, tutor1Dni, tutor2Dni, email, telefono**. Cualquier otro campo
de texto del formulario **debe preservar literalmente** lo que el usuario teclee
(espacios dobles, iniciales y finales incluidos).

- El saneado vive en una sola función: `sanitizeFieldValue(name, value)`.
- `handleChange` en `src/App.tsx` la usa para TODOS los campos string.
- No añadir `.trim()`, `.replace(/\s+/g, '')`, `.replace(/\s{2,}/g, ' ')` ni
  similares en el flujo de teclado de campos de texto libre.
- Si necesitas añadir un campo sin espacios, edítalo en `NO_WHITESPACE_FIELDS`
  y añade su test correspondiente en `src/__tests__/whitespace.test.ts`.
- El test de regresión `src/__tests__/whitespace.test.ts` se romperá si vuelve
  a colarse un colapso global de espacios — NO lo arregles añadiendo campos a
  la lista, arregla el código que rompió la regla.

## Opciones desactivables (modo administrador)

Las restricciones temporales de *Datos de Matriculación* y *Forma de Pago* ya NO se
hacen con constantes `RESTRICCION_*` en `App.tsx`. Se usa `src/opciones/`:

- `catalogo.ts`: catálogo de opciones (`OPCIONES_CATALOGO`), URLs de los flows y
  `ajustarFormulario` (deselecciona lo que se desactiva).
- `Opcion.tsx`: `<Opcion k="...">` envuelve cada opción (atenuada + inerte + aviso).
- `OpcionesProvider.tsx`: carga la configuración, palabra clave `cpmadmin` → contraseña →
  barra de administrador → Guardar en Dataverse.
- Desactivación **solo visual**, sin validación en servidor.
- Backend: `docs/opciones-formulario-power-automate.md`.
- Opción nueva: añadirla al catálogo y envolverla con `<Opcion>`. Por defecto queda visible.
- **Modo ampliación de matrícula**: `OpcionesConfig.ampliacion` (fuera del catálogo, por
  defecto `false`, guardado como `"ampliacion": true` junto a `off`). Mientras está activo,
  toda solicitud es una ampliación: cambian el título y el aviso del formulario, el PDF
  (`MatriculaPdf` con `esAmpliacion`) y el archivo, que pasa a llamarse `AMPLIACION_…`, y se envía
  `ampliacion` a los flows de crear y de PDF (el de crear debe mapearlo a `cr955_ampliacion`).

## Daily Commands

```bash
# Main app
npm install
npm run dev          # vite --port=3000 --host=0.0.0.0 (+ legacy dev-api)
npm test             # vitest run
npm run build        # vite build → dist/
npm run lint         # tsc --noEmit (only typecheck; no eslint/prettier)

# Sub-apps (run from their directories)
cd calculadora-tasas && npm run dev   # port 3001
cd plan-estudios     && npm run dev   # port 3002
```

## TypeScript & Path Aliases

- Root `tsconfig.json` **excludes** `calculadora-tasas`, `plan-estudios`, `shared`, `netlify`, `dist`. Do not expect cross-package type checking from the root.
- Sub-packages have their own `tsconfig.json` with `include: ["src"]`.
- Path alias `@/*` maps to `./*` in the root app; sub-packages do not define `@/` aliases.

## Deployment Architecture

**There is no server of our own.** Since May 2026 the browser calls the Power
Automate webhooks **directly** (they answer with CORS `*`); Power Automate
writes to Dataverse and sends the e-mails. Reason: privacy — data goes from the
browser straight to the school's environment.

- `vite build` uses `vite-plugin-singlefile` → a self-contained `dist/index.html`
  (`public/materias.json` is copied next to it).
- **Vercel** (primary) — `vercel.json`: static build + SPA rewrite `/(.*)` →
  `/index.html`. Every push to `main` deploys.
- **WordPress** — the same single-file HTML can be opened from WordPress (blob
  URL) or embedded with an iframe. See `Plan-Matriculación-digital-wp.md`.
- **Local / presencial** — `Iniciar_Matriculacion.bat` builds and opens
  `localhost:3000`.
- **Legacy, not used by the frontend:** `netlify.toml` + `netlify/functions/`
  (Azure AD, Dataverse, Graph, SharePoint) and `.env.example`. There is **no
  `api/` folder** any more; the `vercelApiRoutes` dev plugin in
  `vite.config.ts` and `scripts/dev-api.ts` are leftovers.

## Backend Flow (Power Automate, called from `src/App.tsx`)

`handleSendAndDownload` runs **four** HTTP-triggered flows, only on the first
submit (a second click just rebuilds and downloads the same PDF):

0. `validateAttachments()` — if a PDF can't be processed, abort **before**
   touching the backend.
1. `PA_DUPLICADOS_URL` — duplicate check (DNI + especialidad + enseñanza/curso
   + academic year). `409` or `{ok:false, reason:'duplicate'}` → duplicate modal.
2. `PA_NORDEM_URL` — `{ cursoEscolar }` → next `nOrden` (**global per school
   year**, cut-off 1 May).
3. `PA_CREAR_URL` — full JSON + `asignaturas[]` (`tipo`: Ordinaria /
   Convalidacion / Pendiente / Repetidor) → creates the `cpmmr_matriculas` row
   and its `cr955_matriculaasignaturas` children; returns `{ rowId, nOrden }`.
4. `PA_PDF_URL` — `rowId` + PDF Base64 + readable fields → stores the PDF in
   `cpmmr_solicitudpdf` and sends the confirmation e-mail.

Errors after step 3 show the `pdf_failed` screen (data is already saved).
Admin options use two more flows (`PublicLeerOpciones`,
`PublicGuardarOpciones`) whose URLs live in `src/opciones/catalogo.ts`.

To add a form field: put it in the step-3 payload **and** map it in the flow
(column prefix `cpmmr_`, some `cr955_`).

## Flow URLs and secrets

- The flow URLs (with `sig=` signature) are **hard-coded constants** in
  `src/App.tsx` (`PA_*_URL`) and `src/opciones/catalogo.ts`. No env vars are
  needed to build. Moving them to `VITE_*` variables in Vercel is pending.
- Never paste those URLs into docs, notes, the Obsidian vault or chat.
- The Claude Code permission classifier may block commit/push of changes that
  touch them ("credential leakage"); then the user commits by hand.

## Data & Code Generation

- `public/materias.json` is the runtime subject catalog. Loaded by `src/data/materias.ts` via `fetch('/materias.json')`.
- `transform_data.cjs` transforms `datMaterias_expandido.json` → `src/data/materias.ts` (run manually when source data changes).
- Fee structures, reductions, and validation rules live in `src/constants/index.ts` and `shared/src/fees.ts`.

## PDF Generation

- Client-side using `@react-pdf/renderer` for the form page.
- If user attaches files, `pdf-lib` merges the form PDF with attachments (images resized to A4, PDFs appended as pages).
- Attached PDFs go through `src/pdf/adjuntos.ts` (`preparePdfAttachment`): unencrypted → copied as vector pages; encrypted/signed (e.g. Modelo 046, RC4 with owner restrictions only) → rasterized with pdf.js; real password → password modal; anything else → "No se puede procesar" modal that blocks submission.
- **pdf.js must be imported only from `pdfjs-dist/legacy/build/…`** (via `loadPdfJs` in `src/pdf/adjuntos.ts`). The default v6 build calls very recent APIs without polyfills (`Uint8Array#toHex`, `Map#getOrInsertComputed`…) and breaks encrypted PDFs in non-updated browsers. Guarded by `src/__tests__/adjuntos-pdf.test.ts`.
- Final PDF is Base64-encoded and sent to the PDF flow (`PA_PDF_URL`).
- Unprocessable-PDF modal offers: remove it, attach photos instead, try another browser, or e-mail it to the school (`mailto:` link that also copies the address to the clipboard).

## Power Platform / Dataverse Schema Notes

Documented extensively in `Power Apps y P Automate.md`. Key tables:
- `cpmmr_matriculas` — enrollment requests
- `cr955_matriculaasignaturas` — subject lines (1:N with matriculas)
- `cr955_asignaturas` — subject catalog

- `cr955_configuracionformulario` — admin options (one row; `cr955_opciones` Text **max 850 chars**, `cr955_clave` password)

Choice values for `cr955_estadoasignatura` (confirmed by the column table and the
create flow expression in `Power Apps y P Automate.md`):
- `904390000` = Matriculada
- `904390001` = Solicitud de Convalidación
- `904390002` = Convalidada
- `904390003` = Simultaneada
- `904390004` = Pendiente

The legacy `netlify/functions/upload-pdf.ts` uses a different mapping — ignore it.
The documented flow expression only maps `Convalidacion` → 001 and `Pendiente` →
004; anything else (including `Repetidor`) becomes 000 Matriculada.

## Style & Tooling

- Tailwind CSS v4 with `@tailwindcss/vite` plugin (no PostCSS config).
- No ESLint or Prettier. `lint` script is **only** `tsc --noEmit`.
- Tests: **Vitest** + Testing Library + jsdom (`npm test`, `npm run test:watch`), in `src/__tests__/`.
- React 19, TypeScript ~5.8.
- Versions are **git tags** `vX.Y.Z` (annotated); `package.json` stays at `0.0.0`. Commit messages in Spanish with conventional prefixes.

## Common Pitfalls

- Do not assume `@/` aliases work in sub-packages; they are root-only.
- `netlify/functions/` and `.env.example` are legacy; changing them does not affect production.
- `README.md` is partly outdated (mentions `api/` and branch `release/v0.1.0`).
- Fee and Orquesta logic is duplicated in `src/` and `shared/`; change both.
- The `clean` script uses `rm -rf dist` and will fail on Windows unless using Git Bash/WSL.
- Attachment upload limit is **5 MB total** (enforced in `App.tsx`).
- `materias.json` must be present in `public/` for the app to load subject data; without it the form's subject selectors will be empty.
