import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  importGithubRepo, 
  getGithubRepo, 
  reviewGithubRepo, 
  generateGithubDocs,
  sendGithubChat,
  getGithubChatHistory,
  clearGithubChat,
  getUserGithubRepos
} from '../controllers/repositoryController.js';

const router = express.Router();

router.use(protect);

router.get('/user-repos', getUserGithubRepos);
router.post('/repository', importGithubRepo);
router.get('/repository/:id', getGithubRepo);
router.post('/review/:id', reviewGithubRepo);
router.post('/documentation/:id', generateGithubDocs);

router.post('/chat/:id', sendGithubChat);
router.get('/chat/:id', getGithubChatHistory);
router.delete('/chat/:id', clearGithubChat);

export default router;
