import { Router } from 'express';
import { register, session } from '../controllers/authController';

const router = Router();

router.all('/users', register);
router.all('/sessions', session);

export default router;
