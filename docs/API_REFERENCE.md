# Andino Postventa – Comprehensive API, Function, and Component Reference

This document consolidates every public contract exposed by the Andino Postventa project across the backend (HTTP APIs, services, utilities) and the frontend (fetch helpers, React components). Use it as the single source of truth for integrations, extensions, and onboarding.

---

## 1. Runtime Overview

- **Backend base URL:** `http://localhost:4000/api/v1`
- **Frontend dev URL:** `http://localhost:5173`
- **Primary data flow:** client text → `POST /classify` → Azure/OpenAI classification → CRM mock validation → transient persistence (`caseStore`) → response to frontend → UI renders `CaseCard`.
- **Storage side effect:** every classified case is appended to `backend/storage/cases.log` (JSONL) and kept in-memory for `GET /cases`.

Environment variables (`backend/.env`) drive ports, logging, and OpenAI credentials. See `backend/.env.example` for the canonical list.

---

## 2. Backend HTTP API Reference

### 2.1 `GET /api/v1/health`

| Property | Value |
| --- | --- |
| Description | Liveness endpoint; also returns uptime (seconds) and the package version. |
| Auth | None |
| Response | `200 OK` JSON `{ status: "ok", uptime: number, version: string }` |

```bash
curl -s http://localhost:4000/api/v1/health | jq
```

### 2.2 `POST /api/v1/classify`

| Property | Value |
| --- | --- |
| Description | Validates a client complaint, calls `classifyText`, enriches via CRM, persists snapshot, and responds with the classification payload. |
| Auth | None |
| Request body | `{ "text": "string (1..2000 chars)", "channel": "web"|"whatsapp"|"email" (optional) }` |
| Success | `200 OK` JSON (see below) |
| Validation error | `400 Bad Request` with RFC 7807 payload + `traceId` |
| Server error | `5xx` with RFC 7807 payload + `traceId` |

#### Success response

```jsonc
{
  "intent": "facturacion",
  "category": "pago",
  "tone": "neutral",
  "confidence": 0.72,
  "caseId": "AND-20251124-48291",
  "receivedAt": "2025-11-24T12:34:56.000Z",
  "channel": "web",
  "crm": {
    "status": "REGISTERED",
    "existingOpenCaseId": null,
    "isCustomer": true
  },
  "rawModelOutput": { "...": "only when NODE_ENV !== 'production'" }
}
```

#### Validation failure response

```jsonc
{
  "type": "https://andino-postventa/errors/validation-error",
  "title": "Invalid request payload",
  "status": 400,
  "detail": "One or more fields failed validation",
  "traceId": "e7aa7f02-4a2d-4c32-8d91-6d9e4a07e0c6",
  "errors": [
    { "path": "text", "message": "text requerido", "code": "too_small" }
  ]
}
```

#### Example `curl`

```bash
curl -X POST http://localhost:4000/api/v1/classify \
  -H "Content-Type: application/json" \
  -d '{ "text": "Necesito facturar nuevamente mi pedido", "channel": "email" }'
```

### 2.3 `GET /api/v1/cases`

| Property | Value |
| --- | --- |
| Description | Returns a paginated slice of the in-memory case store. |
| Query params | `page` (default `1`, min `1`), `pageSize` (default `20`, max `100`). |
| Response | `200 OK` JSON `{ items: StoredCase[], total, page, pageSize }`. |

Example:

```bash
curl "http://localhost:4000/api/v1/cases?page=1&pageSize=5"
```

Each `StoredCase` mirrors the classification payload plus `text`, `crmStatus`, `crmExistingOpenCaseId`, `isCustomer`, and optional `rawModelOutput` (non-production only).

### 2.4 `GET /api/v1/docs`

| Property | Value |
| --- | --- |
| Description | Serves Swagger UI generated from `src/docs/openapi.ts`. Enabled unless `NODE_ENV === 'test'`. |
| Usage | Open in a browser for interactive documentation or export the schema from the network tab. |

---

## 3. Backend Modules & Functions

### 3.1 `config/env.ts`

Exports `env`, a plain object with:

- `port`: number (defaults to `4000`).
- `openai`: `{ apiKey, model }`.
- `nodeEnv`: `'development' | 'production' | 'test'`.
- `logLevel`: `'error' | 'warn' | 'info' | 'debug'`.

**Usage**

```ts
import { env } from './config/env.js';
app.listen(env.port);
```

### 3.2 `schemas/classify.schema.ts`

- `ClassifyInput`: Zod object enforcing trimmed `text` (1–2000 chars) and optional `channel` enum.
- `ClassifyInput` (type): `z.infer` helper for strong typing.

**Usage**

