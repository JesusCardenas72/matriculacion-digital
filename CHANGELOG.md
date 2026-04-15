# Changelog

## 0.1.0 — 2026-04-15

- Añadida solicitud de convalidación de asignaturas en el formulario de matrícula.
- Comprobación de duplicados en el backend: se bloquea la matrícula si ya existe una solicitud con el mismo DNI y la misma especialidad; se informa al solicitante con teléfono y email del centro.
- Autonumeración de solicitudes (formato `AÑO-n`) en modo de comprobación.
- Guardado de campos de convalidación en la lista de SharePoint y envío en el payload.
- Pequeñas mejoras en el flujo de envío y validaciones.


> Nota: Para publicar la release en GitHub ejecuta los comandos indicados en la sección "Pasos siguientes".
