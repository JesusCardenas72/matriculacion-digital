import { useState, useCallback } from 'react';
import type { MatriculacionFormData } from './types';
import { MATRICULACION_INITIAL } from './types';

/**
 * Hook que gestiona el estado de MatriculacionFormData con los resets
 * automáticos correctos (cambio de tipo/curso/especialidad limpia
 * los campos dependientes).
 *
 * Uso:
 *   const { formData, handleChange } = useMatriculacion();
 *   <MatriculacionSection formData={formData} onChange={handleChange} />
 *
 * Si necesitas integrar este estado en un formulario mayor, usa
 * `setFormData` directamente para parchear los campos de matriculación.
 */
export function useMatriculacion(initial: Partial<MatriculacionFormData> = {}) {
  const [formData, setFormData] = useState<MatriculacionFormData>({
    ...MATRICULACION_INITIAL,
    ...initial,
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;

      setFormData(prev => {
        const next = { ...prev, [name]: value };

        if (name === 'tipoEnsenanza') {
          next.curso = '';
          next.perfilProfesional = '';
          next.asignaturaPendiente1 = '';
          next.asignaturaPendiente2 = '';
          // Canto no existe en Elemental
          if (value === 'elemental' && prev.especialidad === 'Canto') {
            next.especialidad = '';
          }
        }

        if (name === 'curso' || name === 'especialidad') {
          next.perfilProfesional = '';
          next.asignaturaPendiente1 = '';
          next.asignaturaPendiente2 = '';
        }

        return next;
      });
    },
    []
  );

  const setConvalidacionAsignaturas = useCallback((ids: string[]) => {
    setFormData(prev => ({ ...prev, convalidacionAsignaturas: ids }));
  }, []);

  return { formData, setFormData, handleChange, setConvalidacionAsignaturas };
}
