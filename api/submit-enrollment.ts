import type { IncomingMessage, ServerResponse } from 'http';

// ── Power Automate webhook URLs ───────────────────────────────────────────────

const PA_WEBHOOK_DUPLICADOS_URL = process.env.PA_WEBHOOK_DUPLICADOS_URL ??
  'https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b62c3d4b21d24bda8daa75a8586198eb/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=4nqPljifCY1CBxAiKj03La2YEksNn78meKn9-nlXGCk';

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

// fetch con timeout para evitar colgados indefinidos
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 20000) {
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
  // Intentar extraer mensaje de error de Power Automate
  try {
    const parsed = JSON.parse(bodyText);
    if (parsed?.error?.message) return parsed.error.message;
    if (parsed?.message) return parsed.message;
    if (parsed?.error_description) return parsed.error_description;
  } catch {
    // no es JSON
  }
  // Si parece HTML, devolver solo el status
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
    const body = JSON.parse(rawBody) as Record<string, unknown>;

    // ── Paso 1: comprobar duplicados y obtener nOrden ─────────────────────────
    let dupRes;
    try {
      dupRes = await fetchWithTimeout(PA_WEBHOOK_DUPLICADOS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:        body.nombre,
          apellidos:     body.apellidos,
          dni:           body.dni,
          especialidad:  body.especialidad,
          tipoEnsenanza: body.tipoEnsenanza,
          curso:         body.curso,
          academicYear:  body.academicYear,
        }),
      });
    } catch (netErr: unknown) {
      const msg = netErr instanceof Error ? netErr.message : String(netErr);
      console.error('Error de red al contactar PA_WEBHOOK_DUPLICADOS_URL:', msg);
      sendJson(res, 502, { ok: false, error: `No se pudo contactar con el servicio de duplicados: ${msg}` });
      return;
    }

    if (dupRes.status === 409) {
      const dupData = await dupRes.text();
      try {
        sendJson(res, 409, JSON.parse(dupData));
      } catch {
        sendJson(res, 409, { ok: false, reason: 'duplicate' });
      }
      return;
    }

    if (!dupRes.ok) {
      const errText = await dupRes.text();
      const msg = extractErrorMessage(dupRes.status, errText);
      console.error(`Duplicados+NOrden error ${dupRes.status}: ${msg}`);
      sendJson(res, dupRes.status, { ok: false, error: msg });
      return;
    }

    const dupData = await dupRes.json() as { ok?: boolean; requestNumber?: string };
    // requestNumber tiene formato "YYYY-YYYY+1-N" (ej. "2026-2027-5")
    const requestNumber = dupData.requestNumber ?? '';
    const parts = requestNumber.split('-');
    const nOrden = parseInt(parts[parts.length - 1] ?? '1', 10) || 1;

    // ── Paso 2: crear el registro con el nOrden calculado ─────────────────────
    let paRes;
    try {
      paRes = await fetchWithTimeout(PA_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, nOrden: String(nOrden) }),
      });
    } catch (netErr: unknown) {
      const msg = netErr instanceof Error ? netErr.message : String(netErr);
      console.error('Error de red al contactar PA_WEBHOOK_URL:', msg);
      sendJson(res, 502, { ok: false, error: `No se pudo contactar con el servicio de creación de registro: ${msg}` });
      return;
    }

    const paData = await paRes.text();

    if (paRes.status === 200 || paRes.status === 202) {
      try {
        const parsed = JSON.parse(paData) as { rowId?: string };
        sendJson(res, 200, { ok: true, rowId: parsed.rowId, nOrden });
      } catch {
        sendJson(res, 200, { ok: true, nOrden });
      }
    } else {
      const msg = extractErrorMessage(paRes.status, paData);
      console.error(`Power Automate error ${paRes.status}: ${msg}`);
      sendJson(res, paRes.status, { ok: false, error: msg });
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('submit-enrollment error:', msg);
    sendJson(res, 500, { ok: false, error: `Error interno del servidor: ${msg}` });
  }
}
