import { useState, type FormEvent } from 'react';
import { ArrowUpCircle, Loader2, Lock } from 'lucide-react';
import {
  descifrarEnlace,
  EnlaceNoValidoError,
  LlaveIncorrectaError,
  type DatosEnlaceAmpliacion,
  type TokenAmpliacion,
} from './enlace';

interface Props {
  token: TokenAmpliacion;
  onAbierto: (datos: DatosEnlaceAmpliacion) => void;
  /** Seguir sin cargar los datos: formulario normal. */
  onOmitir: () => void;
}

/**
 * Ventana que aparece al entrar por el enlace personal del correo de
 * ampliación: pide el DNI del alumno (o, si no tiene, la clave de acceso que
 * viene en el correo) para descifrar los datos de su matrícula y abrir el
 * formulario ya relleno.
 */
export default function DesbloqueoAmpliacion({ token, onAbierto, onOmitir }: Props) {
  const porClave = token.tipoLlave === 'c';
  const [valor, setValor] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentos, setIntentos] = useState(0);

  async function abrir(e: FormEvent) {
    e.preventDefault();
    if (!valor.trim()) return;
    setAbriendo(true);
    setError(null);
    try {
      onAbierto(await descifrarEnlace(token, valor));
    } catch (err) {
      setIntentos(n => n + 1);
      if (err instanceof LlaveIncorrectaError) {
        setError(
          porClave
            ? 'La clave no es correcta. Cópiela tal como aparece en el correo e inténtelo de nuevo.'
            : 'El DNI/NIE no coincide con el de la matrícula. Revíselo e inténtelo de nuevo.',
        );
      } else if (err instanceof EnlaceNoValidoError) {
        setError(err.message);
      } else {
        setError('No se ha podido abrir el enlace en este navegador. Pruebe con otro navegador actualizado.');
      }
    } finally {
      setAbriendo(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <form
        onSubmit={abrir}
        role="dialog"
        aria-label="Ampliación de matrícula"
        className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 sm:p-8 space-y-5"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-50 rounded-xl">
            <ArrowUpCircle size={24} className="text-purple-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Ampliación de matrícula</h2>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
              Su ampliación de matrícula ha sido autorizada. Para cargar los datos de su matrícula actual, escriba{' '}
              {porClave ? 'la clave de acceso que aparece en el correo que le ha enviado el Centro' : 'el DNI/NIE del alumno o alumna'}.
            </p>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">
            {porClave ? 'Clave de acceso' : 'D.N.I. / N.I.E. del alumno/a'}
          </span>
          <input
            autoFocus
            type="text"
            value={valor}
            onChange={e => setValor(e.target.value)}
            autoComplete="off"
            placeholder={porClave ? 'ABCD-EFGH' : '12345678X'}
            autoCapitalize="characters"
            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-purple-200 transition-all"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-700 bg-red-50 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <p className="flex items-start gap-2 text-xs text-gray-500">
          <Lock size={14} className="flex-shrink-0 mt-0.5" />
          Los datos viajan cifrados en el enlace y solo se abren con {porClave ? 'esta clave' : 'este documento'}.
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {intentos > 0 && (
            <button
              type="button"
              onClick={onOmitir}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              Rellenar el formulario sin mis datos
            </button>
          )}
          <button
            type="submit"
            disabled={abriendo || !valor.trim()}
            className="px-5 py-3 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {abriendo && <Loader2 size={16} className="animate-spin" />}
            Cargar mis datos
          </button>
        </div>
      </form>
    </div>
  );
}
