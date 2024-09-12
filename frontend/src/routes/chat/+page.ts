import type { PageLoad } from './$types';
import { apiFetch } from '$lib/api';
import { chatStore } from '$lib/stores/chat';
import { marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';
import { chatDefaultMessage } from '$lib/common';

export const load: PageLoad = async ({ params, fetch }) => {
	chatStore.setConversationId(null);
	chatStore.clearMessages();
	chatStore.addMessage(chatDefaultMessage); // 添加预置消息

	return { conversationId: null };
};
