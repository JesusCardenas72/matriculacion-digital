/**
 * Test de regresión: política de espacios en blanco en los campos del formulario.
 *
 * Histórico: durante el desarrollo varias veces se introdujo un sanitizado
 * global que colapsaba o eliminaba espacios en cualquier campo (incluidos
 * nombres, direcciones, motivos, observaciones…), provocando que el usuario
 * no pudiera escribir varios espacios o que se borraran al teclear.
 *
 * REGLA INMUTABLE: solo los campos en NO_WHITESPACE_FIELDS pierden espacios.
 * Cualquier otro campo debe preservar literalmente lo que se teclee.
 *
 * Si este test falla, NO lo "arregles" añadiendo el campo a la lista —
 * arregla el código que rompió la regla.
 */

import { describe, it, expect } from 'vitest';
import { NO_WHITESPACE_FIELDS, sanitizeFieldValue, sanitize } from '../constants';

describe('NO_WHITESPACE_FIELDS — lista cerrada', () => {
  it('contiene exactamente DNI(s), email y teléfono', () => {
    expect([...NO_WHITESPACE_FIELDS].sort()).toEqual(
      ['dni', 'email', 'telefono', 'tutor1Dni', 'tutor2Dni'].sort()
    );
  });
});

describe('sanitizeFieldValue', () => {
  it('elimina TODOS los espacios en campos sin espacios', () => {
    for (const field of NO_WHITESPACE_FIELDS) {
      expect(sanitizeFieldValue(field, '  12 34 56 78 Z  ')).toBe('12345678Z');
    }
  });

  // Campos representativos donde el usuario DEBE poder teclear con espacios.
  const freeTextFields = [
    'nombre',
    'apellidos',
    'direccion',
    'localidad',
    'provincia',
    'tutor1Nombre',
    'tutor2Nombre',
    'convalidacionMotivo',
    'observaciones',
    'perfilProfesional',
    'especialidad',
    'curso',
    'tipoEnsenanza',
    'codigoPostal',
  ];

  it.each(freeTextFields)('preserva espacios dobles y bordes en "%s"', (name) => {
    const input = '  María  José   del  Carmen  ';
    expect(sanitizeFieldValue(name, input)).toBe(input);
  });

  it.each(freeTextFields)('preserva un único espacio en "%s"', (name) => {
    expect(sanitizeFieldValue(name, 'Calle Mayor 1')).toBe('Calle Mayor 1');
  });

  it.each(freeTextFields)('preserva espacio simple consecutivo en "%s"', (name) => {
    // Caso clásico que se rompió antes: usuario teclea "Juan " + "Pérez"
    // → si hay colapso de \s{2,} no se notaría aquí, pero si hubiera trim
    // intermedio, el espacio final se perdería tras cada tecla.
    expect(sanitizeFieldValue(name, 'Juan ')).toBe('Juan ');
    expect(sanitizeFieldValue(name, 'Juan  ')).toBe('Juan  ');
  });
});

describe('sanitize (deprecado) — passthrough', () => {
  it('NO modifica el valor (regresión: antes colapsaba \\s{2,})', () => {
    expect(sanitize('hola   mundo')).toBe('hola   mundo');
    expect(sanitize('  con bordes  ')).toBe('  con bordes  ');
  });
});
