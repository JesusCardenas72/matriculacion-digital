/**
 * Calcula automáticamente el curso académico activo según la fecha actual.
 * El cambio de curso se produce el 1 de mayo de cada año.
 *   - Ene-Abr → curso (año-1) / año
 *   - May-Dic → curso año / (año+1)
 */
export function getAutoAcademicYear(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0=Enero, 4=Mayo
  if (month < 4) {
    return `${year - 1} / ${year}`;
  }
  return `${year} / ${year + 1}`;
}

/**
 * Fuente de verdad del curso académico activo.
 * Se recalcula automáticamente al cargar la aplicación.
 */
export const ACTIVE_ACADEMIC_YEAR = getAutoAcademicYear();

/**
 * Devuelve el año de inicio a partir de un curso académico.
 * Ej: "2026 / 2027" → 2026
 */
export function getAcademicYearStart(year: string = ACTIVE_ACADEMIC_YEAR): number {
  const match = year.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
}

/**
 * Devuelve la versión corta de un curso académico.
 * Ej: "2026 / 2027" → "26/27"
 */
export function getAcademicYearShort(year: string = ACTIVE_ACADEMIC_YEAR): string {
  const match = year.match(/(\d{2})\d{2}\s*\/\s*(\d{2})\d{2}/);
  return match ? `${match[1]}/${match[2]}` : year;
}

/**
 * Devuelve el año actual del sistema (para copyright, etc.)
 */
export function getCurrentCalendarYear(): number {
  return new Date().getFullYear();
}

const STORAGE_KEY = 'cpm_active_academic_year';

/**
 * Lee el curso académico guardado en localStorage.
 * Si no existe o falla, devuelve ACTIVE_ACADEMIC_YEAR.
 */
export function getStoredAcademicYear(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // localStorage no disponible
  }
  return ACTIVE_ACADEMIC_YEAR;
}
