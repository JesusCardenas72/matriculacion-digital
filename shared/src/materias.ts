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

let materiasCache: Materia[] | null = null;
let loadingPromise: Promise<Materia[]> | null = null;

export async function loadMaterias(): Promise<Materia[]> {
  if (materiasCache) return materiasCache;
  if (loadingPromise) return loadingPromise;
  loadingPromise = fetch('/materias.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load materias');
      return res.json();
    })
    .then(data => {
      materiasCache = data as Materia[];
      return materiasCache;
    })
    .catch(err => {
      loadingPromise = null;
      throw err;
    });
  return loadingPromise;
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
