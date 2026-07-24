import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getNotifications, markAsRead, markAllAsRead, clearNotifications } from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/', clearNotifications);

export default router;
