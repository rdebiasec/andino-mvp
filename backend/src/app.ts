import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import casesRoutes from './routes/cases.routes.js';
import classifyRoutes from './routes/classify.routes.js';
import healthRoutes from './routes/health.routes.js';
import { docsConfig } from './docs/openapi.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: false
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api/v1', healthRoutes);
app.use('/api/v1', classifyRoutes);
app.use('/api/v1', casesRoutes);

if (docsConfig.serveDocs) {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(docsConfig.swaggerSpec, docsConfig.swaggerUiOptions));
}

app.use((_req, res) => {
  return res.status(404).json({
    status: 404,
    message: 'Not Found'
  });
});

app.use(errorHandler);

export { app };
