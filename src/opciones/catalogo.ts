import type { EnrollmentFormData } from '../types';

/**
 * Catálogo de opciones del formulario que se pueden desactivar desde el
 * modo administrador (escribir "cpmadmin" fuera de cualquier campo).
 *
 * La desactivación es SOLO VISUAL: la opción aparece atenuada con el aviso
 * "No disponible en este momento" y no se puede seleccionar. No hay ninguna
 * validación en el servidor.
 *
 * La configuración se guarda en Dataverse mediante dos flujos de Power
 * Automate (ver docs/opciones-formulario-power-automate.md).
 */

// ── Endpoints de Power Automate ──────────────────────────────────────────────
// URLs de los triggers HTTP de los dos flujos (PublicLeerOpciones y
// PublicGuardarOpciones). Si se vacían, el formulario muestra todas las
// opciones y el modo administrador avisa de que no se puede guardar.
export const PA_OPCIONES_LEER_URL = 'https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/30/workflows/4b7e1466b02e484ebfd98477577df100/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=qiSYrfHrd0fCK-Wa3ImXxQUpJ_SWwY_jGGkDiI2u8_Y';
export const PA_OPCIONES_GUARDAR_URL = 'https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/30/workflows/9a162eeaa7e741c186740bbfdaca9417/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=RWbcWuF_UVMrSGKzMRtq70hQdyAs3FWIIg060wGXYmw';

export type SeccionOpcion = 'matriculacion' | 'pago';

export interface OpcionDef {
  key: string;
  label: string;
  seccion: SeccionOpcion;
  grupo: string;
}

