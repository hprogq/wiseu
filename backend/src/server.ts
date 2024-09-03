import app from './app';
import { connectMongoDB } from './config/db';
import config from './config/config';
import figlet from 'figlet';

const title = figlet.textSync('WiseU');
console.log(title);

const startServer = async () => {
    try {
        await connectMongoDB();

        const PORT = config.port;
        app.listen(PORT, () => {
            console.log(`\u001b[34m[INFO]\u001b[0m Server is running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('\u001b[31m[ERROR]\u001b[0m Server initialization failed:', error);
        process.exit(1);
    }
};

startServer();