import { Router } from 'express';
import multer from 'multer';
import { uploadDesign } from '../controllers/customization.controller';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@coremen/types';

const router = Router();

// Configure multer for memory storage, enforcing max file size (RNF-1)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});

router.post('/upload', requireRole(Role.CLIENT), upload.single('designImage'), uploadDesign);

export default router;
