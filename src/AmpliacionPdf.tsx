import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { EnrollmentFormData } from './types';
import logoCpm from './assets/logo_cpm.png';
import logoJccm from './assets/logo_jccm.png';

export interface AmpliacionSubject {
  MATERIA: string;
  DESCRIPCION: string;
  tipo?: 'matriculada' | 'perfil' | 'pendiente' | 'convalidada';
}

export interface AmpliacionPdfProps {
  formData: EnrollmentFormData;
  academicYear: string;
  submitTimestamp: Date;
  asignaturasMatriculadas: AmpliacionSubject[];
  requestNumber?: string;
}

const C = {
  bg: '#F5F5F5', white: '#FFFFFF',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB',
  gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151',
  gray800: '#1F2937', gray900: '#111827',
  blue50: '#EFF6FF', blue200: '#BFDBFE', blue700: '#1D4ED8', blue800: '#1E40AF',
  orange50: '#FFF7ED', orange200: '#FED7AA', orange800: '#92400E',
  green50: '#F0FDF4', green100: '#DCFCE7', green200: '#BBF7D0', green700: '#15803D', green800: '#166534',
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple700: '#7E22CE',
};

const s = StyleSheet.create({
  page: { backgroundColor: C.bg, padding: 20, fontSize: 9, color: C.gray900, fontFamily: 'Helvetica' },
  card: { backgroundColor: C.white, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: C.gray100, borderStyle: 'solid' },
  sectionTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.gray100, borderBottomStyle: 'solid' },
  row: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  fieldLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1.5 },
  fieldValue: { fontSize: 9, fontFamily: 'Helvetica', color: C.gray800, backgroundColor: C.gray50, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  fieldValueHighlight: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.gray800, backgroundColor: C.gray50, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  dotFilled: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: C.gray900, borderStyle: 'solid', backgroundColor: C.gray900 },
  dotEmpty:  { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: C.gray500, borderStyle: 'solid' },
  boxFilled: { width: 8, height: 8, borderRadius: 2, borderWidth: 1.5, borderColor: C.gray900, borderStyle: 'solid', backgroundColor: C.gray900 },
  boxEmpty:  { width: 8, height: 8, borderRadius: 2, borderWidth: 1.5, borderColor: C.gray500, borderStyle: 'solid' },
  labelSmall: { fontSize: 7.5, color: C.gray700, fontFamily: 'Helvetica' },
  labelMicro: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.4 },
});

const Field = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View>
    <Text style={s.fieldLabel}>{label}</Text>
    <Text style={highlight ? s.fieldValueHighlight : s.fieldValue}>{value || '—'}</Text>

  </View>
);

