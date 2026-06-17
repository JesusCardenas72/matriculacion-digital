import React from 'react';
import { EnrollmentFormData } from '../types';

interface MenoresEdadSectionProps {
  formData: EnrollmentFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  fieldErrors?: Record<string, string>;
}

export const MenoresEdadSection: React.FC<MenoresEdadSectionProps> = ({ formData, onChange, onBlur, fieldErrors }) => {
  const errs = fieldErrors || {};
  return (
    <section className="bg-white rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-base sm:text-xl font-semibold">Menores de 18 años</h2>
      </div>
      <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-widest">Rellenar solo si aplica</p>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Tutor/a Legal 1 (Apellidos y Nombre)</label>
            <input name="tutor1Nombre" value={formData.tutor1Nombre} onChange={onChange} onBlur={onBlur} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">D.N.I.</label>
            <input name="tutor1Dni" value={formData.tutor1Dni} onChange={onChange} onBlur={onBlur} className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 transition-all ${errs['tutor1Dni'] ? 'ring-2 ring-red-300' : 'focus:ring-gray-200'}`} maxLength={10} placeholder="12345678X" />
            {errs['tutor1Dni'] && <p className="text-red-500 text-xs mt-1 ml-1">{errs['tutor1Dni']}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Tutor/a Legal 2 (Apellidos y Nombre)</label>
            <input name="tutor2Nombre" value={formData.tutor2Nombre} onChange={onChange} onBlur={onBlur} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">D.N.I.</label>
            <input name="tutor2Dni" value={formData.tutor2Dni} onChange={onChange} onBlur={onBlur} className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 transition-all ${errs['tutor2Dni'] ? 'ring-2 ring-red-300' : 'focus:ring-gray-200'}`} maxLength={10} placeholder="12345678X" />
            {errs['tutor2Dni'] && <p className="text-red-500 text-xs mt-1 ml-1">{errs['tutor2Dni']}</p>}
          </div>
        </div>
      </div>
    </section>
  );
};
