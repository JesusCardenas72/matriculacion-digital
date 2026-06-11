export const FEES = {
  elemental: {
    pruebaAcceso: 0,
    aperturaExpediente: 25,
    serviciosGenerales: 10,
    precioAsignatura: 47,
    cursos: {
      '1º': 94,
      '2º': 94,
      '3º': 188,
      '4º': 188,
    },
  },
  profesional: {
    pruebaAcceso: 40,
    aperturaExpediente: 25,
    serviciosGenerales: 10,
    precioAsignatura: 58,
    cursos: {
      '1º': 232,
      '2º': 232,
      '3º': 348,
      '4º': 348,
      '5º': 348,
      '6º': 348,
    },
  },
} as const;

export type TipoEnsenanza = keyof typeof FEES;

export const ARTICLE_TEXTS = {
  apertura_expediente: {
    title: 'Artículo 12. Apertura de expediente académico',
    text: '1. El alumnado que se matricule por primera vez en un centro público para cursar enseñanzas elementales o profesionales de música o de danza, o que inicie una nueva enseñanza o especialidad, deberá abonar el precio público por apertura de expediente académico previsto en esta orden.',
  },
  fam_num: {
    title: 'Artículo 14. Alumnado miembro de familia numerosa',
    text: '1. De conformidad con la Ley 40/2003, de 18 de noviembre, de Protección a las Familias Numerosas:\n\na) El alumnado miembro de familia numerosa clasificada en la categoría especial estará exento del pago de los precios públicos previstos en esta orden.\n\nb) El alumnado miembro de familia numerosa clasificada en la categoría general tendrá una bonificación del cincuenta por ciento de los precios públicos previstos en esta orden.',
  },
  discapacidad: {
    title: 'Artículo 15. Alumnado con discapacidad',
    text: '1. Está exento del pago de los precios públicos previstos en esta orden el alumnado que tenga reconocido un grado de discapacidad igual o superior al 33 por ciento en los términos previstos en el artículo 4.2 del Texto Refundido de la Ley General de derechos de las personas con discapacidad y de su inclusión social, aprobado por Real Decreto Legislativo 1/2013, de 29 de noviembre.',
  },
  terrorismo: {
    title: 'Artículo 16. Víctimas de actos terroristas',
    text: '1. Está exento del pago de los precios públicos previstos en esta orden el alumnado que haya sido víctima de actos terroristas o sea hijo o cónyuge no separado legalmente de fallecidos o heridos en actos terroristas, de conformidad con el artículo 38 de la Ley 29/2011, de 22 de septiembre, de Reconocimiento y Protección Integral a las víctimas del Terrorismo.',
  },
  violencia_genero: {
    title: 'Artículo 17. Víctimas de violencia de género',
    text: '1. De conformidad con la Ley Orgánica 1/2004, de 28 de diciembre, de Medidas de Protección Integral contra la Violencia de Género, está exento del pago de los precios públicos previstos en esta orden el alumnado víctima de violencia de género, así como el alumnado menor de 25 años cuyas progenitoras la sufran.',
  },
  ingreso_minimo: {
    title: 'Artículo 18. Familias perceptoras del ingreso mínimo de solidaridad',
    text: '1. Está exento del pago de los precios públicos previstos en esta orden el alumnado perteneciente a familias con renta familiar igual o inferior a la renta que da derecho a la percepción del ingreso mínimo de solidaridad, según lo previsto en la disposición adicional vigesimasexta Ley 7/2017, de 21 de diciembre, de Presupuestos Generales de la Junta de Comunidades de Castilla-La Mancha para 2018.',
  },
  matricula_honor: {
    title: 'Artículo 13. Alumnado con matrícula de honor y premios extraordinarios.',
    text: '3. En las enseñanzas artísticas profesionales cursadas en centros públicos dependientes de la consejería con competencias en materia de educación, la obtención de matrícula de honor en una o más asignaturas dará derecho al alumnado, en el curso académico inmediatamente posterior de la misma enseñanza, a una exención del pago en primera matrícula equivalente al importe correspondiente al número de asignaturas en que haya obtenido dicha calificación.',
  },
} as const;

export type ArticleKey = keyof typeof ARTICLE_TEXTS;

export const PROFILE_SPECIFIC_SUBJECTS = [
  'Fundamentos de Composición',
  'Improvisación',
  'Informática musical',
  'Didáctica de la Música',
  'Didáctica musical',
  'Coro',
  'Música moderna',
] as const;

