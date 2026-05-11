import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
    { src: 'Helvetica-Oblique', fontStyle: 'italic' },
    { src: 'Helvetica-BoldOblique', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

const colors = {
  primary: '#1a365d',
  primaryLight: '#2c5282',
  accent: '#c53030',
  gold: '#d69e2e',
  bg: '#fafafa',
  bgLight: '#f7fafc',
  text: '#2d3748',
  textLight: '#718096',
  border: '#e2e8f0',
  white: '#ffffff',
  success: '#38a169',
  info: '#3182ce',
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: colors.bg,
    padding: 0,
  },
  // Cover header
  header: {
    backgroundColor: colors.primary,
    padding: 30,
    paddingBottom: 25,
  },
  headerAccent: {
    height: 4,
    backgroundColor: colors.gold,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#cbd5e0',
    fontWeight: 'normal',
  },
  headerLocation: {
    fontSize: 11,
    color: colors.gold,
    marginTop: 4,
    fontWeight: 'bold',
  },
  // Page header (fixed on all pages)
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: colors.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pageHeaderLeft: {
    fontSize: 8,
    color: colors.textLight,
    fontWeight: 'bold',
  },
  pageHeaderRight: {
    fontSize: 8,
    color: colors.textLight,
  },
  content: {
    padding: 25,
    paddingBottom: 35,
  },
  section: {
    marginBottom: 14,
    wrap: false,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  sectionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    marginRight: 10,
    paddingTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  text: {
    fontSize: 9.5,
    color: colors.text,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  textBold: {
    fontSize: 9.5,
    color: colors.text,
    fontWeight: 'bold',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  textSmall: {
    fontSize: 8.5,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  list: {
    marginLeft: 8,
    marginBottom: 6,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
    marginTop: 4,
    marginRight: 8,
    flexShrink: 0,
  },
  bulletAccent: {
    backgroundColor: colors.accent,
  },
  bulletBlue: {
    backgroundColor: colors.info,
  },
  table: {
    display: 'flex',
    width: '100%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: colors.white,
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tableRowAlt: {
    backgroundColor: colors.bgLight,
  },
  tableCell: {
    fontSize: 8.5,
    color: colors.text,
    flex: 1,
  },
  infoBox: {
    backgroundColor: '#ebf8ff',
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  warningBox: {
    backgroundColor: '#fffaf0',
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  alertBox: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  grid2: {
    flexDirection: 'row',
    gap: 15,
  },
  gridColumn: {
    flex: 1,
  },
  // Page footer
  pageFooter: {
    position: 'absolute',
    bottom: 15,
    left: 25,
    right: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7.5,
    color: colors.textLight,
  },
});

const BulletItem = ({ children, accent = false, blue = false }) => (
  <View style={styles.listItem}>
    <View style={[styles.bullet, accent && styles.bulletAccent, blue && styles.bulletBlue]} />
    <Text style={styles.text}>{children}</Text>
  </View>
);

const TableRow = ({ cells, alt = false }) => (
  <View style={[styles.tableRow, alt && styles.tableRowAlt]}>
    {cells.map((cell, i) => (
      <Text key={i} style={[styles.tableCell, cell.style]}>
        {cell.text}
      </Text>
    ))}
  </View>
);

const InfoBox = ({ type = 'info', children }) => {
  const boxStyle = type === 'warning' ? styles.warningBox : type === 'alert' ? styles.alertBox : styles.infoBox;
  return <View style={boxStyle}>{children}</View>;
};

const PageHeader = () => (
  <View style={styles.pageHeader} fixed>
    <Text style={styles.pageHeaderLeft}>Conservatorio Profesional de Música "Marcos Redondo"</Text>
    <Text style={styles.pageHeaderRight}>Tutorial Formulario de Matriculación</Text>
  </View>
);

const PageFooter = () => (
  <View style={styles.pageFooter} fixed>
    <Text style={styles.footerText}>Conservatorio Profesional de Música "Marcos Redondo" - Ciudad Real</Text>
    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
  </View>
);

export const TutorialPdf = () => (
  <Document>
    {/* ═══════════════════════════════════════════════════════════ */}
    {/* PAGE 1: Cover + Introducción + Acceso                      */}
    {/* ═══════════════════════════════════════════════════════════ */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerAccent} />
        <Text style={styles.headerTitle}>Tutorial del Formulario de</Text>
        <Text style={[styles.headerTitle, { marginTop: -4 }]}>Matriculación Digital</Text>
        <Text style={styles.headerSubtitle}>Conservatorio Profesional de Música "Marcos Redondo"</Text>
        <Text style={styles.headerLocation}>Ciudad Real</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>1</Text></View>
            <Text style={styles.sectionTitle}>Introducción</Text>
          </View>
          <Text style={styles.text}>
            Este documento es una guía completa para el formulario de matriculación digital del Conservatorio Profesional de Música "Marcos Redondo" de Ciudad Real. El formulario gestiona la solicitud de matrícula para Enseñanzas Elementales y Profesionales de Música.
          </Text>
          <Text style={[styles.textBold, { marginTop: 8, marginBottom: 6 }]}>El sistema permite:</Text>
          <View style={styles.list}>
            <BulletItem>Rellenar y enviar la solicitud de matrícula online</BulletItem>
            <BulletItem>Calcular automáticamente las tasas según la normativa vigente (Orden 68/2022)</BulletItem>
            <BulletItem>Generar un PDF con todos los datos completados</BulletItem>
            <BulletItem>Enviar la solicitud directamente al sistema de gestión del centro</BulletItem>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>2</Text></View>
            <Text style={styles.sectionTitle}>Cómo Acceder al Formulario</Text>
          </View>
          <Text style={styles.text}>
            El formulario de matriculación digital está disponible en la página web del Conservatorio. Accede a la URL proporcionada por el centro para comenzar el proceso de solicitud.
          </Text>
          <InfoBox type="info">
            <Text style={[styles.textSmall, { color: colors.info }]}>
              El formulario es compatible con navegadores modernos (Chrome, Firefox, Edge, Safari). Se recomienda usar un ordenador para una mejor experiencia.
            </Text>
          </InfoBox>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>3</Text></View>
            <Text style={styles.sectionTitle}>Estructura General del Formulario</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 0.4 }]}>Sección</Text>
              <Text style={styles.tableHeaderText}>Descripción</Text>
            </View>
            <TableRow cells={[{ text: 'Datos Personales' }, { text: 'Información básica del alumno/a' }]} />
            <TableRow cells={[{ text: 'Menores de 18 años' }, { text: 'Datos de tutores legales (si aplica)' }]} alt />
            <TableRow cells={[{ text: 'Datos de Matriculación' }, { text: 'Tipo enseñanza, curso, especialidad, asignaturas' }]} />
            <TableRow cells={[{ text: 'Forma de Pago' }, { text: 'Método de pago, tasas, reducciones' }]} alt />
            <TableRow cells={[{ text: 'Información Legal' }, { text: 'Protección de datos, autorización de imagen' }]} />
            <TableRow cells={[{ text: 'Documentos Adjuntos' }, { text: 'Archivos opcionales (justificantes, etc.)' }]} alt />
          </View>
        </View>
      </View>

      <PageFooter />
    </Page>

    {/* ═══════════════════════════════════════════════════════════ */}
    {/* PAGE 2: Sección 1 - Datos Personales                       */}
    {/* ═══════════════════════════════════════════════════════════ */}
    <Page size="A4" style={styles.page}>
      <PageHeader />
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>4</Text></View>
            <Text style={styles.sectionTitle}>Sección 1: Datos Personales</Text>
          </View>
          <Text style={[styles.textBold, { marginBottom: 6 }]}>Campos Obligatorios:</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 0.4 }]}>Campo</Text>
              <Text style={styles.tableHeaderText}>Descripción</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.4 }]}>Formato</Text>
            </View>
            <TableRow cells={[{ text: 'Nombre' }, { text: 'Nombre completo' }, { text: 'Texto' }]} />
            <TableRow cells={[{ text: 'Apellidos' }, { text: 'Apellidos completos' }, { text: 'Texto' }]} alt />
            <TableRow cells={[{ text: 'D.N.I. / N.I.E.' }, { text: 'Documento identificación' }, { text: '12345678X' }]} />
            <TableRow cells={[{ text: 'Fecha Nacimiento' }, { text: 'Fecha de nacimiento' }, { text: 'DD/MM/AAAA' }]} alt />
            <TableRow cells={[{ text: 'Domicilio' }, { text: 'Dirección completa' }, { text: 'Calle, nº, piso...' }]} />
            <TableRow cells={[{ text: 'Localidad' }, { text: 'Ciudad/población' }, { text: 'Texto' }]} alt />
            <TableRow cells={[{ text: 'Provincia' }, { text: 'Provincia' }, { text: 'Ciudad Real' }]} />
            <TableRow cells={[{ text: 'C.P.' }, { text: 'Código postal' }, { text: '5 dígitos' }]} alt />
            <TableRow cells={[{ text: 'Email' }, { text: 'Correo electrónico' }, { text: 'formato@correo.com' }]} />
            <TableRow cells={[{ text: 'Teléfono' }, { text: 'Teléfono de contacto' }, { text: '9-15 dígitos' }]} alt />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>5</Text></View>
            <Text style={styles.sectionTitle}>Disponibilidad Horaria y Autorizaciones</Text>
          </View>
          <View style={styles.grid2}>
            <View style={styles.gridColumn}>
              <Text style={[styles.textBold, { marginBottom: 4 }]}>Hora de salida de otros estudios:</Text>
              <View style={styles.list}>
                <BulletItem>Antes de las 17 h</BulletItem>
                <BulletItem>17 h</BulletItem>
                <BulletItem>18 h</BulletItem>
              </View>
            </View>
            <View style={styles.gridColumn}>
              <Text style={[styles.textBold, { marginBottom: 4 }]}>Campos obligatorios:</Text>
              <View style={styles.list}>
                <BulletItem accent>Disponibilidad horaria de mañana</BulletItem>
                <BulletItem accent>Autorización uso de imagen</BulletItem>
              </View>
            </View>
          </View>
          <InfoBox type="info">
            <Text style={[styles.textSmall, { color: colors.info }]}>
              La autorización de imagen está regulada por: Art. 18 Constitución Española, Ley 1/1982, Ley 15/1999 de Protección de Datos.
            </Text>
          </InfoBox>
        </View>
      </View>
      <PageFooter />
    </Page>

    {/* ═══════════════════════════════════════════════════════════ */}
    {/* PAGE 3: Sección 2 - Menores + Sección 3 - Matriculación    */}
    {/* ═══════════════════════════════════════════════════════════ */}
    <Page size="A4" style={styles.page}>
      <PageHeader />
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>6</Text></View>
            <Text style={styles.sectionTitle}>Sección 2: Menores de 18 años</Text>
          </View>
          <InfoBox type="warning">
            <Text style={[styles.textSmall, { color: '#dd6b20' }]}>
              Esta sección es OPCIONAL y solo debe cumplimentarse cuando el/la alumno/a sea menor de edad.
            </Text>
          </InfoBox>
          <View style={styles.grid2}>
            <View style={styles.gridColumn}>
              <Text style={[styles.textBold, { marginBottom: 4 }]}>Tutor/a Legal 1:</Text>
              <View style={styles.list}>
                <BulletItem>Apellidos y Nombre</BulletItem>
                <BulletItem>D.N.I.</BulletItem>
              </View>
            </View>
            <View style={styles.gridColumn}>
              <Text style={[styles.textBold, { marginBottom: 4 }]}>Tutor/a Legal 2 (Opcional):</Text>
              <View style={styles.list}>
                <BulletItem>Apellidos y Nombre</BulletItem>
                <BulletItem>D.N.I.</BulletItem>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>7</Text></View>
            <Text style={styles.sectionTitle}>Sección 3: Datos de Matriculación</Text>
          </View>
          <Text style={[styles.textBold, { marginBottom: 6 }]}>Tipo de Enseñanza:</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Opción</Text>
              <Text style={styles.tableHeaderText}>Cursos disponibles</Text>
            </View>
            <TableRow cells={[{ text: 'Enseñanza Elemental' }, { text: '1º, 2º, 3º, 4º' }]} />
            <TableRow cells={[{ text: 'Enseñanza Profesional' }, { text: '1º, 2º, 3º, 4º, 5º, 6º' }]} alt />
          </View>
          <InfoBox type="alert">
            <Text style={[styles.textSmall, { color: colors.accent }]}>
              Nota importante: La especialidad de Canto no está disponible en Enseñanza Elemental.
            </Text>
          </InfoBox>
          <Text style={[styles.textBold, { marginTop: 8, marginBottom: 6 }]}>Especialidades Disponibles:</Text>
          <Text style={styles.text}>
            Canto, Clarinete, Contrabajo, Fagot, Flauta Travesera, Guitarra, Oboe, Percusión, Piano, Saxofón, Trombón, Trompa, Trompeta, Tuba, Viola, Violín, Violoncello
          </Text>
          <Text style={[styles.textBold, { marginTop: 8, marginBottom: 6 }]}>Asignaturas Pendientes:</Text>
          <View style={styles.list}>
            <BulletItem>Asignatura pendiente 1: Obligatoria si hay pendientes</BulletItem>
            <BulletItem>Asignatura pendiente 2: Solo en Enseñanza Profesional</BulletItem>
          </View>
          <InfoBox type="warning">
            <Text style={[styles.textSmall, { color: '#dd6b20' }]}>
              Las asignaturas pendientes tienen un recargo del 20% sobre el precio base de la asignatura.
            </Text>
          </InfoBox>
        </View>
      </View>
      <PageFooter />
    </Page>

    {/* ═══════════════════════════════════════════════════════════ */}
    {/* PAGE 4: Perfiles 5º/6º + Convalidaciones                   */}
    {/* ═══════════════════════════════════════════════════════════ */}
    <Page size="A4" style={styles.page}>
      <PageHeader />
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>8</Text></View>
            <Text style={styles.sectionTitle}>Perfiles Profesionales (5º y 6º de Profesional)</Text>
          </View>
          <Text style={styles.text}>
            En 5º y 6º curso de Enseñanza Profesional, el alumno debe elegir un único perfil profesional:
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 0.3 }]}>Perfil</Text>
              <Text style={styles.tableHeaderText}>Asignaturas</Text>
            </View>
            <TableRow cells={[{ text: 'Perfil A' }, { text: 'Fundamentos de Composición' }]} />
            <TableRow cells={[{ text: 'Perfil B' }, { text: '5º: Improvisación / Informática Musical — 6º: Didáctica Musical / Improvisación' }]} alt />
            <TableRow cells={[{ text: 'Perfil C' }, { text: '5º: Improvisación / Instrumento Complementario — 6º: Música Moderna / Coro' }]} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>9</Text></View>
            <Text style={styles.sectionTitle}>Convalidación de Asignaturas</Text>
          </View>
          <Text style={styles.text}>
            El formulario permite solicitar convalidación de asignaturas mediante tres vías:
          </Text>

          <Text style={[styles.textBold, { marginTop: 8, marginBottom: 4 }]}>1. Doble Especialidad o Similar:</Text>
          <View style={styles.list}>
            <BulletItem>Para asignaturas ya cursadas y superadas con coincidencia en denominación y curso</BulletItem>
            <BulletItem>Supone reducción en tasas (47€ Elemental, 58€ Profesional)</BulletItem>
            <BulletItem accent>Excepciones: Orquesta/Banda y Música de Cámara</BulletItem>
          </View>

          <Text style={[styles.textBold, { marginTop: 8, marginBottom: 4 }]}>2. Asignaturas de ESO y Bachillerato:</Text>
          <View style={styles.list}>
            <BulletItem>Convalidación con materias del sistema educativo general</BulletItem>
            <BulletItem>Supone reducción en tasas</BulletItem>
            <BulletItem>Requiere certificado académico oficial como documento adjunto</BulletItem>
          </View>

          <Text style={[styles.textBold, { marginTop: 8, marginBottom: 4 }]}>3. Otros Estudios o Planes Anteriores:</Text>
          <View style={styles.list}>
            <BulletItem>Estudios de planes antiguos no reconocibles directamente</BulletItem>
            <BulletItem accent>No supone reducción inmediata en tasas</BulletItem>
            <BulletItem>Requiere tramitación ante el Ministerio de Educación</BulletItem>
          </View>

          <InfoBox type="info">
            <Text style={[styles.textSmall, { color: colors.info }]}>
              La resolución de convalidaciones quedará condicionada a la aportación de documentación acreditativa (certificado académico oficial, programas de estudio, etc.).
            </Text>
          </InfoBox>
        </View>
      </View>
      <PageFooter />
    </Page>

    {/* ═══════════════════════════════════════════════════════════ */}
    {/* PAGE 5: Sección 4 - Forma de Pago (Tasas)                  */}
    {/* ═══════════════════════════════════════════════════════════ */}
    <Page size="A4" style={styles.page}>
      <PageHeader />
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>10</Text></View>
            <Text style={styles.sectionTitle}>Sección 4: Forma de Pago</Text>
          </View>

          <Text style={[styles.textBold, { marginBottom: 6 }]}>Tasas Generales (Orden 68/2022):</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Concepto</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.4 }]}>Importe</Text>
            </View>
            <TableRow cells={[{ text: 'Servicios Generales' }, { text: '10,00 €' }]} />
            <TableRow cells={[{ text: 'Apertura de Expediente (solo primer año)' }, { text: '25,00 €' }]} alt />
            <TableRow cells={[{ text: 'Prueba de Acceso (solo Profesional)' }, { text: '40,00 €' }]} />
          </View>

          <Text style={[styles.textBold, { marginTop: 10, marginBottom: 6 }]}>Tasas por Curso:</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Nivel</Text>
              <Text style={styles.tableHeaderText}>Cursos</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.4 }]}>Importe</Text>
            </View>
            <TableRow cells={[{ text: 'Elemental' }, { text: '1º y 2º' }, { text: '94 €' }]} />
            <TableRow cells={[{ text: 'Elemental' }, { text: '3º y 4º' }, { text: '188 €' }]} alt />
            <TableRow cells={[{ text: 'Profesional' }, { text: '1º y 2º' }, { text: '232 €' }]} />
            <TableRow cells={[{ text: 'Profesional' }, { text: '3º a 6º' }, { text: '348 €' }]} alt />
          </View>

          <Text style={[styles.textBold, { marginTop: 10, marginBottom: 6 }]}>Precio por Asignatura:</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Nivel</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.4 }]}>Importe por asignatura</Text>
            </View>
            <TableRow cells={[{ text: 'Elemental' }, { text: '47 €' }]} />
            <TableRow cells={[{ text: 'Profesional' }, { text: '58 €' }]} alt />
          </View>

          <Text style={[styles.textBold, { marginTop: 10, marginBottom: 6 }]}>Opciones de Pago:</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Opción</Text>
              <Text style={styles.tableHeaderText}>Descripción</Text>
            </View>
            <TableRow cells={[{ text: 'Pago Único' }, { text: 'Total a ingresar en un solo pago' }]} />
            <TableRow cells={[{ text: 'Pago Fraccionado' }, { text: 'Dos pagos (1er plazo + 2º plazo en diciembre)' }]} alt />
            <TableRow cells={[{ text: 'Solicita Beca' }, { text: 'Solo Profesional. Requiere justificante de registro de beca' }]} />
          </View>

          <InfoBox type="warning">
            <Text style={[styles.textSmall, { color: '#dd6b20' }]}>
              El segundo pago del fraccionado debe realizarse en la primera semana de diciembre, enviando el justificante al correo electrónico del conservatorio.
            </Text>
          </InfoBox>
        </View>
      </View>
      <PageFooter />
    </Page>

    {/* ═══════════════════════════════════════════════════════════ */}
    {/* PAGE 6: Reducciones y Exenciones                           */}
    {/* ═══════════════════════════════════════════════════════════ */}
    <Page size="A4" style={styles.page}>
      <PageHeader />
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>11</Text></View>
            <Text style={styles.sectionTitle}>Reducciones y Exenciones de Tasas</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Tipo de Reducción</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.4 }]}>Descuento</Text>
            </View>
            <TableRow cells={[{ text: 'Ninguna' }, { text: '0%' }]} />
            <TableRow cells={[{ text: 'Familia Numerosa General' }, { text: '50%' }]} alt />
            <TableRow cells={[{ text: 'Familia Numerosa Especial' }, { text: '100% (exento)' }]} />
            <TableRow cells={[{ text: 'Discapacidad ≥ 33%' }, { text: '100% (exento)' }]} alt />
            <TableRow cells={[{ text: 'Víctima de Terrorismo' }, { text: '100% (exento)' }]} />
            <TableRow cells={[{ text: 'Víctima de Violencia de Género' }, { text: '100% (exento)' }]} alt />
            <TableRow cells={[{ text: 'Ingreso Mínimo de Solidaridad' }, { text: '100% (exento)' }]} />
          </View>

          <Text style={[styles.textBold, { marginTop: 10, marginBottom: 6 }]}>Matrícula de Honor (Art. 13):</Text>
          <Text style={styles.text}>
            Bonificación adicional equivalente al precio de una asignatura (58€). Acumulable solo con: Ninguna reducción o Familia Numerosa General.
          </Text>

          <InfoBox type="alert">
            <Text style={[styles.textSmall, { color: colors.accent }]}>
              Será necesario adjuntar documentación acreditativa de la circunstancia que justifique la reducción. Hasta que no se aporte, la tramitación quedará en suspenso y, transcurrido el plazo de matrícula sin haber aportado dicha documentación, la solicitud quedará desestimada.
            </Text>
          </InfoBox>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>12</Text></View>
            <Text style={styles.sectionTitle}>Apertura de Expediente (Art. 12)</Text>
          </View>
          <Text style={styles.text}>
            El alumnado que se matricule por primera vez en un centro público para cursar enseñanzas elementales o profesionales de música, o que inicie una nueva enseñanza o especialidad, deberá abonar el precio público por apertura de expediente académico (25,00 €).
          </Text>
          <InfoBox type="info">
            <Text style={[styles.textSmall, { color: colors.info }]}>
              Se abona la primera vez que te matriculas en cada enseñanza o especialidad.
            </Text>
          </InfoBox>
        </View>
      </View>
      <PageFooter />
    </Page>

    {/* ═══════════════════════════════════════════════════════════ */}
    {/* PAGE 7: Modelo 046 + Información Legal                     */}
    {/* ═══════════════════════════════════════════════════════════ */}
    <Page size="A4" style={styles.page}>
      <PageHeader />
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>13</Text></View>
            <Text style={styles.sectionTitle}>Modelo 046 — Pago de Tasas</Text>
          </View>
          <Text style={styles.text}>
            Para realizar el pago de tasas, es necesario utilizar el Modelo 046 de la Junta de Comunidades de Castilla-La Mancha. El formulario incluye un enlace directo al Modelo 046.
          </Text>

          <Text style={[styles.textBold, { marginTop: 8, marginBottom: 6 }]}>Datos para cumplimentar:</Text>
          <View style={styles.infoBox}>
            <Text style={[styles.textSmall, { color: colors.info, fontWeight: 'bold' }]}>Consejería:</Text>
            <Text style={[styles.textSmall, { marginBottom: 4 }]}>CONSEJERÍA DE EDUCACIÓN, CULTURA Y DEPORTES</Text>
            <Text style={[styles.textSmall, { color: colors.info, fontWeight: 'bold' }]}>Órgano Gestor:</Text>
            <Text style={[styles.textSmall, { marginBottom: 4 }]}>DELG. PROV. DE EDUCACIÓN, CULTURA Y DEP. CIUDAD REAL</Text>
            <Text style={[styles.textSmall, { color: colors.info, fontWeight: 'bold' }]}>Concepto:</Text>
            <Text style={styles.textSmall}>2032 – PRECIO PÚBLICO DE ENSEÑANZAS DE IDIOMAS, MÚSICA, DANZA Y DISEÑO</Text>
          </View>

          <Text style={[styles.textBold, { marginTop: 8, marginBottom: 4 }]}>Pasos para cumplimentar:</Text>
          <View style={styles.list}>
            <BulletItem>Hacer clic en el botón "Modelo 046" del formulario</BulletItem>
            <BulletItem>Ingresar los datos solicitados (fecha de devengo, datos personales del pagador)</BulletItem>
            <BulletItem>En Descripción: indicar enseñanza, especialidad, curso y bonificación si aplica</BulletItem>
            <BulletItem>Realizar el pago y guardar el justificante (no vale la copia de autoliquidación)</BulletItem>
          </View>

          <InfoBox type="warning">
            <Text style={[styles.textSmall, { color: '#dd6b20' }]}>
              Será necesario adjuntar el justificante del pago (no es válido copia de la autoliquidación). Hasta que no se aporte, la tramitación quedará en suspenso.
            </Text>
          </InfoBox>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>14</Text></View>
            <Text style={styles.sectionTitle}>Información Legal y Autorizaciones</Text>
          </View>
          <Text style={[styles.textBold, { marginBottom: 4 }]}>Autorización para publicación de imágenes:</Text>
          <Text style={styles.text}>
            El conservatorio pide el consentimiento para publicar imágenes y/o grabaciones audiovisuales con carácter pedagógico y divulgativo, conforme al Art. 18 de la Constitución Española, Ley 1/1982 y Ley 15/1999 de Protección de Datos.
          </Text>
          <Text style={[styles.textBold, { marginTop: 8, marginBottom: 4 }]}>Protección de Datos:</Text>
          <Text style={styles.text}>
            Los datos personales obtenidos mediante este formulario serán incorporados al fichero de la aplicación de gestión académica, conforme a la Ley Orgánica 15/1999 de Protección de Datos de Carácter Personal. Puede ejercitar sus derechos de acceso, rectificación, cancelación y oposición dirigiendo un escrito a la Consejería competente en educación.
          </Text>
        </View>
      </View>
      <PageFooter />
    </Page>

    {/* ═══════════════════════════════════════════════════════════ */}
    {/* PAGE 8: Documentos Adjuntos + Envío                        */}
    {/* ═══════════════════════════════════════════════════════════ */}
    <Page size="A4" style={styles.page}>
      <PageHeader />
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>15</Text></View>
            <Text style={styles.sectionTitle}>Documentos Adjuntos</Text>
          </View>
          <Text style={styles.text}>
            Archivos permitidos: Imágenes (JPG, PNG) y PDF. Tamaño máximo total: 9 MB.
          </Text>
          <Text style={[styles.textBold, { marginTop: 8, marginBottom: 6 }]}>Documentación según situación:</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Situación</Text>
              <Text style={styles.tableHeaderText}>Documentación requerida</Text>
            </View>
            <TableRow cells={[{ text: 'Familia numerosa' }, { text: 'Título de familia numerosa' }]} />
            <TableRow cells={[{ text: 'Discapacidad' }, { text: 'Certificado de discapacidad ≥ 33%' }]} alt />
            <TableRow cells={[{ text: 'Víctima de terrorismo' }, { text: 'Certificado de víctima' }]} />
            <TableRow cells={[{ text: 'Violencia de género' }, { text: 'Orden de protección o sentencia' }]} alt />
            <TableRow cells={[{ text: 'Pago de tasas' }, { text: 'Justificante del Modelo 046' }]} />
            <TableRow cells={[{ text: 'Convalidación' }, { text: 'Certificado académico oficial' }]} alt />
            <TableRow cells={[{ text: 'Beca' }, { text: 'Justificante de registro de beca' }]} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>16</Text></View>
            <Text style={styles.sectionTitle}>Envío del Formulario</Text>
          </View>
          <Text style={[styles.textBold, { marginBottom: 6 }]}>Proceso de Envío:</Text>
          <View style={styles.list}>
            <BulletItem blue>Previsualizar PDF: Ver el documento antes de enviar</BulletItem>
            <BulletItem blue>Vista Previa al Envío: Validación de campos obligatorios</BulletItem>
            <BulletItem blue>Enviar y Descargar: Envía datos al sistema y descarga PDF</BulletItem>
          </View>

          <Text style={[styles.textBold, { marginTop: 8, marginBottom: 6 }]}>Estados de Envío:</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Estado</Text>
              <Text style={styles.tableHeaderText}>Significado</Text>
            </View>
            <TableRow cells={[{ text: 'Idle' }, { text: 'Formulario listo para enviar' }]} />
            <TableRow cells={[{ text: 'Enviando' }, { text: 'Proceso de envío en curso' }]} alt />
            <TableRow cells={[{ text: 'Success' }, { text: 'Envío exitoso' }]} />
            <TableRow cells={[{ text: 'Error' }, { text: 'Error en el envío' }]} alt />
            <TableRow cells={[{ text: 'Duplicate' }, { text: 'Ya existe una solicitud con los mismos datos' }]} />
          </View>

          <InfoBox type="info">
            <Text style={[styles.textSmall, { color: colors.info }]}>
              Si aparece el estado "Duplicate", significa que ya existe una solicitud para ese DNI, especialidad y curso. Contacta con la Secretaría del Conservatorio para modificarla.
            </Text>
          </InfoBox>
        </View>
      </View>
      <PageFooter />
    </Page>

    {/* ═══════════════════════════════════════════════════════════ */}
    {/* PAGE 9: Contacto y Recomendaciones                         */}
    {/* ═══════════════════════════════════════════════════════════ */}
    <Page size="A4" style={styles.page}>
      <PageHeader />
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumber}><Text style={{ color: colors.white, fontSize: 11 }}>17</Text></View>
            <Text style={styles.sectionTitle}>Contacto y Recomendaciones</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={[styles.textSmall, { color: colors.info, fontWeight: 'bold' }]}>Contacto con el Conservatorio:</Text>
            <Text style={[styles.textSmall, { marginTop: 4 }]}>Teléfono: 926 274 154</Text>
            <Text style={styles.textSmall}>Email: 13004341.cpm@educastillalamancha.es</Text>
            <Text style={styles.textSmall}>Web: www.conservatoriociudadreal.es</Text>
          </View>
          <Text style={[styles.textBold, { marginTop: 10, marginBottom: 6 }]}>Recomendaciones:</Text>
          <View style={styles.list}>
            <BulletItem>Revisar todos los datos antes de enviar</BulletItem>
            <BulletItem>Guardar el PDF descargado como comprobante</BulletItem>
            <BulletItem>Adjuntar documentación acreditativa cuando sea necesario</BulletItem>
            <BulletItem>Conservar el justificante de pago del Modelo 046</BulletItem>
            <BulletItem>Contactar con secretaría si hay alguna duda</BulletItem>
          </View>

          <View style={[styles.infoBox, { marginTop: 20, backgroundColor: '#f0fff4', borderLeftColor: colors.success }]}>
            <Text style={[styles.textSmall, { color: colors.success, fontWeight: 'bold' }]}>¡Gracias por usar el sistema de matriculación digital!</Text>
            <Text style={[styles.textSmall, { marginTop: 4 }]}>
              Conservatorio Profesional de Música "Marcos Redondo" — Ciudad Real
            </Text>
          </View>
        </View>
      </View>
      <PageFooter />
    </Page>
  </Document>
);

export default TutorialPdf;
