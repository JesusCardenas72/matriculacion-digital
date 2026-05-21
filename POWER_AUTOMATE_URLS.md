# URLs de Power Automate

## Configuración para Vercel

### Variables de entorno

| Variable | Valor |
|----------|-------|
| `POWER_AUTOMATE_WEBHOOK_URL` | `https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ec7a2a1c67974d32ba23de811d20e93d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3G39Rx3ZC55SKVIoBGvRufw-d6J6fYl74GOi46We9f0` |
| `POWER_AUTOMATE_PDF_WEBHOOK_URL` | `https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b31521c981d04d95a8a6917a899f3988/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=i6YvgMW9GNJO-1Ynz0A3hAiNPGvZVpXkzbsdoeBYsfU` |

## Cómo obtener estas URLs

1. Ve a Power Automate → tus flujos
2. En cada flujo, selecciona el trigger "HTTP request received"
3. Copia la **Webhook URL** mostrada

## Configuración en Vercel

1. Ve a Vercel Dashboard → tu proyecto
2. Settings → Environment Variables
3. Añade las dos variables con los valores de arriba
4. Redeploy el proyecto