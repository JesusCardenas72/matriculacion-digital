# Plan de Trabajo: Matriculación Digital desde WordPress

> **Fecha:** 2026-05-13  
> **Objetivo:** Eliminar la dependencia de Vercel para el frontend del formulario de matriculación, manteniendo la privacidad de los datos (navegador → Power Automate → Dataverse).

---

## 1. Contexto y Motivación

### Arquitectura actual
```
Navegador (React en Vercel)
    ↓ POST /api/submit-enrollment
Vercel (proxy ligero, solo reenvía)
    ↓ POST webhook
Power Automate
    ↓ API
Dataverse (entorno seguro de la empresa)
```

**Problema:** Vercel actúa como un paso intermedio innecesario. Los datos no se almacenan allí, pero sí transitan por un servidor externo.

### Objetivos
1. **No depender de Vercel** para desplegar el formulario.
2. **Privacidad:** los datos viajan directamente desde el navegador del usuario al entorno seguro de la empresa (Dataverse, a través de Power Automate).
3. El usuario accede al formulario desde la web de WordPress del conservatorio.

---

## 2. Decisión arquitectónica: Variante A (Blob desde WordPress)

Se descarta Power Apps por falta de permisos. Se elige la **Variante A** sobre la B porque ofrece máxima privacidad (no deja archivo en el disco del usuario) y cumple exactamente el espíritu de "usar y desechar".

### Flujo de la Variante A
```
Usuario en WordPress
    ↓ clic en botón
WordPress hace fetch del HTML autocontenido
    ↓ crea Blob URL en memoria
Se abre pestaña nueva con el formulario (origin: blob://...)
    ↓ usuario rellena y envía
Navegador → POST directo a webhook de Power Automate
    ↓ Power Automate → Dataverse
Usuario cierra pestaña → Blob se libera de RAM
```

### Por qué funciona
- Los webhooks de Power Automate responden con `Access-Control-Allow-Origin: *`, permitiendo llamadas CORS desde cualquier origen, incluido `blob:`.
- El HTML será **autocontenido**: un único archivo con todo el JavaScript, CSS, imágenes y datos embebidos.

---

## 3. Cambios necesarios en el código

### 3.1. Build single-file con Vite

**Herramienta:** `vite-plugin-singlefile` (ya está en `devDependencies`).

**Configuración en `vite.config.ts`:**
- Añadir el plugin `vitePluginSinglefile()`.
- Desactivar `manualChunks` (el single-file requiere un solo chunk de salida).
- Asegurar que el build genere `index.html` con todo inline.

**Resultado:** `dist/index.html` será un único archivo de ~2–3 MB.

### 3.2. Inlinear `materias.json`

**Problema:** hoy se carga con `fetch('/materias.json')`. Desde un origen `blob:` o `file://`, esa ruta relativa no existe.

**Solución:**
1. Convertir `public/materias.json` a un módulo TypeScript (`src/data/materiasJson.ts`) que exporte el objeto directamente.
2. Actualizar `src/data/materias.ts` para importar ese módulo en lugar de hacer `fetch`.
3. Eliminar `public/materias.json` del build (ya no es necesario).

**Nota:** `transform_data.cjs` seguirá generando el archivo de datos, pero la salida debe ser `.ts` en lugar de `.json`.

### 3.3. Inlinear imágenes (logos)

**Problema:** los archivos `src/assets/logo_cpm.png` y `src/assets/logo_jccm.png` se importan como URLs. En un single-file, deben estar embebidos como base64.

**Solución:**
- Vite embebe automáticamente assets pequeños como base64 si se configura el límite adecuado.
- Verificar que los imports en `App.tsx` y `MatriculaPdf.tsx` usen la ruta correcta para que Vite los incluya en el bundle.

### 3.4. Apuntar directamente a los webhooks de Power Automate

**Problema:** en `src/App.tsx`, las URLs de envío son relativas:
```ts
const POWER_AUTOMATE_URL     = '/api/submit-enrollment';
const POWER_AUTOMATE_URL_PDF = '/api/upload-pdf';
```

**Solución:**
- Reemplazar por las URLs completas de los webhooks de Power Automate (las que hoy están en `api/submit-enrollment.ts` y `api/upload-pdf.ts`).
- Dado que el formulario ya no tendrá backend propio, estas URLs deben ir hardcodeadas (o como variables de entorno en build time de Vite, por ejemplo `VITE_PA_WEBHOOK_URL`).

**URLs a usar:**
- Duplicados + nOrden: `PA_WEBHOOK_DUPLICADOS_URL`
- Crear registro: `PA_WEBHOOK_URL`
- Subir PDF: `PA_WEBHOOK_PDF_URL`

**Nota:** la lógica de "Paso 1: duplicados" y "Paso 2: crear registro" que hoy hace `api/submit-enrollment.ts` debe **moverse al frontend**. El `App.tsx` tendrá que hacer dos llamadas consecutivas a Power Automate:
1. Webhook de duplicados (recibe `nOrden`).
2. Webhook de creación de registro (envía datos + `nOrden`).

### 3.5. Fuentes de Google Fonts

**Decisión:** se mantienen como enlace externo (`fonts.googleapis.com`).

**Justificación:** el usuario siempre tendrá conexión a internet (necesaria para enviar la matrícula). Embeber las fuentes aumentaría el tamaño del bundle sin beneficio práctico.

### 3.6. Eliminar código de backend de Vercel

