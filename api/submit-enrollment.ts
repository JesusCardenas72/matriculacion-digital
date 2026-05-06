export default async function handler(req: Request) {
  const POWER_AUTOMATE_WEBHOOK_URL = process.env.POWER_AUTOMATE_WEBHOOK_URL;

  if (!POWER_AUTOMATE_WEBHOOK_URL) {
    return new Response(JSON.stringify({ error: 'Power Automate URL not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const response = await fetch(POWER_AUTOMATE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error forwarding to Power Automate' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}