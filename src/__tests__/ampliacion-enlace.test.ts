import { describe, expect, it } from 'vitest';
import {
  datosAFormulario,
  descifrarEnlace,
  EnlaceNoValidoError,
  LlaveIncorrectaError,
  leerTokenDeUrl,
  normalizarLlave,
  opcionesNecesarias,
  pideConfirmacion,
  valorLegible,
  type DatosEnlaceAmpliacion,
} from '../ampliacion/enlace';

/**
 * Token generado por GestionMatriculasAdmin (src/utils/enlaceFormularioAmpliacion.test.ts,
 * «vector común», sal e iv fijos) para Ana Ruiz Gómez, DNI 12345678Z, EE3 → EE4 Piano.
 * Si cambia el formato en la app, hay que copiar aquí el nuevo.
 */
const VECTOR = "1d.AQEBAQEBAQEBAQEBAQEBAQ.AgICAgICAgICAgIC.ulxAWXXUd29Bk8IyS4VQP8alIhNkm9s9JPLkT2Gm-bqsHuwmANeNGYhLOA8uyI-AJMHM4V6BeBnMwQ3zjAC26YTgkL8bmPdI1yJx815aqVr1A8VRUbiIWqsjurc4NbOyxYfwbDou2VbDjfPQzI2Cct9Ad0aaC-mYHvG3efl1-eoQ-izmdDnjGUQJnw0k23rqQjHvHK77uQhRfIOHSZkzH0JVrG0YM3UIuMU1xcmec0Utab-UKVij9-Vopplt7HvyqVDfgji2Pvu8zEwGAqBj5quF45ouruM4rgzo4dvTKluz8cK7-9wgrtJAyZ4nKFPLe4mIxHLf2G6eEPkQHM1D6vpsD6R19l5VlhKlP9JQkTnOi4NM1o3YXNZa9UxDAyY4fPX9hQ0ClBSYSsJUw--esk0wkq5VKpeHi7S8gX7xLkUK5aUJQPgW0S7gDV2ptqqroGrEzyh6ubZNJlQaaAf6D_mCtdTXYoZUhH3pXNfzD2FYqMMS-SrtiKgEg_W5tlT3YzCn7hnoHP6w3Y_Ix266ia6UtTkJ1q4BvadrzY4H3pVuiZ20gSAvhLek7F0WuL0aL7bXbaZmMVbWp1BUgpXWZjR68PZ63L_GYZXP83RGwKe6pcSqjneZbTcgkcoI-A8rdgW_fTKk6CNUNV3T6p0La29upzf5Ovmt6QDu0MPWYhrFdJGVltA";
/** Mismo alumno pero sin DNI: se abre con la clave de acceso ABCD-EFGH (vector «con clave» de la app). */
const VECTOR_CLAVE = "1c.AwMDAwMDAwMDAwMDAwMDAw.BAQEBAQEBAQEBAQE.zpLgh_w3IiqToza0zI5rE2B6kJdCbrLP2qlBZ--F1fZreVKBUsMQdaIAekeCRX6LC89QctF7EzxSobvUMpTdTb05FagyiIZvPKIWN_VP3-rtgczRJck2u3dVtdQ6Wyej6E1VNm2ammGarpw_Js7Hxk7TV8K6jj_ALwWOHV0YF8cnsoLbsT3FP7EhweDjijmfgztr2jcy6gBZLVqMrQAoK-sMABnFWcT-amlGENnDRwsgCHRa9dSxu__HMLU0jd0RCVpSdzv8HCqLlB-wSutxAL97F6r627DRXThlZtIaqcAmWZswMD35D_51Ev0IGIn1lkuo-PRUiKRhGe8QGHzNy0H4mMjSPwpHtVS1eE12nFkJWtiyZ3iY0GTDeh1D4euxCPgFC6YJxA_gbrdpNN-lgoeDyg7dlo_ZCHfnNQRE9uVogdUEMSHLddxqp-1rKTqtDbqjDpkkCOJR4cMGXpieocOVfTLBac6NLIW4av-ZzZFDizpV_JhIEkzfmEZR3zPX3LKo3fQ-vpiuo0KRm7nZ9Ylxv35XKI9p0c_RKsHIaFg6rHieeylHW3wsTtlp39VsVyAnxneG_28QvLFIZA6C5BeoBZryF-0YqLAHXUWOzuktaeUynMrj0lSu4jPXww6GTBloPS96BDyOqeLWVx0N7aoVwOND5ZBZoIJIG3E";
const HOY = new Date('2026-12-01T10:00:00Z');

