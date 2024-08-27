import app from './app';
import connectDB from './config/db';
import config from './config/config';

connectDB()
    .then(() => {
        const PORT = config.port;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Database connection failed:', error);
        process.exit(1);
    });