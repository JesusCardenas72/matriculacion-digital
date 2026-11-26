import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowUpCircle, Lock, Save, ShieldCheck, SlidersHorizontal, Undo2, X } from 'lucide-react';
import {
  OPCIONES_CATALOGO,
  PA_OPCIONES_GUARDAR_URL,
  ClaveIncorrectaError,
  acumularTecla,
  CLAVE_ADMIN,
  enviarOpciones,
  leerCache,
  leerOpciones,
  type OpcionKey,
  type OpcionesConfig,
} from './catalogo';
import type { DatosEnlaceAmpliacion } from '../ampliacion/enlace';

interface OpcionesCtx {
  /** Configuración efectiva: el borrador en modo administrador, la publicada si no. */
  opciones: OpcionesConfig;
  isOn: (key: OpcionKey) => boolean;
  /** Modo ampliación de matrícula activo (ver `OpcionesConfig`) o abierto con un enlace personal. */
  ampliacion: boolean;
  admin: boolean;
  toggle: (key: keyof OpcionesConfig) => void;
  /** Datos del enlace personal de ampliación ya descifrado (null si no se entró por uno). */
  enlaceAmpliacion: DatosEnlaceAmpliacion | null;
  /**
   * Activa el modo ampliación solo para esta visita y permite las opciones que
   * la familia necesita aunque el modo administrador las tenga desactivadas.
   */
  activarEnlaceAmpliacion: (datos: DatosEnlaceAmpliacion, opcionesNecesarias: OpcionKey[]) => void;
}

const Ctx = createContext<OpcionesCtx | null>(null);

export function useOpciones(): OpcionesCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOpciones debe usarse dentro de <OpcionesProvider>');
  return ctx;
}

function esCampoEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

type EstadoGuardado =
  | { tipo: 'idle' }
  | { tipo: 'guardando' }
  | { tipo: 'ok' }
  | { tipo: 'error'; mensaje: string };

