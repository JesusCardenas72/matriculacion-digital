import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

/**
 * Plugin que ejecuta las API Routes de Vercel directamente en el dev server de Vite.
 * Así en local funcionan /api/submit-enrollment y /api/upload-pdf sin necesidad de proxy.
 */
function vercelApiRoutes(): Plugin {
  return {
    name: 'vercel-api-routes',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const routePath = req.url.slice('/api/'.length).split('?')[0];
        const routeFile = path.resolve(__dirname, 'api', `${routePath}.ts`);

        if (!fs.existsSync(routeFile)) {
          return next();
        }

        try {
          const mod = await server.ssrLoadModule(routeFile);
          if (typeof mod.default === 'function') {
            await mod.default(req, res);
          } else {
            next();
          }
        } catch (err) {
          console.error(`[API Route Error] ${routePath}:`, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Internal Server Error' }));
          }
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'development' ? [vercelApiRoutes()] : []),
    viteSingleFile(),
  ],
  build: {
    assetsInlineLimit: 200000,
    copyPublicDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
}));
