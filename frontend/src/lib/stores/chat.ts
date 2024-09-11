import { writable } from 'svelte/store';

interface Message {
	id: string;
	content: string;
	sender: 'user' | 'assistant' | 'notice';
}

interface ChatStore {
	messages: Message[];
	conversationId: string | null;
}

function createChatStore() {
	const { subscribe, set, update } = writable<ChatStore>({
		messages: [],
		conversationId: null
	});

	return {
		subscribe,
		setConversationId: (id: string | null) => update((store) => ({ ...store, conversationId: id })),
		setMessages: (messages: Message[]) => update((store) => ({ ...store, messages })),
		addMessage: (message: Message) =>
			update((store) => ({
				...store,
				messages: [...store.messages, message]
			})),
		updateMessage: (id: string, content: string) =>
			update((store) => ({
				...store,
				messages: store.messages.map((msg) => (msg.id === id ? { ...msg, content } : msg))
			})),
		removeMessage: (id: string) =>
			update((store) => ({
				...store,
				messages: store.messages.filter((message) => message.id !== id)
			})),
		clearMessages: () => update((store) => ({ ...store, messages: [] }))
	};
}

export const chatStore = createChatStore();
