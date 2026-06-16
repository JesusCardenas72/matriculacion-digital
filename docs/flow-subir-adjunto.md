# Flow Power Automate: `PublicSubirAdjunto` (+ Fase 3 app admin)

Guía para crear el flow que recibe cada adjunto **original** desde la web pública y lo
guarda en Dataverse como **annotation (Nota)** vinculada a la matrícula. Sustituye a la
antigua fusión de adjuntos en el navegador (que fallaba con PDFs cifrados, HEIC y
rasterizado en blanco en móviles antiguos).

Contexto: la web (Vercel) llama directamente a webhooks de Power Automate. El frontend ya
está preparado: en `src/App.tsx`, la constante `PA_ADJUNTO_URL` espera la URL de este flow,
y `subirAdjuntos()` lo invoca **una vez por fichero** con el cuerpo descrito abajo.

---

## Fase 2 — Flow `PublicSubirAdjunto`

### Trigger: "When an HTTP request is received" (POST)

Esquema JSON del cuerpo de entrada:

```json
{
  "type": "object",
  "properties": {
    "rowId":         { "type": "string" },
    "filename":      { "type": "string" },
    "mimeType":      { "type": "string" },
    "contentBase64": { "type": "string" }
  }
}
```

Recomendado: misma protección que el resto de flows (cabecera `x-api-key` validada al inicio;
si no coincide → Response 401). *(Opcional pero coherente con AdminObtener... etc.)*

### Configuración REAL que funcionó (2026-06-15)

El conector moderno de Dataverse **no expone el campo "Regarding" (objectid)** para crear la
Nota vinculada en un solo paso. Solución que funcionó: **dos acciones** (crear Nota + relacionar).

**Acción 1 — "Agregar una nueva fila" (Add a new row), tabla `annotations` (Notas):**
```json
"parameters": {
  "entityName": "annotations",
  "item/subject": "Documento de matrícula",
  "item/isdocument": true,
  "item/documentbody": "@triggerBody()?['contentBase64']",
  "item/filename": "@triggerBody()?['filename']",
  "item/mimetype": "@triggerBody()?['mimeType']"
}
```
*(documentbody YA es base64; pasar la cadena tal cual. Los campos se añaden desde "Mostrar
todo / Parámetros avanzados". Si las expresiones salen con `['properties']?['...']`, meterlas
con el editor `fx` como `triggerBody()?['filename']` para leer el cuerpo plano real.)*

**Acción 2 — "Relacionar filas" (Relate rows / AssociateEntities):**
```json
"parameters": {
  "entityName": "cpmmr_matriculas",
  "recordId": "@triggerBody()?['rowId']",
  "associationEntityRelationship": "cpmmr_matricula_Annotations",
  "item/@odata.id": "@concat('https://org46da073a.crm4.dynamics.com/api/data/v9.1/annotations(', outputs('Add_a_new_row')?['body/annotationid'], ')')"
}
```
⚠️ **Dos escollos clave del `item/@odata.id`:**
1. Debe ser **URI absoluta** (no `annotations(guid)` relativa) → si no, error "relative URI ...
   odata.context annotation is missing".
2. La base debe ser **`/api/data/v9.1/`** (la versión interna del conector), NO `v9.2` → si no,
   error "URI ... is not valid because it is not based on .../v9.1/".

Construir con `concat(...)` en `fx` es lo fiable (el token `annotationid` no aparece en
contenido dinámico). `Add_a_new_row` es el nombre interno de la Acción 1.

### Acción final: Response

- **200** con `{ "ok": true, "filename": "@triggerBody()?['filename']" }` si todo va bien.
- Configura "Configure run after" para devolver **5xx** si la creación falla, de modo que el
  frontend lo cuente como fallido y lo muestre en el aviso "no se pudo adjuntar".

### Cablear la URL

1. Guarda el flow y copia la **URL HTTP POST** del trigger.
2. Pégala en `src/App.tsx` → `const PA_ADJUNTO_URL = '...'`.
3. Asegúrate de que el CSP/`connect-src` del despliegue (Vercel) permite `*.powerplatform.com`
   (igual que los otros PA_*_URL ya en uso).

### Prueba rápida (sin la web)

`POST` a la URL con un body de ejemplo (un PDF pequeño en base64) y un `rowId` real de una
matrícula. Verifica en Dataverse:

```
GET {DATAVERSE_URL}/api/data/v9.2/annotations?$filter=_objectid_value eq <rowId>&$select=filename,mimetype,isdocument
```

Deben aparecer las Notas con `filename`/`mimetype` correctos e `isdocument = true`.

---

## Email de confirmación (decisión)

El flow `Admin…/PDF` que envía el email de recepción ahora recibe en `cpmmr_solicitudpdf`
**solo el PDF del formulario** (ya no el combinado). El email sigue adjuntando ese PDF como
justificante. Los **originales** del solicitante viajan a Dataverse como Notas (arriba); el
solicitante ya tiene sus propios ficheros, por lo que **no** se reenvían en el email.

> Si más adelante quieres que el email incluya también los originales: tras crear las Notas,
> añade en el flow del email un "List rows" sobre `annotations` filtrando por `_objectid_value`
> y adjunta cada `documentbody`. Requiere que el envío del email ocurra **después** de subir
> los adjuntos (reordenar la secuencia en el frontend).

---

## Fase 3 — App admin (`G:\Dev\GestionMatriculasAdmin`)

La app admin hoy descarga **solo** `cpmmr_solicitudpdf` (flow `AdminObtenerPDF`). Para ver los
adjuntos por separado:

1. **Flow nuevo `AdminObtenerAttachments`** (HTTP, `x-api-key`): recibe `{ rowId }`, hace
   `List rows` sobre `annotations`:
   - `$filter=_objectid_value eq <rowId> and isdocument eq true`
   - `$select=annotationid,filename,mimetype` (+ `documentbody` si se devuelve todo de una).
   - Devuelve `[{ filename, mimeType, contentBase64 }]`.
2. **`src/api/types.ts`:** nuevo tipo `ObtenerAttachmentsResponse` (lista de adjuntos).
3. **`src/api/solicitudes.ts`:** nueva `obtenerAttachments(cfg, rowId)` (patrón de `obtenerPDF`
   con `postFlow`). Añadir `urlObtenerAttachments` a `AppConfig` (`electron/config-store.ts`)
   y al modal `src/components/modals/ConexionModal.tsx`.
4. **`SolicitudDetail.tsx`:** además del visor del PDF de formulario, listar los adjuntos con
   botones previsualizar/descargar (reusar el patrón base64→fichero y el caché local).

### Compatibilidad con las matrículas antiguas (~350)

No se migra nada. Los registros previos siguen con su PDF combinado en `cpmmr_solicitudpdf`;
los nuevos tienen el PDF de formulario ahí + adjuntos en Notas. Para registros antiguos, la
nueva lista de adjuntos saldrá **vacía** (no tienen Notas), lo cual es correcto.
