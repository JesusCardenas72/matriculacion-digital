import { FEES } from './fees';
import type { FeeInput, FeeResult } from './types';

export function calcularTasas(input: FeeInput): FeeResult | null {
  if (!input.tipoEnsenanza || !input.curso) return null;

  const fees = FEES[input.tipoEnsenanza as 'elemental' | 'profesional'];
  let cursoBase = (fees.cursos as any)[input.curso] || 0;

  const isRepetidor = input.esRepetidor || false;
  const repMultiplier = isRepetidor ? 1.2 : 1;

  let subtotalAdmin = fees.serviciosGenerales * repMultiplier;
  if (input.esPrimerAno) subtotalAdmin += fees.aperturaExpediente * repMultiplier;

  let subtotalAcad: number;
  let pending1Cost = 0;
  let pending2Cost = 0;
  let repetidorMode: 'suelta' | 'completo' | null = null;

  if (isRepetidor) {
    const hasPending1 = !!input.asignaturaPendiente1;
    const hasPending2 = !!input.asignaturaPendiente2;

    pending1Cost = hasPending1 ? fees.precioAsignatura * 1.2 : 0;
    pending2Cost = hasPending2 ? fees.precioAsignatura * 1.2 : 0;

    if (input.repiteSoloAsignaturasSuelta) {
      // Repetidor solo con asignaturas sueltas: solo esas asignaturas + 20%
      subtotalAcad = pending1Cost + pending2Cost;
      repetidorMode = 'suelta';
    } else {
      // Curso completo + 20%, más pendientes si las hay
      subtotalAcad = cursoBase * 1.2 + pending1Cost + pending2Cost;
      repetidorMode = 'completo';
    }
  } else {
    // Cálculo normal (asignaturas pendientes de cursos anteriores con recargo 20%)
    pending1Cost = input.asignaturaPendiente1 ? fees.precioAsignatura * 1.2 : 0;
    pending2Cost = input.asignaturaPendiente2 ? fees.precioAsignatura * 1.2 : 0;
    subtotalAcad = cursoBase + pending1Cost + pending2Cost;
  }

  const numConvalidadas = input.convalidacionSolicitada
    ? (input.convalidacionAsignaturas ?? []).length
    : 0;
  const convalidacionDiscount = numConvalidadas * fees.precioAsignatura;
  subtotalAcad = Math.max(0, subtotalAcad - convalidacionDiscount);

  if (input.matriculaHonor) {
    subtotalAcad = Math.max(0, subtotalAcad - 58);
  }

  let multiplier = 1;
  if (input.tipoReduccion === 'fam_num_general') multiplier = 0.5;
  else if (input.tipoReduccion && input.tipoReduccion !== 'ninguna') multiplier = 0;

  if (input.formaPago === 'beca') {
    multiplier = 0;
  }

  const totalAdmin = subtotalAdmin * multiplier;
  const totalAcad = subtotalAcad * multiplier;
  const total = totalAdmin + totalAcad;

  return {
    admin: totalAdmin,
    acad: totalAcad,
    total: total,
    firstPayment: totalAdmin + (totalAcad / 2),
    secondPayment: totalAcad / 2,
    details: {
      serviciosGenerales: fees.serviciosGenerales * repMultiplier * multiplier,
      aperturaExpediente: input.esPrimerAno ? fees.aperturaExpediente * repMultiplier * multiplier : 0,
      curso: repetidorMode === 'suelta' ? 0 : cursoBase * repMultiplier * multiplier,
      asignaturasPendientes: (pending1Cost + pending2Cost) * multiplier,
      convalidacionDiscount: convalidacionDiscount * multiplier,
      convalidacionCount: numConvalidadas,
      matriculaHonorDiscount: input.matriculaHonor ? 58 : 0,
      multiplier,
      reductionLabel: getReductionLabel(input.tipoReduccion, input.matriculaHonor),
      repetidorMode,
    },
  };
}

function getReductionLabel(tipoReduccion: string, matriculaHonor: boolean): string {
  const base =
    tipoReduccion === 'fam_num_general' ? 'Familia Numerosa General (50%)' :
    tipoReduccion === 'fam_num_especial' ? 'Familia Numerosa Especial (100%)' :
    tipoReduccion === 'discapacidad' ? 'Discapacidad ≥ 33% (100%)' :
    tipoReduccion === 'terrorismo' ? 'Víctima de Terrorismo (100%)' :
    tipoReduccion === 'violencia_genero' ? 'Víctima de Violencia de Género (100%)' :
    tipoReduccion === 'ingreso_minimo' ? 'Ingreso Mínimo de Solidaridad (100%)' : '';
  if (matriculaHonor) {
    return base ? `${base} + Matrícula de Honor` : 'Matrícula de Honor (1 asignatura)';
  }
  return base;
}
