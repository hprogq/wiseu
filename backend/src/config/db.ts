import mongoose from 'mongoose';
import config from './config';
import {printError, printInfo} from "../utils/console";

export const connectMongoDB = async () => {
    try {
        await mongoose.connect(config.mongoUri);
        printInfo('MongoDB connected');
    } catch (error) {
        printError('MongoDB connection failed:' + error);
    }
};
