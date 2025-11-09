import { Router } from 'express';

import pkg from '../../package.json' assert { type: 'json' };

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: pkg.version
  });
});

export default router;
