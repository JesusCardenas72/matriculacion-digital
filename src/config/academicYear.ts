export const ACTIVE_ACADEMIC_YEAR = '2025/2026';

export function getAcademicYearShort(): string {
  const [start, end] = ACTIVE_ACADEMIC_YEAR.split('/');
  return `${start.slice(-2)}/${end.slice(-2)}`;
}

export function getCurrentCalendarYear(): number {
  return new Date().getFullYear();
}
