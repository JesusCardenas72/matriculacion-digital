import type { IncomingMessage, ServerResponse } from 'http';

// ── Power Automate webhook URLs ───────────────────────────────────────────────

const PA_WEBHOOK_PDF_URL = process.env.PA_WEBHOOK_PDF_URL ??
  'https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b31521c981d04d95a8a6917a899f3988/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=i6YvgMW9GNJO-1Ynz0A3hAiNPGvZVpXkzbsdoeBYsfU';

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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

function extractErrorMessage(status: number, bodyText: string): string {
  if (!bodyText) return `El servicio de Power Automate respondió con HTTP ${status}`;
  try {
    const parsed = JSON.parse(bodyText);
    if (parsed?.error?.message) return parsed.error.message;
    if (parsed?.message) return parsed.message;
    if (parsed?.error_description) return parsed.error_description;
  } catch {
    // no es JSON
  }
  if (bodyText.trim().startsWith('<')) {
    return `El servicio de Power Automate respondió con HTTP ${status} (respuesta HTML inesperada)`;
  }
  const trimmed = bodyText.trim().slice(0, 300);
  return trimmed.length < bodyText.trim().length ? trimmed + '…' : trimmed;
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

    let paRes;
    try {
      paRes = await fetchWithTimeout(PA_WEBHOOK_PDF_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody,
      });
    } catch (netErr: unknown) {
      const msg = netErr instanceof Error ? netErr.message : String(netErr);
      console.error('Error de red al contactar PA_WEBHOOK_PDF_URL:', msg);
      sendJson(res, 502, { ok: false, error: `No se pudo contactar con el servicio de subida de PDF: ${msg}` });
      return;
    }

    const paData = await paRes.text();

    if (paRes.status === 200 || paRes.status === 202) {
      try {
        const parsed = JSON.parse(paData);
        sendJson(res, 200, parsed);
      } catch {
        sendJson(res, 200, { ok: true });
      }
    } else {
      const msg = extractErrorMessage(paRes.status, paData);
      console.error(`Power Automate PDF error ${paRes.status}: ${msg}`);
      sendJson(res, paRes.status, { ok: false, error: msg });
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('upload-pdf error:', msg);
    sendJson(res, 500, { ok: false, error: `Error interno del servidor: ${msg}` });
  }
}
