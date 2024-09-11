import type { PageLoad } from './$types';
import { apiFetch } from '$lib/api';
import { chatStore } from '$lib/stores/chat';
import { marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';

export const load: PageLoad = async ({ params, fetch }) => {
	const conversationId = params.conversationId;

	if (conversationId) {
		const response = await apiFetch<{
			_id: string;
			messages: Array<{ _id: string; role: string; content: string; createdAt: string }>;
		}>(`conversations/${conversationId}`, {
			fetch, // 使用 SvelteKit 提供的 fetch，确保正确的 session 被传递
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include' // 重要：确保 cookies 和 session 被包含在请求中
		});

		if (response.success) {
			// 预置消息，作为第一条显示
			const defaultMessage = {
				id: uuidv4(),
				content: await marked('欢迎来到 WiseU Chat! 在这里开始你的对话。'),
				sender: 'assistant' as const
			};

			// 解析来自 API 的消息并合并预置消息
			const messages = [
				defaultMessage,
				...(await Promise.all(
					response.data.messages.map(async (msg) => ({
						id: uuidv4(),
						content: await marked(msg.content), // 使用异步解析 Markdown
						sender: msg.role as 'user' | 'assistant' | 'notice'
					}))
				))
			];

			chatStore.setConversationId(conversationId);
			chatStore.setMessages(messages);

			return { conversationId };
		}
	}

	// 如果没有 conversationId，清空聊天记录
	chatStore.setConversationId(null);
	chatStore.clearMessages();

	return { conversationId: null };
};
