import { Router } from 'express';
import { chatConversation, getConversations, getConversationById } from '../controllers/chatController';

const router = Router();

router.all('/conversations', getConversations);
router.all('/conversation', chatConversation);
router.all('/conversation/:conversation_id', getConversationById);

export default router;
