import { Request } from "express";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { BaseMessage } from "@langchain/core/messages";
import config from "../../config/config";
import { MessageDocument } from "../../models/Chat";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto'; // 用于生成文档的哈希值
import { vectorStoreInstance } from "../../config/chroma";
import { ZhipuAIEmbeddings } from "@langchain/community/embeddings/zhipuai";

export class EmbeddedService {
    public readonly embeddings: OpenAIEmbeddings | ZhipuAIEmbeddings;
    public vectorStore: Chroma;

    constructor(serviceId: string) {
        this.embeddings = new OpenAIEmbeddings({
            apiKey: config.openAIApiKey,
            model: "embedding-3",
            configuration: {
                baseURL: "https://open.bigmodel.cn/api/paas/v4",
            },
        });

        // this.embeddings = new ZhipuAIEmbeddings({
        //     apiKey: config.openAIApiKey,
        // });

        this.vectorStore = vectorStoreInstance(this.embeddings, `service-${serviceId}`);
    }
}
