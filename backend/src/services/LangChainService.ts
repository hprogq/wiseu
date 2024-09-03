import { Request } from "express";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { BaseMessage } from "@langchain/core/messages";
import config from "../config/config";
import { MessageDocument } from "../models/Chat";

export class LangChainService {
    private model: ChatOpenAI;

    constructor(req: Request) {
        this.model = new ChatOpenAI({
            apiKey: config.openAIApiKey,
            model: "glm-4-plus",
            temperature: 0.8,
            streaming: true,
            user: 'wiseu_' + req.session.user?.id,
            configuration: {
                baseURL: "https://open.bigmodel.cn/api/paas/v4",
            },
        });
    }

    async chat(question: string, previousMessages: MessageDocument[], onTokenReceived: (token: string) => void, signal: AbortSignal): Promise<string> {
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

        // Make sure the stream method supports aborting with the signal
        const stream = await this.model.stream(promptMessages, { signal });

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
