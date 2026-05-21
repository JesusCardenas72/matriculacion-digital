/**
 * MatriculacionSection — módulo autocontenido de datos de matriculación.
 *
 * Props:
 *   formData            → estado controlado (MatriculacionFormData)
 *   onChange            → handler estándar de inputs/selects
 *   onConvalidacionClick → (opcional) abre tu modal de convalidación
 *
 * Dependencias externas:
 *   - materias.ts  (../../data/materias — ajusta la ruta si cambias de proyecto)
 *   - lucide-react (GraduationCap, CheckCircle2, FileText, AlertCircle)
 *   - motion/react (AnimatePresence, motion) — se puede sustituir por null si no se usa
 */

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GraduationCap, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { materias } from '../data/materias';
import type { MatriculacionFormData } from './types';

// Asignaturas que solo aparecen según perfil elegido en 5º/6º Profesional
const PROFILE_SPECIFIC_SUBJECTS = [
  'Fundamentos de Composición',
  'Improvisación',
  'Informática musical',
  'Didáctica de la Música',
  'Didáctica musical',
  'Coro',
  'Música moderna',
];

const ESPECIALIDADES = [
  'Canto', 'Clarinete', 'Contrabajo', 'Fagot', 'Flauta Travesera',
  'Guitarra', 'Oboe', 'Percusión', 'Piano', 'Saxofón',
  'Trombón', 'Trompa', 'Trompeta', 'Tuba', 'Viola',
  'Violín', 'Violoncello',
];

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  formData: MatriculacionFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onConvalidacionClick?: () => void;
}

