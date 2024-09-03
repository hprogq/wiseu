import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import i18n from 'i18n';
import { detectLanguage } from './config/i18n';
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import identityRoutes from './routes/identityRoutes';
import RedisStore from 'connect-redis';
import session from 'express-session';
import redis from './config/redis';
import config from './config/config';
import {createResponse} from "./utils/responseHelper";

const app = express();

// Initialize store.
let redisStore = new RedisStore({
    client: redis,
    prefix: 'wiseu:',
});

// Initialize session storage.
app.use(
    session({
        name: 'wiseu.sid',
        store: redisStore,
        resave: false,
        rolling: true,
        saveUninitialized: false,
        secret: config.sessionSecret,
        cookie: {
            httpOnly: true, // 仅允许服务器访问 cookie，防止 XSS 攻击
            secure: false,  // 在生产环境中设置为 true
            maxAge: 1000 * 60 * 60,
        },
    }),
);

// i18n
app.use(i18n.init);
app.use(detectLanguage);

// Server
app.use(express.json({ limit: '10mb', strict: true }));
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use(authRoutes);
app.use(chatRoutes);
app.use(identityRoutes);

app.get('/', (req, res) => {
    res.send(createResponse(true, 'WiseU OK'));
});

app.use((req, res) => {
    res.status(404).send(createResponse(false, 'Not Found'));
});

export default app;