# Matriculación Digital - Conservatorio Profesional de Música de Ciudad Real

Aplicación web para la gestión automatizada de solicitudes de matrícula en el Conservatorio Profesional de Música de Ciudad Real.

## Características

- Formulario digital de solicitud de matrícula
- Selección de especialidades, cursos y asignaturas
- Generación de PDF de la solicitud (client-side)
- Integración con Power Automate para flujo automatizado
- Almacenamiento en Dataverse (Microsoft Power Platform)
- Envío de notifications al solicitante por email
- Control de duplicados y autonumeración de solicitudes

## Tecnologías

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **PDF**: @react-pdf/renderer + pdf-lib
- **Backend**: Vercel API Routes (Node.js)
- **Integración**: Power Automate + Dataverse
- **UI**: Lucide React + Motion

## Estructura del Proyecto

```
├── api/                    # Vercel API Routes
│   ├── submit-enrollment.ts
│   └── upload-pdf.ts
├── src/
│   ├── App.tsx             # Aplicación principal
│   ├── MatriculaPdf.tsx    # Generación de PDF
│   ├── constants/          # Constantes del conservatorio
│   ├── data/               # Datos de asignaturas
│   └── matriculacion/      # Lógica de matriculación
├── public/                 # Archivos estáticos
├── shared/                 # Código compartido entre proyectos
├── calculadora-tasas/     # Calculadora de tasas
└── plan-estudios/         # Plan de estudios
```

## Despliegue

### Vercel (Recomendado)

1. Importar el repositorio en vercel.com
2. Seleccionar la rama `release/v0.1.0`
3. Configurar variables de entorno:

| Variable | Descripción |
|----------|-------------|
| `POWER_AUTOMATE_WEBHOOK_URL` | Webhook de Power Automate (formulario) |
| `POWER_AUTOMATE_PDF_WEBHOOK_URL` | Webhook de Power Automate (PDF) |

4. Desplegar

### WordPress

Usar iframe para incrustar la aplicación:

```html
<iframe src="https://tu-app.vercel.app" width="100%" height="800" style="border:none;"></iframe>
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Compilar para producción
npm run build

# Verificar tipos
npm run lint
```

## Límites de uso

- **Plan gratuito Vercel**: 1,000,000 invocaciones/mes, 100 GB ancho de banda/mes
- Suficiente para ~800 solicitudes/mes de matrícula

## Licencia

Privado - Uso interno del Conservatorio Profesional de Música de Ciudad Real
