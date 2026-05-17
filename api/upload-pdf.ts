import type { Request, Response } from 'express';

/**
 * Vercel API Route (también compatible con dev-api.ts Express).
 * Proxy seguro: reenvía el body a Power Automate para la subida del PDF,
 * usando la URL almacenada en variable de entorno del servidor.
 */
export default async function handler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const paUrl = process.env.POWER_AUTOMATE_PDF_WEBHOOK_URL;
  if (!paUrl) {
    return res.status(500).json({ ok: false, error: 'POWER_AUTOMATE_PDF_WEBHOOK_URL no configurado' });
  }

  try {
    const paRes = await fetch(paUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const paData = await paRes.json().catch(() => ({}));

    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(paRes.status).json(paData);
  } catch (err) {
    console.error('api/upload-pdf proxy error:', err);
    return res.status(500).json({ ok: false, error: 'Error interno del proxy' });
  }
}
