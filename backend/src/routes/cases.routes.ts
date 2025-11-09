import { Router } from 'express';

import { listCases } from '../services/caseStore.js';

const router = Router();

router.get('/cases', (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);

  const pageSafe = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const pageSizeSafe = Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 100 ? Math.floor(pageSize) : 20;

  const result = listCases(pageSafe, pageSizeSafe);
  res.json(result);
});

export default router;
