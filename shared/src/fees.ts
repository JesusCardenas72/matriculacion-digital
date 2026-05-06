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

export const CURSOS: Record<TipoEnsenanza, string[]> = {
  elemental: ['1º', '2º', '3º', '4º'],
  profesional: ['1º', '2º', '3º', '4º', '5º', '6º'],
};

export const ESPECIALIDADES = [
  'Canto', 'Clarinete', 'Contrabajo', 'Fagot', 'Flauta Travesera',
  'Guitarra', 'Oboe', 'Percusión', 'Piano', 'Saxofón',
  'Trombón', 'Trompa', 'Trompeta', 'Tuba', 'Viola',
  'Violín', 'Violoncello',
] as const;

export function getCursos(tipo: 'elemental' | 'profesional' | ''): string[] {
  if (tipo === 'elemental') return [...CURSOS.elemental];
  if (tipo === 'profesional') return [...CURSOS.profesional];
  return [];
}

export function getEspecialidadesDisponibles(tipo: 'elemental' | 'profesional' | ''): string[] {
  if (tipo === 'elemental') return ESPECIALIDADES.filter(e => e !== 'Canto');
  return [...ESPECIALIDADES];
}
