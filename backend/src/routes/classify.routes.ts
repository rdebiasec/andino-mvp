import { Router } from 'express';

import { classifyHandler } from '../controllers/classify.controller.js';

const router = Router();

router.post('/classify', classifyHandler);

export default router;
