export interface MatriculacionFormData {
  tipoEnsenanza: 'elemental' | 'profesional' | '';
  curso: string;
  especialidad: string;
  asignaturaPendiente1: string;
  asignaturaPendiente2: string;
  perfilProfesional: 'A' | 'B' | 'C' | '';
  convalidacionAsignaturas: string[];
}

export const MATRICULACION_INITIAL: MatriculacionFormData = {
  tipoEnsenanza: 'elemental',
  curso: '',
  especialidad: '',
  asignaturaPendiente1: '',
  asignaturaPendiente2: '',
  perfilProfesional: '',
  convalidacionAsignaturas: [],
};
