import mongoose, { Schema, Document } from "mongoose";

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
  role: { type: String, required: true },
  content: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const ConversationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // 绑定用户
  title: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  messages: [{ type: Schema.Types.ObjectId, ref: "Message" }],
});

export const Message = mongoose.model<MessageDocument>(
  "Message",
  MessageSchema,
);
export const Conversation = mongoose.model<ConversationDocument>(
  "Conversation",
  ConversationSchema,
);

export interface MessageDocument extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface ConversationDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title?: string;
  createdAt: Date;
  messages: mongoose.Types.ObjectId[];
}
