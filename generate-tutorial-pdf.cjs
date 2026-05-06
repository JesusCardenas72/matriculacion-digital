const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const { marked } = require('marked');

const markdownFile = path.join(__dirname, 'TUTORIAL_FORMULARIO_MATRICULA.md');
const outputPdf = path.join(__dirname, 'TUTORIAL_FORMULARIO_MATRICULA.pdf');

const markdownContent = fs.readFileSync(markdownFile, 'utf-8');

const html = marked(markdownContent);

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 20;
const contentWidth = pageWidth - (margin * 2);
let yPosition = margin;

doc.setFont('helvetica', 'bold');
doc.setFontSize(24);
doc.setTextColor(40, 40, 40);
doc.text('Tutorial del Formulario de Matriculación Digital', pageWidth / 2, yPosition, { align: 'center' });
yPosition += 15;

doc.setFontSize(14);
doc.setFont('helvetica', 'normal');
doc.setTextColor(100, 100, 100);
doc.text('Conservatorio Profesional de Música "Marcos Redondo"', pageWidth / 2, yPosition, { align: 'center' });
yPosition += 8;
doc.text('Ciudad Real', pageWidth / 2, yPosition, { align: 'center' });
yPosition += 15;

doc.setDrawColor(200, 200, 200);
doc.line(margin, yPosition, pageWidth - margin, yPosition);
yPosition += 15;

