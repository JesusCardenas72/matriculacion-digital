import type { ReactNode } from 'react';
import { OPCIONES_CATALOGO, type OpcionKey } from './catalogo';
import { useOpciones } from './OpcionesProvider';

export const AVISO_NO_DISPONIBLE = 'No disponible en este momento';

function labelDe(key: OpcionKey): string {
  return OPCIONES_CATALOGO.find(o => o.key === key)?.label ?? key;
}

function InterruptorAdmin({ k, on, onToggle }: { k: OpcionKey; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${on ? 'Desactivar' : 'Activar'} ${labelDe(k)}`}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm whitespace-nowrap ${
        on ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${on ? 'bg-green-500' : 'bg-red-500'}`} />
      {on ? 'Visible' : 'Desactivada'}
    </button>
  );
}

function Aviso() {
  return (
    <span className="inline-block rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 shadow-sm whitespace-nowrap">
      {AVISO_NO_DISPONIBLE}
    </span>
  );
}

/**
 * Envuelve una opción del formulario que se puede desactivar desde el modo
 * administrador. Desactivada: atenuada, inerte (sin clic ni foco) y con el
 * aviso "No disponible en este momento". En modo administrador muestra
 * además un interruptor para activarla o desactivarla.
 *
 * `avisoPos="esquina"` coloca aviso e interruptor sobre el borde superior
 * (tarjetas); `"debajo"` los coloca debajo (radios y controles pequeños).
 */
export function Opcion({
  k,
  children,
  className = '',
  avisoPos = 'esquina',
}: {
  k: OpcionKey;
  children: ReactNode;
  className?: string;
  avisoPos?: 'esquina' | 'debajo';
  /** Solo para que TypeScript acepte `key` al usarlo dentro de un .map(). */
  key?: string;
}) {
  const { isOn, admin, toggle } = useOpciones();
  const on = isOn(k);
  const mostrarAviso = !on;

  return (
    <div className={`relative ${className}`} data-opcion={k} data-opcion-activa={on}>
      <div
        inert={!on}
        aria-disabled={!on || undefined}
        className={`h-full ${on ? '' : 'opacity-40 grayscale select-none pointer-events-none'} ${admin && !on ? 'outline-2 outline-dashed outline-red-300 outline-offset-4 rounded-2xl' : ''}`}
      >
        {children}
      </div>
      {avisoPos === 'esquina' ? (
        <>
          {mostrarAviso && <div className="absolute -top-2.5 right-3 z-10"><Aviso /></div>}
          {admin && <div className="absolute -top-2.5 left-3 z-10"><InterruptorAdmin k={k} on={on} onToggle={() => toggle(k)} /></div>}
        </>
      ) : (
        (mostrarAviso || admin) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {admin && <InterruptorAdmin k={k} on={on} onToggle={() => toggle(k)} />}
            {mostrarAviso && <Aviso />}
          </div>
        )
      )}
    </div>
  );
}

/**
 * Interruptores sueltos (solo en modo administrador) para opciones que no se
 * pueden envolver, como los <option> de un <select>.
 */
export function InterruptoresAdmin({ titulo, keys }: { titulo: string; keys: OpcionKey[] }) {
  const { isOn, admin, toggle } = useOpciones();
  if (!admin) return null;
  return (
    <div className="mt-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-700">{titulo}</p>
      <div className="flex flex-wrap gap-2">
        {keys.map(k => (
          <button
            key={k}
            type="button"
            role="switch"
            aria-checked={isOn(k)}
            onClick={() => toggle(k)}
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
              isOn(k) ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700 line-through'
            }`}
          >
            {labelDe(k)}
          </button>
        ))}
      </div>
    </div>
  );
}
