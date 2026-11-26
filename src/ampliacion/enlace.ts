/**
 * Enlace personal de ampliación de matrícula.
 *
 * GestionMatriculasAdmin envía a la familia un correo con un botón a
 *   https://matriculacion-digital.vercel.app/#ampliacion=<token>
 * El token lleva CIFRADOS los datos de la matrícula original. La llave es el
 * DNI del alumno o, si no tiene (menores sin DNI), una CLAVE DE ACCESO que va
 * escrita en el correo: la familia la escribe y el formulario se abre en modo
 * ampliación, ya relleno.
 * Va detrás de «#», así que el servidor de la web nunca lo recibe.
 *
 * Formato (versión 1), el mismo que genera la app en
 * `src/utils/enlaceFormularioAmpliacion.ts`:
 *   "1" + tipoLlave ("d" = DNI, "c" = clave de acceso) + "." + sal + "." + iv + "." + cifrado
 *   (base64url). PBKDF2-SHA256 de 150 000 vueltas → AES-GCM 256. DNI y clave se
 *   normalizan igual: solo letras y números, en mayúsculas.
 */

import type { EnrollmentFormData } from '../types';
import {
  ENSENANZA_OPCION,
  ESPECIALIDADES,
  FORMA_PAGO_OPCION,
  REDUCCION_OPCION,
  cursoOpcionKey,
  especialidadOpcionKey,
  type OpcionKey,
} from '../opciones/catalogo';

export const ITERACIONES_PBKDF2 = 150_000;

export type TipoLlave = 'd' | 'c';

/** Lo que viaja cifrado (lo escribe la app). */
export interface DatosEnlaceAmpliacion {
  v: 1;
  destino: string;
  origen: { nOrden: number | null; curso: string; cursoEscolar: string | null };
  caduca: string;
  nombre: string;
  apellidos: string;
  dni: string;
  fechaNacimiento: string;
  domicilio: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  email: string;
  telefono: string;
  horaSalidaEstudios: string;
  disponibilidadManana: boolean;
  autorizacionImagen: boolean;
  especialidad: string;
  formaPago: 'unico' | 'fraccionado' | 'beca' | '';
  tipoReduccion: string;
}

export interface TokenAmpliacion {
  token: string;
  tipoLlave: TipoLlave;
}

/** Lee el token de la parte «#ampliacion=…» de la dirección. null si no hay o no tiene la forma esperada. */
export function leerTokenDeUrl(hash: string): TokenAmpliacion | null {
  const m = /(?:^#|&)ampliacion=([^&]+)/.exec(hash ?? '');
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  const t = /^1([dc])\.[\w-]+\.[\w-]+\.[\w-]+$/.exec(token);
  return t ? { token, tipoLlave: t[1] as TipoLlave } : null;
}

/** DNI o clave como llave: solo letras y números, en mayúsculas («abcd-efgh» = «ABCDEFGH»). */
export function normalizarLlave(texto: string): string {
  return texto.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}

export class LlaveIncorrectaError extends Error {
  constructor() {
    super('Los datos no coinciden con los de la matrícula.');
    this.name = 'LlaveIncorrectaError';
  }
}

export class EnlaceNoValidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'EnlaceNoValidoError';
  }
}

function deBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

const CURSO_DESTINO = /^(EE[2-4]|EP[2-6])$/;

/**
 * Descifra el token con lo que escribe la familia. Lanza LlaveIncorrectaError
 * si no coincide y EnlaceNoValidoError si el contenido no sirve o ha caducado.
 */
export async function descifrarEnlace(
  { token }: TokenAmpliacion,
  secreto: string,
  hoy = new Date(),
): Promise<DatosEnlaceAmpliacion> {
  const llave = normalizarLlave(secreto);
  if (!llave) throw new LlaveIncorrectaError();
  const [, sal, iv, cifrado] = token.split('.');
  let plano: ArrayBuffer;
  try {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(llave), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: deBase64Url(sal), iterations: ITERACIONES_PBKDF2 },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64Url(iv) }, key, deBase64Url(cifrado));
  } catch {
    throw new LlaveIncorrectaError();
  }
  let d: DatosEnlaceAmpliacion;
  try {
    d = JSON.parse(new TextDecoder().decode(plano));
  } catch {
    throw new EnlaceNoValidoError('El enlace está dañado.');
  }
  if (d?.v !== 1 || !CURSO_DESTINO.test(d.destino ?? '')) {
    throw new EnlaceNoValidoError('El enlace no es válido.');
  }
  if (d.caduca && d.caduca < hoy.toISOString().slice(0, 10)) {
    throw new EnlaceNoValidoError('El enlace ha caducado. Póngase en contacto con la Secretaría del Centro.');
  }
  return d;
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** «EE4» → enseñanza y curso tal como los guarda el formulario. */
export function destinoFormulario(destino: string): { tipoEnsenanza: 'elemental' | 'profesional'; curso: string } {
  return {
    tipoEnsenanza: destino.startsWith('EP') ? 'profesional' : 'elemental',
    curso: `${parseInt(destino.slice(2), 10)}º`,
  };
}

/** Especialidad con el nombre exacto del selector (sin importar tildes ni mayúsculas). */
export function especialidadFormulario(especialidad: string): string {
  const buscada = sinTildes(especialidad);
  return ESPECIALIDADES.find(e => sinTildes(e) === buscada) ?? '';
}

const HORAS = ['Antes de las 17 h', '17 h', '18 h'];
const REDUCCIONES = ['ninguna', 'fam_num_general', 'fam_num_especial', 'discapacidad', 'terrorismo', 'violencia_genero', 'ingreso_minimo'];

