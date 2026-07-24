import express from 'express';
import { 
  githubAuthRedirect, 
  githubAuthCallback, 
  getGithubStatus, 
  disconnectGithub 
} from '../controllers/githubAuthController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/auth', protect, githubAuthRedirect);
router.post('/callback', protect, githubAuthCallback);
router.get('/status', protect, getGithubStatus);
router.delete('/disconnect', protect, disconnectGithub);

export default router;