export const OPCIONES_CATALOGO = [
  // ── Datos de Matriculación ──
  { key: 'ensenanzaElemental',   label: 'Enseñanza Elemental',   seccion: 'matriculacion', grupo: 'Tipo de enseñanza' },
  { key: 'ensenanzaProfesional', label: 'Enseñanza Profesional', seccion: 'matriculacion', grupo: 'Tipo de enseñanza' },
  { key: 'cursoEE1', label: '1º Elemental',   seccion: 'matriculacion', grupo: 'Cursos' },
  { key: 'cursoEE2', label: '2º Elemental',   seccion: 'matriculacion', grupo: 'Cursos' },
  { key: 'cursoEE3', label: '3º Elemental',   seccion: 'matriculacion', grupo: 'Cursos' },
  { key: 'cursoEE4', label: '4º Elemental',   seccion: 'matriculacion', grupo: 'Cursos' },
  { key: 'cursoEP1', label: '1º Profesional', seccion: 'matriculacion', grupo: 'Cursos' },
  { key: 'cursoEP2', label: '2º Profesional', seccion: 'matriculacion', grupo: 'Cursos' },
  { key: 'cursoEP3', label: '3º Profesional', seccion: 'matriculacion', grupo: 'Cursos' },
  { key: 'cursoEP4', label: '4º Profesional', seccion: 'matriculacion', grupo: 'Cursos' },
  { key: 'cursoEP5', label: '5º Profesional', seccion: 'matriculacion', grupo: 'Cursos' },
  { key: 'cursoEP6', label: '6º Profesional', seccion: 'matriculacion', grupo: 'Cursos' },
  { key: 'repetidor',             label: 'Repetidor',                     seccion: 'matriculacion', grupo: 'Otras opciones' },
  { key: 'asignaturasPendientes', label: 'Asignaturas pendientes',        seccion: 'matriculacion', grupo: 'Otras opciones' },
  { key: 'convalidacion',         label: 'Convalidación de asignaturas',  seccion: 'matriculacion', grupo: 'Otras opciones' },
  { key: 'perfilA', label: 'Perfil A', seccion: 'matriculacion', grupo: 'Perfiles (5º y 6º Profesional)' },
  { key: 'perfilB', label: 'Perfil B', seccion: 'matriculacion', grupo: 'Perfiles (5º y 6º Profesional)' },
  { key: 'perfilC', label: 'Perfil C', seccion: 'matriculacion', grupo: 'Perfiles (5º y 6º Profesional)' },
  { key: 'espCanto',           label: 'Canto',            seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espClarinete',       label: 'Clarinete',        seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espContrabajo',      label: 'Contrabajo',       seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espFagot',           label: 'Fagot',            seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espFlautaTravesera', label: 'Flauta Travesera', seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espGuitarra',        label: 'Guitarra',         seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espOboe',            label: 'Oboe',             seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espPercusion',       label: 'Percusión',        seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espPiano',           label: 'Piano',            seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espSaxofon',         label: 'Saxofón',          seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espTrombon',         label: 'Trombón',          seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espTrompa',          label: 'Trompa',           seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espTrompeta',        label: 'Trompeta',         seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espTuba',            label: 'Tuba',             seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espViola',           label: 'Viola',            seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espViolin',          label: 'Violín',           seccion: 'matriculacion', grupo: 'Especialidades' },
  { key: 'espVioloncello',     label: 'Violoncello',      seccion: 'matriculacion', grupo: 'Especialidades' },
  // ── Forma de Pago ──
  { key: 'primerAno',       label: 'Primer año en el centro (apertura de expediente)', seccion: 'pago', grupo: 'Apertura de expediente' },
  { key: 'pagoUnico',       label: 'Pago Único',       seccion: 'pago', grupo: 'Forma de pago' },
  { key: 'pagoFraccionado', label: 'Pago Fraccionado', seccion: 'pago', grupo: 'Forma de pago' },
  { key: 'beca',            label: 'Solicita Beca',    seccion: 'pago', grupo: 'Forma de pago' },
  { key: 'reduccionFamNumGeneral',  label: 'Familia Numerosa General',        seccion: 'pago', grupo: 'Reducciones y exenciones' },
  { key: 'reduccionFamNumEspecial', label: 'Familia Numerosa Especial',       seccion: 'pago', grupo: 'Reducciones y exenciones' },
  { key: 'reduccionDiscapacidad',   label: 'Discapacidad ≥ 33%',              seccion: 'pago', grupo: 'Reducciones y exenciones' },
  { key: 'reduccionTerrorismo',     label: 'Víctima de Terrorismo',           seccion: 'pago', grupo: 'Reducciones y exenciones' },
  { key: 'reduccionViolencia',      label: 'Víctima de Violencia de Género',  seccion: 'pago', grupo: 'Reducciones y exenciones' },
  { key: 'reduccionIngresoMinimo',  label: 'Ingreso Mínimo de Solidaridad',   seccion: 'pago', grupo: 'Reducciones y exenciones' },
  { key: 'matriculaHonor',          label: 'Matrícula de Honor',              seccion: 'pago', grupo: 'Reducciones y exenciones' },
] as const satisfies readonly OpcionDef[];

export type OpcionKey = (typeof OPCIONES_CATALOGO)[number]['key'];

/** `true` = visible y seleccionable; `false` = atenuada y bloqueada. */
export type OpcionesConfig = Record<OpcionKey, boolean>;

export const OPCIONES_POR_DEFECTO: OpcionesConfig = Object.fromEntries(
  OPCIONES_CATALOGO.map(o => [o.key, true]),
) as OpcionesConfig;

/**
 * Convierte lo que venga de Dataverse (o de la caché local) en una
 * configuración completa. Solo un `false` explícito desactiva una opción:
 * claves ausentes, desconocidas o con otro tipo de valor se ignoran, de modo
 * que una opción nueva añadida al catálogo aparece activada por defecto.
 */
export function normalizarOpciones(raw: unknown): OpcionesConfig {
  let obj = raw;
  if (typeof obj === 'string') {
    try { obj = JSON.parse(obj); } catch { obj = null; }
  }
  const result = { ...OPCIONES_POR_DEFECTO };
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const o of OPCIONES_CATALOGO) {
      if ((obj as Record<string, unknown>)[o.key] === false) result[o.key] = false;
    }
  }
  return result;
}

// ── Mapeos entre valores del formulario y claves del catálogo ───────────────