export const REDUCCION_LABEL: Record<string, string> = {
  ninguna: 'Ninguna',
  fam_num_general: 'Familia Numerosa General',
  fam_num_especial: 'Familia Numerosa Especial',
  discapacidad: 'Discapacidad',
  terrorismo: 'Víctima de Terrorismo',
  violencia_genero: 'Violencia de Género',
  ingreso_minimo: 'Ingreso Mínimo de Solidaridad',
};

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export function validateDNI(dni: string): string | null {
  const trimmed = dni.trim().toUpperCase();
  if (!trimmed) return null;

  const dniRegex = /^(\d{8})([A-Z])$/;
  const nieRegex = /^([XYZ])(\d{7})([A-Z])$/;

  let number: number;
  let expectedLetter: string;

  const dniMatch = trimmed.match(dniRegex);
  if (dniMatch) {
    number = parseInt(dniMatch[1], 10);
    expectedLetter = DNI_LETTERS[number % 23];
    if (dniMatch[2] !== expectedLetter) return 'DNI inválido: letra incorrecta';
    return null;
  }

  const nieMatch = trimmed.match(nieRegex);
  if (nieMatch) {
    const prefixMap: Record<string, number> = { X: 0, Y: 1, Z: 2 };
    const prefix = prefixMap[nieMatch[1]];
    if (prefix === undefined) return 'NIE inválido: prefijo incorrecto';
    number = prefix * 10000000 + parseInt(nieMatch[2], 10);
    expectedLetter = DNI_LETTERS[number % 23];
    if (nieMatch[3] !== expectedLetter) return 'NIE inválido: letra incorrecta';
    return null;
  }

  if (/^\d{8}$/.test(trimmed)) return 'DNI válido (sin letra)';
  if (/^[XYZ]\d{7}$/.test(trimmed)) return 'NIE válido (sin letra de control)';
  return 'Formato no reconocido (DNI: 8 dígitos + letra o NIE: X/Y/Z + 7 dígitos + letra)';
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Email no válido';
  return null;
}

export function validateCP(cp: string): string | null {
  const trimmed = cp.trim();
  if (!trimmed) return null;
  if (!/^\d{5}$/.test(trimmed)) return 'C.P. debe tener 5 dígitos';
  return null;
}

export function validateTelefono(telefono: string): string | null {
  const trimmed = telefono.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\s+/g, '');
  if (!/^\d{9,15}$/.test(digits)) return 'Teléfono: 9-15 dígitos sin espacios';
  return null;
}

/**
 * Lista CERRADA de campos del formulario en los que NO se permite ningún
 * espacio en blanco mientras el usuario teclea (los espacios se eliminan
 * en caliente). El resto de los campos DEBEN preservar exactamente lo que
 * el usuario escribe — espacios incluidos.
 *
 * REGLA DE ORO: no añadir aquí ningún campo de texto libre (nombres,
 * direcciones, motivos, observaciones, etc.). Cualquier cambio en esta
 * lista debe ir acompañado de su test correspondiente.
 */
export const NO_WHITESPACE_FIELDS: readonly string[] = [
  'dni',
  'tutor1Dni',
  'tutor2Dni',
  'email',
  'telefono',
];

/**
 * Sanea el valor de un input *solo* si el campo no admite espacios.
 * Para cualquier otro campo devuelve el valor sin tocar — esto es
 * intencional para que el usuario pueda escribir libremente.
 */
export function sanitizeFieldValue(name: string, value: string): string {
  if (NO_WHITESPACE_FIELDS.includes(name)) {
    return value.replace(/\s+/g, '');
  }
  return value;
}

/**
 * @deprecated Usa `sanitizeFieldValue(name, value)`. Esta función colapsaba
 * espacios y se aplicaba indiscriminadamente, lo que rompía campos donde
 * el usuario legítimamente teclea varios espacios. Se mantiene como
 * passthrough para compatibilidad temporal.
 */
export function sanitize(value: string): string {
  return value;
}

// Calcula el curso escolar al que pertenece la solicitud enviada hoy.
// Corte en mayo: a partir del 1-may ya se matricula para el curso siguiente.
// - mes >= 5 (may-dic) → "YY/YY+1"
// - mes < 5  (ene-abr) → "YY-1/YY"
export function calcularCursoEscolar(): string {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth() + 1;
  const startYear = month >= 5 ? year : year - 1;
  const pad = (n: number) => ((n % 100 + 100) % 100).toString().padStart(2, "0");
  return `${pad(startYear)}/${pad(startYear + 1)}`;
}
