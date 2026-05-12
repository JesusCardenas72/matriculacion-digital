export const ACTIVE_ACADEMIC_YEAR = '2025 / 2026';

export function getAcademicYearShort(): string {
  return ACTIVE_ACADEMIC_YEAR.split(' / ')[0] || '';
}