```ts
const parsed = ClassifyInput.parse(req.body);
```

### 3.3 `controllers/classify.controller.ts`

#### `classifyHandler(req, res, next)`

Pipeline:

1. Validate request body via `ClassifyInput`.
2. Invoke `classifyText(text, channel)` to obtain AI analysis.
3. Generate `caseId` via `generateCaseId()` and timestamp.
4. Call `validateAndRegisterCase` to simulate CRM enrichment.
5. Persist sanitized text via `addCase`.
6. Strip `rawModelOutput` in production.
7. Log success and respond; delegate errors to `next`.

Add the handler to any Express router:

```ts
import { classifyHandler } from '../controllers/classify.controller.js';
router.post('/classify', classifyHandler);
```

### 3.4 `services/aiService.ts`

#### Constants
- `ALLOWED_INTENTS`, `ALLOWED_CATEGORIES`, `ALLOWED_TONES`: arrays used by normalizers.

#### Functions

| Function | Description |
| --- | --- |
| `classifyText(text: string, channel?: string)` | Cleans the text, builds chat messages, calls OpenAI Chat Completions with enforced JSON output, retries parsing once, and returns `{ intent, category, tone, confidence, rawModelOutput? }`. |
| `setOpenAIClient(mock: OpenAI | null)` | Allows tests to inject or reset the client singleton. |

**Usage**

```ts
const result = await classifyText('Necesito cancelar mi pedido', 'whatsapp');
// result.intent === 'cancelacion'
```

**Error handling**: throws when API key missing, OpenAI returns >=500 twice, or JSON parsing fails after retries. Callers should `try/catch` and delegate to the error handler.

### 3.5 `services/crmService.ts`

#### `validateAndRegisterCase(input: CRMInput): Promise<CRMResult>`

- Flags a message as belonging to a known customer if it mentions “pedido” or by 80% chance.
- Randomly simulates duplicate cases.
- Returns `{ isCustomer, existingOpenCaseId, status }`.

Example:

```ts
const crm = await validateAndRegisterCase({
  text,
  intent,
  category,
  tone,
  confidence,
  channel
});
```

### 3.6 `services/caseStore.ts`

| Function | Behavior |
| --- | --- |
| `addCase(entry: StoredCase)` | Pushes case into in-memory array and appends JSONL line (without `rawModelOutput`) to `storage/cases.log`. |
| `listCases(page = 1, pageSize = 20)` | Returns `{ items, total, page, pageSize }`. |
| `clearCases()` | Empties the in-memory array (useful for tests). |
| `getCases()` | Returns a shallow copy of the in-memory array. |

`StoredCase` contains all response fields plus the sanitized `text` and CRM metadata.

### 3.7 `middlewares/errorHandler.ts`

Express error middleware signature. Behavior:

- Generates a `traceId` for every error via `generateTraceId`.
- Detects `ZodError` to emit structured validation errors (`400`).
- For other errors, logs details and emits RFC 7807 payload with appropriate `status` (default `500`).

Register it last:

```ts
app.use(errorHandler);
```

### 3.8 `utils/id.ts`

| Function | Description |
| --- | --- |
| `generateTraceId()` | Returns a UUID v4 string (via `crypto.randomUUID`). |
| `generateCaseId(date = new Date())` | Returns `AND-YYYYMMDD-#####` (random 5-digit suffix). Accepts optional `Date` for deterministic tests. |

### 3.9 `utils/logger.ts`

Exports `logger` with methods `error`, `warn`, `info`, `debug`. Each:

- Checks `LOG_LEVEL` thresholds.
- Formats timestamped messages.
- Writes to console (`console.error` etc.).

Use for contextual logging:

```ts
logger.info('Case classified', { caseId, intent });
```

### 3.10 `docs/openapi.ts`

- `swaggerSpec`: `swagger-jsdoc` output based on in-memory definition.
- `swaggerUiOptions`: hides the top bar and sets a custom title.
- `docsConfig`: `{ swaggerSpec, swaggerUiOptions, serveDocs }`.

Mounting (already in `app.ts`):

```ts
if (docsConfig.serveDocs) {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(docsConfig.swaggerSpec, docsConfig.swaggerUiOptions));
}
```

---

## 4. Frontend Fetch Helpers (`frontend/src/lib/api.ts`)

### 4.1 `classify(text: string, channel = 'web')`

- Sends `POST /api/v1/classify`.
- Returns typed `ClassifyResponse`.
- Throws `Error` with attached `data` when the response is not OK.

**Usage**

```ts
import { classify } from '../lib/api';

const result = await classify('Mi pedido llegó incompleto', 'email');
console.log(result.intent, result.crm.status);
```