export function MatriculacionSection({ formData, onChange, onConvalidacionClick }: Props) {

  // Lista de cursos según tipo de enseñanza
  const cursos = useMemo(() => {
    if (formData.tipoEnsenanza === 'elemental')   return ['1º', '2º', '3º', '4º'];
    if (formData.tipoEnsenanza === 'profesional') return ['1º', '2º', '3º', '4º', '5º', '6º'];
    return [];
  }, [formData.tipoEnsenanza]);

  // Asignaturas del curso actual (filtradas por tipo, especialidad y perfil)
  const asignaturasCursoActual = useMemo(() => {
    if (!formData.especialidad || !formData.curso || !formData.tipoEnsenanza) return [];

    const cursoNum = parseInt(formData.curso);
    const tipoStr = formData.tipoEnsenanza === 'profesional' ? 'Profesional' : 'Elemental';
    const is5o6 = (formData.curso.includes('5') || formData.curso.includes('6')) && formData.tipoEnsenanza === 'profesional';

    return materias.filter(m => {
      const isEspMatch =
        m.ESPECIALIDAD.toLowerCase().includes(formData.especialidad.toLowerCase()) ||
        formData.especialidad.toLowerCase().includes(m.ESPECIALIDAD.toLowerCase());

      if (m.ENSEÑANZAS !== tipoStr || !isEspMatch || parseInt(m.CURSO_N) !== cursoNum) return false;

      if (is5o6) {
        const is6th = formData.curso.includes('6');
        const profileSubjects: Record<string, string[]> = is6th
          ? {
              A: ['Fundamentos de Composición'],
              B: ['Improvisación', 'Didáctica de la Música', 'Didáctica musical'],
              C: ['Música moderna', 'Coro'],
            }
          : {
              A: ['Fundamentos de Composición'],
              B: ['Improvisación', 'Informática musical'],
              C: ['Improvisación', 'Coro'],
            };

        const isProfileSpecific = PROFILE_SPECIFIC_SUBJECTS.some(s =>
          m.DESCRIPCION.toLowerCase().includes(s.toLowerCase())
        );

        if (isProfileSpecific) {
          if (!formData.perfilProfesional) return false;
          const allowed = profileSubjects[formData.perfilProfesional] ?? [];
          return allowed.some(s => m.DESCRIPCION.toLowerCase().includes(s.toLowerCase()));
        }
      }

      return true;
    });
  }, [formData.especialidad, formData.curso, formData.tipoEnsenanza, formData.perfilProfesional]);

  // Asignaturas de cursos anteriores (para "pendientes")
  const asignaturasPrevias = useMemo(() => {
    if (!formData.especialidad || !formData.curso || !formData.tipoEnsenanza) return [];

    const cursoNum = parseInt(formData.curso);
    const tipoStr = formData.tipoEnsenanza === 'profesional' ? 'Profesional' : 'Elemental';

    return materias
      .filter(m => {
        const isEspMatch =
          m.ESPECIALIDAD.toLowerCase().includes(formData.especialidad.toLowerCase()) ||
          formData.especialidad.toLowerCase().includes(m.ESPECIALIDAD.toLowerCase());
        return m.ENSEÑANZAS === tipoStr && isEspMatch && parseInt(m.CURSO_N) < cursoNum;
      })
      .map(m => ({ id: m.MATERIA, label: `${m.DESCRIPCION} (${m.CURSO_N})`, materiaId: m.MATERIA }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [formData.especialidad, formData.curso, formData.tipoEnsenanza]);

  // Asignaturas pendientes seleccionadas (con datos completos)
  const selectedPendingSubjects = useMemo(() => {
    const result = [];
    if (formData.asignaturaPendiente1) {
      const found = asignaturasPrevias.find(a => a.id === formData.asignaturaPendiente1);
      if (found) result.push(found);
    }
    if (formData.asignaturaPendiente2) {
      const found = asignaturasPrevias.find(a => a.id === formData.asignaturaPendiente2);
      if (found) result.push(found);
    }
    return result;
  }, [formData.asignaturaPendiente1, formData.asignaturaPendiente2, asignaturasPrevias]);

  const is5o6Profesional =
    (formData.curso.includes('5') || formData.curso.includes('6')) &&
    formData.tipoEnsenanza === 'profesional';

  const hasConvalidacion = formData.convalidacionAsignaturas.length > 0;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <section className="bg-white rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 bg-gray-50 rounded-lg">
            <GraduationCap size={20} className="text-gray-600" />
          </div>
          <h2 className="text-base sm:text-xl font-semibold">Datos de Matriculación</h2>
        </div>
        {onConvalidacionClick && (
          <button
            type="button"
            onClick={onConvalidacionClick}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              hasConvalidacion
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {hasConvalidacion && <CheckCircle2 size={16} />}
            Convalidación
          </button>
        )}
      </div>

      <div className="space-y-8">

        {/* Tipo de enseñanza */}
        <div className="flex flex-wrap gap-6">
          {(['elemental', 'profesional'] as const).map(tipo => (
            <label key={tipo} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="tipoEnsenanza"
                value={tipo}
                checked={formData.tipoEnsenanza === tipo}
                onChange={onChange}
                className="w-5 h-5 text-gray-900 border-gray-300 focus:ring-gray-900"
              />
              <span className="text-sm font-bold uppercase tracking-wider text-gray-600 group-hover:text-gray-900">
                {tipo === 'elemental' ? 'Enseñanza Elemental' : 'Enseñanza Profesional'}
              </span>
            </label>
          ))}
        </div>

        {/* Curso y especialidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Curso</label>
            <select
              required
              name="curso"
              value={formData.curso}
              onChange={onChange}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer"
            >
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
              onChange={onChange}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled>Seleccionar especialidad...</option>
              {ESPECIALIDADES
                .filter(esp => !(formData.tipoEnsenanza === 'elemental' && esp === 'Canto'))
                .map(esp => <option key={esp} value={esp}>{esp}</option>)}
            </select>
          </div>

          {/* Asignatura pendiente 1 */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Asignatura pendiente 1</label>
            <select
              name="asignaturaPendiente1"
              value={formData.asignaturaPendiente1}
              onChange={onChange}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer"
            >
              <option value="">Ninguna...</option>
              {asignaturasPrevias.map(a => (
                <option key={a.id} value={a.id}>{a.materiaId} - {a.label}</option>
              ))}
            </select>
          </div>

          {/* Asignatura pendiente 2 (solo Profesional) */}
          {formData.tipoEnsenanza === 'profesional' && (
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Asignatura pendiente 2</label>
              <select
                name="asignaturaPendiente2"
                value={formData.asignaturaPendiente2}
                onChange={onChange}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer"
              >
                <option value="">Ninguna...</option>
                {asignaturasPrevias.map(a => (
                  <option key={a.id} value={a.id}>{a.materiaId} - {a.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Panel de asignaturas del curso actual */}
          <AnimatePresence>
            {formData.especialidad && formData.curso && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="md:col-span-2 mt-4"
              >
                {asignaturasCursoActual.length > 0 || selectedPendingSubjects.length > 0 ? (
                  <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 mb-4 flex items-center gap-2">
                      <FileText size={16} className="text-blue-600" />
                      Asignaturas en las que se matricula
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SubjectList
                        asignaturasCursoActual={asignaturasCursoActual}
                        selectedPendingSubjects={selectedPendingSubjects}
                        convalidacionAsignaturas={formData.convalidacionAsignaturas}
                        perfilProfesional={formData.perfilProfesional}
                        is5o6Profesional={is5o6Profesional}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    No se han encontrado asignaturas para {formData.especialidad} en {formData.curso} de{' '}
                    {formData.tipoEnsenanza === 'profesional' ? 'Enseñanza Profesional' : 'Enseñanza Elemental'}.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Perfiles (solo 5º y 6º Profesional) */}
        <AnimatePresence>
          {is5o6Profesional && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-6 border-t border-gray-50"
            >
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-4">
                Elegir un único perfil (Solo 5º y 6º Profesional)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'A', label: 'Perfil A', desc: 'Fundamentos de Composición' },
                  {
                    id: 'B', label: 'Perfil B',
                    desc: formData.curso.includes('5')
                      ? 'Improvisación / Informática Musical'
                      : 'Didáctica musical / Improvisación',
                  },
                  {
                    id: 'C', label: 'Perfil C',
                    desc: formData.curso.includes('5')
                      ? 'Improvisación / Coro 1'
                      : 'Música moderna / Coro 2',
                  },
                ].map(perfil => (
                  <label
                    key={perfil.id}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-1 ${
                      formData.perfilProfesional === perfil.id
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="perfilProfesional"
                      value={perfil.id}
                      checked={formData.perfilProfesional === perfil.id}
                      onChange={onChange}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm">{perfil.label}</span>
                    <span className={`text-xs ${formData.perfilProfesional === perfil.id ? 'text-gray-300' : 'text-gray-500'}`}>
                      {perfil.desc}
                    </span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ─── SubjectList ──────────────────────────────────────────────────────────────
// Renderiza las tarjetas de asignaturas con separadores de grupo y colores.

interface SubjectListProps {
  asignaturasCursoActual: ReturnType<typeof materias.filter>;
  selectedPendingSubjects: { id: string; label: string; materiaId: string }[];
  convalidacionAsignaturas: string[];
  perfilProfesional: string;
  is5o6Profesional: boolean;
}

const STYLES = {
  matriculada: {
    bg: 'bg-white border-blue-100',
    code: 'text-blue-500 bg-blue-50',
    badge: 'text-blue-500 bg-blue-50 border-blue-100',
    label: 'Matriculada',
  },
  perfil: {
    bg: 'bg-purple-50 border-purple-100',
    code: 'text-purple-500 bg-purple-100',
    badge: 'text-purple-500 bg-purple-100 border-purple-200',
    label: '', // se rellena dinámicamente
  },
  pendiente: {
    bg: 'bg-orange-50 border-orange-100',
    code: 'text-orange-500 bg-orange-100',
    badge: 'text-orange-500 bg-orange-100 border-orange-200',
    label: 'Pendiente',
  },
  convalidada: {
    bg: 'bg-green-50 border-green-200',
    code: 'text-green-700 bg-green-100',
    badge: 'text-green-700 bg-green-100 border-green-200',
    label: 'Solicitada convalidación',
  },
} as const;

function SubjectList({
  asignaturasCursoActual,
  selectedPendingSubjects,
  convalidacionAsignaturas,
  perfilProfesional,
  is5o6Profesional,
}: SubjectListProps) {
  type Tipo = 'matriculada' | 'perfil' | 'pendiente' | 'convalidada';
  type Row = { group: number; key: string; code: string; name: string; tipo: Tipo };

  const rows: Row[] = [];

  for (const m of asignaturasCursoActual) {
    const isConvalidada = convalidacionAsignaturas.includes(m.MATERIA);
    const isPerfil = !isConvalidada && is5o6Profesional && PROFILE_SPECIFIC_SUBJECTS.some(s =>
      m.DESCRIPCION.toLowerCase().includes(s.toLowerCase())
    );
    rows.push({
      group: isConvalidada ? 4 : isPerfil ? 2 : 1,
      key: m.MATERIA,
      code: m.MATERIA,
      name: m.DESCRIPCION,
      tipo: isConvalidada ? 'convalidada' : isPerfil ? 'perfil' : 'matriculada',
    });
  }

  for (const m of selectedPendingSubjects) {
    rows.push({ group: 3, key: `pending-${m.id}`, code: m.materiaId, name: m.label, tipo: 'pendiente' });
  }

  rows.sort((a, b) => a.group - b.group || a.name.localeCompare(b.name, 'es'));

  return (
    <>
      {rows.flatMap((item, idx) => {
        const s = STYLES[item.tipo];
        const badgeLabel = item.tipo === 'perfil' ? `Perfil ${perfilProfesional}` : s.label;
        const isGroupStart = idx > 0 && rows[idx - 1].group !== item.group;

        const card = (
          <div key={item.key} className={`flex items-center gap-3 p-3 rounded-xl shadow-sm border ${s.bg}`}>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${s.code}`}>
              {item.code}
            </span>
            <span className="text-sm font-medium text-gray-700 flex-1 min-w-0">{item.name}</span>
            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${s.badge}`}>
              {badgeLabel}
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
      })}
    </>
  );
}
