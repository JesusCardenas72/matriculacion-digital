const fs = require('fs');
const data = JSON.parse(fs.readFileSync('datMaterias_expandido.json', 'utf8'));

const transformed = data.map(m => ({
  id: m.MATERIA,
  descripcion: m.DESCRIPCION,
  curso: `${m.CursoN}º`,
  cursoN: m.CursoN,
  especialidad: m.Especialidad,
  nivel: m.Enseñanzas === 'Profesional' ? 'Profesional' : 'Elemental'
}));

const content = `export interface Materia {
  id: number;
  descripcion: string;
  curso: string;
  cursoN: number;
  especialidad: string;
  nivel: 'Elemental' | 'Profesional';
}

export const materias: Materia[] = ${JSON.stringify(transformed, null, 2)};
`;

fs.writeFileSync('src/data/materias.ts', content);
console.log('Data transformed and saved to src/data/materias.ts');
