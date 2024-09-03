import dotenv from 'dotenv';

dotenv.config();

export default {
    openAIApiKey: process.env.OPENAI_API_KEY || 'your_openai_api_key',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/wiseu',
    redisUri: process.env.REDIS_URI || 'redis://127.0.0.1:6379/0',
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
    sessionSecret: process.env.SESSION_SECRET || 'your_session_secret_key',
    encryptKey: process.env.ENCRYPT_SECRET || 'your_data_encryption_key',
    port: Number(process.env.PORT) || 5000,
    debug: process.env.DEBUG || false,
};
