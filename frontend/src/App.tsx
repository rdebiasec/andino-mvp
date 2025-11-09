import { useEffect, useState } from 'react';

import Chat from './components/Chat';
import { health } from './lib/api';

const HEALTH_CHECK_INTERVAL = 15000;

type HealthStatus = 'checking' | 'ok' | 'error';

function App() {
  const [status, setStatus] = useState<HealthStatus>('checking');

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      if (!mounted) return;
      try {
        const ok = await health();
        setStatus(ok ? 'ok' : 'error');
      } catch (error) {
        console.error(error);
        setStatus('error');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const statusMessage = {
    checking: 'Verificando conexión…',
    ok: 'Conectado al backend',
    error: 'Error de conexión con el backend'
  }[status];

  return (
    <div className="app">
      <header className="app__header">
        <h1>Andino Postventa</h1>
        <p>Clasificación automática de reclamos con Azure OpenAI</p>
      </header>
      <section
        className={`app__status app__status--${status}`}
        role="status"
        aria-live="polite"
      >
        {statusMessage}
      </section>
      <main className="app__main">
        <Chat backendHealthy={status === 'ok'} />
      </main>
    </div>
  );
}

export default App;
