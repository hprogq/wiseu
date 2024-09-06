import app from './app';
import { connectMongoDB } from './config/db';
import config from './config/config';
import figlet from 'figlet';
import { initializeServiceQueueCheck } from "./services/service/serviceScheduler";
import { printInfo, printError, printWarning } from "./utils/console";

const title = figlet.textSync('WiseU');
console.log(title);

const startServer = async () => {
    try {
        // 连接 MongoDB
        await connectMongoDB();

        // 程序启动时检查并初始化任务队列
        await initializeServiceQueueCheck();

        const PORT = config.port;
        app.listen(PORT, () => {
            printInfo(`Server is running at http://localhost:${PORT}`);
        });
    } catch (error) {
        printError(`Server initialization failed: ${error}`);
        process.exit(1);
    }
};

startServer();