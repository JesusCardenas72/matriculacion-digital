export type { Materia, MateriasIndex } from './materias';
export { loadMaterias, getMaterias, buildMateriasIndex, queryMateriasCurso, queryMateriasPrevias } from './materias';
export type { FeeInput, FeeResult, FeeDetails, TipoEnsenanza as SharedTipoEnsenanza } from './types';
export { calcularTasas } from './calculadora';
export { FEES, CURSOS, ESPECIALIDADES, getCursos, getEspecialidadesDisponibles } from './fees';
export { ARTICLE_TEXTS, REDUCCION_LABEL, PROFILE_SPECIFIC_SUBJECTS } from './articulos';
export type { ArticleKey } from './articulos';
