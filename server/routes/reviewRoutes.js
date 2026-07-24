import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { generateReview } from '../controllers/reviewController.js';
import { sendChatMessage, getChatHistory, clearChatHistory } from '../controllers/chatController.js';

const router = express.Router();

router.post('/', protect, generateReview);

router.post('/chat', protect, sendChatMessage);
router.route('/chat/:reviewId')
  .get(protect, getChatHistory)
  .delete(protect, clearChatHistory);

export default router;