### 4.2 `health(): Promise<boolean>`

- Performs `GET /api/v1/health`.
- Resolves to `true` when the request succeeds (`res.ok`), otherwise `false`.

**Usage**

```ts
const backendUp = await health();
setStatus(backendUp ? 'ok' : 'error');
```

---

## 5. React Components

### 5.1 `<App />`

- Responsible for pinging the backend every 15s via `health()`.
- Shows status banner (`checking|ok|error`) and renders `<Chat backendHealthy={status === 'ok'} />`.
- No props; mounted at `src/main.tsx`.

### 5.2 `<Chat backendHealthy={boolean} />`

Props:

| Name | Type | Description |
| --- | --- | --- |
| `backendHealthy` | `boolean` | Disables the send button when `false`. |

Behavior:

1. Tracks `messages`, `input`, `loading`, and error banners.
2. On submit, stores the client message locally, calls `classify(text, 'web')`, and appends an assistant message containing `<CaseCard />`.
3. Surfaces validation errors with field details (when provided) and `traceId`.

Usage example:

```tsx
<Chat backendHealthy={true} />
```

### 5.3 `<Message role content timestamp>{children}</Message>`

Props:

| Name | Type | Description |
| --- | --- | --- |
| `role` | `'client' | 'assistant'` | Controls styling and label (`Cliente` vs `Andino Assistant`). |
| `content` | `string` | Message text. |
| `timestamp` | `string` (ISO) | Rendered via `toLocaleTimeString`. |
| `children` | `ReactNode` | Optional extra content (e.g., `CaseCard`). |

Usage:

```tsx
<Message role="client" content="..." timestamp={new Date().toISOString()}>
  <CaseCard {...classification} />
</Message>
```

### 5.4 `<CaseCard {...props} />`

Props mirror the backend classification payload:

- `intent`, `category`, `tone`, `confidence`, `caseId`, `receivedAt`, `channel`.
- `crm`: `{ status: 'REGISTERED' | 'DUPLICATE_FOUND', existingOpenCaseId: string | null, isCustomer: boolean }`.

Behavior:

- Formats confidence to 2 decimals.
- Formats timestamps via `toLocaleString`.
- Presents data in an accessible grid (`role="group"`).

Usage:

```tsx
<CaseCard
  intent="cancelacion"
  category="servicio"
  tone="enojado"
  confidence={0.91}
  caseId="AND-20251124-12345"
  receivedAt={new Date().toISOString()}
  channel="web"
  crm={{ status: 'REGISTERED', existingOpenCaseId: null, isCustomer: true }}
/>;
```

---

## 6. Testing Hooks

- `setOpenAIClient(mock)` enables deterministic tests without real API calls.
- `clearCases()` (from `caseStore`) can reset state between tests if needed (already used implicitly in vitest setups).
- `ClassifyInput.parse` is exercised in `backend/tests/classify.spec.ts`; reuse that pattern for new validations.

---

## 7. Implementation Notes & Best Practices

1. **Error propagation:** Always `throw` or `next(error)` so `errorHandler` can attach a `traceId`.
2. **PII hygiene:** `classifyHandler` sanitizes text before persistence; replicate that behavior for any new storage sink.
3. **Production toggles:** `env.nodeEnv === 'production'` removes `rawModelOutput` from responses to avoid leaking vendor details.
4. **Rate limits & retries:** `classifyText` retries both HTTP failures (once) and JSON parsing (once). Adjust `MAX_API_RETRIES` / `MAX_PARSE_RETRIES` cautiously.
5. **Frontend resilience:** The chat disables submission when `backendHealthy` is `false` or while awaiting a response, preventing duplicate submissions.

---

## 8. Quick Integration Recipes

### 8.1 Calling the API from another service

```ts
import fetch from 'node-fetch';

async function classify(text: string) {
  const res = await fetch('http://localhost:4000/api/v1/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, channel: 'web' })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`${error.title ?? 'Error'} (${error.traceId})`);
  }
  return res.json();
}
```

### 8.2 Extending the frontend with historical cases

```ts
async function loadCases(page = 1) {
  const res = await fetch(`http://localhost:4000/api/v1/cases?page=${page}`);
  if (!res.ok) throw new Error('Failed to load cases');
  const { items } = await res.json();
  // Render each item with <CaseCard {...item} />
}
```

---

## 9. Change Log Expectations

When modifying or adding APIs/components:

1. Update this document with new contracts or props.
2. If you add HTTP endpoints, extend the OpenAPI spec (`src/docs/openapi.ts`) and re-run manual tests.
3. For frontend components, document prop additions here and add Storybook notes if applicable (future improvement).

This ensures downstream consumers always have a dependable reference.
