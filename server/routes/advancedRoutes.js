import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { generateDocs, convertCode, exportReport } from '../controllers/advancedController.js';

const router = express.Router();

router.post('/documentation', protect, generateDocs);
router.post('/convert', protect, convertCode);
router.post('/export', protect, exportReport);

export default router;
