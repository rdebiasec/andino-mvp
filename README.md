# Andino Postventa

Andino Postventa es una prueba de concepto de clasificación de reclamos que combina un backend Node.js/Express con integración a OpenAI y un frontend React. El flujo completo permite capturar mensajes de clientes, clasificarlos automáticamente, simular su registro en un CRM ficticio y mostrar los resultados en una interfaz estilo chat.

## Requisitos previos
- Node.js 20 LTS o superior
- npm 9+
- Cuenta de OpenAI con acceso a un modelo compatible (por ejemplo, `gpt-4o-mini`)

## Estructura del repositorio
```
andino-postventa/
  backend/
  frontend/
  README.md
  .gitignore
```

## Configuración del backend
1. Copiar el ejemplo de variables de entorno y completarlo con tus credenciales de OpenAI:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Edita `.env` y reemplaza `OPENAI_API_KEY` con tu clave real y, opcionalmente, ajusta `OPENAI_MODEL`.
3. Instala dependencias y levanta el servidor en modo desarrollo:
   ```bash
   npm install
   npm run dev
   ```

El backend expone los siguientes scripts adicionales:
- `npm run build`: compila TypeScript a `dist/`
- `npm run start`: ejecuta la versión compilada
- `npm run lint`: linting con ESLint
- `npm run typecheck`: verificación de tipos sin emitir código
- `npm run test`: pruebas unitarias con Vitest + Supertest

## Configuración del frontend
1. Crear el archivo `.env` con la URL del backend:
   ```bash
   cd frontend
   echo "VITE_API_URL=http://localhost:4000" > .env
   ```
2. Instalar dependencias y ejecutar el servidor de desarrollo de Vite:
   ```bash
   npm install
   npm run dev
   ```
3. Abre `http://localhost:5173` en el navegador, escribe un reclamo y revisa la tarjeta de clasificación generada.

## Endpoints principales
- `GET /api/v1/health` → Estado del backend con versión y uptime
- `POST /api/v1/classify` → Clasifica un reclamo y registra el caso temporalmente
- `GET /api/v1/cases` → Lista paginada de casos en memoria (`?page` y `?pageSize`)
- `GET /api/v1/docs` → Swagger UI con la especificación OpenAPI

### Ejemplos `curl`
```bash
curl -X GET http://localhost:4000/api/v1/health

curl -X POST http://localhost:4000/api/v1/classify \
  -H "Content-Type: application/json" \
  -d '{"text":"Tengo problemas con mi pedido", "channel":"web"}'
```

## Registro temporal y CRM simulado
Cada caso clasificado se almacena en memoria y se añade al archivo `backend/storage/cases.log` como JSONL (solo datos esenciales, sin credenciales). El servicio `crmService` simula la verificación del cliente, detecta duplicados potenciales y devuelve un estado (`REGISTERED` o `DUPLICATE_FOUND`).

## Pruebas
Desde la carpeta `backend` ejecuta:
```bash
npm run test
```
Las pruebas cubren:
- Validaciones Zod de entrada
- Integración con el servicio de IA (usa mocks del SDK oficial de OpenAI)
- Flujo completo del controlador `/classify`

## Capturas de pantalla
_Placeholder: agrega capturas aquí cuando la interfaz esté en ejecución._

## Prompt usado
> Nota: El prompt original hacía referencia a Azure OpenAI; la implementación actual utiliza OpenAI estándar según el ajuste solicitado.
```
---



# MEGA PROMPT PARA CURSOR (copiar/pegar tal cual)



Quiero que actúes como arquitecto de software y coder experto. Genera un repo JavaScript/TypeScript listo para ejecutar que cumpla exactamente con lo siguiente. Crea archivos y carpetas, escribe código completo, configura scripts y deja todo ejecutable. No dejes TODOs abiertos: entrega implementación funcional.



## 1) Contexto del producto



Vamos a construir **Andino Postventa**, una PoC con backend en Node.js/Express y frontend en React que clasifica reclamos de clientes usando **Azure OpenAI** y simula registro/validación en un CRM ficticio.



## 2) Nombre del repo y estructura



Repo público con dos carpetas raíz:



```

andino-postventa/

  backend/

  frontend/

  README.md

  .gitignore   <-- incluir reglas indicadas abajo

```



### .gitignore (en la raíz y repetir en backend/frontend si aplica)



Debe incluir exactamente:



```

node_modules/

.env

dist/

coverage/

.DS_Store

npm-debug.log*