Una vez el frontend apunte directamente a Power Automate:
- `api/submit-enrollment.ts` → eliminar o deprecar.
- `api/upload-pdf.ts` → eliminar o deprecar.
- `netlify/functions/submit-enrollment.ts` → revisar si se mantiene para compatibilidad con despliegue en Netlify (fuera de scope de este plan, pero documentar).

---

## 4. Integración con WordPress

### 4.1. Subida del archivo

El HTML autocontenido resultante del build se sube a WordPress como un archivo estático:
- Opción A: Biblioteca de medios de WordPress.
- Opción B: Subir por FTP al directorio del tema (ej. `/wp-content/uploads/matricula/`).

### 4.2. Botón de apertura (Variante A)

En una página o entrada de WordPress, añadir un bloque HTML personalizado con el siguiente script:

```html
<button id="btn-matricula">Abrir formulario de matriculación</button>
<script>
  document.getElementById('btn-matricula').addEventListener('click', async () => {
    const res = await fetch('https://tudominio.com/wp-content/uploads/matricula/index.html');
    const html = await res.text();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  });
</script>
```

**Comportamiento:**
- El usuario hace clic.
- El navegador descarga el HTML (~2–3 MB).
- Se abre en una pestaña nueva desde memoria RAM (`blob://...`).
- El usuario rellena, envía y cierra.
- Al cerrar, el Blob se libera. **No queda archivo en Descargas.**

---

## 5. Consideraciones de seguridad y privacidad

| Aspecto | Estado | Notas |
|---|---|---|
| Datos en tránsito | ✅ Seguro | HTTPS end-to-end (navegador → Power Automate → Dataverse). |
| Datos en reposo en Vercel | ✅ Eliminado | Ya no hay servidor intermedio. |
| Datos en PC del usuario | ✅ Mínimos | Solo el formulario en RAM (Variante A). No se guarda la matrícula en local. |
| CORS en webhooks | ✅ Verificado | `Access-Control-Allow-Origin: *` confirmado en los tres endpoints (13/05/2026). |
| URLs de webhooks en frontend | ⚠️ Exposición | Las URLs con `sig=` son públicas por diseño de Power Automate. No contienen secretos de Azure AD. Riesgo aceptable. |

---

## 6. Tareas de implementación (orden recomendado)

1. **[Configuración]** Ajustar `vite.config.ts` para activar `vite-plugin-singlefile`.
2. **[Datos]** Convertir `materias.json` a módulo TS e inlinear en el bundle.
3. **[Assets]** Verificar que los logos se embeban como base64 en el build.
4. **[Frontend]** Refactorizar `src/App.tsx` para llamar directamente a los 3 webhooks de Power Automate (duplicados → crear → upload-pdf).
5. **[Build]** Ejecutar `npm run build` y verificar que `dist/index.html` es un único archivo funcional.
6. **[WordPress]** Subir el HTML a WordPress y crear el botón con el script de Blob.
7. **[Pruebas]**
   - Abrir desde WordPress en varios navegadores (Chrome, Firefox, Edge, Safari móvil).
   - Rellenar formulario de prueba y verificar que llega a Dataverse.
   - Comprobar que el PDF se genera correctamente y se adjunta.
   - Verificar duplicados (enviar dos veces mismos datos → debe dar 409).
8. **[Limpieza]** Eliminar o archivar `api/submit-enrollment.ts` y `api/upload-pdf.ts`.
9. **[Documentación]** Actualizar `AGENTS.md` y `README.md` con la nueva arquitectura.

---

## 7. Estimación de esfuerzo

| Tarea | Complejidad | Tiempo estimado |
|---|---|---|
| Configurar single-file build | Baja | 30 min |
| Inlinear materias.json | Media | 1 h |
| Refactorizar llamadas a Power Automate | Media-Alta | 2–3 h |
| Ajustar assets (logos) | Baja | 30 min |
| Build y pruebas locales | Media | 1–2 h |
| Integración con WordPress | Baja | 30 min |
| Pruebas end-to-end | Media | 2 h |
| Limpieza y documentación | Baja | 1 h |
| **Total** | | **~8–10 horas** |

---

## 8. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El HTML single-file pesa más de lo esperado y tarda en cargar | Media | Medio | Optimizar con gzip en el servidor de WordPress. Si sigue siendo lento, evaluar code-splitting manual. |
| Los webhooks de Power Automate cambian de URL | Baja | Alto | Documentar el proceso de actualización. Las URLs están centralizadas en una constante en `App.tsx`. |
| Navegador antiguo no soporta `URL.createObjectURL` | Baja | Medio | Añadir fallback: abrir el HTML directamente desde la URL del servidor (Variante B). |
| Power Automate deja de aceptar CORS | Baja | Alto | No hay mitigación sencilla sin servidor intermedio. Monitorear y, en último caso, evaluar un proxy mínimo (ej. Cloudflare Worker). |
| Problemas con embebido de fuentes o imágenes en react-pdf | Media | Medio | Probar la generación de PDF en el HTML autocontenido antes de desplegar. |

---

## 9. Notas adicionales

- **Netlify Functions:** el proyecto también tiene funciones en `netlify/functions/`. Este plan no las modifica. Si en el futuro se decide desplegar en Netlify en lugar de WordPress, esas funciones siguen siendo válidas como backend completo.
- **Sub-apps (`calculadora-tasas`, `plan-estudios`):** no están afectadas por este cambio. Siguen siendo proyectos Vite independientes.
- **Git:** este plan se commiteará como documentación en el repositorio para referencia futura.
