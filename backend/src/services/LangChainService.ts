import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { BaseMessage } from "@langchain/core/messages";
import config from "../config/config";
import { MessageDocument } from "../models/Chat";
import { AIMessageChunk } from "@langchain/core/messages";

export class LangChainService {
    private model: ChatOpenAI;

    constructor() {
        this.model = new ChatOpenAI({
            model: "glm-4",
            temperature: 0.8,
            streaming: true,
            configuration: {
                apiKey: config.openAIApiKey,
                baseURL: "https://open.bigmodel.cn/api/paas/v4",
            }
        });
    }

    async chat(question: string, previousMessages: MessageDocument[], onTokenReceived: (token: string) => void): Promise<string> {
        const systemMessage = new SystemMessage({ content: "你是WiseU，一个专注于大学生的生活智能助理。接下来用户将与你进行对话。" });

        const promptMessages: BaseMessage[] = [
            systemMessage,
            ...previousMessages.map((msg) => {
                return msg.role === 'user'
                    ? new HumanMessage({ content: msg.content })
                    : new AIMessage({ content: msg.content });
            }),
            new HumanMessage({ content: question })
        ];

        let fullResponse = "";

        const stream = await this.model.stream(promptMessages);

        for await (const chunk of stream) {
            const token = chunk.content;
            if (typeof token === 'string') {
                onTokenReceived(token);
                fullResponse += token;
            } else if (Array.isArray(token)) {
                const joinedToken = token.join('');
                onTokenReceived(joinedToken);
                fullResponse += joinedToken;
            } else {
                throw new Error("Unsupported content type in AIMessageChunk");
            }
        }

        return fullResponse;
    }
}