yarn-error.log*

```



## 3) Backend (carpeta `backend/`)



* **Nombre**: `andino-postventa-backend`



* **Stack**: Node.js LTS, Express, TypeScript (ts-node + tsconfig), Zod para validación, dotenv, CORS, morgan para logs HTTP.



* **AI**: Integración con **Azure OpenAI** (no OpenAI “puro”). Usa cliente oficial `@azure/openai` o `@azure/ai-openai` (elige el vigente) con `apiVersion` configurable.



* **Endpoint principal**: `POST /api/v1/classify`



  * **Entrada (JSON)**:



    ```json

    { "text": "string (requerido, 1..2000 chars)", "channel": "web|whatsapp|email (opcional)" }

    ```

  * **Salida (JSON)**:



    ```json

    {

      "intent": "cancelacion|devolucion|soporte_tecnico|facturacion|otro",

      "category": "producto|servicio|logistica|pago|otro",

      "tone": "enojado|neutral|frustrado|positivo|urgente",

      "confidence": 0.0,

      "caseId": "AND-YYYYMMDD-xxxxx",

      "receivedAt": "ISO-8601",

      "channel": "string",

      "rawModelOutput": { "...": "opcional para depuración" }

    }

    ```

  * **Reglas**:



    * Validar `text` (no vacío, trim, longitud ≤ 2000).

    * Si `text` falta o inválido ⇒ `400` con detalle de validación (Zod).

    * Manejo de errores robusto y respuesta `5xx` con `traceId`.

    * **Logging temporal**: registrar cada caso en memoria (un array) y también en un archivo `./storage/cases.log` (append JSONL).

    * **CRM mock**: servicio `crmService` que “valida y registra” de forma simulada (retorna `isCustomer=true|false`, `existingOpenCaseId` quizá `null`, y un `status`).

    * Sanitizar PII mínima (trim, remover saltos múltiples). No persistir `rawModelOutput` en archivo, sólo en memoria si `NODE_ENV !== 'production'`.



* **Modelado de IA**:



  * Azure OpenAI: usar `chat.completions` o `responses` con un **prompt de sistema** que fuerce un JSON estricto.

  * `response_format` JSON si está disponible en la versión usada; si no, usa “JSON schema in-prompt” y parseo seguro.

  * Clasificar con taxonomía fija (arriba) y devolver **confidence** ∈ [0,1]. Si el modelo no puede determinar, usar `otro` y `confidence` ≤ 0.4.



* **Rutas adicionales**:



  * `GET /api/v1/health` → `{ status: "ok", uptime, version }`

  * `GET /api/v1/cases` → lista en memoria (paginada ?page & ?pageSize)

  * `GET /api/v1/docs` → Swagger UI de la API



* **Swagger/OpenAPI**:



  * Generar un `openapi.yaml` o `swagger.json` y montar Swagger UI en `/api/v1/docs`.



* **Config**:



  * Variables de entorno (en `backend/.env.example`, no subir `.env`):



    ```

    PORT=4000

    AZURE_OPENAI_ENDPOINT=https://<tu-endpoint>.openai.azure.com/

    AZURE_OPENAI_API_KEY=***

    AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini

    AZURE_OPENAI_API_VERSION=2024-08-01-preview

    LOG_LEVEL=info

    ```

  * CORS permitir `http://localhost:5173` y `http://localhost:3000`.



* **Scripts npm** (en `backend/package.json`):



  * `"dev"`: nodemon + ts-node

  * `"build"`: tsc

  * `"start"`: node `dist/index.js`

  * `"lint"`: eslint

  * `"test"`: vitest (o jest) con pruebas unitarias del validador y del controlador

  * `"typecheck"`: tsc —noEmit



* **Estructura de archivos en backend**:



  ```

  backend/

    src/

      index.ts

      app.ts

      routes/

        classify.routes.ts

        health.routes.ts

        cases.routes.ts

      controllers/

        classify.controller.ts

      services/

        aiService.ts

        crmService.ts

        caseStore.ts

      middlewares/

        errorHandler.ts

      schemas/

        classify.schema.ts

      utils/

        logger.ts

        id.ts

      config/

        env.ts

      docs/

        openapi.ts

    storage/           <-- crear si no existe, para cases.log

    tests/

      classify.spec.ts

    package.json

    tsconfig.json

    .eslintrc.cjs

    .env.example

  ```