export function cursoOpcionKey(tipoEnsenanza: string, curso: string): OpcionKey | null {
  const n = parseInt(curso, 10);
  if (tipoEnsenanza === 'elemental' && n >= 1 && n <= 4) return `cursoEE${n}` as OpcionKey;
  if (tipoEnsenanza === 'profesional' && n >= 1 && n <= 6) return `cursoEP${n}` as OpcionKey;
  return null;
}

export const ENSENANZA_OPCION: Record<'elemental' | 'profesional', OpcionKey> = {
  elemental: 'ensenanzaElemental',
  profesional: 'ensenanzaProfesional',
};

export const PERFIL_OPCION: Record<string, OpcionKey> = {
  A: 'perfilA',
  B: 'perfilB',
  C: 'perfilC',
};

/** Especialidades en el orden en que aparecen en el selector, con su clave del catálogo. */
export const ESPECIALIDAD_OPCION = {
  'Canto': 'espCanto',
  'Clarinete': 'espClarinete',
  'Contrabajo': 'espContrabajo',
  'Fagot': 'espFagot',
  'Flauta Travesera': 'espFlautaTravesera',
  'Guitarra': 'espGuitarra',
  'Oboe': 'espOboe',
  'Percusión': 'espPercusion',
  'Piano': 'espPiano',
  'Saxofón': 'espSaxofon',
  'Trombón': 'espTrombon',
  'Trompa': 'espTrompa',
  'Trompeta': 'espTrompeta',
  'Tuba': 'espTuba',
  'Viola': 'espViola',
  'Violín': 'espViolin',
  'Violoncello': 'espVioloncello',
} as const satisfies Record<string, OpcionKey>;

export const ESPECIALIDADES = Object.keys(ESPECIALIDAD_OPCION) as (keyof typeof ESPECIALIDAD_OPCION)[];

export function especialidadOpcionKey(especialidad: string): OpcionKey | null {
  return (ESPECIALIDAD_OPCION as Record<string, OpcionKey>)[especialidad] ?? null;
}

export const FORMA_PAGO_OPCION: Record<string, OpcionKey> = {
  unico: 'pagoUnico',
  fraccionado: 'pagoFraccionado',
  beca: 'beca',
};

export const REDUCCION_OPCION: Record<string, OpcionKey> = {
  fam_num_general: 'reduccionFamNumGeneral',
  fam_num_especial: 'reduccionFamNumEspecial',
  discapacidad: 'reduccionDiscapacidad',
  terrorismo: 'reduccionTerrorismo',
  violencia_genero: 'reduccionViolencia',
  ingreso_minimo: 'reduccionIngresoMinimo',
};

/**
 * Si el formulario tiene seleccionada una opción que acaba de desactivarse,
 * la deselecciona (con los mismos reseteos en cascada que hace handleChange).
 * Devuelve el MISMO objeto si no hay nada que cambiar, para que setState no
 * provoque renders innecesarios.
 */