/** Campos del formulario que se rellenan desde el enlace. */
export function datosAFormulario(d: DatosEnlaceAmpliacion): Partial<EnrollmentFormData> {
  const { tipoEnsenanza, curso } = destinoFormulario(d.destino);
  let especialidad = especialidadFormulario(d.especialidad);
  if (tipoEnsenanza === 'elemental' && especialidad === 'Canto') especialidad = '';
  const tipoReduccion = (REDUCCIONES.includes(d.tipoReduccion) ? d.tipoReduccion : 'ninguna') as EnrollmentFormData['tipoReduccion'];
  const formaPago = d.formaPago === 'beca' && tipoEnsenanza !== 'profesional' ? '' : d.formaPago;
  return {
    nombre: d.nombre ?? '',
    apellidos: d.apellidos ?? '',
    dni: d.dni ?? '',
    fechaNacimiento: /^\d{4}-\d{2}-\d{2}$/.test(d.fechaNacimiento ?? '') ? d.fechaNacimiento : '',
    domicilio: d.domicilio ?? '',
    localidad: d.localidad ?? '',
    provincia: d.provincia || 'Ciudad Real',
    codigoPostal: d.codigoPostal ?? '',
    email: d.email ?? '',
    telefono: d.telefono ?? '',
    horaSalidaEstudios: (HORAS.includes(d.horaSalidaEstudios) ? d.horaSalidaEstudios : '') as EnrollmentFormData['horaSalidaEstudios'],
    disponibilidadManana: !!d.disponibilidadManana,
    autorizacionImagen: !!d.autorizacionImagen,
    tipoEnsenanza,
    curso,
    especialidad,
    formaPago: formaPago ?? '',
    tipoReduccion,
    familiaNumerosa: tipoReduccion === 'fam_num_general' || tipoReduccion === 'fam_num_especial',
    // En una ampliación el expediente ya existe: no se paga apertura.
    esPrimerAno: false,
  };
}

/**
 * Opciones que el modo administrador pudiera tener desactivadas y que esta
 * familia necesita (su curso, su especialidad, su forma de pago y reducción):
 * con el enlace se permiten solo para ella.
 */
export function opcionesNecesarias(datos: Partial<EnrollmentFormData>): OpcionKey[] {
  const claves: (OpcionKey | null | undefined)[] = [
    datos.tipoEnsenanza ? ENSENANZA_OPCION[datos.tipoEnsenanza] : null,
    cursoOpcionKey(datos.tipoEnsenanza ?? '', datos.curso ?? ''),
    especialidadOpcionKey(datos.especialidad ?? ''),
    datos.formaPago ? FORMA_PAGO_OPCION[datos.formaPago] : null,
    datos.tipoReduccion ? REDUCCION_OPCION[datos.tipoReduccion] : null,
  ];
  return claves.filter((k): k is OpcionKey => !!k);
}

/** Nombre de cada campo precargado, para el mensaje de confirmación. */
export const ETIQUETA_CAMPO: Partial<Record<keyof EnrollmentFormData, string>> = {
  nombre: 'Nombre',
  apellidos: 'Apellidos',
  dni: 'D.N.I. / N.I.E.',
  fechaNacimiento: 'Fecha de nacimiento',
  domicilio: 'Domicilio',
  localidad: 'Localidad',
  provincia: 'Provincia',
  codigoPostal: 'Código postal',
  email: 'Correo electrónico',
  telefono: 'Teléfono',
  horaSalidaEstudios: 'Hora de salida de otros estudios',
  disponibilidadManana: 'Disponibilidad horaria de mañana',
  autorizacionImagen: 'Autorización de uso de imagen',
  tipoEnsenanza: 'Tipo de enseñanza',
  curso: 'Curso',
  especialidad: 'Especialidad',
  formaPago: 'Forma de pago',
  tipoReduccion: 'Reducción o exención de tasas',
  esPrimerAno: 'Primer año en el centro',
};

/** Campos de la ampliación autorizada: cambiarlos puede hacer que no se acepte. */
export const CAMPOS_DE_LA_AMPLIACION = new Set<string>(['tipoEnsenanza', 'curso', 'especialidad', 'esPrimerAno']);

/** Texto legible de un valor del formulario para el mensaje de confirmación. */
export function valorLegible(campo: string, valor: unknown): string {
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  const s = String(valor ?? '').trim();
  if (!s) return '(vacío)';
  if (campo === 'fechaNacimiento') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  if (campo === 'tipoEnsenanza') return s === 'profesional' ? 'Profesional' : 'Elemental';
  if (campo === 'formaPago') return ({ unico: 'Pago Único', fraccionado: 'Pago Fraccionado', beca: 'Solicita Beca' } as Record<string, string>)[s] ?? s;
  if (campo === 'tipoReduccion') {
    return ({
      ninguna: 'Ninguna',
      fam_num_general: 'Familia Numerosa General',
      fam_num_especial: 'Familia Numerosa Especial',
      discapacidad: 'Discapacidad',
      terrorismo: 'Víctima de Terrorismo',
      violencia_genero: 'Víctima de Violencia de Género',
      ingreso_minimo: 'Ingreso Mínimo de Solidaridad',
    } as Record<string, string>)[s] ?? s;
  }
  return s;
}

/**
 * ¿Hay que pedir confirmación antes de este cambio? Sí cuando el campo vino
 * del enlace, todavía no se confirmó y el valor nuevo es distinto del original.
 */
export function pideConfirmacion(
  campo: string,
  valorNuevo: unknown,
  originales: Partial<Record<string, unknown>> | null,
  confirmados: ReadonlySet<string>,
): boolean {
  if (!originales || !(campo in originales) || confirmados.has(campo)) return false;
  return valorNuevo !== originales[campo];
}
