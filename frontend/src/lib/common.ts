import { v4 as uuidv4 } from 'uuid';
import { marked } from 'marked';

export const goBack = () => {
	window.history.back();
};

export const chatDefaultMessage = {
	id: uuidv4(),
	content: await marked('Welcome to WiseU Chat! Start your conversation here.'),
	sender: 'assistant' as const
};
