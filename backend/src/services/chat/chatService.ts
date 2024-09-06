import { Request } from "express";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { BaseMessage } from "@langchain/core/messages";
import config from "../../config/config";
import { MessageDocument } from "../../models/Chat";
import Service from "../../models/Service";
import serviceRegistry from "../service/serviceRegistry";
import mongoose from "mongoose";

export class ChatService {
    private model: ChatOpenAI;
    private req: Request;

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

        this.req = req;
    }

    async chat(
        question: string,
        previousMessages: MessageDocument[],
        onTokenReceived: (token: string) => void,
        signal: AbortSignal
    ): Promise<string> {

        // 基本系统消息
        const systemMessage = new SystemMessage({
            content: "你是WiseU，一个专注于大学生的生活智能助理。接下来用户将与你进行对话。"
        });

        const promptMessages: BaseMessage[] = [
            systemMessage,
            ...previousMessages.map((msg) => {
                return msg.role === 'user'
                    ? new HumanMessage({ content: msg.content })
                    : new AIMessage({ content: msg.content });
            }),
        ];

        // 获取用户启用的服务并注入服务 prompt 和 RAG 上下文
        const userId = this.req.session.user?.id;
        const activeServices = await Service.find({ user: userId, status: 'UP' });

        for (const service of activeServices) {
            try {
                const ServiceClass = serviceRegistry.getService(service.type);
                const serviceInstance = new ServiceClass();

                // 初始化服务
                const serviceId = service._id as mongoose.Types.ObjectId;
                await serviceInstance.init(service.identityId, service.configuration, serviceId.toString());

                // 获取服务的 prompt 并注入
                const servicePrompt = await serviceInstance.prompt(question);
                promptMessages.push(new SystemMessage({ content: servicePrompt }));
            } catch {
                console.error("Failed to inject service prompt");
            }
        }

        promptMessages.push(new HumanMessage({ content: question }));

        let fullResponse = "";

        // 开始流式处理聊天消息
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

    // 生成 RAG 上下文
    private generateRAGContext(relatedDocs: any[]): string {
        return relatedDocs.map(doc => `${doc.title}: ${doc.pageContent}`).join("\n\n");
    }
}
