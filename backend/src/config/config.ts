import dotenv from 'dotenv';

dotenv.config();

export default {
    openAIApiKey: process.env.OPENAI_API_KEY || 'your_openai_api_key',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/wiseu',
    sessionRedisUri: process.env.SESSION_REDIS_URI || 'redis://127.0.0.1:6379/0',
    bullMQRedisUri: process.env.BULLMQ_REDIS_URI || 'redis://127.0.0.1:6379/1',
    chromaUri: process.env.CHROMA_URI || 'http://localhost:8000',
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
    sessionSecret: process.env.SESSION_SECRET || 'your_session_secret_key',
    encryptKey: process.env.ENCRYPT_SECRET || 'your_data_encryption_key',
    port: Number(process.env.PORT) || 5000,
    debug: process.env.DEBUG || false,
};
