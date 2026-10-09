import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Lock, Save, ShieldCheck, SlidersHorizontal, Undo2, X } from 'lucide-react';
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

interface OpcionesCtx {
  /** Configuración efectiva: el borrador en modo administrador, la publicada si no. */
  opciones: OpcionesConfig;
  isOn: (key: OpcionKey) => boolean;
  admin: boolean;
  toggle: (key: OpcionKey) => void;
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

  const admin = borrador !== null;
  const opciones = borrador ?? publicada;

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

  const toggle = useCallback((key: OpcionKey) => {
    setBorrador(prev => (prev ? { ...prev, [key]: !prev[key] } : prev));
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

  const hayCambios = borrador !== null && OPCIONES_CATALOGO.some(o => borrador[o.key] !== publicada[o.key]);
  const desactivadas = OPCIONES_CATALOGO.filter(o => !opciones[o.key]).length;

  const value = useMemo(() => ({ opciones, isOn, admin, toggle }), [opciones, isOn, admin, toggle]);

  return (
    <Ctx.Provider value={value}>
      {admin && <div className="h-28 sm:h-16" aria-hidden="true" />}
      {children}

      {pidiendoClave && <ModalClave onEntrar={entrar} onCancelar={() => setPidiendoClave(false)} />}

      {admin && (
        <div className="fixed top-0 inset-x-0 z-[200] bg-amber-400 text-gray-900 shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldCheck size={18} />
              Modo administrador
            </div>
            <span className="text-xs font-medium">
              {desactivadas === 0 ? 'Todas las opciones visibles' : `${desactivadas} opción${desactivadas === 1 ? '' : 'es'} desactivada${desactivadas === 1 ? '' : 's'}`}
              {hayCambios && ' · cambios sin guardar'}
              {estado.tipo === 'ok' && ' · guardado, los alumnos ya ven esta configuración'}
            </span>
            {estado.tipo === 'error' && (
              <span className="text-xs font-bold text-red-800 bg-red-100 rounded-lg px-2 py-1">{estado.mensaje}</span>
            )}
            <div className="ml-auto flex items-center gap-2">
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
        <PanelOpciones borrador={borrador} onToggle={toggle} onCerrar={() => setPanelAbierto(false)} />
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

function PanelOpciones({ borrador, onToggle, onCerrar }: { borrador: OpcionesConfig; onToggle: (k: OpcionKey) => void; onCerrar: () => void }) {
  const secciones = [
    { id: 'matriculacion', titulo: 'Datos de Matriculación' },
    { id: 'pago', titulo: 'Forma de Pago' },
  ] as const;

  return (
    <div className="fixed inset-0 z-[205] flex justify-end bg-black/30" onClick={onCerrar}>
      <aside className="h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Opciones disponibles</h3>
          <button type="button" onClick={onCerrar} className="p-2 rounded-full hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-8">
          {secciones.map(sec => {
            const items = OPCIONES_CATALOGO.filter(o => o.seccion === sec.id);
            const grupos = [...new Set(items.map(o => o.grupo))];
            return (
              <section key={sec.id} className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-wider text-gray-900">{sec.titulo}</h4>
                {grupos.map(g => (
                  <div key={g} className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{g}</p>
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
