import { Request } from "express";
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  BaseMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { Message, Conversation } from "../../models/Chat";
import Service from "../../models/Service";
import serviceRegistry from "../service/serviceRegistry";
import mongoose from "mongoose";
import { DynamicStructuredTool, DynamicTool } from "@langchain/core/tools";
import { Message as MessageModel } from "../../models/Chat";

export class ChatService {
  private model: ChatOpenAI;
  private req: Request;

  constructor(req: Request) {
    this.model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: "glm-4-plus",
      temperature: 0.8,
      streaming: true,
      user: "wiseu_" + req.session.user?.id,
      configuration: {
        baseURL: "https://open.bigmodel.cn/api/paas/v4",
      },
    });

    this.req = req;
  }

  async getOrCreateConversation(
    conversationId: string | undefined,
    userId: string,
  ) {
    let conversation;
    if (conversationId) {
      conversation =
        await Conversation.findById(conversationId).populate("messages");
      if (!conversation) {
        throw new Error("Conversation not found");
      }
    } else {
      conversation = new Conversation({
        userId: new mongoose.Types.ObjectId(userId),
      });
      await conversation.save(); // Save the newly created conversation immediately
    }
    return conversation;
  }

  async chat(
    question: string,
    previousMessages: InstanceType<typeof MessageModel>[],
    onTokenReceived: (token: string, role?: string) => void,
    signal: AbortSignal,
    conversation: any,
  ): Promise<string> {
    const currentDate = new Date();
    const date = currentDate.toLocaleDateString();
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayOfWeek = daysOfWeek[currentDate.getDay()];
    const time = currentDate.toLocaleTimeString();

    const systemMessage = new SystemMessage({
      content: `You are WiseU, an intelligent assistant focused on university students' lives. Today is ${date} (${dayOfWeek}), and the current time is ${time}. The user will now begin a conversation with you. Regardless of the language contained in the prompt context you receive, please respond to the user in the language of their most recent message.`,
    });

    const servicePromptMessages: BaseMessage[] = [];
    const serviceTools: (DynamicStructuredTool | DynamicTool)[] = [];
    const userId = this.req.session.user?.id;
    const activeServices = await Service.find({ user: userId, status: "UP" });

    for (const service of activeServices) {
      try {
        const ServiceClass = serviceRegistry.getService(service.type);
        const serviceInstance = new ServiceClass();

        await serviceInstance.init(
          service.identityId,
          service.configuration,
          service._id.toString(),
        );

        const servicePrompt = await serviceInstance.prompt(question);
        servicePromptMessages.push(
          new SystemMessage({ content: servicePrompt }),
        );

        serviceTools.push(...serviceInstance.tools);
      } catch (error: any) {
        console.error("Failed to inject service prompt", error);
      }
    }

    const promptMessages: BaseMessage[] = [
      systemMessage,
      ...servicePromptMessages,
      ...previousMessages.map((msg) => {
        return msg.role === "user"
          ? new HumanMessage({ content: msg.content })
          : new AIMessage({ content: msg.content });
      }),
      new HumanMessage({ content: question }),
    ];

    let fullResponse = "";
    const modelWithTools = this.model.bindTools(serviceTools);
    const stream = await modelWithTools.stream(promptMessages, { signal });

    // Create an initial message for the AI response
    const aiMessage = await this.createMessage(
      conversation._id,
      "assistant",
      "",
    );
    conversation.messages.push(aiMessage._id); // Associate the message with the conversation
    await conversation.save(); // Save the updated conversation

    for await (const chunk of stream) {
      if (chunk.tool_calls && chunk.tool_calls.length > 0) {
        for (const toolCall of chunk.tool_calls) {
          if (!toolCall || !toolCall.id) {
            continue;
          }

          const toolName = toolCall.name;
          const toolArgs = toolCall.args;

          // Send the "正在调用XXX" message (start notice)
          onTokenReceived(`Calling ${toolName}...`, "notice");

          const selectedTool = serviceTools.find(
            (tool) => tool.name === toolName,
          );
          if (selectedTool) {
            const toolResult = await selectedTool.invoke(toolArgs);

            if (toolResult.success) {
              // Create a ToolMessage with the tool result and feed it back to the model
              const toolMessage = new ToolMessage({
                content: toolResult.data,
                tool_call_id: toolCall.id,
              });

              // Send the tool result back to the model for further processing
              const updatedMessages = [...promptMessages, toolMessage];

              // Continue processing the stream after the tool invocation
              const postToolStream = await modelWithTools.stream(
                updatedMessages,
                { signal },
              );

              // Send the additional tokens generated after the tool result
              for await (const postToolChunk of postToolStream) {
                const token = postToolChunk.content;
                if (typeof token === "string") {
                  onTokenReceived(token);
                  fullResponse += token;
                  await this.updateMessage(aiMessage._id, fullResponse); // Update message content
                }
              }
            } else {
              onTokenReceived(`Call ${toolName} Failed`, "error");
            }

            // Send the "工具调用完成" message (end notice)
            onTokenReceived(`${toolName} Success`, "notice");
          }
        }
      } else {
        const token = chunk.content;
        if (typeof token === "string") {
          onTokenReceived(token);
          fullResponse += token;
          await this.updateMessage(aiMessage._id, fullResponse); // Update message content
        }
      }
    }

    return fullResponse;
  }

  async createMessage(
    conversationId: mongoose.Types.ObjectId,
    role: string,
    content: string,
  ) {
    const message = new Message({
      conversationId,
      role,
      content,
    });
    await message.save();
    return message;
  }

  async updateMessage(messageId: mongoose.Types.ObjectId, content: string) {
    await Message.findByIdAndUpdate(messageId, { content });
  }
}