describe('leerTokenDeUrl', () => {
  it('lee el token de #ampliacion=…', () => {
    expect(leerTokenDeUrl('#ampliacion=' + VECTOR)).toEqual({ token: VECTOR, tipoLlave: 'd' });
    expect(leerTokenDeUrl('#ampliacion=1c.a.b.c')).toEqual({ token: '1c.a.b.c', tipoLlave: 'c' });
  });

  it('ignora direcciones sin token o con un token raro', () => {
    expect(leerTokenDeUrl('')).toBeNull();
    expect(leerTokenDeUrl('#otra=1')).toBeNull();
    expect(leerTokenDeUrl('#ampliacion=EE4')).toBeNull();
    expect(leerTokenDeUrl('#ampliacion=2d.a.b.c')).toBeNull();
    expect(leerTokenDeUrl('#ampliacion=1f.a.b.c')).toBeNull();
  });
});

describe('descifrarEnlace (vector común con la app)', () => {
  const token = leerTokenDeUrl('#ampliacion=' + VECTOR)!;

  it('con el DNI correcto (escrito como sea) devuelve los datos de la matrícula', async () => {
    const d = await descifrarEnlace(token, ' 12.345.678-z ', HOY);
    expect(d).toMatchObject({
      destino: 'EE4',
      origen: { nOrden: 45, curso: 'EE3' },
      nombre: 'Ana',
      apellidos: 'Ruiz Gómez',
      fechaNacimiento: '2014-03-09',
      especialidad: 'Piano',
      formaPago: 'unico',
      tipoReduccion: 'fam_num_general',
    });
  });

  it('con otro DNI no descifra nada', async () => {
    await expect(descifrarEnlace(token, '12345678A', HOY)).rejects.toBeInstanceOf(LlaveIncorrectaError);
    await expect(descifrarEnlace(token, '', HOY)).rejects.toBeInstanceOf(LlaveIncorrectaError);
  });

  it('caducado: avisa', async () => {
    await expect(descifrarEnlace(token, '12345678Z', new Date('2027-02-01'))).rejects.toBeInstanceOf(EnlaceNoValidoError);
  });

  it('un token manipulado no se abre', async () => {
    const roto = { ...token, token: token.token.slice(0, -4) + 'AAAA' };
    await expect(descifrarEnlace(roto, '12345678Z', HOY)).rejects.toBeInstanceOf(LlaveIncorrectaError);
  });
});

