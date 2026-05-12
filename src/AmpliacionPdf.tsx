import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { EnrollmentFormData } from './types';

export interface AmpliacionPdfProps {
  formData: EnrollmentFormData;
  academicYear: string;
  submitTimestamp: Date;
  asignaturasMatriculadas: Array<{ MATERIA: string; DESCRIPCION: string; tipo?: string }>;
  requestNumber?: string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  header: { fontSize: 16, marginBottom: 12, fontWeight: 'bold' },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 120, fontWeight: 'bold' },
  value: { flex: 1 },
});

export function AmpliacionPdf({ formData, academicYear, submitTimestamp, asignaturasMatriculadas, requestNumber }: AmpliacionPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Solicitud de Ampliación de Matrícula</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Curso académico:</Text>
          <Text style={styles.value}>{academicYear}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Nº solicitud:</Text>
          <Text style={styles.value}>{requestNumber || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Alumno/a:</Text>
          <Text style={styles.value}>{formData.nombre} {formData.apellidos}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Especialidad:</Text>
          <Text style={styles.value}>{formData.especialidad}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Asignaturas:</Text>
          <Text style={styles.value}>
            {asignaturasMatriculadas.map(a => a.DESCRIPCION).join(', ')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fecha envío:</Text>
          <Text style={styles.value}>{submitTimestamp.toLocaleString('es-ES')}</Text>
        </View>
      </Page>
    </Document>
  );
}
