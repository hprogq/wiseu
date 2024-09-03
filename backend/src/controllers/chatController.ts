import { Request, Response } from 'express';
import { Conversation, Message } from '../models/Chat';
import { LangChainService } from '../services/LangChainService';
import { createResponse } from "../utils/responseHelper";
import mongoose from 'mongoose';
import restful from "./helper";
import moment from "moment-timezone";

export const messageController = async (req: Request, res: Response) => {
    restful(req, res, {
        post: async (req: Request, res: Response) => {
            try {
                const langChainService = new LangChainService(req);

                const { conversationId, question } = req.body;
                const userId = req.session.user?.id;

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
                }

                const previousMessages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

                // Setup response headers for SSE
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.flushHeaders();

                // Variable to track if the connection is still active
                let isConnected = true;

                // Create an AbortController
                const abortController = new AbortController();

                // Listen for client disconnection
                res.on('close', () => {
                    isConnected = false;
                    abortController.abort();  // Abort the ongoing process
                });

                const userMessage = new Message({
                    conversationId: conversation._id,
                    role: 'user',
                    content: question
                });

                res.write(`data: ${JSON.stringify(createResponse(true, "Received", {
                    conversationId: conversation._id,
                    role: 'assistant',
                    content: "",
                    complete: false
                }))}\n\n`);

                let assistantMessageContent = "";
                let lastSaveTime = Date.now();
                let isSaved = false;

                const sendToken = (token: string) => {
                    if (!isConnected) {
                        // If the connection is closed, stop processing
                        return;
                    }

                    assistantMessageContent += token;
                    res.write(`data: ${JSON.stringify(createResponse(true, "Partial", {
                        conversationId: conversation._id,
                        role: 'assistant',
                        content: assistantMessageContent,
                        complete: false
                    }))}\n\n`);

                    if (!isSaved || Date.now() - lastSaveTime > 1000) {
                        lastSaveTime = Date.now();
                        savePartialMessage();
                    }
                };

                const savePartialMessage = async () => {
                    try {
                        if (!isSaved) {
                            if (!conversationId) {
                                await conversation.save();
                            }
                            await userMessage.save();
                            const partialAssistantMessage = new Message({
                                conversationId: conversation._id,
                                role: 'assistant',
                                content: assistantMessageContent
                            });
                            await partialAssistantMessage.save();
                            conversation.messages.push(
                                userMessage._id as mongoose.Types.ObjectId,
                                partialAssistantMessage._id as mongoose.Types.ObjectId
                            );
                            await conversation.save();
                            isSaved = true;
                        } else {
                            await Message.findOneAndUpdate(
                                { conversationId: conversation._id, role: 'assistant' },
                                { content: assistantMessageContent }
                            );
                        }
                    } catch (error) {
                        console.error('Error saving partial message:', error);
                    }
                };

                try {
                    const fullResponse = await langChainService.chat(question, previousMessages, sendToken, abortController.signal);

                    if (isConnected) {
                        await savePartialMessage();
                        res.write(`data: ${JSON.stringify(createResponse(true, "Completed", {
                            conversationId: conversation._id,
                            role: 'assistant',
                            content: fullResponse,
                            complete: true
                        }))}\n\n`);
                        res.write('data: [DONE]\n\n');
                        res.end();
                    }
                } catch (error: any) {
                    if (error.message !== 'Aborted' || !res.headersSent) {
                        res.status(500).json(createResponse(false, error.message));
                    }
                }

            } catch (error: any) {
                res.status(500).json(createResponse(false, error.message));
            }
        }
    }, true);
};

export const conversationsController = async (req: Request, res: Response) => {
    restful(req, res, {
        get: async (req: Request, res: Response) => {
            try {
                const userId = req.session.user?.id;
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

export const conversationInstanceController = async (req: Request, res: Response) => {
    restful(req, res, {
        // getConversationInstance
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
        },
        // deleteConversationInstance
        delete: async (req: Request, res: Response) => {
            try {
                const { conversation_id } = req.params;
                const userId = req.session.user?.id;

                const conversation = await Conversation.findOneAndDelete({ _id: conversation_id, userId });
                if (!conversation) {
                    return res.status(404).json(createResponse(false, 'Conversation not found'));
                }

                // 删除会话相关的消息
                await Message.deleteMany({ conversationId: conversation_id });

                res.json(createResponse(true, 'Conversation and related messages deleted successfully'));
            } catch (error: any) {
                res.status(500).json(createResponse(false, error.message));
            }
        }
    }, true)
};
