export type CRMInput = {
  text: string;
  intent: string;
  category: string;
  tone: string;
  confidence: number;
  channel?: string;
};

export type CRMResult = {
  isCustomer: boolean;
  existingOpenCaseId: string | null;
  status: 'REGISTERED' | 'DUPLICATE_FOUND';
};

export async function validateAndRegisterCase(input: CRMInput): Promise<CRMResult> {
  const normalized = input.text.toLowerCase();
  const isCustomer = normalized.includes('pedido') || Math.random() > 0.2;
  const existingOpenCaseId = Math.random() > 0.85 ? 'AND-20250101-12345' : null;
  const status = existingOpenCaseId ? 'DUPLICATE_FOUND' : 'REGISTERED';
  return { isCustomer, existingOpenCaseId, status };
}
