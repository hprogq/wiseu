import type { PageLoad } from './$types';
import { apiFetch } from '$lib/api';
import { chatStore } from '$lib/stores/chat';
import { marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';

export const load: PageLoad = async ({ params, fetch }) => {
	chatStore.setConversationId(null);
	chatStore.clearMessages();

	const defaultMessage = {
		id: uuidv4(),
		content: await marked('欢迎来到 WiseU Chat! 在这里开始你的对话。'),
		sender: 'assistant' as const
	};

	chatStore.addMessage(defaultMessage); // 添加预置消息

	return { conversationId: null };
};