* **Contenido esencial (resúmenes, Cursor debe generar código completo):**



  * `schemas/classify.schema.ts`: Zod con shape `{ text: string.min(1).max(2000), channel?: enum }`.

  * `services/aiService.ts`: función `classifyText(text: string, channel?: string)` que llama Azure OpenAI con prompt de sistema pidiendo JSON estrictamente:



    ```text

    Eres un clasificador de reclamos. Devuelve ÚNICAMENTE un JSON con:

    intent, category, tone, confidence (0..1).

    Intents válidas: cancelacion, devolucion, soporte_tecnico, facturacion, otro.

    Categorías válidas: producto, servicio, logistica, pago, otro.

    Tono válido: enojado, neutral, frustrado, positivo, urgente.

    Si dudas, usa 'otro' y confidence <= 0.4.

    ```



    Parsear a objeto seguro; si el modelo devuelve texto no-JSON, intentar sanitizar y reintentar 1 vez.

  * `services/crmService.ts`: mock con:



    ```ts

    export async function validateAndRegisterCase(input) {

      // valida cliente simulado:

      const isCustomer = input.text.toLowerCase().includes("pedido") || Math.random() > 0.2;

      const existingOpenCaseId = Math.random() > 0.85 ? "AND-20250101-12345" : null;

      const status = existingOpenCaseId ? "DUPLICATE_FOUND" : "REGISTERED";

      return { isCustomer, existingOpenCaseId, status };

    }

    ```

  * `services/caseStore.ts`: memoria + append a `storage/cases.log` en formato JSONL con campos: `caseId, text, channel, intent, category, tone, confidence, receivedAt`.

  * `controllers/classify.controller.ts`: orquestar validación → AI → CRM mock → store → respuesta.

  * `middlewares/errorHandler.ts`: manejar errores con `traceId` y `problem+json`.

  * `docs/openapi.ts`: construir spec (usando `swagger-jsdoc`) y montar en `/api/v1/docs`.



* **Respuestas de ejemplo** (usar en Swagger):



  ```json

  {

    "intent": "soporte_tecnico",

    "category": "servicio",

    "tone": "frustrado",

    "confidence": 0.83,

    "caseId": "AND-20251108-04217",

    "receivedAt": "2025-11-08T15:04:05.000Z",

    "channel": "web"

  }

  ```



## 4) Frontend (carpeta `frontend/`)



* **Nombre**: `andino-postventa-frontend`



* **Stack**: React + Vite + TypeScript. UI minimalista (CSS Modules o Tailwind, el que prefieras pero sin dependencias excesivas).



* **Funcionalidad**: “chat” simple entre cliente y asistente cognitivo.



  * TextArea + botón “Enviar”.

  * Al enviar, llamar `POST http://localhost:4000/api/v1/classify` con `{ text, channel: "web" }`.

  * Mostrar en el hilo: mensaje del cliente y “tarjeta de clasificación” con `intent, category, tone, confidence` y estado del caso (proveniente del CRM mock: `REGISTERED`/`DUPLICATE_FOUND`) y el `caseId`.

  * Manejo de loading/spinner y errores legibles (si 400 mostrar validación; si 5xx mostrar `traceId`).

  * Guardar el hilo en estado (no requiere backend para historial).



* **Componentes**:



  ```

  frontend/

    src/

      App.tsx

      components/

        Chat.tsx

        Message.tsx

        CaseCard.tsx

      lib/api.ts

      styles/

        globals.css

    index.html

    vite.config.ts

    tsconfig.json

    package.json

  ```



* **Configuración**:



  * `.env` en frontend con `VITE_API_URL=http://localhost:4000`

  * CORS habilitado en backend para el puerto del Vite dev server.



* **Scripts**:



  * `"dev"`, `"build"`, `"preview"`



* **UX**:



  * Mostrar barra de estado “Conectado al backend: OK/ERROR” (ping a `/api/v1/health`).

  * Redondear `confidence` a 2 decimales.

  * Accesibilidad básica (labels, aria-busy).



## 5) Seguridad y buenas prácticas



* No enviar keys al frontend. Usar `.env` sólo en backend para secretos.

* Sanitizar entrada (trim) y limitar tamaño.

* Timeouts de request al modelo (por ej. 12s) y reintento 1 vez si 5xx del proveedor.

* Logs en consola con `morgan` y en archivo JSONL para casos.



## 6) Pruebas



* Unit tests de:



  * validador Zod (casos válidos/invalidos),

  * `classifyText` con mock del cliente de Azure OpenAI,

  * controlador `/classify` (supertest).

