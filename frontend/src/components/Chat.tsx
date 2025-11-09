import { FormEvent, useMemo, useState } from 'react';

import { classify } from '../lib/api';
import CaseCard from './CaseCard';
import Message from './Message';

type ChatProps = {
  backendHealthy: boolean;
};

type ClientMessage = {
  id: string;
  role: 'client';
  content: string;
  timestamp: string;
};

type AssistantMessage = {
  id: string;
  role: 'assistant';
  content: string;
  timestamp: string;
  classification: Awaited<ReturnType<typeof classify>>;
};

type ChatMessage = ClientMessage | AssistantMessage;

type ErrorState = {
  message: string;
  traceId?: string;
  details?: Array<{ path: string; message: string }>;
} | null;

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export default function Chat({ backendHealthy }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState>(null);

  const disableSend = useMemo(() => {
    return loading || !backendHealthy || input.trim().length === 0;
  }, [backendHealthy, input, loading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;

    const timestamp = new Date().toISOString();
    const clientMessage: ClientMessage = {
      id: generateId(),
      role: 'client',
      content: text,
      timestamp
    };

    setMessages((prev) => [...prev, clientMessage]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const classification = await classify(text, 'web');
      const assistantMessage: AssistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Clasificación generada',
        timestamp: new Date().toISOString(),
        classification
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      const data = (err as { data?: any; message?: string }).data;
      setError({
        message: data?.detail || (err as Error).message || 'No se pudo clasificar el mensaje',
        traceId: data?.traceId,
        details: data?.errors
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-busy={loading} aria-live="polite">
      {error && (
        <div className="error-banner" role="alert">
          <strong>{error.message}</strong>
          {error.traceId && <div>Trace ID: {error.traceId}</div>}
          {error.details && (
            <ul>
              {error.details.map((d) => (
                <li key={`${d.path}-${d.message}`}>{`${d.path}: ${d.message}`}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="chat__messages">
        {messages.length === 0 && <div className="chat__empty">Aún no hay mensajes. ¡Envía tu primer reclamo!</div>}
        {messages.map((message) => (
          <Message key={message.id} role={message.role} content={message.content} timestamp={message.timestamp}>
            {'classification' in message ? <CaseCard {...message.classification} /> : null}
          </Message>
        ))}
      </div>

      <form className="chat__input-group" onSubmit={handleSubmit}>
        <label htmlFor="claimText">Mensaje del cliente</label>
        <textarea
          id="claimText"
          name="text"
          placeholder="Describe el reclamo del cliente..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-label="Texto del reclamo"
          aria-required="true"
        />
        <div className="chat__actions">
          <button type="submit" className="button" disabled={disableSend}>
            {loading ? 'Clasificando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </section>
  );
}
