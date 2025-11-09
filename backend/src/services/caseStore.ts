import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const storageDir = join(process.cwd(), 'storage');
if (!existsSync(storageDir)) {
  mkdirSync(storageDir, { recursive: true });
}

const logStream = createWriteStream(join(storageDir, 'cases.log'), { flags: 'a' });

export type StoredCase = {
  caseId: string;
  text: string;
  channel: string;
  intent: string;
  category: string;
  tone: string;
  confidence: number;
  receivedAt: string;
  crmStatus: string;
  crmExistingOpenCaseId: string | null;
  isCustomer: boolean;
  rawModelOutput?: unknown;
};

const cases: StoredCase[] = [];

export function addCase(entry: StoredCase) {
  cases.push(entry);

  const { rawModelOutput, ...loggable } = entry;
  const payloadForFile = {
    ...loggable,
    timestamp: new Date().toISOString()
  };

  logStream.write(`${JSON.stringify(payloadForFile)}\n`);
}

export function listCases(page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  const items = cases.slice(start, start + pageSize);
  return {
    items,
    total: cases.length,
    page,
    pageSize
  };
}

export function clearCases() {
  cases.length = 0;
}

export function getCases() {
  return [...cases];
}
