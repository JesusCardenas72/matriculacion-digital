import { useState, type FormEvent } from 'react';
import AdminPanel from './AdminPanel';

async function sha256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function AdminGate() {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const expectedHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH;

  if (!expectedHash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        <p>Acceso al panel de administración no configurado (falta VITE_ADMIN_PASSWORD_HASH).</p>
      </div>
    );
  }

  if (authorized) {
    return <AdminPanel />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const inputHash = await sha256(password);
    if (inputHash.toLowerCase() === expectedHash.toLowerCase()) {
      setAuthorized(true);
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
        <p className="text-sm text-gray-500 mb-6">Introduce la contraseña de acceso.</p>
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false); }}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 outline-none mb-3"
          placeholder="Contraseña"
          autoFocus
        />
        {error && <p className="text-red-500 text-xs mb-3">Contraseña incorrecta.</p>}
        <button
          type="submit"
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
        >
          Acceder
        </button>
      </form>
    </div>
  );
}
