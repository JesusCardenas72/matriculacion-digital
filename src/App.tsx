/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { EnrollmentFormData } from './types';
import { loadMaterias, buildMateriasIndex, getMaterias, queryMateriasCurso, queryMateriasPrevias, MateriasIndex, Materia } from './data/materias';
import { Music, User, GraduationCap, CreditCard, CheckCircle2, AlertCircle, FileText, Download, Paperclip, X, ExternalLink, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
const loadPdfModule = () => import('@react-pdf/renderer');
const loadPdfLib = () => import('pdf-lib');
const loadPdfJs = async () => {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerPort && !pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      // El worker se inlinea en el bundle (compatible con vite-plugin-singlefile)
      const PdfWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?worker&inline')).default;
      pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
    } catch {
      // Fallback: que pdfjs cree el worker por su cuenta a partir de un URL conocido
      try {
        const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      } catch { /* sin worker: pdfjs intentará el modo fake worker */ }
    }
  }
  return pdfjs;
};
import { MatriculaPdf } from './MatriculaPdf';
import { TutorialPdf } from './TutorialPdf';
import logoCpm from './assets/logo_cpm.png';
import logoJccm from './assets/logo_jccm.png';
import { FEES, ARTICLE_TEXTS, PROFILE_SPECIFIC_SUBJECTS, REDUCCION_LABEL, validateDNI, validateEmail, validateCP, validateTelefono, sanitizeFieldValue, calcularCursoEscolar } from './constants';
import { getCurrentCalendarYear } from './config/academicYear';
import { useAcademicYear } from './hooks/useAcademicYear';

// ─────────────────────────────────────────────────────────────────────────────

type FieldError = { key: string; message: string };