describe('datosAFormulario', () => {
  const base: DatosEnlaceAmpliacion = {
    v: 1,
    destino: 'EE4',
    origen: { nOrden: 45, curso: 'EE3', cursoEscolar: '2026-2027' },
    caduca: '2027-01-25',
    nombre: 'Ana',
    apellidos: 'Ruiz',
    dni: '12345678Z',
    fechaNacimiento: '2014-03-09',
    domicilio: 'C/ Mayor 1',
    localidad: 'Ciudad Real',
    provincia: '',
    codigoPostal: '13001',
    email: 'ana@x.com',
    telefono: '600111222',
    horaSalidaEstudios: '17 h',
    disponibilidadManana: false,
    autorizacionImagen: true,
    especialidad: 'violin',
    formaPago: 'unico',
    tipoReduccion: 'fam_num_general',
  };

  it('rellena enseñanza, curso y especialidad con los valores del selector', () => {
    expect(datosAFormulario(base)).toMatchObject({
      tipoEnsenanza: 'elemental',
      curso: '4º',
      especialidad: 'Violín',
      provincia: 'Ciudad Real',
      familiaNumerosa: true,
      esPrimerAno: false,
      horaSalidaEstudios: '17 h',
    });
    expect(datosAFormulario({ ...base, destino: 'EP2' })).toMatchObject({ tipoEnsenanza: 'profesional', curso: '2º' });
  });

  it('beca solo en Profesional; valores desconocidos quedan vacíos', () => {
    expect(datosAFormulario({ ...base, formaPago: 'beca' }).formaPago).toBe('');
    expect(datosAFormulario({ ...base, destino: 'EP3', formaPago: 'beca' }).formaPago).toBe('beca');
    expect(datosAFormulario({ ...base, tipoReduccion: 'otra' }).tipoReduccion).toBe('ninguna');
    expect(datosAFormulario({ ...base, horaSalidaEstudios: '20 h' }).horaSalidaEstudios).toBe('');
    expect(datosAFormulario({ ...base, especialidad: 'Laúd' }).especialidad).toBe('');
  });

  it('opciones que la familia necesita aunque estén desactivadas', () => {
    expect(opcionesNecesarias(datosAFormulario(base))).toEqual([
      'ensenanzaElemental',
      'cursoEE4',
      'espViolin',
      'pagoUnico',
      expect.any(String),
    ]);
  });
});

describe('confirmación de cambios', () => {
  const originales = { domicilio: 'C/ Mayor 1', autorizacionImagen: true };

  it('pide confirmar si cambia un dato que vino del enlace', () => {
    expect(pideConfirmacion('domicilio', 'C/ Mayor 2', originales, new Set())).toBe(true);
    expect(pideConfirmacion('autorizacionImagen', false, originales, new Set())).toBe(true);
  });

  it('no la pide si el valor es el mismo, ya se confirmó, el campo no vino o no hay enlace', () => {
    expect(pideConfirmacion('domicilio', 'C/ Mayor 1', originales, new Set())).toBe(false);
    expect(pideConfirmacion('domicilio', 'C/ Otra', originales, new Set(['domicilio']))).toBe(false);
    expect(pideConfirmacion('tutor1Nombre', 'Pepe', originales, new Set())).toBe(false);
    expect(pideConfirmacion('domicilio', 'C/ Otra', null, new Set())).toBe(false);
  });

  it('valores legibles para el mensaje', () => {
    expect(valorLegible('fechaNacimiento', '2014-03-09')).toBe('09/03/2014');
    expect(valorLegible('autorizacionImagen', true)).toBe('Sí');
    expect(valorLegible('tipoReduccion', 'fam_num_general')).toBe('Familia Numerosa General');
    expect(valorLegible('domicilio', '')).toBe('(vacío)');
  });

  it('normalizarLlave: DNI o clave escritos como sea', () => {
    expect(normalizarLlave(' 12.345.678-z ')).toBe('12345678Z');
    expect(normalizarLlave('abcd-efgh')).toBe('ABCDEFGH');
    expect(normalizarLlave('ABCD EFGH')).toBe('ABCDEFGH');
  });
});

describe('descifrarEnlace con clave de acceso (alumno sin DNI)', () => {
  const token = leerTokenDeUrl('#ampliacion=' + VECTOR_CLAVE)!;

  it('se abre con la clave escrita como sea (minúsculas, sin guion, con espacios)', async () => {
    expect(token.tipoLlave).toBe('c');
    for (const escrita of ['ABCD-EFGH', 'abcdefgh', ' abcd efgh ']) {
      const d = await descifrarEnlace(token, escrita, HOY);
      expect(d.nombre).toBe('Ana');
      expect(d.dni).toBe('');
    }
  });

  it('no se abre con otra clave', async () => {
    await expect(descifrarEnlace(token, 'ABCD-EFGJ', HOY)).rejects.toBeInstanceOf(LlaveIncorrectaError);
  });
});
