import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  CURSOS,
  getEspecialidadesDisponibles,
  loadMaterias,
  buildMateriasIndex,
  queryMateriasCurso,
  queryMateriasPrevias,
  PROFILE_SPECIFIC_SUBJECTS,
} from '@conservatorio/shared';
import type { Materia, MateriasIndex } from '@conservatorio/shared';

const SPECIALIDADES = getEspecialidadesDisponibles('');

function LoadingBox({ msg }: { msg: string }) {
  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 text-center">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  );
}

function EmptyBox({ msg }: { msg: string }) {
  return (
    <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-center gap-2 text-amber-800 text-sm">
      <AlertCircle size={16} />
      {msg}
    </div>
  );
}

export default function PlanEstudiosApp() {
  const [tipoEnsenanza, setTipoEnsenanza] = useState<'elemental' | 'profesional'>('elemental');
  const [curso, setCurso] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [perfilProfesional, setPerfilProfesional] = useState<'A' | 'B' | 'C' | ''>('');
  const [materiasIndex, setMateriasIndex] = useState<MateriasIndex | null>(null);
  const [materiasLoading, setMateriasLoading] = useState(true);
  const [showPrevias, setShowPrevias] = useState(false);

  useEffect(() => {
    setCurso('');
    setEspecialidad('');
    setPerfilProfesional('');
  }, [tipoEnsenanza]);

  useEffect(() => {
    setMateriasLoading(true);
    loadMaterias()
      .then(data => setMateriasIndex(buildMateriasIndex(data)))
      .catch(() => setMateriasIndex(null))
      .finally(() => setMateriasLoading(false));
  }, []);

  const cursos = tipoEnsenanza === 'elemental' ? CURSOS.elemental : CURSOS.profesional;
  const especialidadesDisponibles = getEspecialidadesDisponibles(tipoEnsenanza);
  const is5o6 = (curso.includes('5') || curso.includes('6')) && tipoEnsenanza === 'profesional';
  const is6th = curso.includes('6');

  const asignaturasCursoActual = useMemo(() => {
    if (!especialidad || !curso || !tipoEnsenanza || !materiasIndex) return [];
    const all = queryMateriasCurso(materiasIndex, especialidad, curso, tipoEnsenanza);
    if (!is5o6) return all;

    const profileSubjects: Record<string, string[]> = is6th
      ? { A: ['Fundamentos de Composición'], B: ['Improvisación', 'Didáctica de la Música', 'Didáctica musical'], C: ['Música moderna', 'Coro'] }
      : { A: ['Fundamentos de Composición'], B: ['Improvisación', 'Informática musical'], C: ['Improvisación', 'Coro'] };

    const allowedProfiles = perfilProfesional ? (profileSubjects[perfilProfesional] || []) : [];

    return all.filter(m => {
      const mDesc = m.DESCRIPCION;
      const isProfileSpecific = PROFILE_SPECIFIC_SUBJECTS.some((s: string) => mDesc.toLowerCase().includes(s.toLowerCase()));
      if (!isProfileSpecific) return true;
      if (!perfilProfesional) return false;
      return allowedProfiles.some(s => mDesc.toLowerCase().includes(s.toLowerCase()));
    });
  }, [especialidad, curso, tipoEnsenanza, perfilProfesional, materiasIndex, is5o6, is6th]);

  const excludedProfileSubjects = useMemo(() => {
    if (!especialidad || !curso || !tipoEnsenanza || !materiasIndex || !is5o6) return [];
    const all = queryMateriasCurso(materiasIndex, especialidad, curso, tipoEnsenanza);
    return all.filter(m => {
      const mDesc = m.DESCRIPCION;
      const isProfileSpecific = PROFILE_SPECIFIC_SUBJECTS.some((s: string) => mDesc.toLowerCase().includes(s.toLowerCase()));
      return isProfileSpecific && !asignaturasCursoActual.some(a => a.MATERIA === m.MATERIA);
    });
  }, [especialidad, curso, tipoEnsenanza, materiasIndex, asignaturasCursoActual, is5o6]);

  const asignaturasPrevias = useMemo(() => {
    if (!especialidad || !curso || !tipoEnsenanza || !materiasIndex) return [];
    const cursoNum = parseInt(curso);
    const all = queryMateriasPrevias(materiasIndex, especialidad, cursoNum, tipoEnsenanza);
    return all
      .map(m => ({ id: m.MATERIA, label: m.DESCRIPCION + ' (' + m.CURSO_N + ')', materiaId: m.MATERIA }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [especialidad, curso, tipoEnsenanza, materiasIndex]);

  const perfilLabel = is6th
    ? (perfilProfesional === 'A' ? 'Fundamentos de Composición' : perfilProfesional === 'B' ? 'Didáctica musical / Improvisación' : perfilProfesional === 'C' ? 'Música moderna / Coro 2' : '')
    : (perfilProfesional === 'A' ? 'Fundamentos de Composición' : perfilProfesional === 'B' ? 'Improvisación / Informática Musical' : perfilProfesional === 'C' ? 'Improvisación / Coro 1' : '');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Plan de Estudios</h1>
          <p className="text-sm text-gray-500 mt-2">Conservatorio Profesional de Música &quot;Marcos Redondo&quot;</p>
        </header>

        <div className="space-y-6">
          {/* Selectores */}
          <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gray-50 rounded-lg"><GraduationCap size={20} className="text-gray-600" /></div>
              <h2 className="text-lg font-semibold">Seleccionar Curso y Especialidad</h2>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="radio" checked={tipoEnsenanza === 'elemental'} onChange={() => setTipoEnsenanza('elemental')} className="w-5 h-5 text-gray-900 border-gray-300 focus:ring-gray-900" />
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-600 group-hover:text-gray-900">Enseñanza Elemental</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="radio" checked={tipoEnsenanza === 'profesional'} onChange={() => setTipoEnsenanza('profesional')} className="w-5 h-5 text-gray-900 border-gray-300 focus:ring-gray-900" />
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-600 group-hover:text-gray-900">Enseñanza Profesional</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Curso</label>
                  <select value={curso} onChange={e => { setCurso(e.target.value); setPerfilProfesional(''); }}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer">
                    <option value="" disabled>Seleccionar curso...</option>
                    {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Especialidad</label>
                  <select value={especialidad} onChange={e => setEspecialidad(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer">
                    <option value="" disabled>Seleccionar especialidad...</option>
                    {especialidadesDisponibles.map(esp => <option key={esp} value={esp}>{esp}</option>)}
                  </select>
                </div>
              </div>

              {/* Perfiles para 5º y 6º Profesional */}
              <AnimatePresence>
                {is5o6 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="pt-6 border-t border-gray-50">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-4">Elegir un único perfil (Solo 5º y 6º Profesional)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'A' as const, label: 'Perfil A', desc: 'Fundamentos de Composición' },
                        { id: 'B' as const, label: 'Perfil B', desc: is6th ? 'Didáctica musical / Improvisación' : 'Improvisación / Informática Musical' },
                        { id: 'C' as const, label: 'Perfil C', desc: is6th ? 'Música moderna / Coro 2' : 'Improvisación / Coro 1' },
                      ].map(p => (
                        <label key={p.id}
                          className={'p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-1 ' +
                            (perfilProfesional === p.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 bg-gray-50 hover:border-gray-200')}>
                          <input type="radio" checked={perfilProfesional === p.id} onChange={() => setPerfilProfesional(p.id)} className="sr-only" />
                          <span className="font-bold text-sm">{p.label}</span>
                          <span className={'text-xs ' + (perfilProfesional === p.id ? 'text-gray-300' : 'text-gray-500')}>{p.desc}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Resultados */}
          {materiasLoading && !materiasIndex && <LoadingBox msg="Cargando plan de estudios..." />}

          {materiasIndex && curso && especialidad && (
            <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg"><FileText size={20} className="text-gray-600" /></div>
                  <div>
                    <h2 className="text-lg font-semibold">Asignaturas — {especialidad} ({curso})</h2>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">
                      {tipoEnsenanza === 'profesional' ? 'Enseñanza Profesional' : 'Enseñanza Elemental'}
                      {perfilProfesional ? ' — Perfil ' + perfilProfesional : ''}
                    </p>
                  </div>
                </div>
                {/* Badge count */}
                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                  {asignaturasCursoActual.length} asignaturas
                </span>
              </div>

              {asignaturasCursoActual.length === 0 && excludedProfileSubjects.length === 0 ? (
                <EmptyBox msg={'No se han encontrado asignaturas para ' + especialidad + ' en ' + curso + ' de ' + (tipoEnsenanza === 'profesional' ? 'Enseñanza Profesional' : 'Enseñanza Elemental') + '.'} />
              ) : (
                <div className="space-y-4">
                  {/* Asignaturas del curso */}
                  {asignaturasCursoActual.length > 0 && (
                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200 shadow-sm">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 mb-4 flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        Asignaturas del curso
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {asignaturasCursoActual.map(m => {
                          const isPerfil = is5o6 && PROFILE_SPECIFIC_SUBJECTS.some((s: string) => m.DESCRIPCION.toLowerCase().includes(s.toLowerCase()));
                          const st = isPerfil
                            ? { bg: 'bg-purple-50 border-purple-100', code: 'text-purple-500 bg-purple-100', badge: 'text-purple-500 bg-purple-100 border-purple-200', label: 'Perfil ' + perfilProfesional }
                            : { bg: 'bg-white border-blue-100', code: 'text-blue-500 bg-blue-50', badge: 'text-blue-500 bg-blue-50 border-blue-100', label: 'Matriculada' };
                          return (
                            <div key={m.MATERIA} className={'flex items-center gap-3 p-3 rounded-xl shadow-sm border ' + st.bg}>
                              <span className={'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ' + st.code}>{m.MATERIA}</span>
                              <span className="text-sm font-medium text-gray-700 flex-1 min-w-0">{m.DESCRIPCION}</span>
                              <span className={'text-[10px] font-bold border px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ' + st.badge}>{st.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Perfil: excluidas */}
                  {excludedProfileSubjects.length > 0 && (
                    <div className="p-6 bg-red-50 rounded-2xl border border-red-200">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-red-800 mb-4 flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-500" />
                        Asignaturas excluidas por el perfil seleccionado
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {excludedProfileSubjects.map(m => (
                          <div key={m.MATERIA} className="flex items-center gap-3 p-3 rounded-xl shadow-sm border bg-red-50 border-red-200">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 text-red-500 bg-red-100">{m.MATERIA}</span>
                            <span className="text-sm font-medium text-red-700 flex-1 min-w-0">{m.DESCRIPCION}</span>
                            <span className="text-[10px] font-bold border px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 text-red-500 bg-red-100 border-red-200">Excluida</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Asignaturas previas (pendientes posibles) */}
          {materiasIndex && curso && especialidad && (
            <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <button onClick={() => setShowPrevias(!showPrevias)}
                className="flex items-center gap-3 w-full text-left">
                <div className="p-2 bg-gray-50 rounded-lg"><FileText size={20} className="text-gray-600" /></div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">Asignaturas de Cursos Anteriores</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Posibles asignaturas pendientes — {asignaturasPrevias.length} encontradas</p>
                </div>
                <span className="text-gray-400 text-lg">{showPrevias ? '▾' : '▸'}</span>
              </button>

              <AnimatePresence>
                {showPrevias && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden">
                    {asignaturasPrevias.length === 0 ? (
                      <EmptyBox msg="No hay asignaturas de cursos anteriores para esta especialidad." />
                    ) : (
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {asignaturasPrevias.map(a => (
                            <div key={a.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-orange-100">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 shrink-0">{a.materiaId}</span>
                              <span className="text-xs text-gray-600 truncate">{a.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {/* Leyenda */}
          {materiasIndex && curso && especialidad && (
            <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Leyenda</h3>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-500 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-blue-400 rounded-full" /> Matriculada
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-500 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-purple-400 rounded-full" /> Perfil
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-red-400 rounded-full" /> Excluida del perfil
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-500 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-orange-400 rounded-full" /> Curso anterior (pendiente)
                </span>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
