import mongoose, { Schema, Document } from 'mongoose';

const MessageSchema = new Schema({
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    role: { type: String, required: true }, // 'user' 或 'assistant'
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const ConversationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // 绑定用户
    title: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }]
});

export const Message = mongoose.model<MessageDocument>('Message', MessageSchema);
export const Conversation = mongoose.model<ConversationDocument>('Conversation', ConversationSchema);

export interface MessageDocument extends Document {
    conversationId: mongoose.Types.ObjectId;
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
}

export interface ConversationDocument extends Document {
    userId: mongoose.Types.ObjectId;
    title?: string;
    createdAt: Date;
    messages: mongoose.Types.ObjectId[];
}
