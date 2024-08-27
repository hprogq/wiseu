import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

router.all('/register', register);
router.all('/login', login);

export default router;
