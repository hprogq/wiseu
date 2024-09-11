import { Request, Response } from "express";
import { Conversation, Message } from "../models/Chat";
import { ChatService } from "../services/chat/chatService";
import { createResponse } from "../utils/responseHelper";
import mongoose from "mongoose";
import restful from "../helpers/restfulHelper";
import moment from "moment-timezone";

export const messageController = async (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      post: async (req: Request, res: Response) => {
        try {
          const chatService = new ChatService(req);
          const { conversationId, question } = req.body;
          const userId = req.session.user?.id;

          if (!question) {
            return res
              .status(400)
              .json(createResponse(false, "Question is required"));
          }

          // Get or create a conversation
          const conversation = await chatService.getOrCreateConversation(
            conversationId,
            userId,
          );

          const previousMessages = await Message.find({
            conversationId: conversation._id,
          }).sort({ createdAt: 1 });

          // Setup response headers for SSE
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.flushHeaders();

          // Handle connection state
          let isConnected = true;
          const abortController = new AbortController();
          res.on("close", () => {
            isConnected = false;
            abortController.abort();
          });

          // Save the user's message
          await chatService.createMessage(conversation._id, "user", question);

          res.write(
            `data: ${JSON.stringify(
              createResponse(true, "Received", {
                conversationId: conversation._id,
                role: "assistant",
                content: "",
                complete: false,
              }),
            )}\n\n`,
          );

          const sendToken = (token: string, role: string = "assistant") => {
            if (!isConnected || !token.trim()) return;

            res.write(
              `data: ${JSON.stringify(
                createResponse(true, "Partial", {
                  conversationId: conversation._id,
                  role,
                  content: token,
                  complete: false,
                }),
              )}\n\n`,
            );
          };

          try {
            const fullResponse = await chatService.chat(
              question,
              previousMessages,
              sendToken,
              abortController.signal,
            );

            if (isConnected) {
              res.write(
                `data: ${JSON.stringify(
                  createResponse(true, "Completed", {
                    conversationId: conversation._id,
                    role: "assistant",
                    content: fullResponse,
                    complete: true,
                  }),
                )}\n\n`,
              );
              res.write("data: [DONE]\n\n");
              res.end();
            }
          } catch (error: any) {
            console.error("Chat processing error:", error);
            if (isConnected) {
              res.write(
                `data: ${JSON.stringify(
                  createResponse(false, "Error processing chat", {
                    error: error.message,
                  }),
                )}\n\n`,
              );
              res.end();
            }
          }
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

export const conversationsController = async (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      get: async (req: Request, res: Response) => {
        try {
          const userId = req.session.user?.id;
          const conversations = await Conversation.find({ userId }).sort({
            createdAt: -1,
          });

          const sanitizedConversations = await Promise.all(
            conversations.map(async (conversation) => {
              const messageCount = await Message.countDocuments({
                conversationId: conversation._id,
              });
              const lastMessage = await Message.findOne({
                conversationId: conversation._id,
              }).sort({ createdAt: -1 });

              return {
                _id: conversation._id,
                title: conversation.title,
                messageCount,
                createdAt: moment(conversation.createdAt)
                  .tz("Asia/Shanghai")
                  .format("YYYY-MM-DD HH:mm:ss"),
                updatedAt: lastMessage
                  ? moment(lastMessage.createdAt)
                      .tz("Asia/Shanghai")
                      .format("YYYY-MM-DD HH:mm:ss")
                  : null,
              };
            }),
          );

          res.json(
            createResponse(
              true,
              "Conversations fetched successfully",
              sanitizedConversations,
            ),
          );
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

export const conversationInstanceController = async (
  req: Request,
  res: Response,
) => {
  restful(
    req,
    res,
    {
      get: async (req: Request, res: Response) => {
        try {
          const { conversation_id } = req.params;
          const conversation = await Conversation.findById(
            conversation_id,
          ).populate({
            path: "messages",
            options: { sort: { createdAt: 1 } },
          });

          if (!conversation) {
            return res
              .status(404)
              .json(createResponse(false, "Conversation not found"));
          }

          const formattedMessages = conversation.messages.map((msg: any) => {
            const { __v, conversationId, ...rest } = msg._doc;
            return {
              ...rest,
              createdAt: moment(msg.createdAt)
                .tz("Asia/Shanghai")
                .format("YYYY-MM-DD HH:mm:ss"),
            };
          });

          res.json(
            createResponse(true, "Conversation details fetched successfully", {
              _id: conversation._id,
              title: conversation.title,
              createdAt: moment(conversation.createdAt)
                .tz("Asia/Shanghai")
                .format("YYYY-MM-DD HH:mm:ss"),
              messages: formattedMessages,
            }),
          );
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
      delete: async (req: Request, res: Response) => {
        try {
          const { conversation_id } = req.params;
          const userId = req.session.user?.id;

          const conversation = await Conversation.findOneAndDelete({
            _id: conversation_id,
            userId,
          });
          if (!conversation) {
            return res
              .status(404)
              .json(createResponse(false, "Conversation not found"));
          }

          await Message.deleteMany({ conversationId: conversation_id });

          res.json(
            createResponse(
              true,
              "Conversation and related messages deleted successfully",
            ),
          );
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};
