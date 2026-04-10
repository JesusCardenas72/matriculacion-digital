export interface EnrollmentFormData {
  // Datos Personales
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

  // Otros datos
  horaSalidaEstudios: 'Antes de las 17 h' | '17 h' | '18 h' | '';
  disponibilidadManana: boolean;
  autorizacionImagen: boolean;

  // Menores de 18
  tutor1Nombre: string;
  tutor1Dni: string;
  tutor2Nombre: string;
  tutor2Dni: string;

  // Matriculación
  tipoEnsenanza: 'elemental' | 'profesional' | '';
  curso: string;
  especialidad: string;
  
  // Asignaturas pendientes
  asignaturaPendiente1: string;
  asignaturaPendiente2?: string;
  
  // Perfiles (5º y 6º Profesional)
  perfilProfesional: 'A' | 'B' | 'C' | '';

  // Forma de Pago
  formaPago: 'unico' | 'fraccionado' | 'beca' | '';
  familiaNumerosa: boolean;
  tipoReduccion: 'ninguna' | 'fam_num_general' | 'fam_num_especial' | 'discapacidad' | 'terrorismo' | 'violencia_genero' | 'ingreso_minimo' | '';
  matriculaHonor: boolean;
  esPrimerAno: boolean;
  importeTotal: string;
  importe1erPago?: string;
  importe2oPago?: string;
}
