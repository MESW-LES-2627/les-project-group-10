import { useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('loading...');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus('API unreachable'));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <h1 className="rounded-xl bg-white px-6 py-4 text-2xl font-semibold text-slate-800 shadow">
        FEUP Connect: API says {status}
      </h1>
    </main>
  );
}
