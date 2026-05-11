import { useState, useCallback, useEffect } from 'react';
import { ACTIVE_ACADEMIC_YEAR, getAutoAcademicYear } from '../config/academicYear';

const STORAGE_KEY = 'cpm_active_academic_year';

function readStoredYear(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const autoYear = getAutoAcademicYear();
    if (stored === autoYear) return stored;
    // Si el año guardado ya no coincide con el automático (cambio de curso),
    // lo descartamos y usamos el nuevo año calculado.
    if (stored) {
      localStorage.setItem(STORAGE_KEY, autoYear);
    }
  } catch {
    // localStorage no disponible (modo privado, etc.)
  }
  return ACTIVE_ACADEMIC_YEAR;
}

function writeStoredYear(year: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, year);
  } catch {
    // ignorar
  }
}

/**
 * Hook que lee/escribe el curso académico activo desde localStorage.
 * Si no hay valor guardado, usa ACTIVE_ACADEMIC_YEAR como fallback.
 */
export function useAcademicYear() {
  const [year, setYearState] = useState<string>(readStoredYear);

  const setYear = useCallback((newYear: string) => {
    writeStoredYear(newYear);
    setYearState(newYear);
  }, []);

  // Escuchar cambios en otras pestañas
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setYearState(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return { year, setYear } as const;
}

/**
 * Lee el curso académico activo sincrónicamente (útil fuera de React).
 */
export function getActiveAcademicYear(): string {
  return readStoredYear();
}
