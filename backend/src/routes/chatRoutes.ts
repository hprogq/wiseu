import { Router } from 'express';
import { messageController, conversationsController, conversationInstanceController } from '../controllers/chatController';

const router = Router();

router.all('/messages', messageController);
router.all('/conversations', conversationsController);
router.all('/conversations/:conversation_id', conversationInstanceController);

export default router;
