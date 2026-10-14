import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  OPCIONES_CATALOGO,
  OPCIONES_POR_DEFECTO,
  acumularTecla,
  CLAVE_ADMIN,
  ajustarFormulario,
  cursoOpcionKey,
  especialidadOpcionKey,
  ESPECIALIDADES,
  normalizarOpciones,
} from '../opciones/catalogo';
import { OpcionesProvider } from '../opciones/OpcionesProvider';
import { Opcion, AVISO_NO_DISPONIBLE } from '../opciones/Opcion';
import type { EnrollmentFormData } from '../types';

const base = {
  tipoEnsenanza: 'profesional',
  curso: '5º',
  especialidad: 'Piano',
  perfilProfesional: 'A',
  asignaturaPendiente1: '',
  asignaturaPendiente2: '',
  esRepetidor: false,
  formaPago: 'fraccionado',
  tipoReduccion: 'fam_num_especial',
  matriculaHonor: false,
  esPrimerAno: true,
  convalidacionAsignaturas: [],
  convalidacionSolicitada: false,
  convalidacionMotivo: '',
} as unknown as EnrollmentFormData;

describe('normalizarOpciones', () => {
  it('todo activado por defecto y con entradas inválidas', () => {
    expect(normalizarOpciones(undefined)).toEqual(OPCIONES_POR_DEFECTO);
    expect(normalizarOpciones('no es json')).toEqual(OPCIONES_POR_DEFECTO);
    expect(normalizarOpciones([false])).toEqual(OPCIONES_POR_DEFECTO);
  });

  it('solo un false explícito desactiva; ignora claves desconocidas', () => {
    const c = normalizarOpciones({ beca: false, perfilA: 'false', inventada: false });
    expect(c.beca).toBe(false);
    expect(c.perfilA).toBe(true);
    expect('inventada' in c).toBe(false);
  });

  it('acepta el JSON como texto (columna de Dataverse)', () => {
    expect(normalizarOpciones('{"pagoFraccionado":false}').pagoFraccionado).toBe(false);
  });

  it('las claves del catálogo son únicas', () => {
    const keys = OPCIONES_CATALOGO.map(o => o.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('cursoOpcionKey', () => {
  it('mapea enseñanza + curso a la clave', () => {
    expect(cursoOpcionKey('elemental', '1º')).toBe('cursoEE1');
    expect(cursoOpcionKey('profesional', '6º')).toBe('cursoEP6');
    expect(cursoOpcionKey('elemental', '5º')).toBeNull();
    expect(cursoOpcionKey('', '1º')).toBeNull();
  });
});

describe('especialidadOpcionKey', () => {
  it('todas las especialidades tienen clave en el catálogo', () => {
    const keys = new Set<string>(OPCIONES_CATALOGO.map(o => o.key));
    for (const esp of ESPECIALIDADES) expect(keys.has(especialidadOpcionKey(esp)!)).toBe(true);
    expect(especialidadOpcionKey('Laúd')).toBeNull();
    expect(especialidadOpcionKey('')).toBeNull();
  });
});

describe('ajustarFormulario', () => {
  it('devuelve el mismo objeto si no hay nada desactivado seleccionado', () => {
    expect(ajustarFormulario(base, OPCIONES_POR_DEFECTO)).toBe(base);
  });

  it('deselecciona las opciones desactivadas', () => {
    const on = { ...OPCIONES_POR_DEFECTO, perfilA: false, pagoFraccionado: false, reduccionFamNumEspecial: false, primerAno: false };
    const r = ajustarFormulario(base, on);
    expect(r.perfilProfesional).toBe('');
    expect(r.formaPago).toBe('');
    expect(r.tipoReduccion).toBe('ninguna');
    expect(r.esPrimerAno).toBe(false);
    expect(r.curso).toBe('5º');
  });

  it('curso desactivado: limpia curso y dependientes', () => {
    const r = ajustarFormulario(base, { ...OPCIONES_POR_DEFECTO, cursoEP5: false });
    expect(r.curso).toBe('');
    expect(r.perfilProfesional).toBe('');
  });

  it('especialidad desactivada: limpia especialidad y dependientes', () => {
    const r = ajustarFormulario(base, { ...OPCIONES_POR_DEFECTO, espPiano: false });
    expect(r.especialidad).toBe('');
    expect(r.perfilProfesional).toBe('');
    expect(r.curso).toBe('5º');
  });

  it('enseñanza desactivada: cambia a la otra y limpia beca/Canto', () => {
    const d = { ...base, formaPago: 'beca', especialidad: 'Canto' } as EnrollmentFormData;
    const r = ajustarFormulario(d, { ...OPCIONES_POR_DEFECTO, ensenanzaProfesional: false });
    expect(r.tipoEnsenanza).toBe('elemental');
    expect(r.curso).toBe('');
    expect(r.formaPago).toBe('');
    expect(r.especialidad).toBe('');
  });
});

describe('palabra clave del modo administrador', () => {
  it(`detecta "${CLAVE_ADMIN}" aunque haya teclas antes`, () => {
    let b = '';
    for (const k of ['x', 'Shift', ...'CPMadmin']) b = acumularTecla(b, k);
    expect(b).toBe(CLAVE_ADMIN);
  });
});

describe('<Opcion> y modo administrador', () => {
  // Simula los flows de Power Automate: lectura publicada y verificación/guardado.
  let publicada: Record<string, boolean>;
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    publicada = {};
    fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      if ('password' in body) {
        return body.password === 'ok' ? new Response('{"ok":true}', { status: 200 }) : new Response('', { status: 401 });
      }
      return new Response(JSON.stringify({ opciones: publicada }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opción activada: sin aviso e interactiva', () => {
    render(<OpcionesProvider><Opcion k="beca"><button>Beca</button></Opcion></OpcionesProvider>);
    expect(screen.queryByText(AVISO_NO_DISPONIBLE)).toBeNull();
    expect(screen.getByRole('button', { name: 'Beca' })).toBeVisible();
  });

  it('opción desactivada (configuración publicada): atenuada, inerte y con aviso', async () => {
    publicada = { beca: false };
    const { container } = render(<OpcionesProvider><Opcion k="beca"><button>Beca</button></Opcion></OpcionesProvider>);
    expect(await screen.findByText(AVISO_NO_DISPONIBLE)).toBeInTheDocument();
    expect(container.querySelector('[inert]')).not.toBeNull();
  });

  it('teclear la clave fuera de un campo abre la contraseña; dentro de un campo no', async () => {
    const user = userEvent.setup();
    render(<OpcionesProvider><input aria-label="nombre" /></OpcionesProvider>);

    await user.click(screen.getByLabelText('nombre'));
    await user.keyboard(CLAVE_ADMIN);
    expect(screen.queryByPlaceholderText('Contraseña')).toBeNull();

    act(() => (document.activeElement as HTMLElement).blur());
    await user.keyboard(CLAVE_ADMIN);
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
  });

  it('en modo administrador el interruptor desactiva la opción en vista previa', async () => {
    const user = userEvent.setup();
    render(<OpcionesProvider><Opcion k="beca"><button>Beca</button></Opcion></OpcionesProvider>);
    await user.keyboard(CLAVE_ADMIN);
    await user.type(screen.getByPlaceholderText('Contraseña'), 'ok');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('button', { name: /Todas las opciones/ })).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: /Desactivar Solicita Beca/ }));
    expect(screen.getByText(AVISO_NO_DISPONIBLE)).toBeInTheDocument();
    expect(screen.getByText(/cambios sin guardar/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Guardar/ }));
    expect(await screen.findByText(/guardado, los alumnos ya ven/)).toBeInTheDocument();
    const guardado = fetchMock.mock.calls.map(c => JSON.parse(String(c[1]?.body))).find(b => b.opciones && b.password);
    expect(guardado.password).toBe('ok');
    expect(guardado.opciones.beca).toBe(false);
  });

  it('contraseña incorrecta (401): no entra en modo administrador', async () => {
    const user = userEvent.setup();
    render(<OpcionesProvider><div /></OpcionesProvider>);
    await user.keyboard(CLAVE_ADMIN);
    await user.type(screen.getByPlaceholderText('Contraseña'), 'mala');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Contraseña incorrecta.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Todas las opciones/ })).toBeNull();
  });

  it('panel de opciones: seleccionar y deseleccionar todo', async () => {
    const user = userEvent.setup();
    render(<OpcionesProvider><div /></OpcionesProvider>);
    await user.keyboard(CLAVE_ADMIN);
    await user.type(screen.getByPlaceholderText('Contraseña'), 'ok');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await user.click(await screen.findByRole('button', { name: /Todas las opciones/ }));

    const [deseleccionarTodo] = screen.getAllByRole('button', { name: 'Deseleccionar todo' });
    await user.click(deseleccionarTodo);
    expect(screen.getAllByRole('checkbox').every(c => !(c as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByText(`${OPCIONES_CATALOGO.length} opciones desactivadas`, { exact: false })).toBeInTheDocument();

    const [seleccionarTodo] = screen.getAllByRole('button', { name: 'Seleccionar todo' });
    await user.click(seleccionarTodo);
    expect(screen.getAllByRole('checkbox').every(c => (c as HTMLInputElement).checked)).toBe(true);
  });
});