export function OpcionesProvider({ children }: { children: ReactNode }) {
  const [publicada, setPublicada] = useState<OpcionesConfig>(leerCache);
  const [borrador, setBorrador] = useState<OpcionesConfig | null>(null);
  const [password, setPassword] = useState('');
  const [pidiendoClave, setPidiendoClave] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoGuardado>({ tipo: 'idle' });

  const [enlace, setEnlace] = useState<{ datos: DatosEnlaceAmpliacion; forzadas: OpcionKey[] } | null>(null);

  const admin = borrador !== null;
  const opciones = useMemo<OpcionesConfig>(() => {
    const base = borrador ?? publicada;
    if (!enlace || enlace.forzadas.length === 0) return base;
    return { ...base, ...Object.fromEntries(enlace.forzadas.map(k => [k, true])) };
  }, [borrador, publicada, enlace]);

  const activarEnlaceAmpliacion = useCallback((datos: DatosEnlaceAmpliacion, forzadas: OpcionKey[]) => {
    setEnlace({ datos, forzadas });
  }, []);

  // La barra es fija y su alto cambia con el ancho (los botones pasan a otra
  // fila): el hueco que deja arriba se ajusta a su alto real. Se mide tras
  // cada render (cambia el texto de la barra) y al cambiar el ancho.
  const barra = useRef<HTMLDivElement>(null);
  const [altoBarra, setAltoBarra] = useState(0);
  useLayoutEffect(() => {
    if (barra.current) setAltoBarra(barra.current.getBoundingClientRect().height);
  });
  useEffect(() => {
    const el = barra.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const medir = () => setAltoBarra(el.getBoundingClientRect().height);
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [admin]);

  useEffect(() => {
    let cancelado = false;
    leerOpciones().then(c => { if (!cancelado) setPublicada(c); });
    return () => { cancelado = true; };
  }, []);

  // Palabra clave "cpmadmin" tecleada fuera de cualquier campo del formulario.
  const buffer = useRef('');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || esCampoEditable(e.target)) {
        buffer.current = '';
        return;
      }
      buffer.current = acumularTecla(buffer.current, e.key);
      if (buffer.current === CLAVE_ADMIN) {
        buffer.current = '';
        // El cuadro de contraseña se abre con el foco puesto: sin esto, la
        // última letra de la clave se escribiría dentro del campo.
        e.preventDefault();
        if (borrador === null) setPidiendoClave(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [borrador]);

  const isOn = useCallback((key: OpcionKey) => opciones[key] !== false, [opciones]);

  const toggle = useCallback((key: keyof OpcionesConfig) => {
    setBorrador(prev => (prev ? { ...prev, [key]: !prev[key] } : prev));
    setEstado({ tipo: 'idle' });
  }, []);

  const establecer = useCallback((keys: readonly OpcionKey[], valor: boolean) => {
    setBorrador(prev => (prev ? { ...prev, ...Object.fromEntries(keys.map(k => [k, valor])) } : prev));
    setEstado({ tipo: 'idle' });
  }, []);

  const entrar = (clave: string) => {
    setPassword(clave);
    setBorrador({ ...publicada });
    setPidiendoClave(false);
    setEstado({ tipo: 'idle' });
  };

  const salir = () => {
    if (hayCambios && !window.confirm('Hay cambios sin guardar. ¿Salir y descartarlos?')) return;
    setBorrador(null);
    setPassword('');
    setPanelAbierto(false);
    setEstado({ tipo: 'idle' });
  };

  const guardar = async () => {
    if (!borrador) return;
    setEstado({ tipo: 'guardando' });
    try {
      await enviarOpciones(password, borrador);
      setPublicada(borrador);
      setEstado({ tipo: 'ok' });
    } catch (err) {
      setEstado({ tipo: 'error', mensaje: err instanceof Error ? err.message : String(err) });
    }
  };

  const hayCambios = borrador !== null && (
    borrador.ampliacion !== publicada.ampliacion ||
    OPCIONES_CATALOGO.some(o => borrador[o.key] !== publicada[o.key])
  );
  const desactivadas = OPCIONES_CATALOGO.filter(o => !opciones[o.key]).length;

  const ampliacion = opciones.ampliacion || enlace !== null;
  const enlaceAmpliacion = enlace?.datos ?? null;
  const value = useMemo(
    () => ({ opciones, isOn, ampliacion, admin, toggle, enlaceAmpliacion, activarEnlaceAmpliacion }),
    [opciones, isOn, ampliacion, admin, toggle, enlaceAmpliacion, activarEnlaceAmpliacion],
  );

  return (
    <Ctx.Provider value={value}>
      {admin && <div className="h-28 sm:h-16" style={altoBarra ? { height: altoBarra } : undefined} aria-hidden="true" />}
      {children}

      {pidiendoClave && <ModalClave onEntrar={entrar} onCancelar={() => setPidiendoClave(false)} />}

      {admin && (
        <div ref={barra} className="fixed top-0 inset-x-0 z-[200] bg-amber-400 text-gray-900 shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldCheck size={18} />
              Modo administrador
            </div>
            <span className="text-xs font-medium">
              {desactivadas === 0 ? 'Todas las opciones visibles' : (desactivadas === 1 ? '1 opción desactivada' : `${desactivadas} opciones desactivadas`)}
              {hayCambios && ' · cambios sin guardar'}
              {estado.tipo === 'ok' && ' · guardado, los alumnos ya ven esta configuración'}
            </span>
            {estado.tipo === 'error' && (
              <span className="text-xs font-bold text-red-800 bg-red-100 rounded-lg px-2 py-1">{estado.mensaje}</span>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggle('ampliacion')}
                aria-pressed={ampliacion}
                title="Mientras esté activo, toda solicitud que se envíe será una ampliación de matrícula"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${ampliacion ? 'bg-purple-700 text-white hover:bg-purple-800' : 'bg-white/70 hover:bg-white'}`}
              >
                <ArrowUpCircle size={14} /> Ampliación de matrícula: {ampliacion ? 'Sí' : 'No'}
              </button>
              <button type="button" onClick={() => setPanelAbierto(true)} className="px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white text-xs font-bold flex items-center gap-1.5">
                <SlidersHorizontal size={14} /> Todas las opciones
              </button>
              {hayCambios && (
                <button type="button" onClick={() => { setBorrador({ ...publicada }); setEstado({ tipo: 'idle' }); }} className="px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white text-xs font-bold flex items-center gap-1.5">
                  <Undo2 size={14} /> Descartar
                </button>
              )}
              <button
                type="button"
                onClick={guardar}
                disabled={!hayCambios || estado.tipo === 'guardando' || !PA_OPCIONES_GUARDAR_URL}
                title={!PA_OPCIONES_GUARDAR_URL ? 'El flujo de guardado no está configurado' : undefined}
                className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save size={14} /> {estado.tipo === 'guardando' ? 'Guardando…' : 'Guardar'}
              </button>
              <button type="button" onClick={salir} className="px-3 py-1.5 rounded-lg hover:bg-white/50 text-xs font-bold flex items-center gap-1.5">
                <X size={14} /> Salir
              </button>
            </div>
            {!PA_OPCIONES_GUARDAR_URL && (
              <p className="basis-full text-[11px] font-medium">
                Vista previa: los flujos de Power Automate aún no están configurados, así que los cambios no se pueden guardar.
              </p>
            )}
          </div>
        </div>
      )}

      {admin && panelAbierto && borrador && (
        <PanelOpciones borrador={borrador} onToggle={toggle} onEstablecer={establecer} onCerrar={() => setPanelAbierto(false)} />
      )}
    </Ctx.Provider>
  );
}

function ModalClave({ onEntrar, onCancelar }: { onEntrar: (clave: string) => void; onCancelar: () => void }) {
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [comprobando, setComprobando] = useState(false);

  const comprobar = async () => {
    if (!PA_OPCIONES_GUARDAR_URL) {
      // Sin flujo configurado solo se permite la vista previa.
      onEntrar(clave);
      return;
    }
    setComprobando(true);
    setError(null);
    try {
      await enviarOpciones(clave);
      onEntrar(clave);
    } catch (err) {
      setError(err instanceof ClaveIncorrectaError ? 'Contraseña incorrecta.' : `No se pudo comprobar la contraseña: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setComprobando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={e => { e.preventDefault(); void comprobar(); }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg"><Lock size={20} /></div>
          <h3 className="text-lg font-bold text-gray-900">Modo administrador</h3>
        </div>
        <p className="text-sm text-gray-600">Introduce la contraseña para configurar qué opciones del formulario están disponibles.</p>
        <input
          type="password"
          autoFocus
          value={clave}
          onChange={e => setClave(e.target.value)}
          placeholder="Contraseña"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-200 outline-none"
        />
        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onCancelar} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-sm text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={!clave || comprobando} className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-bold text-sm disabled:opacity-40">
            {comprobando ? 'Comprobando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function BotonesTodas({ keys, borrador, onEstablecer, compacto = false }: {
  keys: readonly OpcionKey[];
  borrador: OpcionesConfig;
  onEstablecer: (keys: readonly OpcionKey[], valor: boolean) => void;
  compacto?: boolean;
}) {
  const todas = keys.every(k => borrador[k]);
  const ninguna = keys.every(k => !borrador[k]);
  const cls = compacto
    ? 'text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-500'
    : 'px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className={`flex items-center ${compacto ? 'gap-3' : 'gap-2'}`}>
      <button type="button" disabled={todas} onClick={() => onEstablecer(keys, true)} className={cls}>
        Seleccionar todo
      </button>
      <button type="button" disabled={ninguna} onClick={() => onEstablecer(keys, false)} className={cls}>
        Deseleccionar todo
      </button>
    </div>
  );
}

function PanelOpciones({ borrador, onToggle, onEstablecer, onCerrar }: {
  borrador: OpcionesConfig;
  onToggle: (k: keyof OpcionesConfig) => void;
  onEstablecer: (keys: readonly OpcionKey[], valor: boolean) => void;
  onCerrar: () => void;
}) {
  const secciones = [
    { id: 'matriculacion', titulo: 'Datos de Matriculación' },
    { id: 'pago', titulo: 'Forma de Pago' },
  ] as const;
  const todasLasClaves = OPCIONES_CATALOGO.map(o => o.key);

  return (
    <div className="fixed inset-0 z-[205] flex justify-end bg-black/30" onClick={onCerrar}>
      <aside className="h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Opciones disponibles</h3>
            <button type="button" onClick={onCerrar} className="p-2 rounded-full hover:bg-gray-100"><X size={18} /></button>
          </div>
          <BotonesTodas keys={todasLasClaves} borrador={borrador} onEstablecer={onEstablecer} />
        </div>
        <div className="p-6 space-y-8">
          <section className="space-y-2">
            <h4 className="text-sm font-black uppercase tracking-wider text-gray-900">Tipo de solicitud</h4>
            <label className="flex items-start gap-3 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={borrador.ampliacion}
                onChange={() => onToggle('ampliacion')}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-purple-700 focus:ring-purple-700"
              />
              <span className="text-sm text-gray-800">
                Ampliación de matrícula
                <span className="block text-xs text-gray-500">
                  Mientras esté marcada, toda solicitud enviada es una ampliación: alumno del centro que a mitad de curso pasa a un curso superior. El alumno ve el aviso, no la casilla.
                </span>
              </span>
            </label>
          </section>
          {secciones.map(sec => {
            const items = OPCIONES_CATALOGO.filter(o => o.seccion === sec.id);
            const grupos = [...new Set(items.map(o => o.grupo))];
            return (
              <section key={sec.id} className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-wider text-gray-900">{sec.titulo}</h4>
                {grupos.map(g => (
                  <div key={g} className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{g}</p>
                      <BotonesTodas compacto keys={items.filter(o => o.grupo === g).map(o => o.key)} borrador={borrador} onEstablecer={onEstablecer} />
                    </div>
                    {items.filter(o => o.grupo === g).map(o => (
                      <label key={o.key} className="flex items-center gap-3 py-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={borrador[o.key]}
                          onChange={() => onToggle(o.key)}
                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                        <span className={`text-sm ${borrador[o.key] ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{o.label}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
