import { useState, type ComponentType } from 'react';
import {
  Search, RefreshCw, Settings, Trash2, Plus, FileText,
  Download, Printer, CheckCircle2, AlertCircle, Clock,
  ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Inbox, BarChart3, Calendar, TrendingUp,
} from 'lucide-react';

type IconComponent = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'tram' | 'val' | 'done' | 'local' | 'reports';
type Kind = 'matriculada' | 'convalidacion' | 'pendiente';

interface Solicitud {
  id: number;
  nombre: string;
  curso: string;
  especialidad: string;
  orden: string | number;
  esAmpliacion?: boolean;
  ordenOriginal?: string | number;
}

interface Asig {
  codigo: string;
  nombre: string;
  meta: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const SOLICITUDES: Solicitud[] = [
  { id: 1, nombre: 'JESÚS-MARÍA CÁRDENAS IGLESIAS', curso: 'EP5', especialidad: 'Oboe', orden: '1,1', esAmpliacion: true, ordenOriginal: 1 },
  { id: 2, nombre: 'Alonso Garcilaso Mendoza', curso: 'EE2', especialidad: 'Trompa', orden: 3 },
  { id: 3, nombre: 'Jesús María Quijano', curso: 'EP2', especialidad: 'Tuba', orden: 4 },
  { id: 4, nombre: 'María Vega Rodríguez', curso: 'EP3', especialidad: 'Violín', orden: 7 },
  { id: 5, nombre: 'Daniel Ortega Sanz', curso: 'EE1', especialidad: 'Piano', orden: 9 },
];

const ASIGS: { matriculadas: Asig[]; convalidacion: Asig[]; pendiente: Asig[] } = {
  matriculadas: [
    { codigo: '39950', nombre: 'Análisis', meta: 'L-X 16:00 · Aula 8' },
    { codigo: '39951', nombre: 'Instrumento', meta: 'Aula 12 · 4h/semana' },
    { codigo: '39955', nombre: 'Música de Cámara', meta: 'Grupo C · Aula 5' },
    { codigo: '39957', nombre: 'Orquesta', meta: 'V 18:00 · Sala Sinfónica' },
  ],
  convalidacion: [
    { codigo: '40023', nombre: 'Repertorio acompañado', meta: 'Pendiente de revisión' },
  ],
  pendiente: [
    { codigo: '40011', nombre: 'Improvisación (3º)', meta: 'Solicitada · sin cupo' },
    { codigo: '40012', nombre: 'Inst. Complementario (3º)', meta: 'Plazas agotadas' },
  ],
};

const LOCAL_SOLICITUDES = [
  { id: 'l1', nombre: 'Carlos Mendoza García', curso: 'EP3', especialidad: 'Piano', recibida: '07/05/2026 10:23' },
];

const TABS: { id: TabId; label: string; count?: number; alert?: boolean }[] = [
  { id: 'tram', label: 'Pendiente de tramitación', count: 5 },
  { id: 'val', label: 'Pendiente de validación', count: 0 },
  { id: 'done', label: 'Tramitado', count: 1 },
  { id: 'local', label: 'Local', count: 1, alert: true },
  { id: 'reports', label: 'Informes' },
];

const STATUS_CFG: Record<Kind, { bg: string; text: string; border: string; label: string }> = {
  matriculada:  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Matriculada' },
  convalidacion:{ bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Solicitud de Convalidación' },
  pendiente:    { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Pendiente' },
};

// ─── Shared components ────────────────────────────────────────────────────────

function StatusBadge({ kind }: { kind: Kind }) {
  const s = STATUS_CFG[kind];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11.5px] font-semibold ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

function SubjectRow({ a, kind }: { a: Asig; kind: Kind }) {
  return (
    <div
      className="grid items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl"
      style={{ gridTemplateColumns: '58px 1fr auto auto' }}
    >
      <span className="text-[12px] text-gray-400 font-medium tabular-nums">{a.codigo}</span>
      <div>
        <div className="text-[13.5px] font-semibold text-gray-900 leading-tight">{a.nombre}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">{a.meta}</div>
      </div>
      <StatusBadge kind={kind} />
      <button className="w-8 h-8 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors flex items-center justify-center flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function SectionHead({
  title, count, colorClass, Icon,
}: {
  title: string;
  count: number;
  colorClass: string;
  Icon: IconComponent;
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5 pt-1">
      <Icon size={14} className={colorClass} />
      <span className={`font-display text-[16px] tracking-tight font-normal ${colorClass}`}>{title}</span>
      <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">
        {count} {count === 1 ? 'asignatura' : 'asignaturas'}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayOrden(s: Solicitud): string {
  if (s.esAmpliacion && s.ordenOriginal !== undefined) {
    return String(s.ordenOriginal);
  }
  const str = String(s.orden);
  if (str.includes(',')) {
    return str.split(',')[0];
  }
  return str;
}

// ─── Detail panel (tabs: tram / val / done) ───────────────────────────────────

function DetailPanel({ sel }: { sel: Solicitud }) {
  const [notes, setNotes] = useState('');

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

      {/* Header */}
      <div
        className="px-7 pt-6 pb-5 border-b border-gray-100 flex items-center gap-5"
        style={{ background: 'linear-gradient(180deg, #f9fafb 0%, transparent 100%)' }}
      >
        {/* Large editorial number */}
        <div
          className="font-display leading-none tracking-tighter select-none flex-shrink-0 pr-1"
          style={{
            fontSize: 88,
            background: 'linear-gradient(160deg, #f97316 30%, #c2410c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {String(getDisplayOrden(sel)).padStart(2, '0')}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Solicitud Nº {getDisplayOrden(sel)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
              Pendiente de tramitación
            </span>
          </div>
          <h1 className="font-display text-[24px] font-normal text-gray-900 tracking-tight leading-tight truncate mb-2">
            {sel.nombre}
          </h1>
          <div className="flex items-center text-[12px] text-gray-500">
            <span className="font-bold mr-1.5">CURSO</span>
            <span className="px-1.5 py-0.5 bg-gray-100 rounded-md font-bold text-[11px] mr-2.5 text-gray-800">{sel.curso}</span>
            <span className="text-gray-300 mr-2.5">|</span>
            <span className="font-bold mr-1.5">ESP.</span>
            <span className="font-semibold text-gray-800 mr-2.5">{sel.especialidad}</span>
            <span className="text-gray-300 mr-2.5">|</span>
            <Clock size={12} className="text-gray-400 mr-1.5" />
            <span className="text-gray-400">Enviada hace 3h</span>
          </div>
        </div>

        <button className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 bg-white rounded-xl text-[13px] text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex-shrink-0">
          <Trash2 size={14} /> Borrar
        </button>
      </div>

      {/* Grid: subjects + PDF */}
      <div className="grid gap-7 p-7" style={{ gridTemplateColumns: '1fr 1fr' }}>

        {/* Subjects column */}
        <div className="flex flex-col gap-4">
          <div>
            <SectionHead title="Matriculadas" count={ASIGS.matriculadas.length} colorClass="text-blue-700" Icon={CheckCircle2} />
            <div className="flex flex-col gap-1.5">
              {ASIGS.matriculadas.map(a => (
                <div key={a.codigo}><SubjectRow a={a} kind="matriculada" /></div>
              ))}
            </div>
          </div>

          <div>
            <SectionHead title="Solicitud de Convalidación" count={ASIGS.convalidacion.length} colorClass="text-purple-700" Icon={Clock} />
            <div className="flex flex-col gap-1.5">
              {ASIGS.convalidacion.map(a => (
                <div key={a.codigo}><SubjectRow a={a} kind="convalidacion" /></div>
              ))}
            </div>
          </div>

          <div>
            <SectionHead title="Pendiente" count={ASIGS.pendiente.length} colorClass="text-orange-700" Icon={AlertCircle} />
            <div className="flex flex-col gap-1.5">
              {ASIGS.pendiente.map(a => (
                <div key={a.codigo}><SubjectRow a={a} kind="pendiente" /></div>
              ))}
            </div>
          </div>

          <button className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 text-orange-600 text-[13px] font-semibold hover:bg-orange-100 transition-colors">
            <Plus size={14} /> Añadir asignatura
          </button>

          <div>
            <SectionHead title="Notas del Administrador" count={0} colorClass="text-gray-400" Icon={FileText} />
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Escribe aquí las observaciones o documentación faltante..."
              className="w-full min-h-[96px] p-3.5 border border-gray-100 rounded-xl bg-gray-50 text-[13px] text-gray-900 resize-y outline-none focus:ring-2 focus:ring-orange-200 leading-relaxed"
            />
          </div>
        </div>

        {/* PDF column */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2.5">
            <FileText size={14} className="text-orange-500" />
            <span className="font-display text-[17px] text-gray-900 tracking-tight font-normal">Solicitud en PDF</span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex flex-col flex-1 min-h-[560px]">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 text-[11.5px] text-gray-500">
              <button className="p-0.5 hover:text-gray-900 transition-colors"><ChevronLeft size={13} /></button>
              <span className="font-semibold">1 / 1</span>
              <button className="p-0.5 hover:text-gray-900 transition-colors"><ChevronRight size={13} /></button>
              <div className="flex-1" />
              <button className="p-0.5 hover:text-gray-900 transition-colors"><ZoomOut size={13} /></button>
              <span className="font-semibold">100%</span>
              <button className="p-0.5 hover:text-gray-900 transition-colors"><ZoomIn size={13} /></button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Printer size={11} /> Imprimir
              </button>
              <button className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors">
                <Download size={11} /> Descargar
              </button>
            </div>

            {/* PDF mock */}
            <div className="p-4 flex-1 overflow-auto flex justify-center items-start">
              <div className="bg-white shadow-md w-[95%] max-w-[500px] rounded p-4 text-[9px] text-gray-800">
                {/* PDF header */}
                <div className="flex items-start justify-between mb-3 gap-2.5">
                  <div className="w-7 h-7 bg-orange-50 rounded-sm flex-shrink-0 border border-orange-100" />
                  <div className="text-center flex-1">
                    <div className="font-display text-[13px]">Solicitud de Matrícula</div>
                    <div className="text-[8px] text-gray-500 mt-0.5">Curso Académico 2026 / 2027</div>
                    <div className="text-[8px] text-gray-500">C.P.M. "Marcos Redondo" · Ciudad Real</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-display text-[20px] text-orange-500 leading-none">#{getDisplayOrden(sel)}</div>
                    <div className="text-[7px] text-gray-400 mt-0.5">Curso 26/27</div>
                  </div>
                </div>

                <div className="inline-block bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[8px] font-semibold mb-2.5 border border-orange-100">
                  Enviado: 8/5/2026 · 19:28
                </div>

                {/* Personal data */}
                <div className="border-t border-gray-100 pt-2 mb-2.5">
                  <div className="font-bold mb-1.5 text-[8px] tracking-wider uppercase">Datos Personales</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      ['NOMBRE', sel.nombre.split(' ')[0]],
                      ['APELLIDOS', sel.nombre.split(' ').slice(1).join(' ')],
                      ['CURSO', sel.curso],
                      ['ESPECIALIDAD', sel.especialidad],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="text-[6.5px] text-gray-400 uppercase tracking-wider">{k}</div>
                        <div className="text-[8.5px] font-medium mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment */}
                <div className="border-t border-gray-100 pt-2 mb-2.5">
                  <div className="font-bold mb-1.5 text-[8px] tracking-wider uppercase">Forma de Pago · Desglose</div>
                  <div className="grid gap-0.5" style={{ gridTemplateColumns: '1fr auto' }}>
                    <span className="text-gray-500">Servicios Generales</span><span className="font-semibold">5,00 €</span>
                    <span className="text-gray-500">Matrícula Curso (5º)</span><span className="font-semibold">174,00 €</span>
                    <span className="text-gray-500">Asignaturas Pendientes</span><span className="font-semibold">69,60 €</span>
                    <span className="text-purple-700">Convalidación (1 asig.)</span><span className="font-semibold text-purple-700">−29,00 €</span>
                    <div className="col-span-2 h-px bg-gray-100 my-1" />
                    <span className="font-bold">IMPORTE TOTAL</span>
                    <span className="font-bold text-orange-600">219,60 €</span>
                  </div>
                </div>

                {/* Subjects */}
                <div className="border-t border-gray-100 pt-2">
                  <div className="font-bold mb-1.5 text-[8px] tracking-wider uppercase">Asignaturas</div>
                  {([
                    ['39950', 'Análisis', 'Matriculada', 'info'],
                    ['39951', 'Instrumento', 'Matriculada', 'info'],
                    ['39955', 'Música de Cámara', 'Matriculada', 'info'],
                    ['39957', 'Orquesta', 'Matriculada', 'info'],
                    ['40023', 'Repertorio Acompañado', 'Convalidación', 'violet'],
                    ['40011', 'Improvisación', 'Pendiente', 'warn'],
                    ['40012', 'Inst. Complementario', 'Pendiente', 'warn'],
                  ] as [string, string, string, string][]).map(([cod, nom, est, c]) => (
                    <div
                      key={cod}
                      className="grid pb-0.5 mb-0.5 border-b border-dotted border-gray-100"
                      style={{ gridTemplateColumns: '36px 1fr 72px' }}
                    >
                      <span className="text-gray-400">{cod}</span>
                      <span>{nom}</span>
                      <span className={`text-center rounded px-1 text-[7px] font-bold ${
                        c === 'info'   ? 'bg-blue-50 text-blue-700' :
                        c === 'violet' ? 'bg-purple-50 text-purple-700' :
                                         'bg-orange-50 text-orange-700'
                      }`}>{est}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-7 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2.5">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-orange-200 text-orange-700 rounded-xl text-[13.5px] font-bold hover:bg-orange-50 transition-colors">
          <AlertCircle size={15} /> Pedir documentación
        </button>
        <button
          className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl text-[13.5px] font-bold hover:opacity-90 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
            boxShadow: '0 6px 16px -4px rgba(249,115,22,.45), inset 0 1px 0 rgba(255,255,255,.15)',
          }}
        >
          <CheckCircle2 size={16} /> Aprobar y tramitar
        </button>
      </div>
    </div>
  );
}

// ─── Local tab ─────────────────────────────────────────────────────────────────

function LocalPanel() {
  return (
    <div className="p-7 max-w-4xl">
      {/* Info banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Inbox size={20} className="text-orange-600" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-orange-900 mb-1">Solicitudes recibidas en secretaría</p>
          <p className="text-sm text-orange-700 leading-relaxed">
            Solicitudes entregadas presencialmente o iniciadas localmente, pendientes de incorporar al flujo digital.
            Puedes tramitarlas directamente o derivarlas al proceso estándar.
          </p>
        </div>
      </div>

      {LOCAL_SOLICITUDES.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Inbox size={44} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">No hay solicitudes locales pendientes</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {LOCAL_SOLICITUDES.map((d, i) => (
            <div key={d.id} className="bg-white border border-gray-100 rounded-2xl px-6 py-5 flex items-center gap-4 shadow-sm">
              {/* Editorial number */}
              <div
                className="font-display leading-none tracking-tighter text-gray-200 w-14 text-center flex-shrink-0 select-none"
                style={{ fontSize: 48 }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-[14px] mb-1.5">{d.nombre}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded-md text-[11px] font-bold text-gray-700">{d.curso}</span>
                  <span className="text-xs text-gray-400">{d.especialidad}</span>
                  <span className="text-gray-300 mx-1">·</span>
                  <Clock size={11} className="text-gray-400" />
                  <span className="text-xs text-gray-400">{d.recibida}</span>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg text-[11px] font-bold border border-orange-200 flex-shrink-0">
                Local
              </span>

              <div className="flex gap-2 flex-shrink-0">
                <button className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
                  <CheckCircle2 size={14} /> Tramitar
                </button>
                <button className="w-9 h-9 border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors flex items-center justify-center">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Informes tab ──────────────────────────────────────────────────────────────

function InformesPanel() {
  const kpis: {
    label: string;
    value: number;
    Icon: IconComponent;
    cls: string;
    bg: string;
  }[] = [
    { label: 'Total solicitudes',      value: 6, Icon: FileText,    cls: 'text-gray-600',   bg: 'bg-gray-50 border-gray-100' },
    { label: 'Pendiente tramitación',  value: 5, Icon: Clock,       cls: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
    { label: 'Tramitadas',             value: 1, Icon: CheckCircle2,cls: 'text-green-600',  bg: 'bg-green-50 border-green-100' },
    { label: 'En validación',          value: 0, Icon: AlertCircle, cls: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
  ];

  const byEsp = [
    { n: 'Piano',  c: 1 },
    { n: 'Oboe',   c: 1 },
    { n: 'Tuba',   c: 1 },
    { n: 'Trompa', c: 1 },
    { n: 'Violín', c: 1 },
  ];

  const estados = [
    { l: 'Pendiente de tramitación', c: 5, color: 'bg-orange-400', pct: 83 },
    { l: 'Tramitado',                c: 1, color: 'bg-green-400',  pct: 17 },
    { l: 'Pendiente de validación',  c: 0, color: 'bg-purple-400', pct: 0  },
  ];

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h2 className="font-display text-[26px] text-gray-900 tracking-tight font-normal">Informes</h2>
          <p className="text-sm text-gray-400 mt-0.5">Curso académico 2026 / 2027</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors">
            <Calendar size={14} /> Curso 2026/27
            <ChevronDown size={13} className="text-gray-400" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map(k => (
          <div key={k.label} className={`border rounded-2xl p-5 ${k.bg}`}>
            <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider mb-3 ${k.cls}`}>
              <k.Icon size={13} /> {k.label}
            </div>
            <div className="font-display leading-none tracking-tighter text-gray-900" style={{ fontSize: 52 }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        {/* By especialidad */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
            <BarChart3 size={15} className="text-orange-500" />
            <span className="font-display text-[18px] text-gray-900 tracking-tight font-normal">Por especialidad</span>
          </div>
          <div className="divide-y divide-gray-50">
            {byEsp.map((e, i) => (
              <div key={e.n} className="flex items-center px-6 py-3.5 gap-3">
                <span className="text-[12px] text-gray-300 font-mono w-5 flex-shrink-0">{i + 1}</span>
                <span className="flex-1 text-[13.5px] font-semibold text-gray-900">{e.n}</span>
                <div className="flex items-center gap-2.5">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden" style={{ width: 90 }}>
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(e.c / 1) * 100}%` }} />
                  </div>
                  <span className="text-[13px] font-bold text-gray-700 w-4 text-right">{e.c}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By estado */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
            <TrendingUp size={15} className="text-orange-500" />
            <span className="font-display text-[18px] text-gray-900 tracking-tight font-normal">Resumen por estado</span>
          </div>
          <div className="p-6 flex flex-col gap-5">
            {estados.map(s => (
              <div key={s.l}>
                <div className="flex justify-between text-[12px] text-gray-500 mb-1.5">
                  <span className="font-medium">{s.l}</span>
                  <span className="font-bold text-gray-900">{s.c}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main AdminPanel component ────────────────────────────────────────────────

export default function AdminPanel() {
  const [tab, setTab] = useState<TabId>('tram');
  const [selectedId, setSelectedId] = useState(3);
  const [search, setSearch] = useState('');

  const isMainTab = tab === 'tram' || tab === 'val' || tab === 'done';
  const selData = SOLICITUDES.find(s => s.id === selectedId)!;
  const filtered = search
    ? SOLICITUDES.filter(s =>
        s.nombre.toLowerCase().includes(search.toLowerCase()) ||
        s.especialidad.toLowerCase().includes(search.toLowerCase())
      )
    : SOLICITUDES;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 flex-shrink-0 flex items-center gap-6 px-7" style={{ height: 72 }}>
        <div className="font-display text-[21px] text-gray-900 tracking-tight font-normal whitespace-nowrap">
          Gestión de Matrículas
        </div>

        {/* Tabs */}
        <nav className="flex gap-0.5 items-center mx-auto">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] transition-all ${
                  active
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-medium'
                }`}
              >
                {t.id === 'local'   && <Inbox    size={13} strokeWidth={active ? 2.5 : 2} />}
                {t.id === 'reports' && <BarChart3 size={13} strokeWidth={active ? 2.5 : 2} />}
                {t.label}
                {t.count !== undefined && (
                  <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center ${
                    active      ? 'bg-orange-500 text-white' :
                    t.alert     ? 'bg-orange-700 text-white' :
                                  'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button className="w-10 h-10 border border-gray-200 bg-gray-50 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center flex-shrink-0">
          <Settings size={17} />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar (main tabs only) */}
        {isMainTab && (
          <aside className="flex-shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden" style={{ width: 320 }}>
            {/* Search & filters */}
            <div className="p-4 pb-3 flex-shrink-0">
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar alumno..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-gray-900 outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <button className="flex-shrink-0 w-[38px] h-[38px] border border-gray-200 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center">
                  <RefreshCw size={13} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button className="flex justify-between items-center px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-[12px] text-gray-600 hover:bg-gray-100 transition-colors">
                  <span><span className="text-gray-400 mr-1">Curso:</span>Todos</span>
                  <ChevronDown size={11} className="text-gray-400" />
                </button>
                <button className="flex justify-between items-center px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-[12px] text-gray-400 hover:bg-gray-100 transition-colors">
                  Especialidad <ChevronDown size={11} />
                </button>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {['Nombre', 'Nº Orden', 'Especialidad', 'Curso'].map((s, i) => (
                  <button
                    key={s}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors font-medium ${
                      i === 1
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'text-gray-500 border-gray-200 hover:border-gray-400 bg-transparent'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {filtered.map(s => {
                const active = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left px-4 py-3.5 mb-0.5 rounded-xl flex items-center gap-3.5 transition-all ${
                      active ? 'bg-orange-50' : 'bg-transparent hover:bg-gray-50'
                    }`}
                    style={active ? { boxShadow: 'inset 3px 0 0 #f97316' } : {}}
                  >
                    {/* Editorial order number */}
                    <div
                      className={`font-display leading-none tracking-tighter w-12 text-center flex-shrink-0 transition-colors ${
                        active ? 'text-orange-500' : 'text-gray-200'
                      }`}
                      style={{ fontSize: 40 }}
                    >
                      {String(getDisplayOrden(s)).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-bold tracking-tight mb-1 truncate ${
                        active ? 'text-orange-700' : 'text-gray-900'
                      }`}>
                        {s.nombre}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                          active ? 'bg-white text-orange-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {s.curso}
                        </span>
                        <span className="text-[12px] text-gray-400">{s.especialidad}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          {isMainTab && (
            <div className="p-6">
              <DetailPanel sel={selData} />
            </div>
          )}
          {tab === 'local'   && <LocalPanel />}
          {tab === 'reports' && <InformesPanel />}
        </main>
      </div>
    </div>
  );
}
