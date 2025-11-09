type CaseCardProps = {
  intent: string;
  category: string;
  tone: string;
  confidence: number;
  caseId: string;
  receivedAt: string;
  channel: string;
  crm: {
    status: 'REGISTERED' | 'DUPLICATE_FOUND';
    existingOpenCaseId: string | null;
    isCustomer: boolean;
  };
};

function formatConfidence(value: number) {
  return value.toFixed(2);
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function CaseCard({ intent, category, tone, confidence, caseId, receivedAt, channel, crm }: CaseCardProps) {
  return (
    <div className="case-card" role="group" aria-label="Resultado de clasificación">
      <div className="case-card__grid">
        <div className="case-card__item">
          <div className="case-card__label">Intento</div>
          <div className="case-card__value">{intent}</div>
        </div>
        <div className="case-card__item">
          <div className="case-card__label">Categoría</div>
          <div className="case-card__value">{category}</div>
        </div>
        <div className="case-card__item">
          <div className="case-card__label">Tono</div>
          <div className="case-card__value">{tone}</div>
        </div>
        <div className="case-card__item">
          <div className="case-card__label">Confianza</div>
          <div className="case-card__value">{formatConfidence(confidence)}</div>
        </div>
        <div className="case-card__item">
          <div className="case-card__label">ID Caso</div>
          <div className="case-card__value">{caseId}</div>
        </div>
        <div className="case-card__item">
          <div className="case-card__label">Recibido</div>
          <div className="case-card__value">{formatDate(receivedAt)}</div>
        </div>
        <div className="case-card__item">
          <div className="case-card__label">Canal</div>
          <div className="case-card__value">{channel}</div>
        </div>
        <div className="case-card__item">
          <div className="case-card__label">Estado CRM</div>
          <div className="case-card__value">{crm.status}</div>
        </div>
        <div className="case-card__item">
          <div className="case-card__label">Cliente válido</div>
          <div className="case-card__value">{crm.isCustomer ? 'Sí' : 'No'}</div>
        </div>
        <div className="case-card__item">
          <div className="case-card__label">Caso existente</div>
          <div className="case-card__value">{crm.existingOpenCaseId ?? 'N/A'}</div>
        </div>
      </div>
    </div>
  );
}