* Script `npm run test` debe pasar.



## 7) Documentación



* `README.md` en la raíz con:



  * Requisitos previos.

  * Cómo configurar `.env` del backend (usar `.env.example`).

  * Comandos para levantar backend y frontend en 2 terminales.

  * Endpoints y ejemplos curl.

  * Capturas de pantalla (placeholder).

* Incluir sección “Prompt usado” pegando este prompt.



## 8) Comandos de ejecución esperados



* Backend:



  ```

  cd backend

  npm i

  cp .env.example .env   # editar con tu endpoint y key de Azure

  npm run dev

  ```

* Frontend:



  ```

  cd frontend

  npm i

  npm run dev

  ```

* Abrir `http://localhost:5173`, enviar un mensaje de prueba y ver la tarjeta de clasificación.



## 9) Checklist de aceptación



* [ ] `GET /api/v1/health` devuelve `{status:"ok"}` con versión y uptime.

* [ ] `POST /api/v1/classify` valida y responde JSON con campos requeridos.

* [ ] Registro temporal en `backend/storage/cases.log` (JSONL).

* [ ] CRM mock determina `status` y posible `existingOpenCaseId`.

* [ ] Swagger disponible en `/api/v1/docs` y refleja los esquemas reales.

* [ ] Frontend envía mensaje, muestra clasificación, estado del caso y `caseId`.

* [ ] Tests unitarios pasan con `npm run test`.

* [ ] `.gitignore` incluye `node_modules/`, `.env`, `dist/`, `coverage/`.



## 10) Snippets imprescindibles (Cursor debe crear archivos completos con esto como base)



**backend/src/config/env.ts**



```ts

import 'dotenv/config';



export const env = {

  port: parseInt(process.env.PORT || '4000', 10),

  azure: {

    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',

    apiKey: process.env.AZURE_OPENAI_API_KEY || '',

    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',

    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview'

  },

  nodeEnv: process.env.NODE_ENV || 'development',

  logLevel: process.env.LOG_LEVEL || 'info',

};

```



**backend/src/services/aiService.ts** (usar cliente oficial de Azure)



```ts

import { env } from '../config/env';

import { randomUUID } from 'crypto';

// Importa el cliente correcto según SDK actual:

import OpenAI from '@azure/openai'; // o '@azure/ai-openai' si corresponde



const client = new OpenAI({

  endpoint: env.azure.endpoint,

  apiKey: env.azure.apiKey

});



const SYSTEM_PROMPT = `

Eres un clasificador de reclamos de postventa. Devuelve ÚNICAMENTE un JSON con:

{ "intent": "...", "category": "...", "tone": "...", "confidence": 0.0 }

Intents: cancelacion, devolucion, soporte_tecnico, facturacion, otro.

Categorías: producto, servicio, logistica, pago, otro.

Tono: enojado, neutral, frustrado, positivo, urgente.

Si dudas, usa "otro" y confidence <= 0.4.

`;



export async function classifyText(text: string, channel?: string) {

  const messages = [

    { role: 'system', content: SYSTEM_PROMPT },

    { role: 'user', content: `Texto del reclamo:\n${text}\nCanal: ${channel ?? 'web'}\n` }

  ];



  // Preferir JSON mode si la versión lo soporta

  const resp = await client.chat.completions.create({

    model: env.azure.deployment,

    messages,

    temperature: 0.2,

    response_format: { type: 'json_object' },

  });



  const raw = resp.choices?.[0]?.message?.content ?? '{}';

  let parsed: any;

  try {

    parsed = JSON.parse(raw);

  } catch {

    // Fallback naive: extraer bloque JSON

    const m = raw.match(/\{[\s\S]*\}/);

    parsed = m ? JSON.parse(m[0]) : { intent: 'otro', category: 'otro', tone: 'neutral', confidence: 0.2 };

  }



  // Normalización

  const mapEnum = (v: string, allowed: string[], def: string) =>

    allowed.includes((v||'').toLowerCase()) ? (v||'').toLowerCase() : def;



  const intent = mapEnum(parsed.intent, ['cancelacion','devolucion','soporte_tecnico','facturacion','otro'], 'otro');

  const category = mapEnum(parsed.category, ['producto','servicio','logistica','pago','otro'], 'otro');

  const tone = mapEnum(parsed.tone, ['enojado','neutral','frustrado','positivo','urgente'], 'neutral');

  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.4)));



  return { intent, category, tone, confidence, rawModelOutput: env.nodeEnv !== 'production' ? parsed : undefined };

}

```