const sections = [
  { title: '1. Introducción', content: `Este documento constituye una guía completa para el填写 del formulario de matriculación digital del Conservatorio Profesional de Música "Marcos Redondo" de Ciudad Real. El formulario está diseñado para gestionar la solicitud de matrícula tanto para Enseñanzas Elementales como Profesionales de Música.\n\nEl sistema permite:\n• Rellenar y enviar la solicitud de matrícula online\n• Calcular automáticamente las tasas según la normativa vigente (Orden 68/2022)\n• Generar un PDF con todos los datosfilled\n• Enviar la solicitud directamente al sistema de gestión del centro` },
  { title: '2. Estructura General del Formulario', content: `El formulario está organizado en las siguientes secciones principales:\n\n• Datos Personales: Información básica del alumno/a\n• Menores de 18 años: Datos de tutores legales (si aplica)\n• Datos de Matriculación: Teaching type, curso, especialidad, asignaturas\n• Forma de Pago: Método de pago, tasas, reducciones\n• Información y Autorizaciones: Protección de datos, autorización de imagen\n• Documentos Adjuntos: Archivos opcionales (justificantes, etc.)` },
  { title: '3. Sección 1: Datos Personales', content: `CAMPOS OBLIGATORIOS:\n\n• Nombre: Nombre completo del alumno/a\n• Apellidos: Apellidos completos\n• D.N.I. / N.I.E.: Documento de identificación (formato: 12345678X)\n• Fecha de Nacimiento: Formato DD/MM/AAAA\n• Domicilio Actual: Calle, número, piso, escalera...\n• Localidad: Ciudad/población\n• Provincia: Por defecto Ciudad Real\n• C.P.: Código postal (5 dígitos)\n• Correo Electrónico: formato@correo.com\n• Teléfono: Número de teléfono\n\nCAMPOS DE DISPONIBILIDAD:\n• Hora de salida de otros estudios: Antes de las 17h, 17h, o 18h\n• Disponibilidad horaria de mañana: OBLIGATORIO (checkbox)\n• Autorización uso de imagen: OBLIGATORIO (checkbox)` },
  { title: '4. Sección 2: Menores de 18 años', content: `Esta sección es OPCIONAL y solo debe cumplimentarse cuando el/la alumno/a sea menor de edad.\n\nTUTOR/A LEGAL 1:\n• Apellidos y Nombre: Nombre completo del primer tutor/a legal\n• D.N.I.: Documento de identificación del tutor/a\n\nTUTOR/A LEGAL 2 (Opcional):\n• Apellidos y Nombre: Nombre completo del segundo tutor/a legal\n• D.N.I.: Documento de identificación del segundo tutor/a` },
  { title: '5. Sección 3: Datos de Matriculación', content: `TIPO DE ENSEÑANZA:\n• Enseñanza Elemental: Cursos 1º, 2º, 3º, 4º\n• Enseñanza Profesional: Cursos 1º a 6º\n(La especialidad de Canto no está disponible en Elemental)\n\nESPECIALIDADES DISPONIBLES:\nCanto, Clarinete, Contrabajo, Fagot, Flauta Travesera, Guitarra, Oboe, Percusión, Piano, Saxofón, Trombón, Trompa, Trompeta, Tuba, Viola, Violín, Violoncello\n\nASIGNATURAS PENDIENTES:\n• Asignatura pendiente 1: Obligatoria si hay pendientes\n• Asignatura pendiente 2: Solo en Enseñanza Profesional\n• Las asignaturas pendientes tienen un RECARGO DEL 20%\n\nPERFILES PROFESIONALES (Solo 5º y 6º):\n• Perfil A: Fundamentos de Composición\n• Perfil B: Improvisación / Informática Musical (5º) o Didáctica (6º)\n• Perfil C: Improvisación / Coro` },
  { title: '6. Sección 4: Forma de Pago', content: `TASAS GENERALES (Orden 68/2022):\n• Servicios Generales: 10,00 €\n• Apertura de Expediente: 25,00 € (solo primer año)\n• Prueba de Acceso (solo Profesional): 40,00 €\n\nTASAS POR CURSO:\n• Elemental 1º-2º: 94 € | 3º-4º: 188 €\n• Profesional 1º-2º: 232 € | 3º-6º: 348 €\n\nOPCIONES DE PAGO:\n• Pago Único: Total en un solo pago\n• Pago Fraccionado: Dos pagos (2º plazo en diciembre)\n• Solicita Beca: Solo Profesional, requiere justificante\n\nREDUCTIONES Y EXENCIONES:\n• Familia Numerosa General: 50% descuento\n• Familia Numerosa Especial: 100% exento\n• Discapacidad ≥33%: 100% exento\n• Víctima de Terrorism: 100% exento\n• Violencia de Género: 100% exento\n• Ingreso Mínimo: 100% exento\n• Matrícula de Honor: 58 € descuento (acumulable)` },
  { title: '7. Convalidaciones de Asignaturas', content: `TIPOS DE CONVALIDACIÓN:\n\n1. DOBLE ESPECIALIDAD O SIMILAR\n• Para asignaturas ya cursadas en otra especialidad\n• Debe haber coincidencia en denominación y curso\n• EXCEPCIONES: Orquesta/Banda y Música de Cámara\n• Reducción: 47 € (Elemental) o 58 € (Profesional)\n\n2. ASIGNATURAS DE ESO Y BACHILLERATO\n• Convalidación con materias del sistema educativo\n• Requiere certificado académico oficial\n• Reducción: 47 € (Elemental) o 58 € (Profesional)\n\n3. OTROS ESTUDIOS / MINISTERIO\n• Planes de estudios antiguos\n• Tramitación a través del Ministerio de Educación\n• SIN reducción inmediata en tasas` },
  { title: '8. Envío del Formulario', content: `PROCESO DE ENVÍO:\n\n1. PREVISUALIZACIÓN: Haga clic en "Previsualizar PDF" para ver el documento\n\n2. VISTA PREVIA: Al hacer clic en "Vista Previa al Envío":\n   • El sistema valida los campos obligatorios\n   • Muestra errores si los hay\n   • Muestra el formulario en modo solo lectura\n\n3. ENVÍO Y DESCARGA:\n   • Enviar y Descargar: Envía datos y descarga PDF\n   • Se crea un registro en Dataverse\n   • Se obtiene un número de orden\n   • Se envía correo de confirmación\n\nESTADOS DE ENVÍO:\n• Idle: Listo para enviar\n• Enviando: Proceso en curso\n• Success: Envío exitoso\n• Error: Error en el envío\n• Duplicate: Ya existe solicitud con mismos datos` },
  { title: '9. Documentos Adjuntos e Información', content: `DOCUMENTOS PERMITIDOS:\n• Imágenes: JPG, PNG, etc.\n• PDF: Documentos en formato PDF\n• Tamaño máximo: 9 MB en total\n\nDOCUMENTACIÓN SEGÚN SITUACIÓN:\n• Familia numerosa: Título de familia numerosa\n• Discapacidad: Certificado de discapacidad ≥33%\n• Víctima de terrorismo: Certificado correspondiente\n• Violencia de género: Orden de protección\n• Ingreso mínimo: Certificado de percepción\n• Pago de tasas: Justificante del Modelo 046\n• Convalidación: Certificado académico oficial\n• Beca: Justificante de registro\n\nCONTACTO:\n• Teléfono: 926 274 154\n• Email: 13004341.cpm@educastillalamancha.es\n\nNORMATIVA APLICABLE:\n• Orden 68/2022 de precios públicos\n• Ley 40/2003 de Familias Numerosas\n• Ley Orgánica 1/2004 contra Violencia de Género` },
  { title: '10. Recomendaciones Finales', content: `1. Revise todos los datos antes de enviar\n2. Guarde el PDF descargado como comprobante\n3. Adjunte documentación acreditativa cuando sea necesario\n4. Conserve el justificante de pago del Modelo 046\n5. Contacte con secretaría si tiene alguna duda\n\nNOTA IMPORTANTE: La documentación acreditativa de reducciones/exenciones debe adjuntarse a la solicitud. Hasta que no se aporte, la tramitación quedará en suspenso y, transcurrido el plazo de matrícula sin documentación, la solicitud será DESESTIMADA.\n\n---\nDocumento generado automáticamente para el Conservatorio Profesional de Música "Marcos Redondo" - Ciudad Real\nAño académico vigente` }
];

doc.setFont('helvetica', 'normal');
doc.setFontSize(10);

for (const section of sections) {
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(section.title, margin, yPosition);
  yPosition += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  const lines = doc.splitTextToSize(section.content, contentWidth);

  for (const line of lines) {
    if (yPosition > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    doc.text(line, margin, yPosition);
    yPosition += 5;
  }

  yPosition += 10;
}

const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
}

doc.save(outputPdf);
console.log(`PDF generado: ${outputPdf}`);
