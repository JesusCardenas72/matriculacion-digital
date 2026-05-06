export type TipoEnsenanza = 'elemental' | 'profesional';

export interface FeeInput {
  tipoEnsenanza: TipoEnsenanza | '';
  curso: string;
  esPrimerAno: boolean;
  tipoReduccion: 'ninguna' | 'fam_num_general' | 'fam_num_especial' | 'discapacidad' | 'terrorismo' | 'violencia_genero' | 'ingreso_minimo' | '';
  matriculaHonor: boolean;
  formaPago: 'unico' | 'fraccionado' | 'beca' | '';
  asignaturaPendiente1: string;
  asignaturaPendiente2?: string;
  convalidacionSolicitada?: boolean;
  convalidacionAsignaturas?: string[];
}

export interface FeeResult {
  admin: number;
  acad: number;
  total: number;
  firstPayment: number;
  secondPayment: number;
  details: FeeDetails;
}

export interface FeeDetails {
  serviciosGenerales: number;
  aperturaExpediente: number;
  curso: number;
  asignaturasPendientes: number;
  convalidacionDiscount: number;
  convalidacionCount: number;
  matriculaHonorDiscount: number;
  multiplier: number;
  reductionLabel: string;
}
