import Groq from "groq-sdk";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { LLMConfig, Tool, ToolResult } from "../types.js";

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: any[];
  toolCallId?: string;
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  finishReason: "stop" | "tool_calls" | "length" | "content_filter";
}

export abstract class LLMProvider {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract generateResponse(
    messages: LLMMessage[],
    tools?: Tool[]
  ): Promise<LLMResponse>;
}

export class GroqProvider extends LLMProvider {
  private client: Groq;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new Groq({
      apiKey: config.apiKey || process.env.GROQ_API_KEY,
    });
  }

  async generateResponse(
    messages: LLMMessage[],
    tools?: Tool[]
  ): Promise<LLMResponse> {
    const groqMessages = messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
      tool_calls: msg.toolCalls?.map((tc) => ({
        ...tc,
        type: "function", // Ensure type is set for Groq
      })),
      tool_call_id: msg.toolCallId,
    }));

    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: groqMessages,
      tools: tools?.map((tool) => ({
        type: "function",
        function: tool.function,
      })),
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens ?? 4096,
      top_p: this.config.topP ?? 1,
      frequency_penalty: this.config.frequencyPenalty ?? 0,
      presence_penalty: this.config.presencePenalty ?? 0,
    });

    const choice = completion.choices[0];
    return {
      content: choice.message.content || "",
      toolCalls: choice.message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      finishReason: choice.finish_reason as any,
    };
  }
}

export class OpenAIProvider extends LLMProvider {
  private client: OpenAI;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async generateResponse(
    messages: LLMMessage[],
    tools?: Tool[]
  ): Promise<LLMResponse> {
    const openaiMessages = messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
      tool_calls: msg.toolCalls?.map((tc) => ({
        ...tc,
        type: "function", // Ensure type is set for OpenAI
      })),
      tool_call_id: msg.toolCallId,
    }));

    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: openaiMessages,
      tools: tools?.map((tool) => ({
        type: "function",
        function: tool.function,
      })),
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens ?? 4096,
      top_p: this.config.topP ?? 1,
      frequency_penalty: this.config.frequencyPenalty ?? 0,
      presence_penalty: this.config.presencePenalty ?? 0,
    });

    const choice = completion.choices[0];
    return {
      content: choice.message.content || "",
      toolCalls: choice.message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      finishReason: choice.finish_reason as any,
    };
  }
}

export class AnthropicProvider extends LLMProvider {
  private client: Anthropic;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateResponse(
    messages: LLMMessage[],
    tools?: Tool[]
  ): Promise<LLMResponse> {
    // Convert messages to Anthropic format
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 4096,
      temperature: this.config.temperature ?? 0.7,
      top_p: this.config.topP ?? 1,
      system: systemMessage?.content,
      messages: conversationMessages,
      tools: tools?.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      })),
    });

    const content = response.content[0];
    if (content.type === "text") {
      return {
        content: content.text,
        finishReason: response.stop_reason as any,
      };
    } else if (content.type === "tool_use") {
      return {
        content: "",
        toolCalls: [
          {
            id: content.id,
            type: "function",
            function: {
              name: content.name,
              arguments: JSON.stringify(content.input),
            },
          },
        ],
        finishReason: "tool_calls",
      };
    }

    return {
      content: "",
      finishReason: "stop",
    };
  }
}

export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case "groq":
      return new GroqProvider(config);
    case "openai":
      return new OpenAIProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
} 