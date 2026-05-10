# AGENTS.md — Matriculación Digital

## Project Layout

Monorepo with three Vite React apps and a shared package. No workspace manager — each has its own `node_modules` and `package.json`.

| Package | Path | Dev port | Purpose |
|---------|------|----------|---------|
| Main app | `.` | 3000 | Enrollment form + PDF generation |
| `calculadora-tasas` | `calculadora-tasas/` | 3001 | Fee calculator |
| `plan-estudios` | `plan-estudios/` | 3002 | Study plan viewer |
| `shared` | `shared/` | — | Types, fee logic, subject helpers (`@conservatorio/shared`) |

## Daily Commands

```bash
# Main app
npm install
npm run dev          # vite --port=3000 --host=0.0.0.0
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

**Two deployment targets exist in parallel:**

1. **Vercel** (primary) — `vercel.json`
   - `api/` routes are Vercel API Routes (Node.js). These are **thin proxies** that forward to Power Automate webhooks.
   - SPA rewrite: `/*` → `/index.html`

2. **Netlify** (secondary) — `netlify.toml`
   - `netlify/functions/` are Netlify Functions with **full backend logic**: Azure AD auth, Dataverse CRUD, Microsoft Graph email, SharePoint file upload, duplicate checking, auto-numbering.
   - Also SPA rewrite + security headers.

**Important:** The `api/` and `netlify/functions/` files look similar but are **not interchangeable**. The Netlify versions contain the real Dataverse/Graph implementation; the Vercel versions are simple pass-throughs. If you modify one, consider whether the other needs alignment.

## Backend Flow

Enrollment submission is a **two-step process**:

1. `POST /api/submit-enrollment` (or Netlify equivalent)
   - Checks for duplicates by `(DNI + especialidad + ensenanzaCurso)` in Dataverse
   - Returns `409` if duplicate
   - Computes next `nOrden` (auto-number per specialty+course group)
   - Creates Dataverse record, returns `{ rowId, nOrden }`

2. `POST /api/upload-pdf`
   - Receives PDF Base64 + enrollment metadata
   - Uploads PDF to Dataverse file column (`cpmmr_solicitudpdf`)
   - Sends confirmation email via Microsoft Graph
   - Creates child records in `cr955_matriculaasignaturas` for each subject

## Environment Variables

See `.env.example` for the full list. Key ones:

**Client (Vite, bundled at build time):**
- `VITE_POWER_AUTOMATE_URL=/api/submit-enrollment`
- `VITE_POWER_AUTOMATE_URL_PDF=/api/upload-pdf`

**Server (Vercel/Netlify Functions):**
- `POWER_AUTOMATE_WEBHOOK_URL`, `POWER_AUTOMATE_PDF_WEBHOOK_URL` — Power Automate webhooks
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` — Azure AD app registration
- `DATAVERSE_URL`, `DATAVERSE_TABLE_NAME=cpmmr_matriculas`, `DATAVERSE_FILE_COLUMN=cpmmr_solicitudpdf`
- `SHAREPOINT_SITE_URL`, `SHAREPOINT_LIST_NAME`, `SHAREPOINT_LIBRARY_NAME`
- `GRAPH_SENDER_EMAIL` — sender for confirmation emails
- `ALLOWED_ORIGIN` — CORS origin

## Data & Code Generation

- `public/materias.json` is the runtime subject catalog. Loaded by `src/data/materias.ts` via `fetch('/materias.json')`.
- `transform_data.cjs` transforms `datMaterias_expandido.json` → `src/data/materias.ts` (run manually when source data changes).
- Fee structures, reductions, and validation rules live in `src/constants/index.ts` and `shared/src/fees.ts`.

## PDF Generation

- Client-side using `@react-pdf/renderer` for the form page.
- If user attaches files, `pdf-lib` merges the form PDF with attachments (images resized to A4, PDFs appended as pages).
- Final PDF is Base64-encoded and sent to the upload endpoint.

## Power Platform / Dataverse Schema Notes

Documented extensively in `Power Apps y P Automate.md`. Key tables:
- `cpmmr_matriculas` — enrollment requests
- `cr955_matriculaasignaturas` — subject lines (1:N with matriculas)
- `cr955_asignaturas` — subject catalog

Choice values for `cr955_estadoasignatura`:
- `904390000` = Matriculada
- `904390001` = Solicitud de Convalidación
- `904390002` = Convalidada
- `904390003` = Simultaneada
- `904390004` = Pendiente

## Style & Tooling

- Tailwind CSS v4 with `@tailwindcss/vite` plugin (no PostCSS config).
- No ESLint, Prettier, or test runner configured.
- `lint` script is **only** `tsc --noEmit`.
- React 19, TypeScript ~5.8.

## Common Pitfalls

- Do not assume `@/` aliases work in sub-packages; they are root-only.
- Modifying `api/` does not affect `netlify/functions/` and vice-versa.
- The `clean` script uses `rm -rf dist` and will fail on Windows unless using Git Bash/WSL.
- Attachment upload limit is **9 MB total** (enforced in `App.tsx`).
- `materias.json` must be present in `public/` for the app to load subject data; without it the form's subject selectors will be empty.
