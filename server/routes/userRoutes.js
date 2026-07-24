import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { updateProfile, changePassword, deleteAccount } from '../controllers/userController.js';

const router = express.Router();

router.use(protect);

router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.delete('/', deleteAccount);

export default router;
