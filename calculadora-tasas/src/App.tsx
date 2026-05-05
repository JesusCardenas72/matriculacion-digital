import { useState, useMemo, useEffect, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, GraduationCap, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';
import {
  calcularTasas,
  CURSOS,
  getEspecialidadesDisponibles,
  ARTICLE_TEXTS,
  loadMaterias,
  buildMateriasIndex,
  queryMateriasCurso,
  queryMateriasPrevias,
  PROFILE_SPECIFIC_SUBJECTS,
} from '@conservatorio/shared';
import type { FeeInput, Materia, MateriasIndex } from '@conservatorio/shared';

type ReductionKey = 'ninguna' | 'fam_num_general' | 'fam_num_especial' | 'discapacidad' | 'terrorismo' | 'violencia_genero' | 'ingreso_minimo';

const REDUCCIONES: { id: ReductionKey; label: string; desc: string; art: string | null }[] = [
  { id: 'ninguna', label: 'Ninguna', desc: 'Sin reducciones aplicables', art: null },
  { id: 'fam_num_general', label: 'Familia Numerosa General', desc: 'Bonificación del 50% (Art. 14.b)', art: 'fam_num' },
  { id: 'fam_num_especial', label: 'Familia Numerosa Especial', desc: 'Exención del 100% (Art. 14.a)', art: 'fam_num' },
  { id: 'discapacidad', label: 'Discapacidad ≥ 33%', desc: 'Exención del 100% (Art. 15)', art: 'discapacidad' },
  { id: 'terrorismo', label: 'Víctima de Terrorismo', desc: 'Exención del 100% (Art. 16)', art: 'terrorismo' },
  { id: 'violencia_genero', label: 'Víctima de Violencia de Género', desc: 'Exención del 100% (Art. 17)', art: 'violencia_genero' },
  { id: 'ingreso_minimo', label: 'Ingreso Mínimo de Solidaridad', desc: 'Exención del 100% (Art. 18)', art: 'ingreso_minimo' },
];

const cls = (...args: (string | false | undefined | null)[]) => args.filter(Boolean).join(' ');

function Row({ label, value, h }: { label: string; value: string; h?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={cls('font-bold', h ? 'text-green-400' : 'text-white')}>{value}</span>
    </div>
  );
}

export default function CalculadoraApp() {
  const [input, setInput] = useState<FeeInput>({
    tipoEnsenanza: 'elemental',
    curso: '',
    esPrimerAno: false,
    tipoReduccion: 'ninguna',
    matriculaHonor: false,
    formaPago: 'unico',
    asignaturaPendiente1: '',
    asignaturaPendiente2: '',
    convalidacionSolicitada: false,
    convalidacionAsignaturas: [],
  });
  const [especialidad, setEspecialidad] = useState('');
  const [materiasIndex, setMateriasIndex] = useState<MateriasIndex | null>(null);
  const [materiasLoading, setMateriasLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<{ title: string; text: string } | null>(null);
  const [isFeesInfoOpen, setIsFeesInfoOpen] = useState(false);

  useEffect(() => {
    loadMaterias()
      .then(data => setMateriasIndex(buildMateriasIndex(data)))
      .catch(() => setMateriasIndex(null))
      .finally(() => setMateriasLoading(false));
  }, []);

  const result = useMemo(() => calcularTasas(input), [input]);

  const asignaturasCursoActual = useMemo(() => {
    if (!especialidad || !input.curso || !input.tipoEnsenanza || !materiasIndex) return [];
    const all = queryMateriasCurso(materiasIndex, especialidad, input.curso, input.tipoEnsenanza as 'elemental' | 'profesional');
    const is5o6 = (input.curso.includes('5') || input.curso.includes('6')) && input.tipoEnsenanza === 'profesional';
    if (!is5o6) return all;
    const is6th = input.curso.includes('6');
    const profileSubjects: Record<string, string[]> = is6th
      ? { A: ['Fundamentos de Composición'], B: ['Improvisación', 'Didáctica de la Música', 'Didáctica musical'], C: ['Música moderna', 'Coro'] }
      : { A: ['Fundamentos de Composición'], B: ['Improvisación', 'Informática musical'], C: ['Improvisación', 'Coro'] };
    return all.filter(m => {
      const isProfileSpecific = PROFILE_SPECIFIC_SUBJECTS.some((s: string) => m.DESCRIPCION.toLowerCase().includes(s.toLowerCase()));
      return !isProfileSpecific;
    });
  }, [especialidad, input.curso, input.tipoEnsenanza, materiasIndex]);

  const asignaturasPrevias = useMemo(() => {
    if (!especialidad || !input.curso || !input.tipoEnsenanza || !materiasIndex) return [];
    const cursoNum = parseInt(input.curso);
    const all = queryMateriasPrevias(materiasIndex, especialidad, cursoNum, input.tipoEnsenanza as 'elemental' | 'profesional');
    return all
      .map(m => ({ id: m.MATERIA, label: m.DESCRIPCION + ' (' + m.CURSO_N + ')', materiaId: m.MATERIA }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [especialidad, input.curso, input.tipoEnsenanza, materiasIndex]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    if (name === 'especialidad') { setEspecialidad(val as string); return; }
    setInput(prev => ({ ...prev, [name]: val }));
  };

  const handleConvalidacionToggle = (materiaId: string) => {
    setInput(prev => {
      const current = prev.convalidacionAsignaturas ?? [];
      const updated = current.includes(materiaId) ? current.filter(id => id !== materiaId) : [...current, materiaId];
      return { ...prev, convalidacionAsignaturas: updated, convalidacionSolicitada: updated.length > 0 };
    });
  };

  const cursos = input.tipoEnsenanza === 'elemental' ? CURSOS.elemental : input.tipoEnsenanza === 'profesional' ? CURSOS.profesional : [];
  const especialidadesDisponibles = getEspecialidadesDisponibles(input.tipoEnsenanza);

  const precioAsignatura = input.tipoEnsenanza === 'elemental' ? 47 : 58;
  const honorDisabled = input.tipoReduccion !== 'ninguna' && input.tipoReduccion !== 'fam_num_general';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Calculadora de Tasas</h1>
          <p className="text-sm text-gray-500 mt-2">Conservatorio Profesional de Música &quot;Marcos Redondo&quot; — Orden 68/2022</p>
        </header>

        <div className="space-y-6">
          {/* Bloque 1: Datos académicos */}
          <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gray-50 rounded-lg"><GraduationCap size={20} className="text-gray-600" /></div>
              <h2 className="text-lg font-semibold">Datos de la Matrícula</h2>
            </div>

            <div className="flex flex-wrap gap-6 mb-5">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="tipoEnsenanza" value="elemental" checked={input.tipoEnsenanza === 'elemental'} onChange={handleChange} className="w-5 h-5 text-gray-900 border-gray-300 focus:ring-gray-900" />
                <span className="text-sm font-bold uppercase tracking-wider text-gray-600 group-hover:text-gray-900">Enseñanza Elemental</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="tipoEnsenanza" value="profesional" checked={input.tipoEnsenanza === 'profesional'} onChange={handleChange} className="w-5 h-5 text-gray-900 border-gray-300 focus:ring-gray-900" />
                <span className="text-sm font-bold uppercase tracking-wider text-gray-600 group-hover:text-gray-900">Enseñanza Profesional</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Curso</label>
                <select name="curso" value={input.curso} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer">
                  <option value="" disabled>Seleccionar curso...</option>
                  {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Especialidad</label>
                <select name="especialidad" value={especialidad} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer">
                  <option value="" disabled>Seleccionar especialidad...</option>
                  {especialidadesDisponibles.map(esp => <option key={esp} value={esp}>{esp}</option>)}
                </select>
              </div>
            </div>
            {materiasLoading && <p className="text-sm text-gray-400 mt-3">Cargando datos de asignaturas...</p>}
          </section>

          {/* Bloque 2: Asignaturas pendientes */}
          <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gray-50 rounded-lg"><FileText size={20} className="text-gray-600" /></div>
              <h2 className="text-lg font-semibold">Asignaturas</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Asignatura pendiente 1 <span className="text-orange-400">(+20% recargo)</span></label>
                <select name="asignaturaPendiente1" value={input.asignaturaPendiente1} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer">
                  <option value="">Ninguna...</option>
                  {asignaturasPrevias.map(a => (<option key={a.id} value={a.id}>{a.materiaId} - {a.label}</option>))}
                </select>
              </div>
              {input.tipoEnsenanza === 'profesional' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Asignatura pendiente 2 <span className="text-orange-400">(+20% recargo)</span></label>
                  <select name="asignaturaPendiente2" value={input.asignaturaPendiente2} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all appearance-none cursor-pointer">
                    <option value="">Ninguna...</option>
                    {asignaturasPrevias.map(a => (<option key={a.id} value={a.id}>{a.materiaId} - {a.label}</option>))}
                  </select>
                </div>
              )}

              {/* Convalidación */}
              {asignaturasCursoActual.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Convalidar asignaturas (descuento de {precioAsignatura}€/asig.)
                  </p>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {asignaturasCursoActual.map(m => {
                      const checked = (input.convalidacionAsignaturas ?? []).includes(m.MATERIA);
                      return (
                        <label key={m.MATERIA}
                          className={cls('flex items-center gap-3 cursor-pointer px-3 py-2 rounded-xl transition-all',
                            checked ? 'bg-blue-50 border border-blue-200' : 'bg-white hover:bg-gray-100')}>
                          <input type="checkbox" checked={checked} onChange={() => handleConvalidacionToggle(m.MATERIA)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          <span className="text-sm text-gray-700">{m.DESCRIPCION}</span>
                          {checked && (
                            <span className="ml-auto text-xs font-semibold text-blue-600">
                              −{precioAsignatura}€
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Bloque 3: Apertura expediente + Reducciones + Forma de pago */}
          <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg"><CreditCard size={20} className="text-gray-600" /></div>
                <h2 className="text-lg font-semibold">Forma de Pago y Reducciones</h2>
                <button type="button" onClick={() => setIsFeesInfoOpen(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors" title="Información de tasas">
                  <AlertCircle size={18} />
                </button>
              </div>
            </div>

            {/* Apertura expediente */}
            <div className="mb-6">
              <div className="relative group">
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all pr-16">
                  <input type="checkbox" name="esPrimerAno" checked={input.esPrimerAno} onChange={handleChange}
                    className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700">Primer año en el centro o Primer año en Profesional</span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Apertura de expediente (25€)</span>
                  </div>
                </label>
                <button type="button" onClick={() => setSelectedArticle(ARTICLE_TEXTS.apertura_expediente)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white text-gray-400 hover:text-gray-900 rounded-xl shadow-sm transition-all">
                  <AlertCircle size={20} />
                </button>
              </div>
            </div>

            {/* Reducciones */}
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1 mb-3">Reducción o Exención de Tasas</p>
              <div className="grid grid-cols-1 gap-2">
                {REDUCCIONES.map(item => (
                  <div key={item.id} className="relative group">
                    <button type="button"
                      onClick={() => {
                        const compatible = item.id === 'ninguna' || item.id === 'fam_num_general';
                        setInput(prev => ({ ...prev, tipoReduccion: item.id, matriculaHonor: compatible ? prev.matriculaHonor : false }));
                      }}
                      className={cls('w-full p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 pr-16',
                        input.tipoReduccion === item.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-50 bg-gray-50 hover:border-gray-200')}>
                      <span className="font-bold text-sm">{item.label}</span>
                      <span className={cls('text-xs', input.tipoReduccion === item.id ? 'text-gray-400' : 'text-gray-500')}>{item.desc}</span>
                    </button>
                    {item.art && (
                      <button type="button" onClick={() => setSelectedArticle((ARTICLE_TEXTS as any)[item.art])}
                        className={cls('absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all',
                          input.tipoReduccion === item.id ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-gray-400 hover:text-gray-900 shadow-sm')}>
                        <AlertCircle size={24} />
                      </button>
                    )}
                  </div>
                ))}

                <div className="border-t border-gray-100 pt-3 mt-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Bonificación adicional apilable</p>
                  <div className="relative group">
                    <button type="button" disabled={honorDisabled}
                      onClick={() => setInput(prev => ({ ...prev, matriculaHonor: !prev.matriculaHonor }))}
                      className={cls('w-full p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 pr-16',
                        input.matriculaHonor ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-50 bg-gray-50 hover:border-gray-200',
                        honorDisabled ? 'opacity-40 cursor-not-allowed' : '')}>
                      <span className="font-bold text-sm">Matrícula de Honor</span>
                      <span className={cls('text-xs', input.matriculaHonor ? 'text-gray-400' : 'text-gray-500')}>
                        Bonificación de 58€ (1 asignatura) (Art. 13)
                      </span>
                    </button>
                    <button type="button" onClick={() => setSelectedArticle(ARTICLE_TEXTS.matricula_honor)}
                      className={cls('absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all',
                        input.matriculaHonor ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-gray-400 hover:text-gray-900 shadow-sm')}>
                      <AlertCircle size={24} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Forma de Pago */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1 mb-3">Forma de Pago</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'unico', label: 'Opción 1', title: 'Pago Único', desc: 'Total en un solo pago' },
                  { id: 'fraccionado', label: 'Opción 2', title: 'Pago Fraccionado', desc: 'Dos pagos (1er y 2º plazo)' },
                  { id: 'beca', label: 'Opción 3', title: 'Solicita Beca', desc: 'Aportar justificante de beca' },
                ]
                  .filter(op => !(input.tipoEnsenanza === 'elemental' && op.id === 'beca'))
                  .map(op => (
                    <label key={op.id}
                      className={cls('p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2',
                        input.formaPago === op.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 bg-gray-50 hover:border-gray-200')}>
                      <input type="radio" name="formaPago" value={op.id} checked={input.formaPago === op.id} onChange={handleChange} className="sr-only" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{op.label}</span>
                      <span className="font-bold text-lg">{op.title}</span>
                      <span className={cls('text-xs', input.formaPago === op.id ? 'text-gray-300' : 'text-gray-500')}>{op.desc}</span>
                    </label>
                  ))}
              </div>
            </div>
          </section>

          {/* Resultado */}
          <AnimatePresence>
            {result && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900 text-white rounded-[2rem] p-8 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/10 rounded-lg"><CheckCircle2 size={20} className="text-white" /></div>
                  <h2 className="text-lg font-semibold">Desglose de Tasas</h2>
                  {result.details.reductionLabel && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 ml-auto">{result.details.reductionLabel}</span>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <Row label="Servicios Generales" value={result.details.serviciosGenerales.toFixed(2) + '€'} />
                  {input.esPrimerAno && (
                    <Row label="Apertura de Expediente" value={result.details.aperturaExpediente.toFixed(2) + '€'} />
                  )}
                  <Row label={'Matrícula Curso (' + input.curso + ')'} value={result.details.curso.toFixed(2) + '€'} />
                  {result.details.asignaturasPendientes > 0 && (
                    <Row label="Asignaturas Pendientes (+20%)" value={result.details.asignaturasPendientes.toFixed(2) + '€'} />
                  )}
                  {result.details.convalidacionDiscount > 0 && (
                    <Row label={'Convalidación (' + result.details.convalidacionCount + ' asig.)'} value={'-' + result.details.convalidacionDiscount.toFixed(2) + '€'} h />
                  )}
                  {result.details.matriculaHonorDiscount > 0 && (
                    <Row label="Matrícula de Honor (Art. 13)" value={'-' + result.details.matriculaHonorDiscount.toFixed(2) + '€'} h />
                  )}
                  {result.details.multiplier < 1 && (
                    <Row label="Reducción aplicada" value={'-' + ((1 - result.details.multiplier) * 100).toFixed(0) + '%'} h />
                  )}
                </div>

                <div className="border-t border-white/10 pt-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold uppercase tracking-wider text-gray-400">Importe Total</span>
                    <span className="text-3xl font-black text-orange-400">{result.total.toFixed(2)}€</span>
                  </div>
                  {input.formaPago === 'fraccionado' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">1er Pago</span>
                        <span className="font-bold">{result.firstPayment.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">2º Pago</span>
                        <span className="font-bold">{result.secondPayment.toFixed(2)}€</span>
                      </div>
                    </>
                  )}
                  {input.formaPago === 'beca' && (
                    <div className="mt-3 p-3 bg-blue-500/20 border border-blue-400/30 rounded-xl">
                      <p className="text-sm text-blue-200">Debe aportar el justificante de registro de la beca para el centro.</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-white/10 pt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Información adicional</p>
                  <ul className="space-y-2 text-xs text-gray-300">
                    <li>- Tasas según Orden 68/2022 de la Consejería de Educación de Castilla-La Mancha.</li>
                    <li>- El pago se realiza mediante el Modelo 046 de la JCCM.</li>
                    <li>- Asignaturas pendientes: recargo del 20% (Art. 49.3 Ley 11/2023).</li>
                    <li>- Matrícula de Honor: descuento de 58€ por asignatura (Art. 13), apilable solo con Familia Numerosa General.</li>
                  </ul>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Modal: Info de Tasas */}
        <AnimatePresence>
          {isFeesInfoOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsFeesInfoOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl z-[60] border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-900 text-white rounded-lg"><AlertCircle size={20} /></div>
                    <h3 className="text-xl font-bold">Información de Tasas</h3>
                  </div>
                  <button type="button" onClick={() => setIsFeesInfoOpen(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Tasas Generales (Orden 68/2022)</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Servicios Generales</span><span className="font-bold">10.00€</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Apertura Expediente</span><span className="font-bold">25.00€</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Prueba de Acceso (Prof.)</span><span className="font-bold">40.00€</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Elemental</span>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span>1º y 2º</span><span className="font-bold">94€</span></div>
                        <div className="flex justify-between text-xs"><span>3º y 4º</span><span className="font-bold">188€</span></div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Profesional</span>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span>1º y 2º</span><span className="font-bold">232€</span></div>
                        <div className="flex justify-between text-xs"><span>3º a 6º</span><span className="font-bold">348€</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Reducciones</h4>
                    <div className="space-y-2 text-xs text-blue-800 font-medium">
                      <p>- Familia Numerosa General: 50% de bonificación</p>
                      <p>- Familia Numerosa Especial: 100% de exención</p>
                      <p>- Becarios (Solo Profesional): 100% de exención</p>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setIsFeesInfoOpen(false)}
                  className="w-full mt-8 py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all">
                  Cerrar
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Modal: Artículo */}
        <AnimatePresence>
          {selectedArticle && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedArticle(null)} className="fixed inset-0 bg-black/40 backdrop-blur-md z-[70]" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl z-[80] border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gray-900 text-white rounded-lg"><FileText size={20} /></div>
                  <h3 className="text-lg font-bold leading-tight">{selectedArticle.title}</h3>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap italic">&quot;{selectedArticle.text}&quot;</p>
                </div>
                <button type="button" onClick={() => setSelectedArticle(null)}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all">
                  Entendido
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
