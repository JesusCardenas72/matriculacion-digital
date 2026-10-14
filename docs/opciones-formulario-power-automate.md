# Opciones del formulario: tabla Dataverse + 2 flows de Power Automate

Guía para montar el almacenamiento del **modo administrador** del formulario, que permite
desactivar visualmente opciones de *Datos de Matriculación* y *Forma de Pago*.

El frontend ya está hecho (`src/opciones/`). Solo falta crear la tabla y los dos flujos y
pegar sus URLs en `src/opciones/catalogo.ts`:

```ts
export const PA_OPCIONES_LEER_URL = '';     // ← URL del flow "PublicLeerOpciones"
export const PA_OPCIONES_GUARDAR_URL = '';  // ← URL del flow "PublicGuardarOpciones"
```

Si se vacían, el formulario muestra **todas** las opciones y el modo administrador
funciona solo como vista previa: deja probar, pero no guardar.

---

## Cómo se usa (para el administrador)

1. Abrir el formulario y hacer clic en una zona vacía de la página para que el cursor no esté en ningún campo.
2. Teclear **`cpmadmin`**. Se abre la ventana de contraseña.
3. Aparece una barra amarilla de **Modo administrador**:
   - Cada opción muestra un interruptor **Visible / Desactivada**.
   - Debajo del selector de curso aparecen los **cursos disponibles**.
   - **Todas las opciones** abre la lista completa con casillas. Incluye las que ahora no se ven
     en pantalla, como los perfiles de EP5/EP6, la beca en Elemental o las reducciones, que están dentro de su ventana.
4. **Guardar** publica la configuración. Los alumnos la ven al cargar o recargar el formulario.
5. **Salir** vuelve a la vista normal.

Para el alumno, una opción desactivada se ve atenuada, con el aviso *“No disponible en este
momento”*, y no se puede seleccionar. **No hay validación en el servidor**: es solo una ayuda visual.

---

## 1. Tabla Dataverse `cr955_configuracionformulario`

| Columna (nombre lógico) | Tipo | Uso |
|---|---|---|
| `cr955_opciones` (columna principal) | Texto (máx. **850**) | JSON con la lista de opciones desactivadas (máx. ~680 caracteres aunque se desactiven las 46) |
| `cr955_clave` | Texto (100) | Contraseña del modo administrador |

Crear **una única fila**:

- `cr955_opciones` (Opciones) = `{}` (todo visible)
- `cr955_clave` = la contraseña que quieras

Para cambiar la contraseña, edita esa fila en Dataverse. El flow de lectura **nunca devuelve**
`cr955_clave`, porque solo selecciona `cr955_opciones`.

> Si al crear la tabla Dataverse genera otro nombre de conjunto, por ejemplo
> `cr955_configuracionformularios`, usa el que aparezca en el selector de tabla de los flows.

Formato del JSON que se guarda: solo la lista de opciones **desactivadas** (las demás se
consideran visibles). Todo visible = `{"off":[]}`:

```json
{ "off": ["ensenanzaProfesional", "pagoFraccionado", "cursoEP5"] }
```

> Antes se guardaba el objeto completo (`{ "beca": false, "pagoUnico": true, … }`). Al añadir las
> especialidades dejó de caber en los 850 caracteres y el flujo devolvía **HTTP 502**. La lectura
> sigue aceptando el formato antiguo.

Claves disponibles (definidas en `OPCIONES_CATALOGO`, en `src/opciones/catalogo.ts`):
`ensenanzaElemental`, `ensenanzaProfesional`, `cursoEE1`…`cursoEE4`, `cursoEP1`…`cursoEP6`,
`repetidor`, `asignaturasPendientes`, `convalidacion`, `perfilA`, `perfilB`, `perfilC`,
`primerAno`, `pagoUnico`, `pagoFraccionado`, `beca`, `reduccionFamNumGeneral`,
`reduccionFamNumEspecial`, `reduccionDiscapacidad`, `reduccionTerrorismo`,
`reduccionViolencia`, `reduccionIngresoMinimo`, `matriculaHonor`, y las especialidades
`espCanto`, `espClarinete`, `espContrabajo`, `espFagot`, `espFlautaTravesera`, `espGuitarra`,
`espOboe`, `espPercusion`, `espPiano`, `espSaxofon`, `espTrombon`, `espTrompa`, `espTrompeta`,
`espTuba`, `espViola`, `espViolin`, `espVioloncello`.

---

## 2. Flow `PublicLeerOpciones` (construido y probado)

Trigger **When an HTTP request is received** (*Who can trigger: Anyone*, sin esquema; el formulario envía `{}`).

1. **List rows** (Dataverse): tabla *Configuración formulario*, *Select columns* `cr955_opciones`, *Row count* `1`.
2. **Response**: `200`, cabecera `Content-Type: application/json`, cuerpo (expresión `fx`):

```
json(concat('{"opciones":', coalesce(first(body('List_rows')?['value'])?['cr955_opciones'], '{}'), '}'))
```

Devuelve `{"opciones":{…}}`. Si el flow falla o tarda, el formulario usa la última configuración
que vio ese navegador, o todo visible si nunca la ha visto.

---

## 3. Flow `PublicGuardarOpciones` (construido y probado)

Trigger **When an HTTP request is received** (*Anyone*), esquema:

```json
{ "type": "object", "properties": { "password": { "type": "string" }, "opciones": { "type": "object" } } }
```

El formulario lo llama dos veces: `{ "password" }` solo **verifica** la clave al entrar en modo
administrador; `{ "password", "opciones" }` **guarda**.

1. **List rows**: *Select columns* `cr955_clave`, *Row count* `1`.
2. **Condition** (`fx` a la izquierda, `is equal to`, `true` a la derecha):
   `and(not(empty(triggerBody()?['password'])), equals(first(body('List_rows')?['value'])?['cr955_clave'], triggerBody()?['password']))`
   - **If no** → **Response** `401`, `{"error":"clave"}`.
   - **If yes** → **Condition** `empty(triggerBody()?['opciones'])` is equal to `true`:
     - **If yes** (solo verificar) → **Response** `200`, `{"ok":true}`.
     - **If no** → **Update a row**: Row ID `first(body('List_rows')?['value'])?['cr955_configuracionformularioid']`,
       Opciones `string(triggerBody()?['opciones'])`; después **Response** `200`, `{"ok":true}`.

Un `opciones` vacío (`{}`) se interpreta como "solo verificar" y **no** guarda. El formulario siempre
envía `{"off":[…]}`, que nunca está vacío, así que nunca ocurre.

---

## 4. Pruebas rápidas

1. Pegar las dos URLs en `src/opciones/catalogo.ts` y desplegar.
2. Teclear `cpmadmin` en el formulario y probar una contraseña incorrecta: debe salir *Contraseña incorrecta*.
3. Entrar con la correcta, desactivar *Pago Fraccionado* y pulsar **Guardar**.
4. Comprobar en Dataverse que `cr955_opciones` contiene `{"off":["pagoFraccionado"]}`.
5. Abrir el formulario en otro navegador o en una ventana privada: *Pago Fraccionado* debe salir atenuado con el aviso.
