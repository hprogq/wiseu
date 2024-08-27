import dotenv from 'dotenv';

dotenv.config();

export default {
    openAIApiKey: process.env.OPENAI_API_KEY || 'your_openai_api_key',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/wiseu',
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
    port: process.env.PORT || 5000,
};
