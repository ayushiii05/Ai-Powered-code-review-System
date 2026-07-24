import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { 
  uploadProjectZip, 
  uploadSingleFile, 
  getProject, 
  generateProjectReview, 
  generateProjectDocumentation,
  sendProjectChat,
  getProjectChatHistory,
  clearProjectChat
} from '../controllers/projectController.js';

const router = express.Router();

// Configure multer for memory storage (files up to 100MB)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } 
});

router.use(protect);

router.post('/upload/zip', upload.single('file'), uploadProjectZip);
router.post('/upload/file', upload.single('file'), uploadSingleFile);

router.get('/:id', getProject);
router.post('/:id/review', generateProjectReview);
router.post('/:id/documentation', generateProjectDocumentation);

router.post('/:id/chat', sendProjectChat);
router.get('/:id/chat', getProjectChatHistory);
router.delete('/:id/chat', clearProjectChat);

export default router;
