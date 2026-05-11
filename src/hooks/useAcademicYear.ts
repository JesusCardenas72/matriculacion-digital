import { useState, useCallback } from 'react';
import { ACTIVE_ACADEMIC_YEAR } from '../config/academicYear';

const STORAGE_KEY = 'academicYear';

export function useAcademicYear() {
  const [year, setYearState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || ACTIVE_ACADEMIC_YEAR;
    } catch {
      return ACTIVE_ACADEMIC_YEAR;
    }
  });

  const setYear = useCallback((newYear: string) => {
    setYearState(newYear);
    try {
      localStorage.setItem(STORAGE_KEY, newYear);
    } catch {
      // ignore
    }
  }, []);

  return { year, setYear };
}
