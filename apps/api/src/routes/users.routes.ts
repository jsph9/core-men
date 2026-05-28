import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMyProfile, updateMyProfile } from '../controllers/users.controller';

const router = Router();

router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, updateMyProfile);

export default router;
