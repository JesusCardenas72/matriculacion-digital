import type { Handler, HandlerEvent } from '@netlify/functions';
import Busboy from 'busboy';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedFile {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

interface ParsedFormData {
  fields: Record<string, string>;
  files: ParsedFile[];
}

interface DriveItem {
  name: string;
  id: string;
}

interface GraphDrivesResponse {
  value: DriveItem[];
}

interface GraphSiteResponse {
  id: string;
}

interface GraphFolderResponse {
  webUrl: string;
  id: string;
}

// ── Multipart parser ──────────────────────────────────────────────────────────

function parseMultipart(event: HandlerEvent): Promise<ParsedFormData> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: ParsedFile[] = [];

    const contentType = event.headers['content-type'] ?? '';
    const busboy = Busboy({
      headers: { 'content-type': contentType },
      limits: { fileSize: 8 * 1024 * 1024 },
    });

    busboy.on('field', (name: string, value: string) => {
      fields[name] = value;
    });

    busboy.on('file', (_fieldname: string, stream: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        files.push({ filename: info.filename, mimeType: info.mimeType, buffer: Buffer.concat(chunks) });
      });
    });

    busboy.on('finish', () => resolve({ fields, files }));
    busboy.on('error', reject);

    const body = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64')
      : Buffer.from(event.body ?? '', 'utf8');

    (busboy as unknown as NodeJS.WritableStream).write(body);
    (busboy as unknown as NodeJS.WritableStream).end();
  });
}

// ── Campo EnsenanzaCurso y mapeos ─────────────────────────────────────────────

/**
 * Construye el código de enseñanza y curso para Dataverse.
 * Elemental: EE1, EE2, EE3, EE4
 * Profesional: EP1, EP2, EP3, EP4, EP5, EP6
 */
function buildEnsenanzaCurso(tipoEnsenanza: string, curso: string): string {
  const prefix = tipoEnsenanza === 'elemental' ? 'EE' : tipoEnsenanza === 'profesional' ? 'EP' : '';
  const num = curso.replace(/\D/g, ''); // "1º" → "1", "2º" → "2", etc.
  return prefix && num ? `${prefix}${num}` : '';
}

const REDUCCION_TASAS_MAP: Record<string, string> = {
  ninguna: 'Ninguna',
  fam_num_general: 'Familia Numerosa General',
  fam_num_especial: 'Familia Numerosa Especial',
  discapacidad: 'Discapacidad',
  terrorismo: 'Víctima de Terrorismo',
  violencia_genero: 'Violencia de Género',
  ingreso_minimo: 'Ingreso Mínimo de Solidaridad',
};

const FORMA_PAGO_MAP: Record<string, string> = {
  unico: 'Pago Único',
  fraccionado: 'Pago Fraccionado',
  beca: 'Solicita Beca',
};

// ── Azure AD token (reutilizable para Graph y Dataverse) ─────────────────────

