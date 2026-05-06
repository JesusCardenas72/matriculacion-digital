import type { IncomingMessage, ServerResponse } from 'http';

// ── Power Automate webhook URLs ───────────────────────────────────────────────

const PA_WEBHOOK_URL = process.env.PA_WEBHOOK_DATOS_URL ??
  'https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ec7a2a1c67974d32ba23de811d20e93d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3G39Rx3ZC55SKVIoBGvRufw-d6J6fYl74GOi46We9f0';

// ── Helpers ───────────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  try {
    const rawBody = await readBody(req);

    // Reenviar tal cual al webhook de Power Automate
    const paRes = await fetch(PA_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rawBody,
    });

    const paData = await paRes.text();

    // Power Automate devuelve 200 con { ok, rowId, nOrden } o 202 si está procesando
    if (paRes.status === 200 || paRes.status === 202) {
      // Intentar parsear la respuesta de PA
      try {
        const parsed = JSON.parse(paData);
        sendJson(res, 200, parsed);
      } catch {
        // Si PA no devuelve JSON válido, devolver éxito genérico
        sendJson(res, 200, { ok: true });
      }
    } else if (paRes.status === 409) {
      sendJson(res, 409, JSON.parse(paData));
    } else {
      console.error(`Power Automate error ${paRes.status}: ${paData}`);
      sendJson(res, paRes.status, { ok: false, error: paData });
    }

  } catch (err) {
    console.error('submit-enrollment error:', err);
    sendJson(res, 500, { ok: false, error: String(err) });
  }
}
