import materiasData from './materiasData';

export interface Materia {
  MATERIA: string;
  DESCRIPCION: string;
  ABREVIATURA: string;
  DEPARTAMENTO: string;
  CURSO: string;
  CURSO_N: string;
  ENSEÑANZAS: string;
  ESPECIALIDAD: string;
}

// ── Salvaguarda: asignaturas restringidas a ciertas especialidades ──────────
// La asignatura "Orquesta" (ABREVIATURA "ORQ") SOLO existe en las especialidades
// de cuerda frotada. El resto de especialidades cursan "Banda", nunca "Orquesta".
// Los datos de origen (public/materias.json) arrastran de forma recurrente
// entradas de "Orquesta" en especialidades donde no corresponde (p. ej. Clarinete),
// por lo que filtramos aquí de forma centralizada para que nunca vuelva a aparecer.
const ESPECIALIDADES_CON_ORQUESTA = new Set([
  'Contrabajo',
  'Viola',
  'Violín',
  'Violoncello',
]);

function esOrquesta(m: Materia): boolean {
  return (
    m.ABREVIATURA?.toUpperCase() === 'ORQ' ||
    m.DESCRIPCION?.trim().toLowerCase() === 'orquesta'
  );
}

function sanitizeMaterias(materias: Materia[]): Materia[] {
  return materias.filter(
    m => !esOrquesta(m) || ESPECIALIDADES_CON_ORQUESTA.has(m.ESPECIALIDAD)
  );
}

let materiasCache: Materia[] | null = sanitizeMaterias(materiasData as Materia[]);

export async function loadMaterias(): Promise<Materia[]> {
  return materiasCache!;
}

export function getMaterias(): Materia[] | null {
  return materiasCache;
}

export type MateriasIndex = Map<string, Materia[]>;

export function buildMateriasIndex(materias: Materia[]): MateriasIndex {
  const index: MateriasIndex = new Map();
  for (const m of materias) {
    const key = `${m.ENSEÑANZAS}|${m.ESPECIALIDAD}|${m.CURSO_N}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key)!.push(m);
  }
  return index;
}

export function queryMateriasCurso(
  index: MateriasIndex,
  especialidad: string,
  curso: string,
  tipoEnsenanza: 'elemental' | 'profesional'
): Materia[] {
  const tipoStr = tipoEnsenanza === 'profesional' ? 'Profesional' : 'Elemental';
  const key = `${tipoStr}|${especialidad}|${curso}`;
  return index.get(key) ?? [];
}

export function queryMateriasPrevias(
  index: MateriasIndex,
  especialidad: string,
  cursoNum: number,
  tipoEnsenanza: 'elemental' | 'profesional'
): Materia[] {
  const tipoStr = tipoEnsenanza === 'profesional' ? 'Profesional' : 'Elemental';
  const results: Materia[] = [];
  for (const [key, materias] of index) {
    const [tipo, esp, cursoN] = key.split('|');
    if (tipo === tipoStr && esp === especialidad) {
      const cNum = parseInt(cursoN);
      if (cNum < cursoNum) {
        results.push(...materias);
      }
    }
  }
  return results;
}

export const materias: Materia[] = [];
