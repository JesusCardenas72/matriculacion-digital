import type { Handler } from '@netlify/functions';

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

// ── Graph: enviar email con PDF adjunto ───────────────────────────────────────

async function sendEmailWithPdf(
  token: string,
  to: string,
  nombre: string,
  apellidos: string,
  fileName: string,
  contentBase64: string
): Promise<void> {
  const sender = process.env.GRAPH_SENDER_EMAIL!;

  const html = `
<p>Estimado/a <b>${nombre} ${apellidos}</b>,</p>
<p>Hemos recibido correctamente tu solicitud de matrícula en el
<b>Conservatorio Profesional de Música "Marcos Redondo"</b> de Ciudad Real.</p>
<p>Adjunto encontrarás el resguardo en PDF. Consérvalo como justificante.</p>
<p>Si tienes cualquier duda, puedes contactarnos en:<br>
📞 926 27 41 54<br>
✉️ <a href="mailto:13004341.cpm@educastillalamancha.es">13004341.cpm@educastillalamancha.es</a></p>
<br>
<p>Un saludo,<br>
<b>Secretaría del CPM "Marcos Redondo"</b><br>
Ciudad Real</p>`.trim();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: 'Solicitud de matrícula RECIBIDA — CPM Marcos Redondo (Ciudad Real)',
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }],
          attachments: [{
            '@odata.type': '#microsoft.graph.fileAttachment',
            name:          fileName,
            contentType:   'application/pdf',
            contentBytes:  contentBase64,   // base64 puro — Graph lo decodifica correctamente
          }],
        },
        saveToSentItems: true,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph sendMail ${res.status}: ${err}`);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
const corsHeaders = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
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
    const { rowId, fileName, contentBase64, nombre, apellidos, email } =
      JSON.parse(event.body ?? '{}') as {
        rowId: string; fileName: string; contentBase64: string;
        nombre: string; apellidos: string; email: string;
      };

    if (!rowId || !fileName || !contentBase64 || !email) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: 'Faltan campos obligatorios' }),
      };
    }

    const fileBuffer = Buffer.from(contentBase64, 'base64');

    // Obtener tokens en paralelo
    const [dvToken, graphToken] = await Promise.all([
      getAzureToken(`${process.env.DATAVERSE_URL!}/.default`),
      getAzureToken('https://graph.microsoft.com/.default'),
    ]);

    // Subir PDF a Dataverse y enviar email en paralelo
    await Promise.all([
      uploadDataverseFile(dvToken, rowId, fileName, fileBuffer),
      sendEmailWithPdf(graphToken, email, nombre, apellidos, fileName, contentBase64),
    ]);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('upload-pdf error:', err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(err) }),
    };
  }
};
