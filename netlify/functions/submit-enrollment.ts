import type { Handler } from '@netlify/functions';

// ── Mapeos ────────────────────────────────────────────────────────────────────

function buildEnsenanzaCurso(tipoEnsenanza: string, curso: string): string {
  const prefix = tipoEnsenanza === 'elemental' ? 'EE' : tipoEnsenanza === 'profesional' ? 'EP' : '';
  const num = curso.replace(/\D/g, '');
  return prefix && num ? `${prefix}${num}` : '';
}

const REDUCCION_TASAS_MAP: Record<string, string> = {
  ninguna:          'Ninguna',
  fam_num_general:  'Familia Numerosa General',
  fam_num_especial: 'Familia Numerosa Especial',
  discapacidad:     'Discapacidad',
  terrorismo:       'Víctima de Terrorismo',
  violencia_genero: 'Violencia de Género',
  ingreso_minimo:   'Ingreso Mínimo de Solidaridad',
};

const FORMA_PAGO_MAP: Record<string, string> = {
  unico:       'Pago Único',
  fraccionado: 'Pago Fraccionado',
  beca:        'Solicita Beca',
};

// ── Azure AD token ────────────────────────────────────────────────────────────

async function getAzureToken(scope: string): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        scope,
      }).toString(),
    }
  );
  if (!res.ok) throw new Error(`Token error: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// ── Dataverse ─────────────────────────────────────────────────────────────────

const DV_HEADERS = (token: string) => ({
  Authorization:      `Bearer ${token}`,
  'Content-Type':     'application/json',
  'OData-MaxVersion': '4.0',
  'OData-Version':    '4.0',
  Accept:             'application/json',
});

/** Escapa comillas simples para $filter OData. */
function odataEscape(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Comprueba si ya existe una matrícula con el mismo (DNI + especialidad + ensenanzaCurso + cursoAcademico).
 */
async function existsDuplicate(
  token: string,
  entitySet: string,
  dni: string,
  especialidad: string,
  ensenanzaCurso: string,
  academicYear: string
): Promise<boolean> {
  const dataverseUrl = process.env.DATAVERSE_URL!;
  const filter = [
    `cpmmr_dni eq '${odataEscape(dni)}'`,
    `cpmmr_especialidad eq '${odataEscape(especialidad)}'`,
    `cpmmr_ensenanzaycurso eq '${odataEscape(ensenanzaCurso)}'`,
    `cpmmr_cursoacademico eq '${odataEscape(academicYear)}'`,
  ].join(' and ');

  const url = `${dataverseUrl}/api/data/v9.2/${entitySet}?$select=cpmmr_matriculaid&$filter=${encodeURIComponent(filter)}&$top=1`;
  const res = await fetch(url, { headers: DV_HEADERS(token) });
  if (!res.ok) throw new Error(`Dataverse GET duplicados ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { value: unknown[] };
  return (data.value ?? []).length > 0;
}

/**
 * Calcula el siguiente NOrden para (especialidad + ensenanzaCurso + cursoAcademico).
 * Empieza en 1 si no hay ninguno previo en ese curso académico.
 */
async function getNextNOrden(
  token: string,
  entitySet: string,
  especialidad: string,
  ensenanzaCurso: string,
  academicYear: string
): Promise<number> {
  const dataverseUrl = process.env.DATAVERSE_URL!;
  const filter = [
    `cpmmr_especialidad eq '${odataEscape(especialidad)}'`,
    `cpmmr_ensenanzaycurso eq '${odataEscape(ensenanzaCurso)}'`,
    `cpmmr_cursoacademico eq '${odataEscape(academicYear)}'`,
  ].join(' and ');

  const url = `${dataverseUrl}/api/data/v9.2/${entitySet}?$select=cr955_norden&$filter=${encodeURIComponent(filter)}&$orderby=cr955_norden desc&$top=1`;
  const res = await fetch(url, { headers: DV_HEADERS(token) });
  if (!res.ok) throw new Error(`Dataverse GET NOrden ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { value: Array<{ cr955_norden?: number | null }> };
  const last = data.value?.[0]?.cr955_norden ?? 0;
  return (typeof last === 'number' ? last : 0) + 1;
}

/**
 * Crea un registro en Dataverse y devuelve su GUID.
 * El ID se extrae de la cabecera OData-EntityId de la respuesta.
 */
async function createDataverseRecord(
  token: string,
  entitySet: string,
  payload: Record<string, unknown>
): Promise<string> {
  const dataverseUrl = process.env.DATAVERSE_URL!;

  const res = await fetch(`${dataverseUrl}/api/data/v9.2/${entitySet}`, {
    method: 'POST',
    headers: DV_HEADERS(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Dataverse POST ${res.status}: ${await res.text()}`);

  const entityId = res.headers.get('OData-EntityId') ?? '';
  const match = entityId.match(/\(([0-9a-f-]{36})\)/i);
  if (!match) throw new Error(`No se pudo extraer el GUID del registro: ${entityId}`);
  return match[1];
}

