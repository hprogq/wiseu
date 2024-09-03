import mongoose from 'mongoose';
import config from './config';

export const connectMongoDB = async () => {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('\u001b[34m[INFO]\u001b[0m MongoDB connected');
    } catch (error) {
        throw new Error('\u001b[31m[ERROR]\u001b[0m MongoDB connection failed:' + error);
    }
};
