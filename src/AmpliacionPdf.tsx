import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { EnrollmentFormData } from './types';
import logoCpm from './assets/logo_cpm.png';
import logoJccm from './assets/logo_jccm.png';

export interface AmpliacionSubject {
  MATERIA: string;
  DESCRIPCION: string;
  tipo: 'matriculada';
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
};

const s = StyleSheet.create({
  page: { backgroundColor: C.bg, padding: 20, fontSize: 9, color: C.gray900, fontFamily: 'Helvetica' },
  card: { backgroundColor: C.white, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: C.gray100, borderStyle: 'solid' },
  sectionTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.gray100, borderBottomStyle: 'solid' },
  row: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  fieldLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1.5 },
  fieldValue: { fontSize: 9, fontFamily: 'Helvetica', color: C.gray800, backgroundColor: C.gray50, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
});

const Field = ({ label, value }: { label: string; value: string }) => (
  <View>
    <Text style={s.fieldLabel}>{label}</Text>
    <Text style={s.fieldValue}>{value || '—'}</Text>
  </View>
);

const AmpliacionPdfComponent = ({ formData, academicYear, submitTimestamp, asignaturasMatriculadas, requestNumber }: AmpliacionPdfProps) => {
  const fechaFmt = formData.fechaNacimiento
    ? new Date(formData.fechaNacimiento + 'T12:00:00').toLocaleDateString('es-ES')
    : '';

  const yearMatch = academicYear.match(/(\d{4})\s*\/\s*(\d{4})/);
  const cursoShort = yearMatch ? `${yearMatch[1].slice(-2)}/${yearMatch[2].slice(-2)}` : '';

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={{ ...s.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: 10 }}>
          <Image src={logoJccm} style={{ height: 30 }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.gray900 }}>Ampliacion de Matricula</Text>
            <Text style={{ fontSize: 9, color: C.gray500, marginTop: 1 }}>Curso Academico {academicYear}</Text>
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

        {/* Datos Personales */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Datos Personales</Text>
          <View style={s.row}>
            <View style={{ flex: 1 }}><Field label="Nombre" value={formData.nombre} /></View>
            <View style={{ flex: 1.4 }}><Field label="Apellidos" value={formData.apellidos} /></View>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}><Field label="D.N.I. / N.I.E." value={formData.dni} /></View>
            <View style={{ flex: 1 }}><Field label="Fecha de nac." value={fechaFmt} /></View>
            <View style={{ flex: 1.8 }}><Field label="Correo electronico" value={formData.email} /></View>
          </View>
          <View style={{ ...s.row, marginBottom: 0 }}>
            <View style={{ flex: 1 }}><Field label="Telefono" value={formData.telefono} /></View>
          </View>
        </View>

        {/* Datos de Matriculacion */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Datos de Matriculacion</Text>
          <View style={s.row}>
            <View style={{ flex: 1.6 }}>
              <Field
                label="Tipo de Ensenanza"
                value={formData.tipoEnsenanza === 'elemental' ? 'Ensenanza Elemental' : formData.tipoEnsenanza === 'profesional' ? 'Ensenanza Profesional' : '—'}
              />
            </View>
            <View style={{ width: 42 }}><Field label="Curso" value={formData.curso} /></View>
            <View style={{ flex: 1.4 }}><Field label="Especialidad" value={formData.especialidad} /></View>
          </View>
        </View>

        {/* Asignaturas a ampliar */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Asignaturas Solicitadas en Ampliacion</Text>
          <View style={{ backgroundColor: C.blue50, borderRadius: 6, padding: 8, borderWidth: 1, borderColor: C.blue200, borderStyle: 'solid' }}>
            {asignaturasMatriculadas.map((item) => (
              <View
                key={item.MATERIA}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.white, borderWidth: 1, borderColor: C.blue200, borderStyle: 'solid', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, marginBottom: 2 }}
              >
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.blue700, backgroundColor: C.blue50, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2 }}>
                  {item.MATERIA}
                </Text>
                <Text style={{ fontSize: 8, color: C.gray700, flex: 1 }}>{item.DESCRIPCION}</Text>
                <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.blue700, backgroundColor: C.blue50, borderWidth: 1, borderColor: C.blue200, borderStyle: 'solid', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 8 }}>
                  Ampliacion
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pie de página */}
        <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.gray200, borderTopStyle: 'solid', flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: 1.5 }}>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray700 }}>Consejeria de Educacion, Cultura y Deportes</Text>
            <Text style={{ fontSize: 7, color: C.gray700 }}>Conservatorio Profesional de Musica "Marcos Redondo"</Text>
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