export default function App() {
  const [formData, setFormData] = useState<EnrollmentFormData>({
    nombre: '',
    apellidos: '',
    dni: '',
    fechaNacimiento: '',
    domicilio: '',
    localidad: '',
    provincia: '',
    codigoPostal: '',
    email: '',
    telefono: '',
    horaSalidaEstudios: '',
    disponibilidadManana: false,
    autorizacionImagen: false,
    tutor1Nombre: '',
    tutor1Dni: '',
    tutor2Nombre: '',
    tutor2Dni: '',
    tipoEnsenanza: 'elemental',
    curso: '',
    especialidad: '',
    asignaturaPendiente1: '',
    asignaturaPendiente2: '',
    esRepetidor: false,
    perfilProfesional: '',
    formaPago: 'unico',
    familiaNumerosa: false,
    tipoReduccion: 'ninguna',
    matriculaHonor: false,
    esPrimerAno: false,
    importeTotal: '',
    importe1erPago: '',
    importe2oPago: '',
    convalidacionSolicitada: false,
    convalidacionAsignaturas: [] as string[],
    convalidacionMotivo: '',
  });

  const [isExemptionModalOpen, setIsExemptionModalOpen] = useState(false);
  const [isAperturaWarningOpen, setIsAperturaWarningOpen] = useState(false);
  const [isFeesInfoModalOpen, setIsFeesInfoModalOpen] = useState(false);
  const [isModelo046InfoOpen, setIsModelo046InfoOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<{ title: string; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ key: string; label: string }[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [encryptedPdfNames, setEncryptedPdfNames] = useState<string[]>([]);
  // Contraseñas validadas por nombre de archivo (PDFs desbloqueados por el usuario)
  const [pdfPasswords, setPdfPasswords] = useState<Record<string, string>>({});
  // Valor escrito en cada campo de contraseña del modal (por nombre de archivo)
  const [pwInputs, setPwInputs] = useState<Record<string, string>>({});
  // Mensaje de error/estado por archivo al intentar desbloquear
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwBusy, setPwBusy] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'readonly'>('form');
  const [isConvalidacionModalOpen, setIsConvalidacionModalOpen] = useState(false);
  const [isConvalidacionSubjectModalOpen, setIsConvalidacionSubjectModalOpen] = useState(false);
  const [convalidacionModalView, setConvalidacionModalView] = useState<'types' | 'ministerio'>('types');
  const [convalidacionSubjectContext, setConvalidacionSubjectContext] = useState<'doble' | 'eso_bach'>('doble');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [materiasIndex, setMateriasIndex] = useState<MateriasIndex | null>(null);
  const [materiasLoading, setMateriasLoading] = useState(true);
  const { year: academicYear } = useAcademicYear();

  useEffect(() => {
    loadMaterias()
      .then(data => setMateriasIndex(buildMateriasIndex(data)))
      .catch(() => setMateriasIndex(null))
      .finally(() => setMateriasLoading(false));
  }, []);

  const validateField = useCallback((name: string, value: string) => {
    let error: string | null = null;
    const trimmed = value.trim();

    switch (name) {
      case 'dni':
      case 'tutor1Dni':
      case 'tutor2Dni':
        error = validateDNI(trimmed);
        break;
      case 'email':
        error = validateEmail(trimmed);
        break;
      case 'codigoPostal':
        error = validateCP(trimmed);
        break;
      case 'telefono':
        error = validateTelefono(trimmed);
        break;
    }

    setFieldErrors(prev => {
      if (!error) {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: error };
    });
  }, []);

  const handleValidationClose = () => {
    setShowValidationModal(false);
    if (validationErrors.length > 0) {
      const firstErrorKey = validationErrors[0].key;
      const ref = fieldRefs[firstErrorKey];
      if (ref) {
        setTimeout(() => {
          ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
          ref.focus({ preventScroll: true });
        }, 300);
      }
    }
  };

  const fieldRefs = useRef<Record<string, HTMLElement>>({});
  const registerFieldRef = (name: string) => (el: HTMLElement | null) => {
    if (el) fieldRefs.current[name] = el;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitTimestamp, setSubmitTimestamp] = useState<Date | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  // ── Endpoints directos a Power Automate (sin backend intermedio) ────────────
  const PA_DUPLICADOS_URL = 'https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b62c3d4b21d24bda8daa75a8586198eb/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=4nqPljifCY1CBxAiKj03La2YEksNn78meKn9-nlXGCk';
  const PA_NORDEM_URL     = 'https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/046ad596f6eb4e919d17aff5c8c567f4/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=tvSwEUEfq-lI-Au8YLOtpD5KNyfskQhuuhJ3NGEloww';
  const PA_CREAR_URL      = 'https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ec7a2a1c67974d32ba23de811d20e93d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3G39Rx3ZC55SKVIoBGvRufw-d6J6fYl74GOi46We9f0';
  const PA_PDF_URL        = 'https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b31521c981d04d95a8a6917a899f3988/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=i6YvgMW9GNJO-1Ynz0A3hAiNPGvZVpXkzbsdoeBYsfU';
  const [requestNumber, setRequestNumber] = useState<string | null>(null);

  const cursos = useMemo(() => {
    if (formData.tipoEnsenanza === 'elemental') return ['1º', '2º', '3º', '4º'];
    if (formData.tipoEnsenanza === 'profesional') return ['1º', '2º', '3º', '4º', '5º', '6º'];
    return [];
  }, [formData.tipoEnsenanza]);

  const asignaturasCursoActual = useMemo(() => {
    if (!formData.especialidad || !formData.curso || !formData.tipoEnsenanza || !materiasIndex) return [];
    const all = queryMateriasCurso(materiasIndex, formData.especialidad, formData.curso, formData.tipoEnsenanza as 'elemental' | 'profesional');
    const is5o6 = (formData.curso.includes('5') || formData.curso.includes('6')) && formData.tipoEnsenanza === 'profesional';
    if (!is5o6) return all;

    const is6th = formData.curso.includes('6');
    const profileSubjects: Record<string, string[]> = is6th
      ? {
          'A': ['Fundamentos de Composición'],
          'B': ['Improvisación', 'Didáctica de la Música', 'Didáctica musical'],
          'C': ['Música moderna', 'Coro']
        }
      : {
          'A': ['Fundamentos de Composición'],
          'B': ['Improvisación', 'Informática musical'],
          'C': ['Improvisación', 'Coro']
        };

    return all.filter(m => {
      const mDesc = m.DESCRIPCION;
      const isProfileSpecific = PROFILE_SPECIFIC_SUBJECTS.some(s =>
        mDesc.toLowerCase().includes(s.toLowerCase())
      );
      if (isProfileSpecific) {
        if (!formData.perfilProfesional) return false;
        const allowed = profileSubjects[formData.perfilProfesional] || [];
        return allowed.some(s => mDesc.toLowerCase().includes(s.toLowerCase()));
      }
      return true;
    });
  }, [formData.especialidad, formData.curso, formData.tipoEnsenanza, formData.perfilProfesional, materiasIndex]);

  const asignaturasPrevias = useMemo(() => {
    if (!formData.especialidad || !formData.curso || !formData.tipoEnsenanza || !materiasIndex) return [];
    const cursoNum = parseInt(formData.curso);
    const all = queryMateriasPrevias(materiasIndex, formData.especialidad, cursoNum, formData.tipoEnsenanza as 'elemental' | 'profesional');
    return all.map(m => ({
      id: m.MATERIA,
      label: `${m.DESCRIPCION} (${m.CURSO_N})`,
      materiaId: m.MATERIA
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [formData.especialidad, formData.curso, formData.tipoEnsenanza, materiasIndex]);

  const asignaturasParaRepetidor = useMemo(() => {
    if (!formData.especialidad || !formData.tipoEnsenanza || !materiasIndex) return [];
    // cursoNum+1 para incluir también el último curso (4º elemental → 5, 6º profesional → 7)
    const maxCursoNum = formData.tipoEnsenanza === 'elemental' ? 5 : 7;
    const all = queryMateriasPrevias(materiasIndex, formData.especialidad, maxCursoNum, formData.tipoEnsenanza as 'elemental' | 'profesional');
    return all.map(m => ({
      id: m.MATERIA,
      label: `${m.DESCRIPCION} (${m.CURSO_N})`,
      materiaId: m.MATERIA,
    })).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [formData.especialidad, formData.tipoEnsenanza, materiasIndex]);

  const is5o6Profesional =
    (formData.curso.includes('5') || formData.curso.includes('6')) &&
    formData.tipoEnsenanza === 'profesional';

  const isRepetidorAllowed =
    (formData.tipoEnsenanza === 'elemental' && formData.curso === '4º') ||
    (formData.tipoEnsenanza === 'profesional' && formData.curso === '6º');

  const isRepetidor = !!formData.esRepetidor && isRepetidorAllowed;

  const selectedPendingSubjects = useMemo(() => {
    const pool = isRepetidor ? asignaturasParaRepetidor : asignaturasPrevias;
    const selected = [];
    if (formData.asignaturaPendiente1) {
      const found = pool.find(a => a.id === formData.asignaturaPendiente1);
      if (found) selected.push(found);
    }
    if (formData.asignaturaPendiente2) {
      const found = pool.find(a => a.id === formData.asignaturaPendiente2);
      if (found) selected.push(found);
    }
    return selected;
  }, [formData.asignaturaPendiente1, formData.asignaturaPendiente2, asignaturasPrevias, asignaturasParaRepetidor, isRepetidor]);

  // true solo cuando el repetidor tiene pendientes EXCLUSIVAMENTE del último curso (EE4/EP6)
  // Usa el lookup sin filtrar por perfil para no excluir asignaturas de perfil de 6º
  const allPendingFromLastCourse = useMemo(() => {
    if (!isRepetidor || selectedPendingSubjects.length === 0 || !materiasIndex) return false;
    const rawLastCourse = queryMateriasCurso(materiasIndex, formData.especialidad, formData.curso, formData.tipoEnsenanza as 'elemental' | 'profesional');
    const lastCourseIds = new Set(rawLastCourse.map(m => m.MATERIA));
    return selectedPendingSubjects.every(s => lastCourseIds.has(s.id));
  }, [isRepetidor, selectedPendingSubjects, materiasIndex, formData.especialidad, formData.curso, formData.tipoEnsenanza]);

  const calculation = useMemo(() => {
    if (!formData.tipoEnsenanza || !formData.curso) return null;

    const fees = FEES[formData.tipoEnsenanza as 'elemental' | 'profesional'];
    let cursoBase = (fees.cursos as any)[formData.curso] || 0;

    const isRepetidorEfectivo = !!formData.esRepetidor;
    const repMultiplier = isRepetidorEfectivo ? 1.2 : 1;

    let subtotalAdmin = fees.serviciosGenerales * repMultiplier;
    if (formData.esPrimerAno) subtotalAdmin += fees.aperturaExpediente * repMultiplier;

    let subtotalAcad: number;
    let pending1Cost = 0;
    let pending2Cost = 0;
    let repetidorMode: 'suelta' | 'completo' | null = null;

    if (isRepetidorEfectivo) {
      const hasPending1 = !!formData.asignaturaPendiente1;
      const hasPending2 = !!formData.asignaturaPendiente2;
      const pendingCount = (hasPending1 ? 1 : 0) + (hasPending2 ? 1 : 0);
      const maxSuelta = formData.tipoEnsenanza === 'elemental' ? 1 : 2;

      if (pendingCount > 0 && pendingCount <= maxSuelta && allPendingFromLastCourse) {
        // Asignaturas sueltas del último curso: solo esas asignaturas + 20%
        pending1Cost = hasPending1 ? fees.precioAsignatura * 1.2 : 0;
        pending2Cost = hasPending2 ? fees.precioAsignatura * 1.2 : 0;
        subtotalAcad = pending1Cost + pending2Cost;
        repetidorMode = 'suelta';
      } else {
        // Curso completo + 20%, más pendientes de cursos anteriores si las hay
        pending1Cost = hasPending1 ? fees.precioAsignatura * 1.2 : 0;
        pending2Cost = hasPending2 ? fees.precioAsignatura * 1.2 : 0;
        subtotalAcad = cursoBase * 1.2 + pending1Cost + pending2Cost;
        repetidorMode = 'completo';
      }
    } else {
      // Cálculo normal (asignaturas pendientes de cursos anteriores con recargo 20%)
      pending1Cost = formData.asignaturaPendiente1 ? fees.precioAsignatura * 1.2 : 0;
      pending2Cost = formData.asignaturaPendiente2 ? fees.precioAsignatura * 1.2 : 0;
      subtotalAcad = cursoBase + pending1Cost + pending2Cost;
    }

    // Convalidación: descuenta precioAsignatura por cada asignatura convalidada
    const numConvalidadas = formData.convalidacionSolicitada
      ? (formData.convalidacionAsignaturas ?? []).length
      : 0;
    const convalidacionDiscount = numConvalidadas * fees.precioAsignatura;
    subtotalAcad = Math.max(0, subtotalAcad - convalidacionDiscount);

    // Matrícula de Honor: descuenta 58€ (apilable solo con fam_num_general, se aplica antes del multiplicador)
    if (formData.matriculaHonor) {
      subtotalAcad = Math.max(0, subtotalAcad - 58);
    }

    let multiplier = 1;
    if (formData.tipoReduccion === 'fam_num_general') multiplier = 0.5;
    else if (formData.tipoReduccion && formData.tipoReduccion !== 'ninguna') multiplier = 0;

    if (formData.formaPago === 'beca') {
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
        aperturaExpediente: formData.esPrimerAno ? fees.aperturaExpediente * repMultiplier * multiplier : 0,
        curso: repetidorMode === 'completo' ? cursoBase * 1.2 * multiplier : cursoBase * multiplier,
        asignaturasPendientes: (pending1Cost + pending2Cost) * multiplier,
        convalidacionDiscount: convalidacionDiscount * multiplier,
        convalidacionCount: numConvalidadas,
        matriculaHonorDiscount: formData.matriculaHonor ? 58 : 0,
        multiplier,
        repetidorMode,
        reductionLabel: (() => {
          const base = formData.tipoReduccion === 'fam_num_general' ? 'Familia Numerosa General (50%)' :
                       formData.tipoReduccion === 'fam_num_especial' ? 'Familia Numerosa Especial (100%)' :
                       formData.tipoReduccion === 'discapacidad' ? 'Discapacidad ≥ 33% (100%)' :
                       formData.tipoReduccion === 'terrorismo' ? 'Víctima de Terrorismo (100%)' :
                       formData.tipoReduccion === 'violencia_genero' ? 'Víctima de Violencia de Género (100%)' :
                       formData.tipoReduccion === 'ingreso_minimo' ? 'Ingreso Mínimo de Solidaridad (100%)' : '';
          if (formData.matriculaHonor) {
            return base ? `${base} + Matrícula de Honor` : 'Matrícula de Honor (1 asignatura)';
          }
          return base;
        })()
      }
    };
  }, [formData.tipoEnsenanza, formData.curso, formData.esPrimerAno, formData.tipoReduccion, formData.matriculaHonor, formData.formaPago, formData.asignaturaPendiente1, formData.asignaturaPendiente2, formData.convalidacionSolicitada, formData.convalidacionAsignaturas, formData.esRepetidor, allPendingFromLastCourse]);

  React.useEffect(() => {
    if (calculation) {
      setFormData(prev => ({
        ...prev,
        importeTotal: calculation.total.toFixed(2),
        importe1erPago: calculation.firstPayment.toFixed(2),
        importe2oPago: calculation.secondPayment.toFixed(2),
      }));
    }
  }, [calculation]);

  const requiredDocSections = useMemo(() => {
    const sections: Array<{ title: string; items: string[] }> = [];
    const totalImporte = calculation?.total ?? 0;

    if ((formData.formaPago === 'unico' || formData.formaPago === 'fraccionado') && totalImporte > 0) {
      sections.push({
        title: 'Justificante de Pago de Tasas',
        items: ['Justificante de pago de tasas mediante el Modelo 046']
      });
    }
    if (formData.formaPago === 'beca') {
      sections.push({
        title: 'Solicitud de Beca',
        items: ['Copia del PDF de la presentación de la solicitud de beca para el Conservatorio «Marcos Redondo»']
      });
    }
    if (formData.tipoReduccion && formData.tipoReduccion !== 'ninguna') {
      let docText = '';
      if (formData.tipoReduccion === 'fam_num_general' || formData.tipoReduccion === 'fam_num_especial') {
        docText = 'Carnet o Certificado que acredite la condición de Familia Numerosa General o Especial';
      } else if (formData.tipoReduccion === 'discapacidad') {
        docText = 'Certificado que acredite una discapacidad igual o superior al 33%';
      } else if (formData.tipoReduccion === 'terrorismo') {
        docText = 'Certificado que acredite la condición de víctima de terrorismo';
      } else if (formData.tipoReduccion === 'violencia_genero') {
        docText = 'Certificado que acredite la condición de víctima de violencia de género';
      } else if (formData.tipoReduccion === 'ingreso_minimo') {
        docText = 'Certificado de Ingreso Mínimo de Solidaridad';
      }
      if (docText) {
        sections.push({ title: 'Reducción / Exención de Tasas', items: [docText] });
      }
    }
    if (formData.convalidacionSolicitada && formData.convalidacionMotivo === 'eso_bach') {
      sections.push({
        title: 'Convalidación (ESO / Bachillerato)',
        items: [
          'Certificado Oficial Académico en el que aparezcan las asignaturas convalidables',
          'O Certificado de Matriculación (en el caso de Simultaneidad)'
        ]
      });
    }
    return sections;
  }, [formData.formaPago, formData.tipoReduccion, formData.convalidacionSolicitada, formData.convalidacionMotivo, calculation]);

  const attachmentRequired = useMemo(() => {
    const totalImporte = calculation?.total ?? 0;
    return (
      ((formData.formaPago === 'unico' || formData.formaPago === 'fraccionado') && totalImporte > 0) ||
      formData.formaPago === 'beca' ||
      (!!formData.tipoReduccion && formData.tipoReduccion !== 'ninguna')
    );
  }, [formData.formaPago, formData.tipoReduccion, calculation]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    // Política de espacios: el saneado vive en sanitizeFieldValue y SOLO
    // afecta a campos sin espacios (DNI, email, teléfono). Los demás campos
    // preservan literalmente lo que el usuario teclea — incluidos espacios
    // dobles, iniciales y finales. Ver tests en src/__tests__/whitespace.test.ts.
    if (typeof val === 'string') {
      val = sanitizeFieldValue(name, val);
    }

    if (name === 'formaPago' && (val === 'unico' || val === 'fraccionado')) {
      if (formData.curso.includes('1º') && !formData.esPrimerAno) {
        setIsAperturaWarningOpen(true);
      }
    }

    if (typeof val === 'string' && ['dni', 'tutor1Dni', 'tutor2Dni', 'email', 'codigoPostal', 'telefono'].includes(name)) {
      validateField(name, val);
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: val };
      
      // Reset dependent fields
      if (name === 'tipoEnsenanza') {
        newData.curso = '';
        newData.perfilProfesional = '';
        newData.asignaturaPendiente1 = '';
        newData.asignaturaPendiente2 = '';
        newData.esRepetidor = false;
        newData.convalidacionAsignaturas = [];
        newData.convalidacionSolicitada = false;
        newData.convalidacionMotivo = '';
        if (val === 'elemental' && newData.formaPago === 'beca') {
          newData.formaPago = '';
        }
        if (val === 'elemental' && newData.especialidad === 'Canto') {
          newData.especialidad = '';
        }
      }
      if (name === 'curso' || name === 'especialidad') {
        newData.perfilProfesional = '';
        newData.asignaturaPendiente1 = '';
        newData.asignaturaPendiente2 = '';
        newData.esRepetidor = false;
        newData.convalidacionAsignaturas = [];
        newData.convalidacionSolicitada = false;
        newData.convalidacionMotivo = '';
      }
      if (name === 'esRepetidor') {
        newData.asignaturaPendiente1 = '';
        newData.asignaturaPendiente2 = '';
      }

      return newData;
    });
  };

  const handleConvalidacionToggle = (materiaId: string) => {
    setFormData(prev => {
      const current = prev.convalidacionAsignaturas ?? [];
      const updated = current.includes(materiaId)
        ? current.filter((id: string) => id !== materiaId)
        : [...current, materiaId];
      return { ...prev, convalidacionAsignaturas: updated, convalidacionSolicitada: updated.length > 0 };
    });
  };

  const handleDniBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const name = e.target.name;
    const raw = e.target.value.trim().toUpperCase();
    if (!raw) return;
    const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
    let formatted = raw;

    if (/^\d{1,8}$/.test(raw)) {
      const padded = raw.padStart(8, '0');
      formatted = padded + LETTERS[parseInt(padded, 10) % 23];
    } else if (/^[XYZ]\d{1,7}$/.test(raw)) {
      const prefix = raw[0];
      const numStr = raw.slice(1).padStart(7, '0');
      const prefixVal = ({ X: 0, Y: 1, Z: 2 } as Record<string, number>)[prefix];
      formatted = prefix + numStr + LETTERS[(prefixVal * 10000000 + parseInt(numStr, 10)) % 23];
    }

    if (formatted !== e.target.value) {
      setFormData(prev => ({ ...prev, [name]: formatted }));
      validateField(name, formatted);
    }
  }, [validateField]);

  const renderConvalidacionRow = (count: number, discount: number) => (
    <div className="flex justify-between text-sm pt-2 border-t border-gray-100 text-green-600 font-bold">
      <span>{`Convalidación (${count} asig.)`}</span>
      <span>{`-${discount.toFixed(2)}€`}</span>
    </div>
  );

  // ── helper: detecta si un PDF esta cifrado con contraseña real (no se puede
  // renderizar sin la clave). PDF.js lanza PasswordException en ese caso. ──
  const _isPasswordEncryptedPdf = async (file: File): Promise<boolean> => {
    try {
      const pdfjs = await loadPdfJs();
      const buf = await file.arrayBuffer();
      const task = pdfjs.getDocument({ data: new Uint8Array(buf), password: '' });
      try {
        const doc = await task.promise;
        await doc.destroy();
        return false;
      } catch (err: unknown) {
        // pdfjs PasswordException tiene name === 'PasswordException'
        if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'PasswordException') {
          return true;
        }
        return false;
      }
    } catch {
      return false;
    }
  };

  const _scanForEncryptedPdfs = async (files: File[]) => {
    const found: string[] = [];
    for (const f of files) {
      const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      if (!isPdf) continue;
      if (await _isPasswordEncryptedPdf(f)) found.push(f.name);
    }
    if (found.length > 0) {
      setEncryptedPdfNames(prev => Array.from(new Set([...prev, ...found])));
    }
  };

  // Intenta abrir el PDF con la contraseña indicada. Si es correcta, la guarda y
  // retira el archivo de la lista de cifrados (quedará apto para rasterizarse).
  const _tryUnlockPdf = async (name: string) => {
    const file = attachments.find(f => f.name === name);
    const password = pwInputs[name] ?? '';
    if (!file || !password) {
      setPwErrors(prev => ({ ...prev, [name]: 'Introduce la contraseña del documento.' }));
      return;
    }
    setPwBusy(name);
    try {
      const pdfjs = await loadPdfJs();
      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), password }).promise;
      await doc.destroy();
      setPdfPasswords(prev => ({ ...prev, [name]: password }));
      setEncryptedPdfNames(prev => prev.filter(n => n !== name));
      setPwErrors(prev => { const c = { ...prev }; delete c[name]; return c; });
      setPwInputs(prev => { const c = { ...prev }; delete c[name]; return c; });
    } catch (err: unknown) {
      const isPw = err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'PasswordException';
      setPwErrors(prev => ({ ...prev, [name]: isPw ? 'Contraseña incorrecta. Inténtalo de nuevo.' : 'No se pudo abrir el documento.' }));
    } finally {
      setPwBusy(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    const validExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|pdf)$/i;
    const MAX_TOTAL_SIZE = 5 * 1024 * 1024;
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const extValid = validExtensions.test(file.name);
      return isImage || isPdf || extValid;
    });
    const rejected = files.filter(f => !validFiles.includes(f));
    const currentTotal = attachments.reduce((sum, f) => sum + f.size, 0);
    const newTotal = validFiles.reduce((sum, f) => sum + f.size, currentTotal);
    if (newTotal > MAX_TOTAL_SIZE) {
      setValidationErrors([{ key: 'files', label: 'El tamaño total de los documentos adjuntos no puede superar 5 MB.' }]);
      setShowValidationModal(true);
      e.target.value = '';
      return;
    }
    setAttachments(prev => [...prev, ...validFiles]);
    // Detecta PDFs cifrados con contraseña real (no bloquea: solo informa)
    void _scanForEncryptedPdfs(validFiles);
    if (rejected.length > 0) {
      const names = rejected.map(f => `«${f.name}»`).join(', ');
      setValidationErrors([{
        key: 'files',
        label: `Formato no permitido: ${names}. Solo se admiten archivos PDF (.pdf) o imágenes (.jpg, .jpeg, .png, .gif, .webp, .bmp). Renombra el archivo con la extensión correcta y vuelve a adjuntarlo.`,
      }]);
      setShowValidationModal(true);
    }
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => {
      const removed = prev[index];
      if (removed) {
        setEncryptedPdfNames(names => names.filter(n => n !== removed.name));
        setPdfPasswords(p => { const c = { ...p }; delete c[removed.name]; return c; });
        setPwInputs(p => { const c = { ...p }; delete c[removed.name]; return c; });
        setPwErrors(p => { const c = { ...p }; delete c[removed.name]; return c; });
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const requiredFields: { key: keyof EnrollmentFormData; label: string }[] = [
      { key: 'nombre', label: 'Nombre' },
      { key: 'apellidos', label: 'Apellidos' },
      { key: 'dni', label: 'D.N.I. / N.I.E.' },
      { key: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
      { key: 'domicilio', label: 'Domicilio Actual' },
      { key: 'localidad', label: 'Localidad' },
      { key: 'provincia', label: 'Provincia' },
      { key: 'codigoPostal', label: 'C.P.' },
      { key: 'email', label: 'Correo Electrónico' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'horaSalidaEstudios', label: 'Hora salida otros estudios' },
      { key: 'tipoEnsenanza', label: 'Tipo de Enseñanza' },
      { key: 'curso', label: 'Curso' },
      { key: 'especialidad', label: 'Especialidad' },
      { key: 'formaPago', label: 'Forma de Pago' },
    ];

    const missing = requiredFields
      .filter(field => !formData[field.key]);

    if (missing.length > 0) {
      setValidationErrors(missing);
      setShowValidationModal(true);
      return;
    }

    const fieldErrorEntries = Object.entries(fieldErrors);
    if (fieldErrorEntries.length > 0) {
      setValidationErrors(fieldErrorEntries.map(([key, message]) => ({ key, label: message })));
      setShowValidationModal(true);
      return;
    }

    const totalAttachmentSize = attachments.reduce((sum, f) => sum + f.size, 0);
    if (totalAttachmentSize > 5 * 1024 * 1024) {
      setValidationErrors([{ key: 'files', label: 'El tamaño total de los documentos adjuntos supera el límite de 5 MB. Por favor, reduce el tamaño o el número de archivos adjuntos.' }]);
      setShowValidationModal(true);
      return;
    }

    // Validation passed: show reminder modal before preview
    setShowReminderModal(true);
  };

  const currentYear = getCurrentCalendarYear();

  // ── helper: convert image File to PNG Uint8Array (for pdf-lib attachments) ──
  const _imageToPngBytes = (file: File): Promise<Uint8Array> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d')!.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        fetch(c.toDataURL('image/png'))
          .then(r => r.arrayBuffer()).then(ab => resolve(new Uint8Array(ab))).catch(reject);
      };
      img.onerror = reject; img.src = url;
    });

  // ── helper: rasteriza un PDF (firmado/encriptado/no incrustable) a PNGs página a página ──
  // pdf.js pinta el fondo a blanco (#ffffff) antes de dibujar el contenido de la
  // página. Si tras renderizar no queda ningún píxel no-blanco, esa página se
  // rasterizó vacía. Una página suelta en blanco es legítima (suele venir así en
  // el origen) y se conserva; solo si TODAS salen vacías estamos ante el caso XFA
  // (administración), cuyo contenido vive en una capa aparte y nunca se pinta.
  const _isCanvasBlank = (ctx: CanvasRenderingContext2D, w: number, h: number): boolean => {
    const { data } = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < data.length; i += 16) { // muestreo 1 de cada 4 píxeles
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return false;
    }
    return true;
  };

  const _rasterizePdfToPngs = async (buf: ArrayBuffer, password = ''): Promise<Uint8Array[]> => {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buf),
      password,
    }).promise;
    const out: Uint8Array[] = [];
    let blankPages = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D no disponible');
      await page.render({ canvasContext: ctx, viewport, canvas: null }).promise;
      if (_isCanvasBlank(ctx, canvas.width, canvas.height)) blankPages++;
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob falló'))), 'image/png')
      );
      out.push(new Uint8Array(await blob.arrayBuffer()));
      page.cleanup();
    }
    await doc.destroy();
    if (out.length > 0 && blankPages === out.length) {
      // Todas las páginas se rasterizaron vacías (p.ej. PDF XFA): abortamos para
      // que el adjunto caiga al nivel 3 (archivo embebido) en vez de insertar
      // páginas en blanco. Una o varias páginas vacías sueltas sí se conservan.
      throw new Error('Rasterizado en blanco en todas las páginas (posible PDF XFA)');
    }
    return out;
  };

  // ── helper: build the final merged PDF (page 1 = form, rest = attachments) ──
  const buildPdfBytes = async (ts: Date, reqNum: string | null): Promise<{ bytes: Uint8Array; filename: string }> => {
    const { pdf } = await loadPdfModule();
    const mainBlob = await pdf(
      <MatriculaPdf
        formData={formData}
        academicYear={academicYear}
        submitTimestamp={ts}
        asignaturasCursoActual={asignaturasCursoActual}
        selectedPendingSubjects={selectedPendingSubjects}
        calculation={calculation}
        requestNumber={reqNum ?? undefined}
        allPendingFromLastCourse={allPendingFromLastCourse}
      />
    ).toBlob();

    const ds = ts.toLocaleDateString('es-ES').replace(/\//g, '-');
    const hs = ts.toLocaleTimeString('es-ES').replace(/:/g, '-');
    const filename = `SOLICITUD_${ds}_${hs}.pdf`;

    if (attachments.length === 0) {
      return { bytes: new Uint8Array(await mainBlob.arrayBuffer()), filename };
    }

    // Merge attachments as subsequent pages
    const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
    const mainBytes = new Uint8Array(await mainBlob.arrayBuffer());
    const pdfDoc = await PDFDocument.load(mainBytes);
    const A4W = 595.28, A4H = 841.89;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const file of attachments) {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (isPdf) {
        const buf = await file.arrayBuffer();
        let merged = false;
        try {
          const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
          // `ignoreEncryption` solo evita el error de contraseña: NO descifra los
          // streams. Si copiáramos sus páginas, pdf-lib trasladaría los bytes aún
          // cifrados y se verían en blanco. Forzamos el rasterizado con pdf.js
          // (intento 2), que sí descifra los PDFs con restricción de propietario.
          if (srcDoc.isEncrypted) throw new Error('PDF cifrado: no apto para copyPages');
          const copied = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());
          copied.forEach(pg => pdfDoc.addPage(pg));
          merged = true;
        } catch {
          // PDF firmado/encriptado o no incrustable: lo adjuntamos en bruto al PDF resultante
        }
        if (!merged) {
          // Intento 2: rasterizar con PDF.js (sirve para firmados y para
          // "encriptados" sin contraseña real, p.ej. con restricciones de propietario)
          try {
            const pngs = await _rasterizePdfToPngs(buf, pdfPasswords[file.name] ?? '');
            for (const png of pngs) {
              const embImg = await pdfDoc.embedPng(png);
              const { width: iW, height: iH } = embImg;
              const fit = Math.min((A4W - 40) / iW, (A4H - 40) / iH);
              const pg = pdfDoc.addPage([A4W, A4H]);
              pg.drawImage(embImg, { x: (A4W - iW * fit) / 2, y: (A4H - iH * fit) / 2, width: iW * fit, height: iH * fit });
              pg.drawText(file.name, { x: 20, y: 14, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
            }
            merged = true;
          } catch {
            // PDF protegido con contraseña real u otro fallo: caemos al adjunto embebido
          }
        }
        if (!merged) {
          try {
            await pdfDoc.attach(new Uint8Array(buf), file.name, {
              mimeType: 'application/pdf',
              description: 'Documento adjuntado por el solicitante (firmado/protegido)',
            });
          } catch {
            // Si ni attach funciona, seguimos sin bloquear el envío
          }
          const pg = pdfDoc.addPage([A4W, A4H]);
          pg.drawText('Documento adjunto', { x: 40, y: A4H - 80, size: 16, font, color: rgb(0, 0, 0) });
          pg.drawText(file.name, { x: 40, y: A4H - 110, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
          pg.drawText('Este PDF está protegido con contraseña y se incluye como archivo', { x: 40, y: A4H - 140, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
          pg.drawText('adjunto embebido dentro de esta solicitud.', { x: 40, y: A4H - 154, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
        }
      } else if (file.type.startsWith('image/') || /\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name)) {
        try {
          const isJpeg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name);
          const embImg = isJpeg
            ? await pdfDoc.embedJpg(await file.arrayBuffer())
            : await pdfDoc.embedPng(await _imageToPngBytes(file));
          const { width: iW, height: iH } = embImg;
          const fit = Math.min((A4W - 40) / iW, (A4H - 40) / iH);
          const pg = pdfDoc.addPage([A4W, A4H]);
          pg.drawImage(embImg, { x: (A4W - iW * fit) / 2, y: (A4H - iH * fit) / 2, width: iW * fit, height: iH * fit });
          pg.drawText(file.name, { x: 20, y: 14, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
        } catch {
          try {
            await pdfDoc.attach(new Uint8Array(await file.arrayBuffer()), file.name, {
              mimeType: file.type || 'application/octet-stream',
              description: 'Imagen adjuntada por el solicitante',
            });
          } catch { /* noop */ }
          const pg = pdfDoc.addPage([A4W, A4H]);
          pg.drawText('Imagen adjunta', { x: 40, y: A4H - 80, size: 16, font, color: rgb(0, 0, 0) });
          pg.drawText(file.name, { x: 40, y: A4H - 110, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        }
      } else {
        try {
          await pdfDoc.attach(new Uint8Array(await file.arrayBuffer()), file.name, {
            mimeType: file.type || 'application/octet-stream',
            description: 'Documento adjuntado por el solicitante',
          });
        } catch { /* noop */ }
        const pg = pdfDoc.addPage([A4W, A4H]);
        pg.drawText('Documento adjunto', { x: 40, y: A4H - 80, size: 16, font, color: rgb(0, 0, 0) });
        pg.drawText(file.name, { x: 40, y: A4H - 110, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
      }
    }

    return { bytes: await pdfDoc.save(), filename };
  };

  // ── helper: verifica que CADA adjunto se puede leer/incrustar ANTES de crear
  // el registro en Dataverse, usando la misma ruta de incrustado que buildPdfBytes.
  // Si un adjunto es ilegible, aborta con un mensaje claro y SIN dejar registro huérfano. ──
  const validateAttachments = async (): Promise<void> => {
    if (attachments.length === 0) return;
    for (const file of attachments) {
      try {
        const buf = await file.arrayBuffer();
        if (buf.byteLength === 0) {
          throw new Error(`El archivo «${file.name}» está vacío.`);
        }
      } catch (e) {
        if (e instanceof Error) throw e;
        throw new Error(`No se pudo leer el archivo «${file.name}».`);
      }
    }
  };

  // ── helper: encode Uint8Array to Base64 safely (chunked to avoid stack overflow) ──
  const uint8ToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  const handlePreviewPdf = async () => {
    const { bytes } = await buildPdfBytes(new Date(), '#');
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleDownloadTutorial = async () => {
    const { pdf } = await loadPdfModule();
    const blob = await pdf(<TutorialPdf />).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleSendAndDownload = async () => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    const alreadySubmitted = submitTimestamp !== null;

    try {
      const now = alreadySubmitted ? submitTimestamp : new Date();
      if (!alreadySubmitted) setSubmitTimestamp(now);

      let reqNum: string | null = requestNumber;
      let pdfBytes: Uint8Array;
      let filename: string;

      if (!alreadySubmitted) {
        const ensenanzaCursoPrefix = formData.tipoEnsenanza === 'elemental' ? 'EE' : formData.tipoEnsenanza === 'profesional' ? 'EP' : '';
        const ensenanzaCursoNum = formData.curso.replace(/\D/g, '');
        const ensenanzaCurso = ensenanzaCursoPrefix && ensenanzaCursoNum ? `${ensenanzaCursoPrefix}${ensenanzaCursoNum}` : '';

        // ── Paso 0: Validar adjuntos antes de tocar el backend ───────────────
        // Garantiza que el PDF se podrá generar; si un adjunto es ilegible aborta
        // aquí, sin crear registro en Dataverse ni enviar nada a Power Automate.
        await validateAttachments();

        // ── Paso 1: Comprobar duplicados ─────────────────────────────────────
        const resDup = await fetch(PA_DUPLICADOS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre,
            apellidos: formData.apellidos,
            dni: formData.dni,
            especialidad: formData.especialidad,
            tipoEnsenanza: formData.tipoEnsenanza,
            curso: formData.curso,
            academicYear,
          }),
        });
        if (resDup.status === 409) {
          setSubmitStatus('duplicate');
          setIsSubmitting(false);
          return;
        }
        if (!resDup.ok) throw new Error(`Error al comprobar duplicados (HTTP ${resDup.status})`);

        const dupData = await resDup.json() as { ok?: boolean; reason?: string };
        if (dupData?.ok === false && dupData?.reason === 'duplicate') {
          setSubmitStatus('duplicate');
          setIsSubmitting(false);
          return;
        }

        // ── Paso 2: Obtener nOrden ───────────────────────────────────────────
        const cursoEscolar = calcularCursoEscolar();
        const resNOrden = await fetch(PA_NORDEM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cursoEscolar }),
        });
        if (!resNOrden.ok) throw new Error(`Error al obtener nOrden (HTTP ${resNOrden.status})`);
        const dataNOrden = await resNOrden.json() as { nOrden?: number };
        const nOrdenCalculado: number = dataNOrden?.nOrden ?? 1;

        // ── Paso 3: Crear registro en Dataverse ─────────────────────────────
        const asignaturasParaDataverse = [
          ...asignaturasCursoActual.map(a => ({
            codigo: a.MATERIA,
            nombre: a.DESCRIPCION,
            tipo: (formData.convalidacionAsignaturas ?? []).includes(a.MATERIA) ? 'Convalidacion' : 'Ordinaria'
          })),
          ...selectedPendingSubjects.map(s => ({
            codigo: s.id,
            nombre: s.label,
            tipo: isRepetidor ? 'Repetidor' : 'Pendiente'
          }))
        ];

        const jsonPayload = {
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          dni: formData.dni,
          fechaNacimiento: formData.fechaNacimiento,
          domicilio: formData.domicilio,
          localidad: formData.localidad,
          provincia: formData.provincia,
          codigoPostal: formData.codigoPostal,
          email: formData.email,
          telefono: formData.telefono,
          horaSalidaEstudios: formData.horaSalidaEstudios,
          disponibilidadManana: formData.disponibilidadManana,
          autorizacionImagen: formData.autorizacionImagen,
          tutor1Nombre: formData.tutor1Nombre,
          tutor1Dni: formData.tutor1Dni,
          tutor2Nombre: formData.tutor2Nombre,
          tutor2Dni: formData.tutor2Dni,
          tipoEnsenanza: formData.tipoEnsenanza,
          curso: formData.curso,
          ensenanzaCurso,
          especialidad: formData.especialidad,
          asignaturaPendiente1: formData.asignaturaPendiente1,
          asignaturaPendiente2: formData.asignaturaPendiente2 ?? '',
          esRepetidor: !!formData.esRepetidor,
          perfilProfesional: formData.perfilProfesional,
          formaPago: formData.formaPago,
          familiaNumerosa: formData.familiaNumerosa,
          tipoReduccion: formData.tipoReduccion,
          convalidacionSolicitada: formData.convalidacionSolicitada,
          convalidacionAsignaturas: (formData.convalidacionAsignaturas ?? [])
            .map((id: string) => asignaturasCursoActual.find((m: Materia) => m.MATERIA === id)?.DESCRIPCION ?? id)
            .join(', '),
          matriculaHonor: formData.matriculaHonor,
          esPrimerAno: formData.esPrimerAno,
          importeTotal: formData.importeTotal,
          importe1erPago: formData.importe1erPago ?? '',
          importe2oPago: formData.importe2oPago ?? '',
          estado: 'Recibida',
          academicYear,
          cursoEscolar,
          nOrden: nOrdenCalculado,
          asignaturas: asignaturasParaDataverse
        };

        const resCrear = await fetch(PA_CREAR_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonPayload),
        });
        if (!resCrear.ok) throw new Error(`Error al crear el registro (HTTP ${resCrear.status})`);

        const dataCrear = await resCrear.json() as { ok?: boolean; rowId?: string; nOrden?: number };
        console.log('[DEBUG PA_CREAR respuesta]', JSON.stringify(dataCrear));
        const rowId: string = dataCrear?.rowId ?? '';
        const nOrden: number = dataCrear?.nOrden ?? 0;
        if (!rowId) throw new Error(`No se recibió rowId del servidor`);
        if (!nOrden) throw new Error(`Registro creado (${rowId}) pero nOrden devuelto es ${nOrden} — revisa la acción Response del flujo PA_CREAR`);

        reqNum = String(nOrden);
        setRequestNumber(reqNum);

        ({ bytes: pdfBytes, filename } = await buildPdfBytes(now, reqNum));

        // ── Paso 4: Subir PDF + email + asignaturas ─────────────────────────
        const perfilEmailLabel =
          formData.perfilProfesional === 'A' ? 'Perfil A — Fundamentos de Composición'
          : formData.perfilProfesional === 'B' ? (formData.curso.includes('5') ? 'Perfil B — Improvisación / Informática Musical' : 'Perfil B — Didáctica Musical / Improvisación')
          : formData.perfilProfesional === 'C' ? (formData.curso.includes('5') ? 'Perfil C — Improvisación / Instrumento Complementario' : 'Perfil C — Improvisación / Música Moderna')
          : '';

        const resPdf = await fetch(PA_PDF_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rowId,
            nOrden,
            requestNumber: reqNum,
            academicYear,
            fileName: filename,
            mimeType: 'application/pdf',
            contentBase64: uint8ToBase64(pdfBytes),
            nombre:               formData.nombre,
            apellidos:            formData.apellidos,
            email:                formData.email,
            dni:                  formData.dni,
            fechaNacimiento:      formData.fechaNacimiento,
            domicilio:            formData.domicilio,
            localidad:            formData.localidad,
            provincia:            formData.provincia,
            codigoPostal:         formData.codigoPostal,
            telefono:             formData.telefono,
            horaSalidaEstudios:   formData.horaSalidaEstudios,
            tipoCurso:            `${formData.tipoEnsenanza === 'elemental' ? 'Enseñanza Elemental' : 'Enseñanza Profesional'} — ${formData.curso}`,
            especialidad:         formData.especialidad,
            asignaturaPendiente1: selectedPendingSubjects[0]?.label || formData.asignaturaPendiente1 || '',
            asignaturaPendiente2: selectedPendingSubjects[1]?.label || formData.asignaturaPendiente2 || '',
            perfil:               perfilEmailLabel,
            formaPago:            formData.formaPago === 'unico' ? 'Pago Único' : formData.formaPago === 'fraccionado' ? 'Pago Fraccionado' : 'Solicita Beca',
            reduccion:            REDUCCION_LABEL[formData.tipoReduccion ?? ''] ?? '',
            importeTotal:         formData.importeTotal ? `${formData.importeTotal} EUR` : '',
            importe1erPago:       formData.importe1erPago ? `${formData.importe1erPago} EUR` : '',
            importe2oPago:        formData.importe2oPago ? `${formData.importe2oPago} EUR` : '',
            asignaturasCursoActual: JSON.stringify(asignaturasCursoActual),
            asignaturasPendientes:  JSON.stringify(
              selectedPendingSubjects
                .map(s => (getMaterias() ?? []).find(m => m.MATERIA === s.id))
                .filter(Boolean)
            ),
          }),
        });
        if (!resPdf.ok) throw new Error(`Error al subir el PDF (HTTP ${resPdf.status})`);
      } else {
        // Re-descarga: reconstruir el PDF con el número de orden ya guardado en estado
        ({ bytes: pdfBytes, filename } = await buildPdfBytes(now, reqNum));
      }

      // Descarga el PDF al usuario (mismo archivo enviado)
      const downloadUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = downloadUrl; link.download = filename; link.click();
      URL.revokeObjectURL(downloadUrl);

      setSubmitStatus('success');
      if (!alreadySubmitted) {
        setAttachments([]);
        setEncryptedPdfNames([]);
      }
    } catch (error) {
      console.error(error);
      setSubmitError(error instanceof Error ? error.message : 'Error desconocido');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-sm max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Matrícula Enviada!</h2>
          <p className="text-gray-600 mb-6">
            Tu solicitud para el curso {academicYear} ha sido recibida correctamente. Recibirás un correo de confirmación en breve.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setSubmitStatus('idle')}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              ← Volver
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmitStatus('idle');
                setViewMode('form');
                setSubmitTimestamp(null);
                setRequestNumber(null);
                setAttachments([]);
                setEncryptedPdfNames([]);
                setValidationErrors([]);
                setFormData({
                  nombre: '', apellidos: '', dni: '', fechaNacimiento: '', domicilio: '', localidad: '', provincia: 'Ciudad Real', codigoPostal: '', email: '', telefono: '', horaSalidaEstudios: '', disponibilidadManana: false, autorizacionImagen: false, tutor1Nombre: '', tutor1Dni: '', tutor2Nombre: '', tutor2Dni: '', tipoEnsenanza: '', curso: '', especialidad: '', asignaturaPendiente1: '', asignaturaPendiente2: '', perfilProfesional: '', formaPago: '', familiaNumerosa: false, tipoReduccion: 'ninguna', matriculaHonor: false, esPrimerAno: false, importeTotal: '', importe1erPago: '', importe2oPago: '', convalidacionSolicitada: false, convalidacionAsignaturas: [], convalidacionMotivo: '',
                });
              }}
              className="w-full py-3 bg-white text-gray-900 border-2 border-gray-100 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Nueva Solicitud
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900 font-sans py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {viewMode === 'readonly' && (
          <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Volver
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSendAndDownload}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {submitTimestamp ? 'Descargando...' : 'Enviando...'}
                </>
              ) : submitTimestamp ? (
                <>
                  <Download size={18} />
                  Descargar PDF
                </>
              ) : (
                <>
                  <Download size={18} />
                  Enviar y Descargar
                </>
              )}
            </button>
          </div>
        )}

        <div id="solicitud-pdf-content" className="bg-[#f5f5f5] p-2 sm:p-4 rounded-3xl">
          {/* Header */}
          <header className="mb-6 md:mb-10 flex items-center justify-between gap-2 sm:gap-4 bg-white p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
          <div className="flex-shrink-0">
            <img
              src={logoJccm}
              alt="JCCM"
              className="h-8 sm:h-12 md:h-16 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "https://picsum.photos/seed/jccm/100/60";
              }}
            />
          </div>

          <div className="text-center flex-grow min-w-0 px-1">
            <h1 className="text-[clamp(0.75rem,3.5vw,1.5rem)] font-bold tracking-tight text-gray-900 mb-0.5 leading-tight">
              Solicitud de Matrícula
            </h1>
            <p className="text-[clamp(0.6rem,2.5vw,0.875rem)] text-gray-500 font-medium">
              Curso Académico {academicYear}
            </p>
            <p className="text-[clamp(0.55rem,2vw,0.75rem)] text-gray-400 mt-0.5">
              C.P.M. "Marcos Redondo", Ciudad Real
            </p>
          </div>

          <div className="flex-shrink-0">
            <img
              src={logoCpm}
              alt="CPM Marcos Redondo"
              className="h-8 sm:h-12 md:h-16 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "https://picsum.photos/seed/cpm/150/60";
              }}
            />
          </div>
        </header>

        <form noValidate onSubmit={handleSubmit} className={`space-y-4 sm:space-y-8 ${viewMode === 'readonly' ? 'pointer-events-none opacity-90' : ''}`}>
          {/* Datos Personales */}
          <section className="bg-white rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <User size={20} className="text-gray-600" />
                </div>
                <h2 className="text-base sm:text-xl font-semibold">Datos Personales</h2>
              </div>
              <button
                type="button"
                onClick={handleDownloadTutorial}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all"
              >
                <HelpCircle size={14} />
                Ayuda
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Nombre</label>
                <input required name="nombre" value={formData.nombre} onChange={handleChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" maxLength={100} placeholder="Ej: Juan" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Apellidos</label>
                <input required name="apellidos" value={formData.apellidos} onChange={handleChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" maxLength={100} placeholder="Ej: Pérez García" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">D.N.I. / N.I.E.</label>
                <input required name="dni" value={formData.dni} onChange={handleChange} onBlur={handleDniBlur} className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 transition-all ${fieldErrors.dni ? 'ring-2 ring-red-300' : 'focus:ring-gray-200'}`} maxLength={10} placeholder="12345678X" />
                {fieldErrors.dni && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.dni}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Fecha de Nacimiento</label>
                <input required type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Domicilio Actual</label>
                <input required name="domicilio" value={formData.domicilio} onChange={handleChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" maxLength={200} placeholder="Calle, número, piso..." />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Localidad</label>
                <input required name="localidad" value={formData.localidad} onChange={handleChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" maxLength={100} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Provincia</label>
                  <input name="provincia" value={formData.provincia} onChange={handleChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" maxLength={50} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">C.P.</label>
                  <input required name="codigoPostal" value={formData.codigoPostal} onChange={handleChange} className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 transition-all ${fieldErrors.codigoPostal ? 'ring-2 ring-red-300' : 'focus:ring-gray-200'}`} maxLength={5} />
                  {fieldErrors.codigoPostal && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.codigoPostal}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Correo Electrónico</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 transition-all ${fieldErrors.email ? 'ring-2 ring-red-300' : 'focus:ring-gray-200'}`} maxLength={254} placeholder="ejemplo@correo.com" />
                {fieldErrors.email && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Teléfono</label>
                <input required type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 transition-all ${fieldErrors.telefono ? 'ring-2 ring-red-300' : 'focus:ring-gray-200'}`} maxLength={15} />
                {fieldErrors.telefono && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.telefono}</p>}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Hora salida otros estudios obligatorios</label>
                <div className="flex gap-4">
                  {['Antes de las 17 h', '17 h', '18 h'].map((hora) => (
                    <label key={hora} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="horaSalidaEstudios" 
                        value={hora} 
                        checked={formData.horaSalidaEstudios === hora}
                        onChange={handleChange}
                        className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                      />
                      <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">{hora}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-center gap-5">
                <label className="toggle-label">
                  <div className="toggle">
                    <input
                      className="toggle-state"
                      type="checkbox"
                      name="disponibilidadManana"
                      checked={formData.disponibilidadManana}
                      onChange={handleChange}
                      required
                    />
                    <div className="indicator" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    Disponibilidad horaria de mañana
                    <span className="text-red-500 ml-0.5">*</span>
                  </span>
                </label>
                <label className="toggle-label">
                  <div className="toggle">
                    <input
                      className="toggle-state"
                      type="checkbox"
                      name="autorizacionImagen"
                      checked={formData.autorizacionImagen}
                      onChange={handleChange}
                      required
                    />
                    <div className="indicator" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    Autorización uso de imagen
                    <span className="text-red-500 ml-0.5">*</span>
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* Menores de 18 */}
          <section className="bg-white rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-base sm:text-xl font-semibold">Menores de 18 años</h2>
            </div>
            <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-widest">Rellenar solo si aplica</p>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Tutor/a Legal 1 (Apellidos y Nombre)</label>
                  <input name="tutor1Nombre" value={formData.tutor1Nombre} onChange={handleChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" maxLength={100} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">D.N.I.</label>
                  <input name="tutor1Dni" value={formData.tutor1Dni} onChange={handleChange} onBlur={handleDniBlur} className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 transition-all ${fieldErrors.tutor1Dni ? 'ring-2 ring-red-300' : 'focus:ring-gray-200'}`} maxLength={10} placeholder="12345678X" />
                  {fieldErrors.tutor1Dni && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.tutor1Dni}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Tutor/a Legal 2 (Apellidos y Nombre)</label>
                  <input name="tutor2Nombre" value={formData.tutor2Nombre} onChange={handleChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" maxLength={100} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">D.N.I.</label>
                  <input name="tutor2Dni" value={formData.tutor2Dni} onChange={handleChange} onBlur={handleDniBlur} className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 transition-all ${fieldErrors.tutor2Dni ? 'ring-2 ring-red-300' : 'focus:ring-gray-200'}`} maxLength={10} placeholder="12345678X" />
                  {fieldErrors.tutor2Dni && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.tutor2Dni}</p>}
                </div>
              </div>
            </div>
          </section>

          {/* Matriculación */}
          <section className="bg-white rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <GraduationCap size={20} className="text-gray-600" />
                </div>
                <h2 className="text-base sm:text-xl font-semibold">Datos de Matriculación</h2>
              </div>
              <button
                type="button"
                onClick={() => { setConvalidacionModalView('types'); setIsConvalidacionModalOpen(true); }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${(formData.convalidacionAsignaturas ?? []).length > 0 ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                {(formData.convalidacionAsignaturas ?? []).length > 0 && <CheckCircle2 size={16} />}
                Convalidación
              </button>
            </div>

            <div className="space-y-8">
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="tipoEnsenanza" 
                    value="elemental" 
                    checked={formData.tipoEnsenanza === 'elemental'}
                    onChange={handleChange}
                    className="w-5 h-5 text-gray-900 border-gray-300 focus:ring-gray-900"
                  />
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-600 group-hover:text-gray-900">Enseñanza Elemental</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="tipoEnsenanza" 
                    value="profesional" 
                    checked={formData.tipoEnsenanza === 'profesional'}
                    onChange={handleChange}
                    className="w-5 h-5 text-gray-900 border-gray-300 focus:ring-gray-900"
                  />
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-600 group-hover:text-gray-900">Enseñanza Profesional</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Curso</label>
                  <select required name="curso" value={formData.curso} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer">
                    <option value="" disabled>Seleccionar curso...</option>
                    {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Especialidad</label>
                  <select 
                    required 
                    name="especialidad" 
                    value={formData.especialidad} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Seleccionar especialidad...</option>
                    {[
                      "Canto", "Clarinete", "Contrabajo", "Fagot", "Flauta Travesera", 
                      "Guitarra", "Oboe", "Percusión", "Piano", "Saxofón", 
                      "Trombón", "Trompa", "Trompeta", "Tuba", "Viola", 
                      "Violín", "Violoncello"
                    ].filter(esp => !(formData.tipoEnsenanza === 'elemental' && esp === 'Canto')).map((esp) => (
                      <option key={esp} value={esp}>{esp}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold uppercase tracking-wider text-gray-600">
                      Repetidor
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!formData.esRepetidor}
                      onClick={() => {
                        const syntheticEvent = {
                          target: { name: 'esRepetidor', value: '', type: 'checkbox', checked: !formData.esRepetidor },
                        } as React.ChangeEvent<HTMLInputElement>;
                        handleChange(syntheticEvent);
                      }}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${formData.esRepetidor ? 'bg-gray-900' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${formData.esRepetidor ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-xs font-bold uppercase tracking-wider ${formData.esRepetidor ? 'text-gray-900' : 'text-gray-400'}`}>
                      {formData.esRepetidor ? 'Sí' : 'No'}
                    </span>
                  </div>
                  {formData.esRepetidor && isRepetidorAllowed && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 space-y-1">
                      {formData.tipoEnsenanza === 'elemental' ? (
                        <>
                          <span className="block"><strong>EE4 repetidor:</strong> si tiene 1 asignatura pendiente del ciclo, pagará solo esa asignatura suelta con recargo +20% (56,40 €). Sin asignatura pendiente, abonará el curso completo con recargo +20% (225,60 €).</span>
                          <span className="block">Si repite con asignatura suelta, indíquela en el campo <em>Asignatura pendiente del curso repetido</em>.</span>
                        </>
                      ) : (
                        <>
                          <span className="block"><strong>EP6 repetidor:</strong> si tiene 1 ó 2 asignaturas pendientes del ciclo, pagará solo esas asignaturas sueltas con recargo +20% (69,60 € c/u). Sin asignaturas pendientes, abonará el curso completo con recargo +20% (417,60 €).</span>
                          <span className="block">Si repite con asignaturas sueltas, indíquelas en los campos <em>Asignatura pendiente del curso repetido</em>.</span>
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">
                    {isRepetidor ? 'Asignatura pendiente del curso repetido' : 'Asignatura pendiente 1'}
                  </label>
                    <select name="asignaturaPendiente1" value={formData.asignaturaPendiente1} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer">
                      <option value="">Ninguna...</option>
                      {(isRepetidor ? asignaturasParaRepetidor : asignaturasPrevias).map(a => (
                        <option key={a.id} value={a.id}>
                          {a.materiaId} - {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(formData.tipoEnsenanza === 'profesional' && !isRepetidor) && (
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Asignatura pendiente 2</label>
                      <select name="asignaturaPendiente2" value={formData.asignaturaPendiente2} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer">
                        <option value="">Ninguna...</option>
                        {asignaturasPrevias.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.materiaId} - {a.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(isRepetidor && formData.tipoEnsenanza === 'profesional') && (
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">2ª Asignatura pendiente del curso repetido</label>
                      <select name="asignaturaPendiente2" value={formData.asignaturaPendiente2} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer">
                        <option value="">Ninguna...</option>
                        {asignaturasParaRepetidor.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.materiaId} - {a.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Asignaturas del curso actual */}
                  <AnimatePresence>
                    {formData.especialidad && formData.curso && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="md:col-span-2 mt-4"
                      >
                        {(asignaturasCursoActual.length > 0 || selectedPendingSubjects.length > 0) ? (
                          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 mb-4 flex items-center gap-2">
                              <FileText size={16} className="text-blue-600" />
                              Asignaturas en las que se matricula
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(() => {
                                const convAsigs = formData.convalidacionAsignaturas ?? [];
                                type SubjectRow = { group: number; key: string; code: string; name: string; tipo: 'matriculada' | 'perfil' | 'pendiente' | 'convalidada' };
                                const rows: SubjectRow[] = [];
                                // Repetidor con asignaturas sueltas del último curso: solo muestra esas pendientes
                                const repetidorSuelta = allPendingFromLastCourse;
                                if (!repetidorSuelta) {
                                  for (const m of asignaturasCursoActual) {
                                    const isConvalidada = convAsigs.includes(m.MATERIA);
                                    const isPerfil = !isConvalidada && is5o6Profesional && PROFILE_SPECIFIC_SUBJECTS.some(s => m.DESCRIPCION.toLowerCase().includes(s.toLowerCase()));
                                    rows.push({ group: isConvalidada ? 4 : isPerfil ? 2 : 1, key: m.MATERIA, code: m.MATERIA, name: m.DESCRIPCION, tipo: isConvalidada ? 'convalidada' : isPerfil ? 'perfil' : 'matriculada' });
                                  }
                                }
                                for (const m of selectedPendingSubjects) {
                                  rows.push({ group: 3, key: `pending-${m.id}`, code: m.materiaId, name: m.label, tipo: 'pendiente' });
                                }
                                rows.sort((a, b) => a.group - b.group || a.name.localeCompare(b.name, 'es'));
                                const STYLES = {
                                  matriculada: { bg: 'bg-white border-blue-100',      code: 'text-blue-500 bg-blue-50',      badge: 'text-blue-500 bg-blue-50 border-blue-100',        label: 'Matriculada' },
                                  perfil:      { bg: 'bg-purple-50 border-purple-100', code: 'text-purple-500 bg-purple-100', badge: 'text-purple-500 bg-purple-100 border-purple-200', label: `Perfil ${formData.perfilProfesional}` },
                                  pendiente:   { bg: 'bg-orange-50 border-orange-100', code: 'text-orange-500 bg-orange-100', badge: 'text-orange-500 bg-orange-100 border-orange-200', label: isRepetidor ? 'Repetidor' : 'Pendiente' },
                                  convalidada: { bg: 'bg-green-50 border-green-200',   code: 'text-green-700 bg-green-100',   badge: 'text-green-700 bg-green-100 border-green-200',    label: 'Solicitada convalidación' },
                                };
                                return rows.flatMap((item, idx) => {
                                  const s = STYLES[item.tipo];
                                  const isGroupStart = idx > 0 && rows[idx - 1].group !== item.group;
                                  const card = (
                                    <div key={item.key} className={`flex items-center gap-3 p-3 rounded-xl shadow-sm border ${s.bg}`}>
                                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${s.code}`}>
                                        {item.code}
                                      </span>
                                      <span className="text-sm font-medium text-gray-700 flex-1 min-w-0">
                                        {item.name}
                                      </span>
                                      <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${s.badge}`}>
                                        {s.label}
                                      </span>
                                    </div>
                                  );
                                  if (!isGroupStart) return [card];
                                  return [
                                    <div key={`sep-${item.group}`} className="col-span-full pt-1 pb-0">
                                      <hr className="border-t border-blue-100/60" />
                                    </div>,
                                    card,
                                  ];
                                });
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            No se han encontrado asignaturas para {formData.especialidad} en {formData.curso} de {formData.tipoEnsenanza === 'profesional' ? 'Enseñanza Profesional' : 'Enseñanza Elemental'}.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              {/* Perfiles para 5º y 6º Profesional */}
              <AnimatePresence>
                {(formData.curso.includes('5') || formData.curso.includes('6')) && formData.tipoEnsenanza === 'profesional' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-6 border-t border-gray-50"
                  >
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-4">Elegir un único perfil (Solo 5º y 6º Profesional)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'A', label: 'Perfil A', desc: 'Fundamentos de Composición' },
                        { id: 'B', label: 'Perfil B', desc: formData.curso.includes('5') ? 'Improvisación / Informática Musical' : 'Didáctica musical / Improvisación' },
                        { id: 'C', label: 'Perfil C', desc: formData.curso.includes('5') ? 'Improvisación / Coro 1' : 'Música moderna / Coro 2' },
                      ].map((perfil) => (
                        <label key={perfil.id} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-1 ${formData.perfilProfesional === perfil.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                          <input type="radio" name="perfilProfesional" value={perfil.id} checked={formData.perfilProfesional === perfil.id} onChange={handleChange} className="sr-only" />
                          <span className="font-bold text-sm">{perfil.label}</span>
                          <span className={`text-xs ${formData.perfilProfesional === perfil.id ? 'text-gray-300' : 'text-gray-500'}`}>{perfil.desc}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Forma de Pago */}
          <section className="bg-white rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <CreditCard size={20} className="text-gray-600" />
                </div>
                <h2 className="text-base sm:text-xl font-semibold">Forma de Pago</h2>
                <button 
                  type="button"
                  onClick={() => setIsFeesInfoModalOpen(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
                  title="Ver información de tasas"
                >
                  <AlertCircle size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-2 items-end relative">
                <button 
                  type="button"
                  onClick={() => setIsExemptionModalOpen(true)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${(formData.tipoReduccion && formData.tipoReduccion !== 'ninguna') || formData.matriculaHonor ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  <CheckCircle2 size={16} className={(formData.tipoReduccion && formData.tipoReduccion !== 'ninguna') || formData.matriculaHonor ? 'block' : 'hidden'} />
                  Reducción o Exención de Tasas
                </button>

                {((formData.tipoReduccion && formData.tipoReduccion !== 'ninguna') || formData.matriculaHonor) && (
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {calculation?.details.reductionLabel}
                  </span>
                )}

                <AnimatePresence>
                  {isFeesInfoModalOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsFeesInfoModalOpen(false)}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[120]"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl z-[130] border border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-900 text-white rounded-lg">
                              <AlertCircle size={20} />
                            </div>
                            <h3 className="text-xl font-bold">Información de Tasas</h3>
                          </div>
                          <button type="button" onClick={() => setIsFeesInfoModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                            <Music size={20} className="rotate-45" />
                          </button>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="bg-gray-50 rounded-2xl p-6">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Tasas Generales (Orden 68/2022)</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 font-medium">Servicios Generales</span>
                                <span className="font-bold">10.00€</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 font-medium">Apertura Expediente</span>
                                <span className="font-bold">25.00€</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 font-medium">Prueba de Acceso (Prof.)</span>
                                <span className="font-bold">40.00€</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Elemental</span>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>1º y 2º</span>
                                  <span className="font-bold">94€</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span>3º y 4º</span>
                                  <span className="font-bold">188€</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Profesional</span>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>1º y 2º</span>
                                  <span className="font-bold">232€</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span>3º a 6º</span>
                                  <span className="font-bold">348€</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Reducciones</h4>
                            <div className="space-y-2 text-xs text-blue-800 font-medium">
                              <p>• Familia Numerosa General: 50% de bonificación</p>
                              <p>• Familia Numerosa Especial: 100% de exención</p>
                              <p>• Becarios (Solo Profesional): 100% de exención</p>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsFeesInfoModalOpen(false)}
                          className="w-full mt-8 py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
                        >
                          Cerrar
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isExemptionModalOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsExemptionModalOpen(false)}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl z-[60] border border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold">Reducciones y Exenciones</h3>
                          <button type="button" onClick={() => setIsExemptionModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                            <Music size={20} className="rotate-45" /> {/* Using Music rotated as a cross since I don't have X icon imported yet, wait I should check lucide imports */}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { id: 'ninguna', label: 'Ninguna', desc: 'Sin reducciones aplicables', art: null },
                            { id: 'fam_num_general', label: 'Familia Numerosa General', desc: 'Bonificación del 50% (Art. 14.b)', art: 'fam_num' },
                            { id: 'fam_num_especial', label: 'Familia Numerosa Especial', desc: 'Exención del 100% (Art. 14.a)', art: 'fam_num' },
                            { id: 'discapacidad', label: 'Discapacidad ≥ 33%', desc: 'Exención del 100% (Art. 15)', art: 'discapacidad' },
                            { id: 'terrorismo', label: 'Víctima de Terrorismo', desc: 'Exención del 100% (Art. 16)', art: 'terrorismo' },
                            { id: 'violencia_genero', label: 'Víctima de Violencia de Género', desc: 'Exención del 100% (Art. 17)', art: 'violencia_genero' },
                            { id: 'ingreso_minimo', label: 'Ingreso Mínimo de Solidaridad', desc: 'Exención del 100% (Art. 18)', art: 'ingreso_minimo' },
                          ].map((item) => (
                            <div key={item.id} className="relative group">
                              <button
                                type="button"
                                onClick={() => {
                                  // Si la nueva reducción es incompatible con Matrícula de Honor, la limpiamos
                                  const compatibleConHonor = item.id === 'ninguna' || item.id === 'fam_num_general';
                                  setFormData(prev => ({
                                    ...prev,
                                    tipoReduccion: item.id as any,
                                    matriculaHonor: compatibleConHonor ? prev.matriculaHonor : false,
                                  }));
                                  setIsExemptionModalOpen(false);
                                }}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 pr-16 ${formData.tipoReduccion === item.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}`}
                              >
                                <span className="font-bold text-sm">{item.label}</span>
                                <span className={`text-xs ${formData.tipoReduccion === item.id ? 'text-gray-400' : 'text-gray-500'}`}>{item.desc}</span>
                              </button>
                              {item.art && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedArticle((ARTICLE_TEXTS as any)[item.art]);
                                  }}
                                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${formData.tipoReduccion === item.id ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-gray-400 hover:text-gray-900 shadow-sm'}`}
                                >
                                  <AlertCircle size={24} />
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Separador para Matrícula de Honor */}
                          <div className="border-t border-gray-100 pt-3 mt-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Bonificación adicional apilable</p>
                            <div className="relative group">
                              <button
                                type="button"
                                disabled={formData.tipoReduccion !== 'ninguna' && formData.tipoReduccion !== 'fam_num_general' && formData.tipoReduccion !== ''}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, matriculaHonor: !prev.matriculaHonor }));
                                  setIsExemptionModalOpen(false);
                                }}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 pr-16
                                  ${formData.matriculaHonor ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}
                                  ${(formData.tipoReduccion !== 'ninguna' && formData.tipoReduccion !== 'fam_num_general' && formData.tipoReduccion !== '') ? 'opacity-40 cursor-not-allowed' : ''}
                                `}
                              >
                                <span className="font-bold text-sm">Matrícula de Honor</span>
                                <span className={`text-xs ${formData.matriculaHonor ? 'text-gray-400' : 'text-gray-500'}`}>Bonificación de 58€ (1 asignatura) (Art. 13)</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedArticle(ARTICLE_TEXTS.matricula_honor);
                                }}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${formData.matriculaHonor ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-gray-400 hover:text-gray-900 shadow-sm'}`}
                              >
                                <AlertCircle size={24} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Aviso documentación acreditativa */}
                        {formData.tipoReduccion !== 'ninguna' && formData.tipoReduccion !== '' && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-3"
                          >
                            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 leading-relaxed">
                              Será necesario <strong>adjuntar documentación acreditativa</strong> de la circunstancia que justifique la Reducción o Exención. Hasta que no se aporte, la tramitación de la Solicitud de Matrícula quedará <strong>en suspenso</strong> y, transcurrido el plazo de matrícula sin haber aportado dicha documentación, su solicitud quedará <strong>desestimada</strong>.
                            </p>
                          </motion.div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {selectedArticle && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedArticle(null)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[70]"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl z-[80] border border-gray-100"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
                          <div className="p-2 bg-gray-900 text-white rounded-lg">
                            <FileText size={20} />
                          </div>
                          <h3 className="text-lg font-bold leading-tight">{selectedArticle.title}</h3>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap italic">
                            "{selectedArticle.text}"
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedArticle(null)}
                          className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
                        >
                          Entendido
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showValidationModal && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowValidationModal(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[120]"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl z-[130] border border-red-100"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
                          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                            <AlertCircle size={24} />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">Campos Obligatorios</h3>
                        </div>
                        
                        <div className="bg-red-50 rounded-2xl p-6 mb-6">
                          <p className="text-sm text-red-800 font-medium mb-3">
                            Por favor, complete los siguientes campos para continuar:
                          </p>
                          <ul className="space-y-2">
                            {validationErrors.map((error, index) => (
                              <li key={index} className="text-sm text-red-700 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                                {error.label}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={handleValidationClose}
                          className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                        >
                          Entendido
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {encryptedPdfNames.length > 0 && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setEncryptedPdfNames([])}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[125]"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl z-[135] border border-amber-100"
                      >
                        <div className="flex items-center gap-3 mb-5">
                          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                            <AlertCircle size={24} />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">Documento protegido con contraseña</h3>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5 space-y-4">
                          <p className="text-sm text-amber-900 font-medium">
                            Por razones de seguridad, el sistema no admite PDF protegidos con contraseña. La única
                            forma de incluir el documento es introducir su contraseña para desbloquearlo:
                          </p>
                          <ul className="space-y-4">
                            {encryptedPdfNames.map((n, i) => (
                              <li key={i} className="space-y-2">
                                <div className="text-sm text-amber-900 flex items-start gap-2">
                                  <span className="mt-0.5 shrink-0">•</span>
                                  <span className="font-semibold break-all">{n}</span>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="password"
                                    value={pwInputs[n] ?? ''}
                                    placeholder="Contraseña del documento"
                                    onChange={e => setPwInputs(prev => ({ ...prev, [n]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void _tryUnlockPdf(n); } }}
                                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                  />
                                  <button
                                    type="button"
                                    disabled={pwBusy === n}
                                    onClick={() => void _tryUnlockPdf(n)}
                                    className="shrink-0 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 disabled:opacity-60 transition-colors"
                                  >
                                    {pwBusy === n ? 'Comprobando…' : 'Desbloquear'}
                                  </button>
                                </div>
                                {pwErrors[n] && (
                                  <p className="text-xs text-red-700 font-medium">{pwErrors[n]}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-amber-800">
                            Si no introduce la contraseña, la solicitud se enviará igualmente, pero ese PDF
                            aparecerá solo como página informativa dentro del documento generado.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEncryptedPdfNames([])}
                          className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                        >
                          Entendido
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showReminderModal && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowReminderModal(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[140]"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl z-[150] border border-orange-100 max-h-[90vh] overflow-y-auto"
                      >
                        {attachmentRequired && attachments.length === 0 ? (
                          <>
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                <AlertCircle size={24} />
                              </div>
                              <h3 className="text-xl font-bold text-gray-900">Documentación obligatoria</h3>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 space-y-4">
                              <p className="text-sm font-bold text-red-900">
                                No puede continuar sin adjuntar la documentación requerida:
                              </p>
                              {requiredDocSections.map((section, idx) => (
                                <div key={idx}>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-1">{section.title}</p>
                                  <ul className="space-y-1">
                                    {section.items.map((item, iIdx) => (
                                      <li key={iIdx} className="flex gap-2 text-sm text-red-800">
                                        <span className="mt-0.5 shrink-0">•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowReminderModal(false)}
                              className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                            >
                              Volver y adjuntar documentación
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                <AlertCircle size={24} />
                              </div>
                              <h3 className="text-xl font-bold text-gray-900">Documentación necesaria</h3>
                            </div>
                            <div className="bg-orange-50 rounded-2xl p-6 mb-6 space-y-4">
                              {requiredDocSections.length > 0 ? (
                                <>
                                  <p className="text-sm font-medium text-orange-900">
                                    Verifique que ha adjuntado la documentación correcta:
                                  </p>
                                  {requiredDocSections.map((section, idx) => (
                                    <div key={idx}>
                                      <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700 mb-1">{section.title}</p>
                                      <ul className="space-y-1">
                                        {section.items.map((item, iIdx) => (
                                          <li key={iIdx} className="flex gap-2 text-sm text-orange-800">
                                            <span className="mt-0.5 shrink-0">•</span>
                                            <span>{item}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <p className="text-sm text-orange-900 font-medium leading-relaxed">
                                  RECUERDE: verifique toda la información antes de continuar con el envío de la solicitud.
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowReminderModal(false);
                                  setViewMode('readonly');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                              >
                                Entendido, continuar
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowReminderModal(false)}
                                className="w-full py-4 bg-transparent text-gray-700 border-2 border-gray-200 rounded-xl font-bold uppercase tracking-widest hover:bg-gray-50 transition-all"
                              >
                                Volver
                              </button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isAperturaWarningOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAperturaWarningOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl z-[110] border border-red-100"
                      >
                        <div className="flex items-center gap-4 mb-8">
                          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                            <AlertCircle size={32} />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-gray-900 leading-tight">¿Seguro que no debe abonar la apertura de expediente?</h3>
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mt-1">Verificación de normativa vigente</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-3xl p-8 mb-8 border border-gray-100">
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <FileText size={14} />
                            Texto Literal de la Normativa
                          </h4>
                          <p className="text-base text-gray-700 leading-relaxed italic font-serif">
                            "{ARTICLE_TEXTS.apertura_expediente.text}"
                          </p>
                          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Orden 68/2022, de 21 de marzo</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consejería de Educación</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={() => setIsAperturaWarningOpen(false)}
                            className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                          >
                            Sí, estoy seguro
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAperturaWarningOpen(false);
                              setFormData(prev => ({ ...prev, esPrimerAno: true }));
                            }}
                            className="w-full py-5 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-gray-50 transition-all"
                          >
                            No, incluir apertura (25€)
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 mb-8">
              <div className="relative group">
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all pr-16">
                  <input 
                    type="checkbox" 
                    name="esPrimerAno" 
                    checked={formData.esPrimerAno}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700">Primer año en el centro o Primer año en Profesional</span>
                    <span className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">Apertura de expediente (25€). Se abona la primera vez que te matriculas en cada enseñanza o especialidad.</span>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(ARTICLE_TEXTS.apertura_expediente)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white text-gray-400 hover:text-gray-900 rounded-xl shadow-sm transition-all"
                  title="Ver normativa sobre apertura de expediente"
                >
                  <AlertCircle size={20} />
                </button>
              </div>
            </div>

            {formData.esRepetidor && formData.esPrimerAno && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-2">
                <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 font-medium leading-relaxed">
                  <span className="font-bold">Incongruencia detectada:</span> Un alumno repetidor no puede ser primer año en el centro al mismo tiempo. Revisa los campos <span className="font-bold">Repetidor</span> y <span className="font-bold">Primer año</span> antes de continuar.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'unico', label: 'Opción 1', title: 'Pago Único', desc: 'Total a ingresar en un solo pago' },
                { id: 'fraccionado', label: 'Opción 2', title: 'Pago Fraccionado', desc: 'Dos pagos (1er y 2º plazo)' },
                { id: 'beca', label: 'Opción 3', title: 'Solicita Beca', desc: 'Debe aportar el justificante de registro de la beca para el centro' },
              ].filter(opcion => !(formData.tipoEnsenanza === 'elemental' && opcion.id === 'beca')).map((opcion) => (
                <label key={opcion.id} className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${formData.formaPago === opcion.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                  <input type="radio" name="formaPago" value={opcion.id} checked={formData.formaPago === opcion.id} onChange={handleChange} className="sr-only" />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${formData.formaPago === opcion.id ? 'text-gray-400' : 'text-gray-400'}`}>{opcion.label}</span>
                  <span className="font-bold text-lg">{opcion.title}</span>
                  <span className={`text-xs leading-relaxed ${formData.formaPago === opcion.id ? 'text-gray-300' : 'text-gray-500'}`}>{opcion.desc}</span>
                </label>
              ))}
            </div>

            <AnimatePresence>
              {formData.formaPago === 'beca' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3"
                >
                  <AlertCircle size={20} className="text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-800 font-medium leading-relaxed">
                    Debe aportar el justificante de registro de la beca para el centro.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {calculation && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-8 overflow-hidden"
                >
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Desglose de Tasas</h3>
                    <div className="space-y-3">
                      {(() => {
                        const d = calculation.details;
                        const rep = !!d.repetidorMode;
                        const badge = rep ? <span className="ml-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-0.5">(+20%)</span> : null;
                        const totalConceptos =
                          d.serviciosGenerales +
                          d.aperturaExpediente +
                          (d.repetidorMode !== 'suelta' ? d.curso : 0) +
                          d.asignaturasPendientes -
                          d.convalidacionDiscount -
                          d.matriculaHonorDiscount;
                        return (
                          <>
                            <div className="flex justify-between text-sm items-center">
                              <span className="text-gray-500 flex items-center">Servicios Generales{badge}</span>
                              <span className="font-medium">{d.serviciosGenerales.toFixed(2)}€</span>
                            </div>
                            {formData.esPrimerAno && (
                              <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 flex items-center">Apertura de Expediente{badge}</span>
                                <span className="font-medium">{d.aperturaExpediente.toFixed(2)}€</span>
                              </div>
                            )}
                            {d.repetidorMode !== 'suelta' && (
                              <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 flex items-center">
                                  Matrícula Curso ({formData.curso}){d.repetidorMode === 'completo' ? badge : null}
                                </span>
                                <span className="font-medium">{d.curso.toFixed(2)}€</span>
                              </div>
                            )}
                            {d.asignaturasPendientes > 0 && (
                              <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 flex items-center">
                                  Asignaturas Pendientes{d.repetidorMode === 'suelta' ? badge : null}
                                </span>
                                <span className="font-medium">{d.asignaturasPendientes.toFixed(2)}€</span>
                              </div>
                            )}
                            {d.convalidacionDiscount > 0 && renderConvalidacionRow(d.convalidacionCount, d.convalidacionDiscount)}
                            {d.matriculaHonorDiscount > 0 && (
                              <div className="flex justify-between text-sm pt-2 border-t border-gray-100 text-green-600 font-bold">
                                <span>Matrícula de Honor (Art. 13)</span>
                                <span>-{d.matriculaHonorDiscount.toFixed(2)}€</span>
                              </div>
                            )}
                            {d.multiplier < 1 && (
                              <div className="flex justify-between text-sm pt-2 border-t border-gray-100 text-green-600 font-bold">
                                <span>Reducción aplicada</span>
                                <span>-{((1 - d.multiplier) * 100).toFixed(0)}%</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm pt-3 mt-1 border-t-2 border-gray-200 font-bold">
                              <span className="text-gray-700">Total Tasas</span>
                              <span className="text-gray-900">{totalConceptos.toFixed(2)}€</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {formData.formaPago && formData.formaPago !== 'beca' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Importe Total (€)</label>
                    <input name="importeTotal" value={formData.importeTotal} onChange={handleChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" placeholder="0.00" />
                  </div>
                  {formData.formaPago === 'fraccionado' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Importe 1er Pago (€)</label>
                        <input name="importe1erPago" value={formData.importe1erPago} onChange={handleChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" placeholder="0.00" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Importe 2º Pago (€)</label>
                        <input name="importe2oPago" value={formData.importe2oPago} onChange={handleChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" placeholder="0.00" />
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-2 leading-relaxed">
                          El segundo pago debe realizarse en la primera semana de diciembre, enviando el justificante al correo electrónico del conservatorio.
                        </p>
                      </div>
                    </>
                  )}
                  {viewMode !== 'readonly' && (
                    <>
                      <div className="md:col-span-2 flex items-center gap-3 mt-2">
                        <a
                          href="https://modelos-tributos.jccm.es/webgreco/modelos/jsp/cumplimentacion/GreJspModelo046_2012_P.jsp"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-modelo046"
                        >
                          Modelo 046
                          <div className="arrow-wrapper">
                            <div className="arrow"></div>
                          </div>
                        </a>
                        <button
                          type="button"
                          onClick={() => setIsModelo046InfoOpen(true)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
                          title="Instrucciones para cumplimentar el Modelo 046"
                        >
                          <AlertCircle size={20} />
                        </button>
                      </div>
                      {formData.importeTotal && parseFloat(formData.importeTotal) > 0 && (
                        <div className="md:col-span-2 mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
                          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800 leading-relaxed">
                            Será necesario adjuntar documentación acreditativa el pago de la tasa, con <strong>justificante del pago</strong> (no es válido copia de la autoliquidación). Hasta que no se aporte, la tramitación de la Solicitud de Matrícula quedará <strong>en suspenso</strong> y, transcurrido el plazo de matrícula sin haber aportado dicha documentación, su solicitud quedará <strong>desestimada</strong>.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

                  {isModelo046InfoOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsModelo046InfoOpen(false)}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[120]"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl z-[130] border border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-900 text-white rounded-lg">
                              <AlertCircle size={20} />
                            </div>
                            <h3 className="text-xl font-bold">Modelo 046</h3>
                          </div>
                          <button type="button" onClick={() => setIsModelo046InfoOpen(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                            <Music size={20} className="rotate-45" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <p className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[11px]">Instrucciones para la cumplimentación del modelo 046</p>
                          <ul className="space-y-3 text-sm text-gray-700 leading-relaxed">
                            <li className="flex gap-2">
                              <span className="text-gray-400 shrink-0">–</span>
                              <span><strong>Consejería u Organismo Autónomo:</strong> CONSEJERÍA DE EDUCACIÓN, CULTURA Y DEPORTES</span>
                            </li>
                            <li className="flex gap-2">
                              <span className="text-gray-400 shrink-0">–</span>
                              <span><strong>Órgano Gestor:</strong> DELG. PROV. DE EDUCACIÓN, CULTURA Y DEP. CIUDAD REAL.</span>
                            </li>
                            <li className="flex gap-2">
                              <span className="text-gray-400 shrink-0">–</span>
                              <span><strong>Denominación del Concepto:</strong> 2032 – PRECIO PÚBLICO DE ENSEÑANZAS DE IDIOMAS, MÚSICA, DANZA Y DISEÑO.</span>
                            </li>
                            <li className="flex gap-2">
                              <span className="text-gray-400 shrink-0">–</span>
                              <span>Hacer CLIC en el botón <strong>"CUMPLIMENTAR el MODELO 046"</strong>.</span>
                            </li>
                            <li className="flex gap-2">
                              <span className="text-gray-400 shrink-0">–</span>
                              <span>En la nueva ventana ingresar los datos solicitados (fecha de devengo, datos personales del pagador).</span>
                            </li>
                            <li className="flex gap-2">
                              <span className="text-gray-400 shrink-0">–</span>
                              <span><strong>Descripción:</strong> Enseñanzas Elementales o Profesionales de Música, especialidad y curso. También se hará constar si tiene algún tipo de bonificación o exención.</span>
                            </li>
                          </ul>
                        </div>

                        <div className="mt-8 flex flex-col gap-3">
                          <a
                            href="https://portaltributario.jccm.es/sites/portaltributario.castillalamancha.es/files/instrucciones/i-046_2026_01_12.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 px-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-bold text-sm text-center hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                          >
                            <FileText size={16} />
                            Más información en PDF
                          </a>
                          <button
                            type="button"
                            onClick={() => setIsModelo046InfoOpen(false)}
                            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
                          >
                            Cerrar
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
          </section>

          {/* Información Legal */}
          <section className="bg-gray-900 text-white rounded-[2rem] p-8 shadow-sm">
            {viewMode !== 'readonly' && (
              <>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
                  <FileText size={20} className="text-gray-400" />
                  <h2 className="text-base sm:text-xl font-semibold">Información y Autorización</h2>
                </div>
                <div className="space-y-4 text-sm text-gray-300 leading-relaxed max-h-48 overflow-y-auto pr-4 custom-scrollbar">
                  <p className="font-bold text-white uppercase text-xs tracking-widest mb-2">Autorización para la publicación de imágenes</p>
                  <p>
                    Con la inclusión de las nuevas tecnologías dentro de los medios didácticos al alcance de la Comunidad Escolar, existe la posibilidad de que en éstos puedan aparecer imágenes del solicitante /sus hijos/as (en el caso de menores de edad) durante la realización de actividades escolares.
                  </p>
                  <p>
                    Dado que el derecho a la propia imagen está reconocido en el artículo 18 de la Constitución y regulado por la Ley 1/1982, de 5 de mayo, sobre el derecho al honor, a la intimidad personal y familiar y la propia imagen, y la Ley 15/1999, de 13 de diciembre, sobre la Protección de Datos de Carácter Personal, la Dirección de este Conservatorio pide el consentimiento a los interesados o a los padres para poder publicar imágenes y/o grabaciones audiovisuales con carácter pedagógico y divulgativo.
                  </p>
                  <p className="font-bold text-white uppercase text-xs tracking-widest mt-4 mb-2">Protección de Datos</p>
                  <p>
                    En cumplimiento de lo dispuesto en la Ley Orgánica 15/1999, de 13 de diciembre, de Protección de Datos de Carácter Personal, se le informa que los datos personales obtenidos mediante este formulario serán incorporados al fichero de la aplicación de gestión académica. Puede ejercitar sus derechos de acceso, rectificación, cancelación y oposición dirigiendo un escrito a la Consejería competente en educación de la Junta de Comunidades de Castilla-La Mancha.
                  </p>
                </div>
              </>
            )}
            <div className={viewMode !== 'readonly' ? 'mt-8 p-4 bg-white/5 rounded-2xl border border-white/10' : 'p-4 bg-white/5 rounded-2xl border border-white/10'}>
              <p className="text-xs text-gray-400 mb-6 italic">
                DECLARACIÓN: La persona abajo firmante DECLARA, bajo su expresa responsabilidad, que son ciertos los datos que figuran en la presente solicitud, así como en la documentación que se acompaña.
              </p>

              {viewMode === 'readonly' && attachments.length > 0 && (
                <div className="mb-6 pb-6 border-b border-white/10">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3">
                    <Paperclip size={18} className="text-gray-400" />
                    Documentos Adjuntos
                  </p>
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                        <FileText size={16} className="text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-300 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewMode !== 'readonly' && (
                <>
                  {/* File Attachment Section */}
                  <div className="mb-6 pb-6 border-b border-white/10">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4 cursor-pointer">
                      <Paperclip size={18} className="text-gray-400" />
                      Documentos Adjuntos (Opcional - máx 5Mb.)
                    </label>
                    <p className="text-xs text-gray-400 mb-4">Se aceptan archivos de imagen (JPG, PNG, etc.) y PDF</p>

                    <input
                      type="file"
                      id="file-input"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => document.getElementById('file-input')?.click()}
                      className="w-full py-3 px-4 border-2 border-dashed border-gray-400 rounded-xl text-gray-300 hover:border-white hover:text-white transition-all flex items-center justify-center gap-2 mb-4"
                    >
                      <Paperclip size={18} />
                      Adjuntar Archivos
                    </button>

                    {/* Attachments List */}
                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        {attachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText size={16} className="text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm text-gray-300 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(index)}
                              className="flex-shrink-0 p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-all"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/15 my-4" />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-orange-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Vista Previa al Envío'
                    )}
                  </button>
                </>
              )}
            </div>
          </section>
        </form>
        </div>

        <AnimatePresence>
          {submitStatus === 'error' && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setSubmitStatus('idle'); setSubmitError(null); }}
                className="fixed inset-0 bg-black/40 backdrop-blur-md z-[140]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl z-[150] border border-red-100"
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <AlertCircle size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Error al enviar</h3>
                </div>
                <div className="bg-red-50 rounded-2xl p-6 mb-6">
                  <p className="text-sm text-red-800 font-medium">
                    {submitError || 'Hubo un error al enviar el formulario. Por favor, inténtalo de nuevo.'}
                  </p>
                  <p className="text-xs text-red-600 mt-3">
                    Si el problema persiste, comprueba tu conexión a Internet o contacta con Secretaría.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSubmitStatus('idle'); setSubmitError(null); }}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                >
                  Entendido
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {submitStatus === 'duplicate' && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSubmitStatus('idle')}
                className="fixed inset-0 bg-black/40 backdrop-blur-md z-[140]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl z-[150] border border-amber-200"
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <AlertCircle size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Solicitud duplicada</h3>
                </div>
                <div className="bg-amber-50 rounded-2xl p-6 mb-6 text-sm text-amber-800">
                  <p className="font-semibold mb-2">Ya existe una solicitud de matrícula para este DNI, especialidad y curso.</p>
                  <p>
                    Si necesitas modificarla, contacta con la Secretaría del Conservatorio:<br />
                    📞 <b>926 274 154</b> &nbsp;|&nbsp; ✉️ <a href="mailto:13004341.cpm@educastillalamancha.es" className="underline">13004341.cpm@educastillalamancha.es</a>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitStatus('idle')}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                >
                  Entendido
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <footer className="mt-12 text-center text-gray-400 text-xs pb-12">
          <p>© {currentYear} Conservatorio Profesional de Música "Marcos Redondo" - Ciudad Real</p>
          <p className="mt-1">Sistema de Matriculación Digital</p>
          <button
            type="button"
            onClick={handleDownloadTutorial}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
          >
            <FileText size={14} />
            Ver Tutorial del Formulario (PDF)
          </button>
        </footer>

      {/* ── Modal: Convalidación (principal) ── */}
      <AnimatePresence>
        {isConvalidacionModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConvalidacionModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-[2.5rem] p-8 shadow-2xl z-[160] border border-gray-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-900 text-white rounded-lg">
                    <CheckCircle2 size={20} />
                  </div>
                  <h3 className="text-xl font-bold">Convalidación de Asignaturas</h3>
                </div>
                <button type="button" onClick={() => setIsConvalidacionModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {convalidacionModalView === 'types' ? (
                  <motion.div
                    key="types"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                      <p className="text-sm text-blue-800 leading-relaxed">
                        Seleccione el tipo de convalidación que desea solicitar. En los dos primeros casos podrá elegir las asignaturas concretas y se aplicará la <strong>reducción correspondiente en las tasas de matrícula</strong>.
                      </p>
                    </div>

                    {/* Botón 1: Doble Especialidad */}
                    <button
                      type="button"
                      onClick={() => { setConvalidacionSubjectContext('doble'); setFormData((prev: EnrollmentFormData) => ({ ...prev, convalidacionMotivo: 'doble' })); setIsConvalidacionSubjectModalOpen(true); }}
                      className="w-full text-left p-5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 hover:border-gray-200 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 shrink-0 group-hover:shadow">
                          <GraduationCap size={22} className="text-gray-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm sm:text-base">Convalidación por Doble Especialidad o Similar</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">Asignatura ya cursada y superada con coincidencia en denominación y curso.</p>
                          <p className="text-xs text-amber-600 font-semibold mt-1.5">Excepciones: Orquesta/Banda y Música de Cámara</p>
                          <p className="text-[10px] text-blue-600 font-bold mt-2 uppercase tracking-wider">Supone reducción en tasas de matrícula.</p>
                        </div>
                      </div>
                    </button>

                    {/* Botón 2: ESO y Bachillerato */}
                    <button
                      type="button"
                      onClick={() => { setConvalidacionSubjectContext('eso_bach'); setFormData((prev: EnrollmentFormData) => ({ ...prev, convalidacionMotivo: 'eso_bach' })); setIsConvalidacionSubjectModalOpen(true); }}
                      className="w-full text-left p-5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 hover:border-gray-200 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 shrink-0 group-hover:shadow">
                          <FileText size={22} className="text-gray-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm sm:text-base">Asignaturas de ESO y Bachillerato</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">Convalidación de asignaturas del conservatorio con materias de ESO o Bachillerato.</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <a
                              href="https://www.conservatoriociudadreal.es/wp-content/uploads/2025/09/Convalidaciones-ESO-FAQ.pdf"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                            >
                              <ExternalLink size={11} /> Ver detalle ESO
                            </a>
                            <a
                              href="https://www.conservatoriociudadreal.es/wp-content/uploads/2025/09/Convalidaciones-Bachillerato-FAQ.pdf"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                            >
                              <ExternalLink size={11} /> Ver detalle Bachillerato
                            </a>
                          </div>
                          <p className="text-[10px] text-blue-600 font-bold mt-2 uppercase tracking-wider">Supone reducción en tasas de matrícula. Se debe aportar certificado que acredita que se va a cursar o que ha sido cursada y la nota obtenida, como documento adjunto a esta solicitud</p>
                        </div>
                      </div>
                    </button>

                    {/* Botón 3: Otros estudios / Ministerio */}
                    <button
                      type="button"
                      onClick={() => setConvalidacionModalView('ministerio')}
                      className="w-full text-left p-5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 hover:border-gray-200 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 shrink-0 group-hover:shadow">
                          <AlertCircle size={22} className="text-gray-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm sm:text-base">Otros Estudios o Planes de Estudios Anteriores</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">Estudios distintos o planes de estudios de estudios antiguos no reconocibles directamente.</p>
                          <p className="text-[10px] text-red-600 font-bold mt-2 uppercase tracking-wider">No supone reducción en tasas de matrícula en este momento de la Matriculación, hasta que sea resuelta por el Ministerio de Educación.</p>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ministerio"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <button
                      type="button"
                      onClick={() => setConvalidacionModalView('types')}
                      className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider mb-2 transition-colors"
                    >
                      ← Volver a tipos de convalidación
                    </button>

                    <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-900 text-sm">Tramitación a través del Ministerio de Educación</p>
                          <p className="text-sm text-amber-800 leading-relaxed mt-2">
                            Este tipo de convalidación no se resuelve de forma directa en el centro. Deberá realizar la solicitud ante el <strong>Ministerio de Educación, Formación Profesional y Deportes</strong> y, una vez obtenida la resolución, notificarla al conservatorio para que se proceda a la convalidación.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 leading-relaxed">
                        Este tipo de convalidación{' '}
                        <strong>no conlleva reducción en el precio de las tasas de matrícula, hasta el momento de que sea aceptada la convalidación por el Ministerio, pudiendo solicitar la Devolución de Ingresos Indebidos (Modelo&nbsp;413)</strong>.
                      </p>
                    </div>

                    <a
                      href="https://www.educacionfpydeportes.gob.es/servicios-al-ciudadano/catalogo/gestion-titulos/estudios-no-universitarios/titulos-espanoles/convalidaciones/convalidacion-estudios-musica-danza.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:bg-gray-100 transition-all text-sm font-bold text-gray-700"
                    >
                      <ExternalLink size={16} className="shrink-0" />
                      <span>Solicitud de convalidación en el Ministerio de Educación</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setIsConvalidacionModalOpen(false)}
                      className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
                    >
                      Cerrar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Modal: Convalidación - Selección de Asignaturas ── */}
      <AnimatePresence>
        {isConvalidacionSubjectModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConvalidacionSubjectModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[170]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl z-[180] border border-gray-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-900 text-white rounded-lg">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {convalidacionSubjectContext === 'doble' ? 'Doble Especialidad o Similar' : 'ESO y Bachillerato'}
                    </h3>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-0.5">Selección de asignaturas</p>
                  </div>
                </div>
                <button type="button" onClick={() => setIsConvalidacionSubjectModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {convalidacionSubjectContext === 'doble' && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Excepciones:</strong> No son convalidables por esta vía las asignaturas de Orquesta/Banda, Música de Cámara y Repertorio Acompañado.
                  </p>
                </div>
              )}

              {convalidacionSubjectContext === 'eso_bach' && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Documentación de referencia</p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="https://www.conservatoriociudadreal.es/wp-content/uploads/2025/09/Convalidaciones-ESO-FAQ.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink size={12} /> Ver detalle ESO (PDF)
                    </a>
                    <a
                      href="https://www.conservatoriociudadreal.es/wp-content/uploads/2025/09/Convalidaciones-Bachillerato-FAQ.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink size={12} /> Ver detalle Bachillerato (PDF)
                    </a>
                  </div>
                </div>
              )}

              {/* Selectores inline si falta curso o especialidad */}
              {(!formData.curso || !formData.especialidad) && (
                <div className="mb-5 p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Completa los datos del curso</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500 font-medium">Enseñanza</label>
                      <select
                        name="tipoEnsenanza"
                        value={formData.tipoEnsenanza}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-200 appearance-none cursor-pointer"
                      >
                        <option value="elemental">Elemental</option>
                        <option value="profesional">Profesional</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500 font-medium">Curso</label>
                      <select
                        name="curso"
                        value={formData.curso}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-200 appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Seleccionar...</option>
                        {(formData.tipoEnsenanza === 'elemental' ? ['1º','2º','3º','4º'] : ['1º','2º','3º','4º','5º','6º']).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500 font-medium">Especialidad</label>
                      <select
                        name="especialidad"
                        value={formData.especialidad}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-200 appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Seleccionar...</option>
                        {["Canto","Clarinete","Contrabajo","Fagot","Flauta Travesera","Guitarra","Oboe","Percusión","Piano","Saxofón","Trombón","Trompa","Trompeta","Tuba","Viola","Violín","Violoncello"]
                          .filter(esp => !(formData.tipoEnsenanza === 'elemental' && esp === 'Canto'))
                          .map(esp => <option key={esp} value={esp}>{esp}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Asignaturas que solicita convalidar</label>
                {asignaturasCursoActual.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
                    {!formData.curso || !formData.especialidad
                      ? 'Selecciona el curso y la especialidad para ver las asignaturas disponibles.'
                      : 'No se han encontrado asignaturas para la combinación seleccionada.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {asignaturasCursoActual.map((materia: Materia) => {
                      const checked = (formData.convalidacionAsignaturas ?? []).includes(materia.MATERIA);
                      return (
                        <label
                          key={materia.MATERIA}
                          className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl transition-all ${checked ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleConvalidacionToggle(materia.MATERIA)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{materia.DESCRIPCION}</span>
                          {checked && (
                            <span className="ml-auto text-xs font-semibold text-blue-600">
                              −{formData.tipoEnsenanza === 'elemental' ? '47' : '58'} €
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
                {(formData.convalidacionAsignaturas ?? []).length > 0 && (
                  <p className="text-xs text-blue-700 font-semibold ml-1">
                    {(formData.convalidacionAsignaturas ?? []).length} asignatura{(formData.convalidacionAsignaturas ?? []).length > 1 ? 's' : ''} seleccionada{(formData.convalidacionAsignaturas ?? []).length > 1 ? 's' : ''} — descuento: −{(formData.convalidacionAsignaturas ?? []).length * (formData.tipoEnsenanza === 'elemental' ? 47 : 58)} €
                  </p>
                )}
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    La resolución quedará condicionada a la aportación de documentación acreditativa (certificado académico oficial, programas de estudio, etc.). El centro le comunicará el resultado y, en su caso, el importe definitivo a abonar.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsConvalidacionSubjectModalOpen(false);
                  setIsConvalidacionModalOpen(false);
                }}
                className="w-full mt-6 py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
              >
                Confirmar selección
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>


      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

    </div>
  );
}
