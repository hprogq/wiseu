import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import i18n from 'i18n';
import { detectLanguage } from "./config/i18n";
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import identityRoutes from './routes/identityRoutes';

const app = express();

// i18n
app.use(i18n.init);
app.use(detectLanguage);

// Server
app.use(express.json({ limit: '10mb', strict: true }));
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/identity', identityRoutes);

app.get('/', (req, res) => {
    res.send({ success: true, message: 'WiseU OK', data: null });
});

export default app;