import { AlertTriangle } from 'lucide-react';
import { CAMPOS_DE_LA_AMPLIACION, ETIQUETA_CAMPO, valorLegible } from './enlace';
import type { EnrollmentFormData } from '../types';

interface Props {
  campo: string;
  valorOriginal: unknown;
  valorNuevo: unknown;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Confirmación al cambiar un dato que venía de la matrícula original (enlace
 * personal de ampliación). Tras confirmar, ese campo ya se edita libremente.
 */
export default function ConfirmarCambio({ campo, valorOriginal, valorNuevo, onConfirmar, onCancelar }: Props) {
  const etiqueta = ETIQUETA_CAMPO[campo as keyof EnrollmentFormData] ?? campo;
  const esDeLaAmpliacion = CAMPOS_DE_LA_AMPLIACION.has(campo);
  // En los campos de texto el valor nuevo es solo la primera tecla: no se muestra.
  const mostrarNuevo = typeof valorNuevo === 'boolean' || !['nombre', 'apellidos', 'dni', 'domicilio', 'localidad', 'provincia', 'codigoPostal', 'email', 'telefono'].includes(campo);

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div role="alertdialog" aria-label="Confirmar cambio" className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-50 rounded-xl">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">¿Cambiar «{etiqueta}»?</h2>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
              {esDeLaAmpliacion ? 'En la ampliación autorizada figura' : 'Este dato viene de su matrícula actual'}:{' '}
              <strong className="text-gray-900">{valorLegible(campo, valorOriginal)}</strong>.
              {mostrarNuevo && (
                <>
                  {' '}Lo cambiará por <strong className="text-gray-900">{valorLegible(campo, valorNuevo)}</strong>.
                </>
              )}
            </p>
            {esDeLaAmpliacion ? (
              <p className="mt-2 text-sm font-semibold text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
                Es un dato de la ampliación autorizada por el Centro. Si lo cambia, puede que la Secretaría no acepte la solicitud.
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-600">Cámbielo solo si ya no es correcto.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancelar}
            className="px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            No, dejarlo como está
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="px-5 py-3 rounded-xl text-sm font-bold text-white bg-gray-900 hover:bg-black"
          >
            Sí, cambiarlo
          </button>
        </div>
      </div>
    </div>
  );
}