**backend/src/schemas/classify.schema.ts**



```ts

import { z } from 'zod';

export const ClassifyInput = z.object({

  text: z.string().trim().min(1, 'text requerido').max(2000, 'máximo 2000 caracteres'),

  channel: z.enum(['web','whatsapp','email']).optional()

});

export type ClassifyInput = z.infer<typeof ClassifyInput>;

```



**backend/src/services/caseStore.ts**



```ts

import { createWriteStream, existsSync, mkdirSync } from 'fs';

import { join } from 'path';



const storageDir = join(process.cwd(), 'storage');

if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true });

const ws = createWriteStream(join(storageDir, 'cases.log'), { flags: 'a' });



const mem: any[] = [];

export function addCase(entry: any) {

  mem.push(entry);

  ws.write(JSON.stringify(entry) + '\n');

}

export function listCases(page=1, pageSize=20) {

  const start = (page-1)*pageSize;

  return { items: mem.slice(start, start+pageSize), total: mem.length, page, pageSize };

}

```



**backend/src/services/crmService.ts**



```ts

export async function validateAndRegisterCase(input: {

  text: string, intent: string, category: string, tone: string, confidence: number, channel?: string

}) {

  const isCustomer = input.text.toLowerCase().includes('pedido') || Math.random() > 0.2;

  const existingOpenCaseId = Math.random() > 0.85 ? 'AND-20250101-12345' : null;

  const status = existingOpenCaseId ? 'DUPLICATE_FOUND' : 'REGISTERED';

  return { isCustomer, existingOpenCaseId, status };

}

```



**backend/src/controllers/classify.controller.ts**



```ts

import { ClassifyInput } from '../schemas/classify.schema';

import { classifyText } from '../services/aiService';

import { addCase } from '../services/caseStore';



const newId = () => {

  const now = new Date();

  const ymd = now.toISOString().slice(0,10).replace(/-/g,'');

  const r = Math.floor(Math.random()*90000 + 10000);

  return `AND-${ymd}-${r}`;

};



export async function classifyHandler(req, res, next) {

  try {

    const parsed = ClassifyInput.parse(req.body);

    const ai = await classifyText(parsed.text, parsed.channel);

    const caseId = newId();

    const receivedAt = new Date().toISOString();



    const crm = await (await import('../services/crmService')).validateAndRegisterCase({

      text: parsed.text, ...ai, channel: parsed.channel

    });



    const payload = {

      intent: ai.intent, category: ai.category, tone: ai.tone, confidence: ai.confidence,

      caseId, receivedAt, channel: parsed.channel ?? 'web',

      rawModelOutput: ai.rawModelOutput, crm

    };



    addCase({ ...payload, text: parsed.text }); // guardar texto sólo en log temporal



    // no exponer rawModelOutput si NODE_ENV=production

    if (process.env.NODE_ENV === 'production') delete payload.rawModelOutput;



    res.status(200).json(payload);

  } catch (err) {

    next(err);

  }

}

```



**backend/src/app.ts** (registrar rutas, CORS, morgan, swagger y error handler)



> Cursor debe generar el resto: `routes`, `errorHandler`, `openapi`, `index.ts` y tests.



**frontend/src/lib/api.ts**



```ts

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function classify(text: string, channel='web') {

  const res = await fetch(`${API}/api/v1/classify`, {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify({ text, channel })

  });

  const data = await res.json();

  if (!res.ok) throw Object.assign(new Error(data.message || 'Error'), { data });

  return data;

}

export async function health() {

  try {

    const res = await fetch(`${API}/api/v1/health`);

    return res.ok;

  } catch { return false; }

}

```



**frontend/components / comportamiento**



* `Chat.tsx`: input + lista de mensajes; al enviar, push del mensaje del usuario y luego `CaseCard` con la clasificación.

* `CaseCard.tsx`: muestra intent/category/tone/confidence y `crm.status` + `caseId`.



## 11) Commits sugeridos



* `chore: scaffold backend with express+ts and swagger`

* `feat(api): /classify endpoint with Azure OpenAI, zod validation, temp case logging`

* `feat(frontend): chat UI consuming backend`

* `test: unit tests for validators and controller`

* `docs: add README and OpenAPI spec`



**Entrega ahora** todo el código con esta estructura, asegurando que `npm run dev` funciona en backend y frontend y que los tests se ejecutan con éxito.





