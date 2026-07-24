import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getHistory,
  getReviewById,
  updateReview,
  deleteReview,
  getDashboardStats
} from '../controllers/historyController.js';

const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.route('/')
  .get(protect, getHistory);

router.route('/:id')
  .get(protect, getReviewById)
  .patch(protect, updateReview)
  .delete(protect, deleteReview);

export default router;
