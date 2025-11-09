import { PropsWithChildren } from 'react';

type MessageProps = PropsWithChildren<{
  role: 'client' | 'assistant';
  content: string;
  timestamp: string;
}>;

export default function Message({ role, content, timestamp, children }: MessageProps) {
  return (
    <article className={`message message--${role}`}>
      <div className="message__meta">
        <strong>{role === 'client' ? 'Cliente' : 'Andino Assistant'}</strong>
        <span> · </span>
        <time dateTime={timestamp}>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
      </div>
      <p>{content}</p>
      {children}
    </article>
  );
}