const AmpliacionPdfComponent = ({ formData, academicYear, submitTimestamp, asignaturasMatriculadas, requestNumber }: AmpliacionPdfProps) => {
  const fechaFmt = formData.fechaNacimiento
    ? new Date(formData.fechaNacimiento + 'T12:00:00').toLocaleDateString('es-ES')
    : '';

  const reduccionLabel =
    formData.tipoReduccion === 'fam_num_general' ? 'Familia Numerosa (General)'
    : formData.tipoReduccion === 'fam_num_especial' ? 'Familia Numerosa (Especial)'
    : formData.tipoReduccion === 'discapacidad' ? 'Discapacidad'
    : formData.tipoReduccion === 'terrorismo' ? 'Víctima Terrorismo'
    : formData.tipoReduccion === 'violencia_genero' ? 'Víctima Violencia de Género'
    : formData.tipoReduccion === 'ingreso_minimo' ? 'Ingreso Mínimo Vital'
    : 'Ninguna';

  const yearMatch = academicYear.match(/(\d{4})\s*\/\s*(\d{4})/);
  const cursoShort = yearMatch ? `${yearMatch[1].slice(-2)}/${yearMatch[2].slice(-2)}` : '';

  const STYLES: Record<NonNullable<AmpliacionSubject['tipo']>, { bg: string; border: string; code: string; codeBg: string; badge: string; badgeBg: string; badgeBorder: string; label: string }> = {
    matriculada: { bg: C.white,      border: C.blue200,   code: C.blue700,   codeBg: C.blue50,   badge: C.blue700,   badgeBg: C.blue50,   badgeBorder: C.blue200,   label: 'Matriculada' },
    perfil:      { bg: C.purple50,   border: C.purple200, code: C.purple700, codeBg: C.purple100, badge: C.purple700, badgeBg: C.purple100, badgeBorder: C.purple200, label: 'Perfil' },
    pendiente:   { bg: C.orange50,   border: C.orange200, code: C.orange800, codeBg: C.orange50,  badge: C.orange800, badgeBg: C.orange50,  badgeBorder: C.orange200, label: 'Pendiente' },
    convalidada: { bg: C.green50,    border: C.green200,  code: C.green700,  codeBg: C.green100, badge: C.green700,  badgeBg: C.green100, badgeBorder: C.green200,  label: 'Convalidada' },
  };

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={{ ...s.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: 10 }}>
          <Image src={logoJccm} style={{ height: 30 }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.gray900 }}>AMPLIACIÓN DE MATRÍCULA</Text>
            <Text style={{ fontSize: 9, color: C.gray500, marginTop: 1 }}>Curso Académico {academicYear}</Text>
            <Text style={{ fontSize: 8, color: C.gray400 }}>C.P.M. "Marcos Redondo", Ciudad Real</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Image src={logoCpm} style={{ height: 30 }} />
              {requestNumber && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#F97316', lineHeight: 1 }}>
                    #{requestNumber}
                  </Text>
                  {cursoShort && (
                    <Text style={{ fontSize: 8, color: '#F97316', marginTop: 1 }}>
                      Curso {cursoShort}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <View style={{ backgroundColor: '#F97316', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white }}>
                Enviado: {submitTimestamp.toLocaleDateString('es-ES')}{' '}
                {submitTimestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Fila 1: Datos Personales (izq) + Datos de Matrícula (der) ── */}
        <View style={{ flexDirection: 'row', gap: 6 }}>

          {/* Columna izquierda: Datos Personales */}
          <View style={{ flex: 3 }}>
            <View style={s.card}>
              <Text style={s.sectionTitle}>Datos Personales</Text>
              <View style={s.row}>
                <View style={{ flex: 1 }}><Field label="Nombre" value={formData.nombre} /></View>
                <View style={{ flex: 1.4 }}><Field label="Apellidos" value={formData.apellidos} /></View>
              </View>
              <View style={s.row}>
                <View style={{ flex: 1 }}><Field label="D.N.I. / N.I.E." value={formData.dni} /></View>
                <View style={{ flex: 1 }}><Field label="Fecha de nac." value={fechaFmt} /></View>
              </View>
              <View style={s.row}>
                <View style={{ flex: 1.8 }}><Field label="Correo electrónico" value={formData.email} /></View>
                <View style={{ flex: 1 }}><Field label="Teléfono" value={formData.telefono} /></View>
              </View>
              <View style={s.row}>
                <View style={{ flex: 1.8 }}><Field label="Domicilio actual" value={formData.domicilio} /></View>
              </View>
              <View style={{ ...s.row, marginBottom: 0 }}>
                <View style={{ flex: 1.8 }}><Field label="Localidad" value={formData.localidad} /></View>
                <View style={{ flex: 1 }}><Field label="Provincia" value={formData.provincia} /></View>
                <View style={{ flex: 0.8 }}><Field label="C.P." value={formData.codigoPostal} /></View>
              </View>
            </View>
          </View>

          {/* Columna derecha: Datos de Matrícula */}
          <View style={{ flex: 1.4 }}>
            <View style={s.card}>
              <Text style={s.sectionTitle}>Datos de Matrícula</Text>
              <View style={{ gap: 4 }}>
                <Field
                  label="Enseñanza / Curso"
                  value={`${formData.tipoEnsenanza === 'elemental' ? 'Enseñanza Elemental' : formData.tipoEnsenanza === 'profesional' ? 'Enseñanza Profesional' : '—'} — ${formData.curso || '—'}`}
                />
                <Field label="Especialidad" value={formData.especialidad} />
                <Field
                  label="Forma de Pago"
                  value={formData.formaPago === 'unico' ? 'Pago Único' : formData.formaPago === 'fraccionado' ? 'Pago Fraccionado' : formData.formaPago === 'beca' ? 'Solicita Beca' : '—'}
                />
                <Field label="Reducción de Tasas" value={reduccionLabel} />
              </View>

              <View style={{ marginTop: 6, paddingTop: 5, borderTopWidth: 1, borderTopColor: C.gray100, borderTopStyle: 'solid', flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.labelMicro}>Hora salida</Text>
                  {(['<17 h', '17 h', '18 h'] as const).map(h => (
                    <View key={h} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <View style={(formData.horaSalidaEstudios === h || (h === '<17 h' && formData.horaSalidaEstudios === 'Antes de las 17 h')) ? s.dotFilled : s.dotEmpty} />
                      <Text style={s.labelSmall}>{h}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.labelMicro}>Disponib. mañana</Text>
                  {([{ label: 'Sí', val: true }, { label: 'No', val: false }]).map(op => (
                    <View key={op.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <View style={formData.disponibilidadManana === op.val ? s.boxFilled : s.boxEmpty} />
                      <Text style={s.labelSmall}>{op.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.labelMicro}>Autorización imagen</Text>
                  {([{ label: 'Sí', val: true }, { label: 'No', val: false }]).map(op => (
                    <View key={op.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <View style={formData.autorizacionImagen === op.val ? s.boxFilled : s.boxEmpty} />
                      <Text style={s.labelSmall}>{op.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Asignaturas Matriculadas ── */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Asignaturas Matriculadas ({asignaturasMatriculadas.length})</Text>
          {asignaturasMatriculadas.length > 0 && (
            <View style={{ backgroundColor: C.blue50, borderRadius: 6, padding: 8, borderWidth: 1, borderColor: C.blue200, borderStyle: 'solid' }}>
              <View>
                {asignaturasMatriculadas.map((item, idx) => {
                  const tipo = item.tipo || 'matriculada';
                  const st = STYLES[tipo];
                  return (
                    <View key={`${item.MATERIA}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: st.bg, borderWidth: 1, borderColor: st.border, borderStyle: 'solid', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, marginBottom: 2 }}>
                      <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: st.code, backgroundColor: st.codeBg, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2 }}>
                        {item.MATERIA}
                      </Text>
                      <Text style={{ fontSize: 8, color: C.gray700, flex: 1 }}>{item.DESCRIPCION}</Text>
                      <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: st.badge, backgroundColor: st.badgeBg, borderWidth: 1, borderColor: st.badgeBorder, borderStyle: 'solid', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 8 }}>
                        {st.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* ── Firmas ── */}
        <View style={{ ...s.card, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 8 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: C.gray400, borderTopStyle: 'solid', marginBottom: 4 }} />
              <Text style={{ fontSize: 8, color: C.gray500 }}>Firma del/la Alumno/a</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: C.gray400, borderTopStyle: 'solid', marginBottom: 4 }} />
              <Text style={{ fontSize: 8, color: C.gray500 }}>Sello y firma de Secretaría</Text>
              <Text style={{ fontSize: 7, color: C.gray400, marginTop: 2 }}>
                Ciudad Real, {submitTimestamp.toLocaleDateString('es-ES')}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.gray800 }}>
              {formData.nombre} {formData.apellidos}
            </Text>
          </View>
        </View>

        {/* ── Pie de página ── */}
        <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.gray200, borderTopStyle: 'solid', flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: 1.5 }}>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray700 }}>Consejería de Educación, Cultura y Deportes</Text>
            <Text style={{ fontSize: 7, color: C.gray700 }}>Conservatorio Profesional de Música "Marcos Redondo"</Text>
            <Text style={{ fontSize: 7, color: C.gray500 }}>Calle Pantano del Vicario, 1  -  13004 Ciudad Real</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 1.5 }}>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray700 }}>926 274 154</Text>
            <Text style={{ fontSize: 7, color: C.gray500 }}>13004341.cpm@educastillalamancha.es</Text>
            <Text style={{ fontSize: 7, color: C.gray500 }}>www.conservatoriociudadreal.es</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};

const AmpliacionPdfMemoized = React.memo(AmpliacionPdfComponent);
export { AmpliacionPdfMemoized as AmpliacionPdf };
