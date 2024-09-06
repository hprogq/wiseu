import { Router } from 'express';
import { register, session, getCurrentUser } from '../controllers/authController';

const router = Router();

router.all('/users', register);
router.all('/sessions', session);
router.all('/users/me', getCurrentUser);

export default router;
