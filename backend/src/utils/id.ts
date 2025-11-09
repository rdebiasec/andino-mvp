import { randomUUID } from 'crypto';

export function generateTraceId() {
  return randomUUID();
}

export function generateCaseId(date = new Date()) {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 90000 + 10000);
  return `AND-${ymd}-${random}`;
}
