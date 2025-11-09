const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type ClassifyResponse = {
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
  rawModelOutput?: Record<string, unknown>;
};

export async function classify(text: string, channel = 'web'): Promise<ClassifyResponse> {
  const res = await fetch(`${API}/api/v1/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, channel })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.detail || data.message || 'Error al clasificar'), { data });
  }
  return data as ClassifyResponse;
}

export async function health(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/api/v1/health`);
    return res.ok;
  } catch {
    return false;
  }
}
