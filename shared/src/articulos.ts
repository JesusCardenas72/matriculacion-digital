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
    text: '1. Está exento del pago de los precios públicos previstos en esta orden el alumnado que haya sido víctima de actos terroristas o sea hijo o cónyuge no separado legalmente de fallecidos o heridos en actos terroristas, de conformidad con el artículo 38 de la Ley 29/2011, de 22 de noviembre, de Reconocimiento y Protección Integral a las víctimas del Terrorismo.',
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

export const REDUCCION_LABEL: Record<string, string> = {
  ninguna: 'Ninguna',
  fam_num_general: 'Familia Numerosa General',
  fam_num_especial: 'Familia Numerosa Especial',
  discapacidad: 'Discapacidad',
  terrorismo: 'Víctima de Terrorismo',
  violencia_genero: 'Violencia de Género',
  ingreso_minimo: 'Ingreso Mínimo de Solidaridad',
};

export const PROFILE_SPECIFIC_SUBJECTS = [
  'Fundamentos de Composición',
  'Improvisación',
  'Informática musical',
  'Didáctica de la Música',
  'Didáctica musical',
  'Coro',
  'Música moderna',
] as const;
