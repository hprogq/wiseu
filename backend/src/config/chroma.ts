import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ZhipuAIEmbeddings } from "@langchain/community/embeddings/zhipuai";
import config from "../config/config";

export const vectorStoreInstance = (embeddings: OpenAIEmbeddings | ZhipuAIEmbeddings, collectionName: string): Chroma => {
    return new Chroma(embeddings, {
        collectionName,
        url: config.chromaUri,
        collectionMetadata: {
            "hnsw:space": "cosine",
        },
    });
};