import { Request, Response } from 'express';
import { Conversation, Message } from '../models/Chat';
import { LangChainService } from '../services/LangChainService';
import { createResponse } from "../utils/responseHelper";
import mongoose from 'mongoose';
import restful from "./helper";
import moment from "moment-timezone";

const langChainService = new LangChainService();

export const chatConversation = async (req: Request, res: Response) => {
    restful(req, res, {
        post: async (req: Request, res: Response) => {
            try {
                const { conversationId, question } = req.body;
                const userId = req.user?.user_id;

                if (!question) {
                    return res.status(400).json(createResponse(false, 'Question is required'));
                }

                let conversation;
                if (conversationId) {
                    conversation = await Conversation.findById(conversationId).populate('messages');
                    if (!conversation) {
                        return res.status(404).json(createResponse(false, 'Conversation not found'));
                    }
                } else {
                    conversation = new Conversation({ userId: new mongoose.Types.ObjectId(userId) });
                    await conversation.save();
                }

                const previousMessages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

                // 设置响应头以支持 SSE
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.flushHeaders();

                // 创建并保存用户消息
                const userMessage = new Message({
                    conversationId: conversation._id,
                    role: 'user',
                    content: question
                });
                await userMessage.save();

                // 创建初始响应
                res.write(`data: ${JSON.stringify(createResponse(true, "Received", {
                    conversationId: conversation._id,
                    role: 'assistant',
                    content: "",
                    complete: false
                }))}\n\n`);

                // 逐字处理助手的响应
                let assistantMessageContent = "";
                const sendToken = (token: string) => {
                    assistantMessageContent += token;
                    res.write(`data: ${JSON.stringify(createResponse(true, "Partial", {
                        conversationId: conversation._id,
                        role: 'assistant',
                        content: assistantMessageContent,
                        complete: false
                    }))}\n\n`);
                };

                // 调用 LangChain 并返回结果
                const fullResponse = await langChainService.chat(question, previousMessages, sendToken);

                // 创建并保存助手消息
                const assistantMessage = new Message({
                    conversationId: conversation._id,
                    role: 'assistant',
                    content: fullResponse
                });
                await assistantMessage.save();

                // 将消息添加到会话中
                conversation.messages.push(userMessage._id as mongoose.Types.ObjectId);
                conversation.messages.push(assistantMessage._id as mongoose.Types.ObjectId);
                await conversation.save();

                // 发送完成状态
                res.write(`data: ${JSON.stringify(createResponse(true, "Completed", {
                    conversationId: conversation._id,
                    role: 'assistant',
                    content: fullResponse,
                    complete: true
                }))}\n\n`);

                res.write('data: [DONE]\n\n');
                res.end();

            } catch (error: any) {
                res.status(500).json(createResponse(false, error.message));
            }
        }
    }, true);
};

export const getConversations = async (req: Request, res: Response) => {
    restful(req, res, {
        get: async (req: Request, res: Response) => {
            try {
                const userId = req.user?.user_id;
                const conversations = await Conversation.find({ userId }).sort({ createdAt: -1 });

                const sanitizedConversations = await Promise.all(conversations.map(async (conversation) => {
                    const messageCount = await Message.countDocuments({ conversationId: conversation._id });
                    const lastMessage = await Message.findOne({ conversationId: conversation._id }).sort({ createdAt: -1 });

                    return {
                        _id: conversation._id,
                        title: conversation.title,
                        messageCount,
                        createdAt: moment(conversation.createdAt).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
                        updatedAt: lastMessage ? moment(lastMessage.createdAt).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss') : null,
                    };
                }));

                res.json(createResponse(true, "Conversations fetched successfully", sanitizedConversations));

            } catch (error: any) {
                res.status(500).json(createResponse(false, error.message));
            }
        }
    }, true)
};

export const getConversationById = async (req: Request, res: Response) => {
    restful(req, res, {
        get: async (req: Request, res: Response) => {
            try {
                const { conversation_id } = req.params;
                const conversation = await Conversation.findById(conversation_id).populate({
                    path: 'messages',
                    options: { sort: { 'createdAt': 1 } }
                });

                if (!conversation) {
                    return res.status(404).json(createResponse(false, 'Conversation not found'));
                }

                const formattedMessages = conversation.messages.map((msg: any) => {
                    const { __v, conversationId, ...rest } = msg._doc; // 去除 __v 和 conversationId 字段
                    return {
                        ...rest,
                        createdAt: moment(msg.createdAt).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
                    };
                });

                res.json(createResponse(true, "Conversation details fetched successfully", {
                    _id: conversation._id,
                    title: conversation.title,
                    createdAt: moment(conversation.createdAt).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
                    messages: formattedMessages
                }));

            } catch (error: any) {
                res.status(500).json(createResponse(false, error.message));
            }
        }
    }, true)
};
