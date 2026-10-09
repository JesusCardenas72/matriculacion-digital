import { Buffer } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).Buffer = Buffer;
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminPanel from './AdminPanel.tsx';
import { OpcionesProvider } from './opciones/OpcionesProvider';
import './index.css';

const isAdmin = new URLSearchParams(window.location.search).has('admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? <AdminPanel /> : <OpcionesProvider><App /></OpcionesProvider>}
  </StrictMode>,
);
