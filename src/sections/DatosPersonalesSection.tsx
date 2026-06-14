import React from 'react';
import { User } from 'lucide-react';
import { EnrollmentFormData } from '../types';

interface DatosPersonalesSectionProps {
  formData: EnrollmentFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const DatosPersonalesSection: React.FC<DatosPersonalesSectionProps> = ({ formData, onChange, onBlur }) => {
  return (
    <section className="bg-white rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
        <div className="p-2 bg-gray-50 rounded-lg">
          <User size={20} className="text-gray-600" />
        </div>
        <h2 className="text-base sm:text-xl font-semibold">Datos Personales</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Nombre</label>
          <input required name="nombre" value={formData.nombre} onChange={onChange} onBlur={onBlur} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" placeholder="Ej: Juan" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Apellidos</label>
          <input required name="apellidos" value={formData.apellidos} onChange={onChange} onBlur={onBlur} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" placeholder="Ej: Pérez García" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">D.N.I. / N.I.E.</label>
          <input required name="dni" value={formData.dni} onChange={onChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" placeholder="12345678X" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Fecha de Nacimiento</label>
          <input required type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={onChange} onBlur={onBlur} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Domicilio Actual</label>
          <input required name="domicilio" value={formData.domicilio} onChange={onChange} onBlur={onBlur} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" placeholder="Calle, número, piso..." />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Localidad</label>
          <input required name="localidad" value={formData.localidad} onChange={onChange} onBlur={onBlur} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Provincia</label>
            <input name="provincia" value={formData.provincia} onChange={onChange} onBlur={onBlur} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">C.P.</label>
            <input required name="codigoPostal" value={formData.codigoPostal} onChange={onChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Correo Electrónico</label>
          <input required type="email" name="email" value={formData.email} onChange={onChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" placeholder="ejemplo@correo.com" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Teléfono</label>
          <input required type="tel" name="telefono" value={formData.telefono} onChange={onChange} className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 transition-all" />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Hora salida otros estudios obligatorios</label>
          <div className="flex gap-4">
            {['Antes de las 17 h', '17 h', '18 h'].map((hora) => (
              <label key={hora} className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="radio" 
                  name="horaSalidaEstudios" 
                  value={hora} 
                  checked={formData.horaSalidaEstudios === hora}
                  onChange={onChange}
                  className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                />
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">{hora}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center gap-5">
          <label className="toggle-label">
            <div className="toggle">
              <input
                className="toggle-state"
                type="checkbox"
                name="disponibilidadManana"
                checked={formData.disponibilidadManana}
                onChange={onChange}
                required
              />
              <div className="indicator" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              Disponibilidad horaria de mañana
              <span className="text-red-500 ml-0.5">*</span>
            </span>
          </label>
          <label className="toggle-label">
            <div className="toggle">
              <input
                className="toggle-state"
                type="checkbox"
                name="autorizacionImagen"
                checked={formData.autorizacionImagen}
                onChange={onChange}
                required
              />
              <div className="indicator" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              Autorización uso de imagen
              <span className="text-red-500 ml-0.5">*</span>
            </span>
          </label>
        </div>
      </div>
    </section>
  );
};
