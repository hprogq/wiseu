import {ChromaClient, Collection, IncludeEnum} from 'chromadb';
import {OpenAIEmbeddings} from '@langchain/openai';
import {ZhipuAIEmbeddings} from '@langchain/community/embeddings/zhipuai';
import {ServiceProvider} from "../../providers/ServiceProvider";
import {Configuration, Parameter} from "../../providers/CommonProvider";
import {createHash} from "crypto";
import {printInfo} from "../../utils/console";

class DluflKnowledgeService extends ServiceProvider {
    name = 'DLUFL Knowledge Service';
    description = 'Provides access to the DLUFL knowledge resources';
    icon = 'https://example.com/icon.png';
    category = 'knowledge';
    type = 'dlufl_knowledge';
    identityType = ['dlufl_undergrad'];
    params: Parameter[] = [
        {
            fieldName: 'base',
            fieldType: 'string',
            displayName: 'Knowledge Base',
            required: true,
            description: 'The URL of the knowledge base'
        }
    ];
    rag = true;
    interval = 60 * 1000;

    private client: ChromaClient | undefined;
    private collection: Collection | undefined;
    private embeddings: OpenAIEmbeddings | ZhipuAIEmbeddings | undefined;

    constructor() {
        super();
    }

    // Initialize service
    public async init(identityId: string, config: Configuration, serviceId: string = ''): Promise<boolean> {
        if (!await super.init(identityId, config))
            return false;

        // Initialize ChromaClient
        this.client = new ChromaClient({
            path: config.chromaUri,
        });

        if (serviceId) {
            this.embeddings = new OpenAIEmbeddings({
                apiKey: config.openAIApiKey,
                model: "embedding-3",
            });

            const collectionName = `service-${serviceId}`;
            try {
                // Try to get the collection if it exists
                this.collection = await this.client.getCollection({
                    name: collectionName,
                });
                console.log(`Collection ${collectionName} already exists. Using existing collection.`);
            } catch (error) {
                // If the collection doesn't exist, create it
                if (error instanceof Error && error.message.includes("Collection not found")) {
                    this.collection = await this.client.createCollection({
                        name: collectionName,
                        metadata: {
                            "hnsw:space": "cosine",
                        }
                    });
                    console.log(`Created new collection: ${collectionName}`);
                } else {
                    // If it's a different error, throw it
                    throw error;
                }
            }
        }

        return true;
    }

    // Load remote knowledge base data
    async loadRemoteData(fileUrl: string): Promise<any[]> {
        try {
            const response = await fetch(fileUrl);
            const rawData = await response.text();
            return JSON.parse(rawData);
        } catch(err: any) {
            console.error(`Failed to fetch remote data from ${fileUrl}: ${err.message}`);
            return [];
        }
    }

    // Generate unique hash for content
    generateId(content: string): string {
        return createHash('sha256').update(content).digest('hex');
    }

    // Incremental update of knowledge base
    async incrementalUpdate(dataSet: any[]) {
        if (!this.client || !this.embeddings || !this.collection) {
            return;
        }

        const documentsToUpdate = [];
        const contentsToEmbed = [];
        const idsToEmbed = [];

        for (const doc of dataSet) {
            const docId = this.generateId(doc.content);
            const existingDoc = await this.getDocumentById(docId);

            if (existingDoc && existingDoc.metadata.lastUpdated === doc.lastUpdated) {
                console.log(`Document ${docId} is up-to-date, skipping...`);
                continue;
            }

            documentsToUpdate.push({
                pageContent: doc.content,
                metadata: {
                    title: doc?.title,
                    lastUpdated: doc?.lastUpdated,
                    url: doc?.metadata?.source,
                    source: doc?.metadata?.source,
                    category: doc?.metadata?.category,
                    author: doc?.metadata?.author
                }
            });
            contentsToEmbed.push(doc.content);
            idsToEmbed.push(docId);
        }

        if (documentsToUpdate.length === 0) {
            console.log('All documents are up-to-date.');
            return;
        }

        const embeddings = await this.embeddings.embedDocuments(contentsToEmbed);

        await this.collection.add({
            ids: idsToEmbed,
            embeddings: embeddings,
            metadatas: documentsToUpdate.map(doc => doc.metadata),
            documents: contentsToEmbed,
        });

        console.log(`${documentsToUpdate.length} documents added/updated.`);
    }

    // Find document by id using metadata filter
    async getDocumentById(docId: string): Promise<any | null> {
        if (!this.collection) {
            return null;
        }

        const results = await this.collection.get({
            ids: [docId],
            include: [IncludeEnum.Metadatas, IncludeEnum.Documents, IncludeEnum.Embeddings]
        });

        if (results.ids.length > 0) {
            const index = results.ids.indexOf(docId);
            if (index !== -1) {
                return {
                    id: results.ids[index],
                    metadata: results.metadatas ? results.metadatas[index] : null,
                    document: results.documents ? results.documents[index] : null,
                    embedding: results.embeddings ? results.embeddings[index] : null
                };
            }
        }

        return null;
    }

    // Remove stale documents
    async removeStaleDocuments(dataSet: any[]) {
        if (!this.collection) {
            return;
        }

        const validIds = dataSet.map(doc => this.generateId(doc.content));

        const allDocs = await this.collection.get({});
        const allDocIds = allDocs.ids;

        const docsToDelete = allDocIds.filter(id => !validIds.includes(id));

        if (docsToDelete.length > 0) {
            await this.collection.delete({ ids: docsToDelete });
            console.log(`Deleted documents: ${docsToDelete.join(', ')}`);
        }
    }

    // 检索 ChromaDB 中的相关文档
    async searchInChroma(query: string): Promise<any[]> {
        if (!this.collection || !this.embeddings) {
            return [];
        }

        const embedding = await this.embeddings.embedQuery(query); // 对查询进行嵌入
        const results = await this.collection.query({ queryEmbeddings: [embedding], nResults: 5 });

        return results.documents.map((doc: any) => ({
            title: doc.metadata?.title,
            pageContent: doc.document
        }));
    }

    // 生成 RAG 上下文
    private generateRAGContext(relatedDocs: any[]): string {
        return relatedDocs.map(doc => `${doc.title}: ${doc.pageContent}`).join("\n\n");
    }

    async prompt(question: string): Promise<string> {
        const context = await this.searchInChroma(question);
        const ragContext = this.generateRAGContext(context); // 将文档内容生成上下文
        return '以下内容是有关大连外国语大学的知识上下文，你可以参考。.\n' + ragContext;
    }

    async update(): Promise<void> {
        printInfo('Scheduled task running for Dlufl Knowledge Service');
        const base = this.configuration.base;
        const data = await this.loadRemoteData(base);
        await this.incrementalUpdate(data);
        await this.removeStaleDocuments(data);
    }
}

export default DluflKnowledgeService;