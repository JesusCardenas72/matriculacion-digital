import express from 'express';
import { readdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const API_DIR = join(__dirname, '..', 'api');

const app = express();
app.use(express.raw({ type: '*/*', limit: '50mb' }));

async function mountApis() {
  const files = readdirSync(API_DIR).filter(f => extname(f) === '.ts');
  for (const file of files) {
    const route = '/api/' + basename(file, extname(file));
    const mod = await import(pathToFileURL(join(API_DIR, file)).href);
    const handler = mod.default;
    if (typeof handler === 'function') {
      app.all(route, (req, res) => handler(req, res));
      console.log(`  → ${route}`);
    }
  }
}

const PORT = process.env.API_PORT || 3001;

mountApis().then(() => {
  app.listen(PORT, () => {
    console.log(`[dev-api] Local API server running at http://localhost:${PORT}`);
  });
});