async function getAzureToken(scope: string): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID!;
  const clientId = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope,
      }).toString(),
    }
  );
  if (!res.ok) throw new Error(`Token error (scope=${scope}): ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function getAccessToken(): Promise<string> {
  return getAzureToken('https://graph.microsoft.com/.default');
}

async function graphGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Graph GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function graphPost<T>(token: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Graph POST ${path} → ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function graphPutBuffer(token: string, path: string, buffer: Buffer, mimeType: string): Promise<void> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': mimeType },
    body: buffer as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`Graph PUT ${path} → ${res.status}: ${await res.text()}`);
}

// ── SharePoint helpers ────────────────────────────────────────────────────────

async function getSharePointSiteId(token: string, siteUrl: string): Promise<string> {
  const url = new URL(siteUrl);
  // Graph API path format: /sites/{hostname}:{/relative-path}
  const path = `/sites/${url.hostname}:${url.pathname}`;
  const site = await graphGet<GraphSiteResponse>(token, path);
  return site.id;
}

async function getDriveId(token: string, siteId: string, libraryName: string): Promise<string> {
  const data = await graphGet<GraphDrivesResponse>(token, `/sites/${siteId}/drives`);
  const drive = data.value.find(d => d.name === libraryName);
  if (!drive) throw new Error(`Document library "${libraryName}" not found`);
  return drive.id;
}

async function createFolder(
  token: string,
  siteId: string,
  driveId: string,
  folderName: string
): Promise<string> {
  const folder = await graphPost<GraphFolderResponse>(
    token,
    `/sites/${siteId}/drives/${driveId}/root/children`,
    { name: folderName, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' }
  );
  return folder.webUrl;
}

async function uploadFile(
  token: string,
  siteId: string,
  driveId: string,
  folderName: string,
  file: ParsedFile
): Promise<void> {
  const safeFilename = file.filename.replace(/[/\\]/g, '_');
  await graphPutBuffer(
    token,
    `/sites/${siteId}/drives/${driveId}/root:/${folderName}/${safeFilename}:/content`,
    file.buffer,
    file.mimeType
  );
}

async function createListItem(
  token: string,
  siteId: string,
  listName: string,
  fields: Record<string, unknown>
): Promise<void> {
  await graphPost(
    token,
    `/sites/${siteId}/lists/${encodeURIComponent(listName)}/items`,
    { fields }
  );
}

// ── Dataverse helpers ─────────────────────────────────────────────────────────

/**
 * Crea un registro en Dataverse via Web API (OData v4).
 *
 * Variables de entorno necesarias:
 *   DATAVERSE_URL        → URL de tu entorno, ej: https://orgXXXXXX.crm.dynamics.com
 *   DATAVERSE_TABLE_NAME → Nombre del conjunto de entidades (entity set name),
 *                          ej: cpm_matriculas  (plural del nombre lógico de la tabla)
 *
 * Nota sobre prefijo de campos: En Dataverse, los campos personalizados llevan
 * el prefijo del publicador de tu solución (ej: cpm_, new_, etc.).
 * Asegúrate de que los nombres de campo coincidan exactamente con los de tu tabla.
 *
 * Nota sobre campos de tipo Opción (Choice): Si los campos HoraSalida,
 * ReduccionTasas y FormaPago son de tipo Choice en Dataverse, deberás enviar
 * el valor entero de la opción en lugar del string. Crea los campos como
 * "Texto (línea única)" para simplificar, o ajusta los valores aquí.
 */
async function createDataverseRecord(payload: Record<string, unknown>): Promise<void> {
  const dataverseUrl = process.env.DATAVERSE_URL!;
  const tableName = process.env.DATAVERSE_TABLE_NAME!;

  const token = await getAzureToken(`${dataverseUrl}/.default`);

  const res = await fetch(`${dataverseUrl}/api/data/v9.2/${tableName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Dataverse POST error ${res.status}: ${errText}`);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    const { fields, files } = await parseMultipart(event);

    // Build a unique folder name: "APELLIDOS Nombre YYYY-MM-DD HH-MM"
    const now = new Date();
    const dateStr = now.toISOString().substring(0, 16).replace('T', ' ').replace(':', '-');
    const folderName = `${(fields.apellidos ?? 'Desconocido').toUpperCase()} ${fields.nombre ?? ''} ${dateStr}`.trim();

    const token = await getAccessToken();
    const siteUrl = process.env.SHAREPOINT_SITE_URL!;
    const listName = process.env.SHAREPOINT_LIST_NAME!;
    const libraryName = process.env.SHAREPOINT_LIBRARY_NAME!;

    const siteId = await getSharePointSiteId(token, siteUrl);
    const driveId = await getDriveId(token, siteId, libraryName);

    const folderUrl = await createFolder(token, siteId, driveId, folderName);

    for (const file of files) {
      await uploadFile(token, siteId, driveId, folderName, file);
    }

    await createListItem(token, siteId, listName, {
      Title: folderName,
      Nombre: fields.nombre ?? '',
      Apellidos: fields.apellidos ?? '',
      DNI: fields.dni ?? '',
      FechaNacimiento: fields.fechaNacimiento ?? '',
      Domicilio: fields.domicilio ?? '',
      Localidad: fields.localidad ?? '',
      Provincia: fields.provincia ?? '',
      CodigoPostal: fields.codigoPostal ?? '',
      Email: fields.email ?? '',
      Telefono: fields.telefono ?? '',
      HoraSalidaEstudios: fields.horaSalidaEstudios ?? '',
      DisponibilidadManana: fields.disponibilidadManana === 'true',
      AutorizacionImagen: fields.autorizacionImagen === 'true',
      Tutor1Nombre: fields.tutor1Nombre ?? '',
      Tutor1DNI: fields.tutor1Dni ?? '',
      Tutor2Nombre: fields.tutor2Nombre ?? '',
      Tutor2DNI: fields.tutor2Dni ?? '',
      TipoEnsenanza: fields.tipoEnsenanza ?? '',
      Curso: fields.curso ?? '',
      Especialidad: fields.especialidad ?? '',
      AsignaturaPendiente1: fields.asignaturaPendiente1 ?? '',
      AsignaturaPendiente2: fields.asignaturaPendiente2 ?? '',
      PerfilProfesional: fields.perfilProfesional ?? '',
      FormaPago: fields.formaPago ?? '',
      FamiliaNumerosa: fields.familiaNumerosa === 'true',
      TipoReduccion: fields.tipoReduccion ?? '',
      MatriculaHonor: fields.matriculaHonor === 'true',
      EsPrimerAno: fields.esPrimerAno === 'true',
      ImporteTotal: parseFloat(fields.importeTotal ?? '0') || 0,
      Importe1erPago: parseFloat(fields.importe1erPago ?? '0') || 0,
      Importe2oPago: parseFloat(fields.importe2oPago ?? '0') || 0,
      CarpetaDocumentos: folderUrl,
      FechaEnvio: now.toISOString(),
      Estado: 'Pendiente',
    });

    // ── Exportar a Dataverse ──────────────────────────────────────────────────
    // Solo se ejecuta si DATAVERSE_URL y DATAVERSE_TABLE_NAME están configuradas.
    // Si Dataverse falla, se registra el error pero NO se interrumpe la respuesta
    // al alumno (SharePoint ya tiene el registro guardado).
    if (process.env.DATAVERSE_URL && process.env.DATAVERSE_TABLE_NAME) {
      try {
        // IMPORTANTE: Sustituye el prefijo "cpm_" por el de tu publicador en Dataverse.
        // Para verlo: Power Apps → Soluciones → tu solución → Publicador.
        const ensenanzaCurso = buildEnsenanzaCurso(
          fields.tipoEnsenanza ?? '',
          fields.curso ?? ''
        );

        await createDataverseRecord({
          cpmmr_nombre:               fields.nombre ?? '',
          cpmmr_apellidos:            fields.apellidos ?? '',
          cpmmr_dni:                  fields.dni ?? '',
          // Dataverse espera fecha ISO 8601 (YYYY-MM-DD) para campos Solo fecha.
          // Si el campo está vacío enviamos null para no romper la validación.
          cpmmr_fechanacimiento:      fields.fechaNacimiento || null,
          cpmmr_domicilio:            fields.domicilio ?? '',
          cpmmr_localidad:            fields.localidad ?? '',
          cpmmr_provincia:            fields.provincia ?? '',
          cpmmr_cp:                   fields.codigoPostal ?? '',
          cpmmr_email:                fields.email ?? '',
          cpmmr_telefono:             fields.telefono ?? '',
          cpmmr_horasalida:           fields.horaSalidaEstudios ?? '',
          cpmmr_disponibilidadmanana: fields.disponibilidadManana === 'true',
          cpmmr_autorizacionimagen:   fields.autorizacionImagen === 'true',
          cpmmr_ensenanzacurso:       ensenanzaCurso,
          cpmmr_especialidad:         fields.especialidad ?? '',
          cpmmr_reducciontasas:       REDUCCION_TASAS_MAP[fields.tipoReduccion ?? ''] ?? fields.tipoReduccion ?? '',
          cpmmr_formapago:            FORMA_PAGO_MAP[fields.formaPago ?? ''] ?? fields.formaPago ?? '',
        });
      } catch (dvErr) {
        // El error de Dataverse no bloquea la respuesta al usuario.
        console.error('Dataverse export error (non-blocking):', dvErr);
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('submit-enrollment error:', err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(err) }),
    };
  }
};