// ── CORS ──────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin':  process.env.ALLOWED_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    // Parsear JSON enviado por el formulario
    const f = JSON.parse(event.body ?? '{}') as Record<string, unknown>;

    const str  = (k: string) => String(f[k] ?? '');
    const bool = (k: string) => f[k] === true || f[k] === 'true';

    const ensenanzaCurso = buildEnsenanzaCurso(str('tipoEnsenanza'), str('curso'));
    const especialidad   = str('especialidad');
    const dni            = str('dni');
    const nombre         = str('nombre');
    const apellidos      = str('apellidos');
    const academicYear   = str('academicYear') || `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`;

    // Obtener token Dataverse
    const token      = await getAzureToken(`${process.env.DATAVERSE_URL}/.default`);
    const entitySet  = process.env.DATAVERSE_TABLE_NAME!;

    // 1) Validar duplicados (DNI + especialidad + ensenanzaCurso + cursoAcademico)
    if (dni && especialidad && ensenanzaCurso) {
      const isDup = await existsDuplicate(token, entitySet, dni, especialidad, ensenanzaCurso, academicYear);
      if (isDup) {
        return {
          statusCode: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ok: false,
            reason: 'duplicate',
            contact: {
              phone: '926 274 154',
              email: '13004341.cpm@educastillalamancha.es',
            },
          }),
        };
      }
    }

    // 2) Calcular NOrden correlativo dentro de (especialidad + ensenanzaCurso + cursoAcademico)
    const nOrden = await getNextNOrden(token, entitySet, especialidad, ensenanzaCurso, academicYear);

    // 3) Crear registro principal en Solicitudes de Matrícula
    const rowId = await createDataverseRecord(token, entitySet, {
      cpmmr_nombre:               nombre,
      cpmmr_apellidos:            apellidos,
      cpmmr_nombrematricula:      [apellidos, nombre].filter(Boolean).join(', '),
      cpmmr_dni:                  dni,
      cpmmr_fechanacimiento:      str('fechaNacimiento') || null,
      cpmmr_domicilio:            str('domicilio'),
      cpmmr_localidad:            str('localidad'),
      cpmmr_provincia:            str('provincia'),
      cpmmr_cp:                   str('codigoPostal'),
      cpmmr_email:                str('email'),
      cpmmr_telefono:             str('telefono'),
      cpmmr_horasalida:           str('horaSalidaEstudios'),
      cpmmr_disponibilidadmanana: bool('disponibilidadManana'),
      cpmmr_autorizacionimagen:   bool('autorizacionImagen'),
      cpmmr_ensenanzaycurso:      ensenanzaCurso,
      cpmmr_especialidad:         especialidad,
      cpmmr_reducciontasas:       REDUCCION_TASAS_MAP[str('tipoReduccion')] ?? str('tipoReduccion'),
      cpmmr_formadepago:          FORMA_PAGO_MAP[str('formaPago')] ?? str('formaPago'),
      cpmmr_cursoacademico:       academicYear,
      cr955_norden:               nOrden,
      cr955_convalidacionsolicitada: bool('convalidacionSolicitada'),
      cr955_convalidacionasignaturas: str('convalidacionAsignaturas'),
    });

    // Devolver rowId y nOrden al frontend para la segunda llamada (upload-pdf)
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, rowId, nOrden }),
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