export function ajustarFormulario(data: EnrollmentFormData, on: OpcionesConfig): EnrollmentFormData {
  let d = data;
  const set = (patch: Partial<EnrollmentFormData>) => { d = { ...d, ...patch }; };
  const resetDependientesCurso: Partial<EnrollmentFormData> = {
    perfilProfesional: '',
    asignaturaPendiente1: '',
    asignaturaPendiente2: '',
    esRepetidor: false,
    convalidacionAsignaturas: [],
    convalidacionSolicitada: false,
    convalidacionMotivo: '',
  };

  if (d.tipoEnsenanza && !on[ENSENANZA_OPCION[d.tipoEnsenanza]]) {
    const otra = d.tipoEnsenanza === 'elemental' ? 'profesional' : 'elemental';
    const nueva = on[ENSENANZA_OPCION[otra]] ? otra : '';
    set({ tipoEnsenanza: nueva, curso: '', ...resetDependientesCurso });
    if (nueva === 'elemental' && d.formaPago === 'beca') set({ formaPago: '' });
    if (nueva === 'elemental' && d.especialidad === 'Canto') set({ especialidad: '' });
  }

  const cursoKey = cursoOpcionKey(d.tipoEnsenanza, d.curso);
  if (cursoKey && !on[cursoKey]) set({ curso: '', ...resetDependientesCurso });

  const espKey = especialidadOpcionKey(d.especialidad);
  if (espKey && !on[espKey]) set({ especialidad: '', ...resetDependientesCurso });

  if (d.esRepetidor && !on.repetidor) set({ esRepetidor: false, asignaturaPendiente1: '', asignaturaPendiente2: '' });
  if ((d.asignaturaPendiente1 || d.asignaturaPendiente2) && !on.asignaturasPendientes) {
    set({ asignaturaPendiente1: '', asignaturaPendiente2: '' });
  }
  if (d.perfilProfesional && PERFIL_OPCION[d.perfilProfesional] && !on[PERFIL_OPCION[d.perfilProfesional]]) {
    set({ perfilProfesional: '' });
  }
  if ((d.convalidacionAsignaturas ?? []).length > 0 && !on.convalidacion) {
    set({ convalidacionAsignaturas: [], convalidacionSolicitada: false, convalidacionMotivo: '' });
  }

  if (d.esPrimerAno && !on.primerAno) set({ esPrimerAno: false });
  if (d.formaPago && FORMA_PAGO_OPCION[d.formaPago] && !on[FORMA_PAGO_OPCION[d.formaPago]]) {
    set({ formaPago: '' });
  }
  if (d.tipoReduccion && REDUCCION_OPCION[d.tipoReduccion] && !on[REDUCCION_OPCION[d.tipoReduccion]]) {
    set({ tipoReduccion: 'ninguna' });
  }
  if (d.matriculaHonor && !on.matriculaHonor) set({ matriculaHonor: false });

  return d;
}

// ── Detección de la palabra clave del modo administrador ────────────────────

export const CLAVE_ADMIN = 'cpmadmin';

/** Añade una tecla al búfer y devuelve el búfer recortado a la longitud de la clave. */
export function acumularTecla(buffer: string, key: string): string {
  if (key.length !== 1) return buffer;
  return (buffer + key.toLowerCase()).slice(-CLAVE_ADMIN.length);
}

// ── Comunicación con Power Automate ─────────────────────────────────────────

const CACHE_KEY = 'cpm_opciones_formulario';

export function leerCache(): OpcionesConfig {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return normalizarOpciones(raw);
  } catch {
    // localStorage no disponible
  }
  return { ...OPCIONES_POR_DEFECTO };
}

function escribirCache(config: OpcionesConfig): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {
    // ignorar
  }
}

/**
 * Lee la configuración publicada. Si el flujo no está configurado o falla,
 * devuelve la última configuración conocida en este navegador (o todo
 * activado), para no bloquear nunca la matrícula.
 */
export async function leerOpciones(): Promise<OpcionesConfig> {
  if (!PA_OPCIONES_LEER_URL) return { ...OPCIONES_POR_DEFECTO };
  try {
    const res = await fetch(PA_OPCIONES_LEER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const config = normalizarOpciones(json?.opciones);
    escribirCache(config);
    return config;
  } catch (err) {
    console.warn('[opciones] No se pudo leer la configuración; se usa la última conocida.', err);
    return leerCache();
  }
}

export class ClaveIncorrectaError extends Error {
  constructor() { super('Contraseña incorrecta'); }
}

/**
 * Envía la contraseña (y, si se indica, la nueva configuración) al flujo de
 * guardado. Sin `config` solo verifica la contraseña.
 */
export async function enviarOpciones(password: string, config?: OpcionesConfig): Promise<void> {
  if (!PA_OPCIONES_GUARDAR_URL) {
    throw new Error('El flujo de guardado no está configurado (PA_OPCIONES_GUARDAR_URL vacía).');
  }
  const res = await fetch(PA_OPCIONES_GUARDAR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config ? { password, opciones: config } : { password }),
  });
  if (res.status === 401 || res.status === 403) throw new ClaveIncorrectaError();
  if (!res.ok) throw new Error(`Error al guardar (HTTP ${res.status}).`);
  if (config) escribirCache(config);
}
