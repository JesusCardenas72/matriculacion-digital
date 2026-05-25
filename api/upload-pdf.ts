import type { Request, Response } from 'express';

// ── Azure AD token ────────────────────────────────────────────────────────────

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

// ── Dataverse: subir archivo a columna tipo File ──────────────────────────────

async function uploadDataverseFile(
  token: string,
  rowId: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<void> {
  const dataverseUrl = process.env.DATAVERSE_URL!;
  const tableName    = process.env.DATAVERSE_TABLE_NAME!;
  const columnName   = process.env.DATAVERSE_FILE_COLUMN ?? 'cpmmr_solicitudpdf';

  const res = await fetch(
    `${dataverseUrl}/api/data/v9.2/${tableName}(${rowId})/${columnName}`,
    {
      method: 'PATCH',
      headers: {
        Authorization:    `Bearer ${token}`,
        'Content-Type':   'application/octet-stream',
        'x-ms-file-name': fileName,
        'OData-MaxVersion': '4.0',
        'OData-Version':    '4.0',
      },
      body: fileBuffer as unknown as BodyInit,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Dataverse file upload ${res.status}: ${err}`);
  }
}

// ── Dataverse: crear registros de asignaturas matriculadas ───────────────────

interface Materia {
  MATERIA: string;
  DESCRIPCION: string;
  ABREVIATURA: string;
  CURSO_N: string;
  ENSEÑANZAS: string;
  ESPECIALIDAD: string;
}

// Valores de la choice cr955_estadoasignatura en Dataverse
const ESTADO_ASIGNATURA = {
  MATRICULADA:  904390000,
  CONVALIDADA:  904390001,
  SIMULTANEADA: 904390002,
} as const;

async function createAsignaturaRecords(
  token: string,
  matriculaId: string,
  asignaturas: Materia[],
  tipo: 'Ordinaria' | 'Pendiente',
  nOrden: number | null
): Promise<void> {
  const dataverseUrl = process.env.DATAVERSE_URL!;

  const estadoChoice = ESTADO_ASIGNATURA.MATRICULADA;

  for (const m of asignaturas) {
    const payload: Record<string, unknown> = {
      cr955_codigomateria:   m.MATERIA,
      cr955_name:            m.DESCRIPCION,
      cr955_asignatura:      `${m.DESCRIPCION} — ${m.CURSO_N} ${m.ENSEÑANZAS} (${tipo})`,
      cr955_estadoasignatura: estadoChoice,
      'cr955_Matricula@odata.bind': `/cpmmr_matriculas(${matriculaId})`,
    };
    if (nOrden !== null && !Number.isNaN(nOrden)) {
      payload.cr955_norden = nOrden;
    }

    const res = await fetch(`${dataverseUrl}/api/data/v9.2/cr955_matriculaasignaturas`, {
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
      const err = await res.text();
      console.error(`Error creando asignatura ${m.MATERIA} (${tipo}): ${res.status} ${err}`);
    }
  }
}

// ── Graph: enviar email con PDF adjunto ───────────────────────────────────────

interface EmailData {
  to: string;
  nombre: string;
  apellidos: string;
  dni: string;
  fechaNacimiento: string;
  domicilio: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  telefono: string;
  horaSalidaEstudios: string;
  tipoCurso: string;
  especialidad: string;
  asignaturaPendiente1: string;
  asignaturaPendiente2: string;
  perfil: string;
  formaPago: string;
  reduccion: string;
  importeTotal: string;
  importe1erPago: string;
  importe2oPago: string;
  academicYear: string;
  fileName: string;
  contentBase64: string;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function sendEmailWithPdf(token: string, data: EmailData): Promise<void> {
  const sender = process.env.GRAPH_SENDER_EMAIL!;

  const html = `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;max-width:680px;margin:0 auto">

  <div style="background:#1e40af;padding:20px 24px;border-radius:8px 8px 0 0">
    <p style="color:#ffffff;font-size:18px;font-weight:bold;margin:0">Conservatorio Profesional de Música "Marcos Redondo"</p>
    <p style="color:#bfdbfe;font-size:13px;margin:4px 0 0">Ciudad Real</p>
  </div>

  <div style="background:#f0fdf4;border:1px solid #86efac;padding:16px 24px;margin:0">
    <p style="margin:0;font-size:15px">✅ Estimado/a <b>${data.nombre} ${data.apellidos}</b>,</p>
    <p style="margin:8px 0 0;color:#166534">Hemos recibido correctamente tu solicitud de matrícula. A continuación tienes el resumen de los datos enviados. Consérvalo como justificante.</p>
  </div>

  <div style="padding:16px 24px 0">
    <p style="font-size:11px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:10px">Datos Personales</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:6px 8px;color:#6b7280;width:40%">Nombre y apellidos</td><td style="padding:6px 8px;font-weight:bold">${data.nombre} ${data.apellidos}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:6px 8px;color:#6b7280">DNI / NIE</td><td style="padding:6px 8px">${data.dni}</td></tr>
      <tr><td style="padding:6px 8px;color:#6b7280">Fecha de nacimiento</td><td style="padding:6px 8px">${formatDate(data.fechaNacimiento)}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:6px 8px;color:#6b7280">Domicilio</td><td style="padding:6px 8px">${data.domicilio}</td></tr>
      <tr><td style="padding:6px 8px;color:#6b7280">Localidad</td><td style="padding:6px 8px">${data.localidad} (${data.provincia}) — CP ${data.codigoPostal}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:6px 8px;color:#6b7280">Email</td><td style="padding:6px 8px">${data.to}</td></tr>
      <tr><td style="padding:6px 8px;color:#6b7280">Teléfono</td><td style="padding:6px 8px">${data.telefono}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:6px 8px;color:#6b7280">Hora salida estudios</td><td style="padding:6px 8px">${data.horaSalidaEstudios}</td></tr>
    </table>
  </div>

  <div style="padding:16px 24px 0">
    <p style="font-size:11px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:10px">Datos de Matriculación</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:6px 8px;color:#6b7280;width:40%">Curso académico</td><td style="padding:6px 8px;font-weight:bold">${data.academicYear}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:6px 8px;color:#6b7280;width:40%">Tipo / Curso</td><td style="padding:6px 8px">${data.tipoCurso}</td></tr>
      <tr><td style="padding:6px 8px;color:#6b7280">Especialidad</td><td style="padding:6px 8px;font-weight:bold">${data.especialidad}</td></tr>
      ${data.asignaturaPendiente1 ? `<tr style="background:#f9fafb"><td style="padding:6px 8px;color:#6b7280">Asignatura pendiente 1</td><td style="padding:6px 8px">${data.asignaturaPendiente1}</td></tr>` : ''}
      ${data.asignaturaPendiente2 ? `<tr><td style="padding:6px 8px;color:#6b7280">Asignatura pendiente 2</td><td style="padding:6px 8px">${data.asignaturaPendiente2}</td></tr>` : ''}
      ${data.perfil ? `<tr style="background:#f9fafb"><td style="padding:6px 8px;color:#6b7280">Perfil profesional</td><td style="padding:6px 8px">${data.perfil}</td></tr>` : ''}
    </table>
  </div>

  <div style="padding:16px 24px 0">
    <p style="font-size:11px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:10px">Forma de Pago</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:6px 8px;color:#6b7280;width:40%">Modalidad</td><td style="padding:6px 8px">${data.formaPago}</td></tr>
      ${data.reduccion ? `<tr style="background:#f9fafb"><td style="padding:6px 8px;color:#6b7280">Reducción aplicada</td><td style="padding:6px 8px">${data.reduccion}</td></tr>` : ''}
      <tr><td style="padding:6px 8px;color:#6b7280">Importe total</td><td style="padding:6px 8px;font-weight:bold;font-size:15px">${data.importeTotal}</td></tr>
      ${data.importe1erPago ? `<tr style="background:#f9fafb"><td style="padding:6px 8px;color:#6b7280">1er pago</td><td style="padding:6px 8px">${data.importe1erPago}</td></tr>` : ''}
      ${data.importe2oPago ? `<tr><td style="padding:6px 8px;color:#6b7280">2º pago</td><td style="padding:6px 8px">${data.importe2oPago}</td></tr>` : ''}
    </table>
  </div>

  <div style="background:#f3f4f6;padding:16px 24px;margin-top:20px;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;font-size:12px;color:#6b7280">
    <p style="margin:0">Si tienes cualquier duda, puedes contactarnos en:</p>
    <p style="margin:6px 0 0">📞 <b>926 27 41 54</b> &nbsp;|&nbsp; ✉️ <a href="mailto:13004341.cpm@educastillalamancha.es" style="color:#1e40af">13004341.cpm@educastillalamancha.es</a></p>
    <p style="margin:10px 0 0">Un saludo,<br><b>Secretaría del CPM "Marcos Redondo"</b> — Ciudad Real</p>
  </div>

</div>`.trim();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: 'Solicitud de matrícula RECIBIDA — CPM Marcos Redondo (Ciudad Real)',
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: data.to } }],
          attachments: [{
            '@odata.type': '#microsoft.graph.fileAttachment',
            name:          data.fileName,
            contentType:   'application/pdf',
            contentBytes:  data.contentBase64,
          }],
        },
        saveToSentItems: true,
      }),
    }
  );

  if (!res.ok) throw new Error(`Graph sendMail ${res.status}: ${await res.text()}`);
}

// ── CORS ──────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
const corsHeaders = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Helpers para body compatible dev/prod ─────────────────────────────────────

function getJsonBody(req: Request): Record<string, unknown> {
  if (Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString('utf-8') || '{}');
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body || '{}');
  }
  return (req.body as Record<string, unknown>) || {};
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: Request, res: Response): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders).end();
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, corsHeaders).end('Method Not Allowed');
    return;
  }

  try {
    const rawBody = getJsonBody(req);
    const body: Record<string, string> = Object.fromEntries(
      Object.entries(rawBody).map(([k, v]) => [k, v == null ? '' : String(v)])
    );

    const { rowId, fileName, contentBase64, email } = body;

    if (!rowId || !fileName || !contentBase64 || !email) {
      res.writeHead(400, corsHeaders)
         .end(JSON.stringify({ ok: false, error: 'Faltan campos obligatorios' }));
      return;
    }

    const asignaturasCursoActual: Materia[] = body.asignaturasCursoActual
      ? (JSON.parse(body.asignaturasCursoActual) as Materia[])
      : [];
    const asignaturasPendientes: Materia[] = body.asignaturasPendientes
      ? (JSON.parse(body.asignaturasPendientes) as Materia[])
      : [];

    const nOrdenParsed = body.nOrden ? Number(body.nOrden) : NaN;
    const nOrden = Number.isFinite(nOrdenParsed) ? nOrdenParsed : null;

    const fileBuffer = Buffer.from(contentBase64, 'base64');

    // Obtener tokens en paralelo
    const [dvToken, graphToken] = await Promise.all([
      getAzureToken(`${process.env.DATAVERSE_URL!}/.default`),
      getAzureToken('https://graph.microsoft.com/.default'),
    ]);

    // Subir PDF a Dataverse y enviar email en paralelo
    await Promise.all([
      uploadDataverseFile(dvToken, rowId, fileName, fileBuffer),
      sendEmailWithPdf(graphToken, {
        to:                 email,
        nombre:             body.nombre             ?? '',
        apellidos:          body.apellidos          ?? '',
        dni:                body.dni                ?? '',
        fechaNacimiento:    body.fechaNacimiento     ?? '',
        domicilio:          body.domicilio           ?? '',
        localidad:          body.localidad           ?? '',
        provincia:          body.provincia           ?? '',
        codigoPostal:       body.codigoPostal        ?? '',
        telefono:           body.telefono            ?? '',
        horaSalidaEstudios: body.horaSalidaEstudios  ?? '',
        tipoCurso:          body.tipoCurso           ?? '',
        especialidad:       body.especialidad        ?? '',
        asignaturaPendiente1: body.asignaturaPendiente1 ?? '',
        asignaturaPendiente2: body.asignaturaPendiente2 ?? '',
        perfil:             body.perfil              ?? '',
        formaPago:          body.formaPago           ?? '',
        reduccion:          body.reduccion           ?? '',
        importeTotal:       body.importeTotal        ?? '',
        importe1erPago:     body.importe1erPago      ?? '',
        importe2oPago:      body.importe2oPago       ?? '',
        academicYear:       body.academicYear        ?? `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`,
        fileName,
        contentBase64,
      }),
    ]);

    // Crear registros en cr955_matriculaasignatura (no bloquea si falla)
    if (process.env.DATAVERSE_URL && process.env.DATAVERSE_TABLE_NAME) {
      try {
        await Promise.all([
          createAsignaturaRecords(dvToken, rowId, asignaturasCursoActual, 'Ordinaria', nOrden),
          createAsignaturaRecords(dvToken, rowId, asignaturasPendientes, 'Pendiente', nOrden),
        ]);
      } catch (asigErr) {
        console.error('Error creando asignaturas en Dataverse (non-blocking):', asigErr);
      }
    }

    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' })
       .end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error('upload-pdf error:', err);
    res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' })
       .end(JSON.stringify({ ok: false, error: String(err) }));
  }
}
