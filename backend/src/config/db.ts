import mongoose from 'mongoose';
import config from './config';

const connectDB = async () => {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('Database connected');
    } catch (error) {
        throw new Error('Database connection failed:' + error);
    }
};

export default connectDB;
