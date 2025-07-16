import type {
  ConversationStorage,
  ConversationConfig,
  StoredMessage,
  ConversationSession,
  ConversationQueryOptions,
  ConversationQueryResult,
  LLMConfig,
  ToolResult,
} from "../types.js";
import { createLLMProvider } from "../llm/providers.js";

/**
 * Manages conversation persistence and retrieval with intelligent context optimization
 */
export class ConversationManager {
  private storage: ConversationStorage;
  private config: ConversationConfig;
  private workingMemory: Map<string, StoredMessage[]> = new Map();

  constructor(config: ConversationConfig) {
    this.storage = config.storage;
    this.config = {
      maxWorkingMemoryMessages: 50,
      enableSummarization: true,
      maxContextTokens: 8000,
      defaultRelevanceStrategy: "hybrid",
      enableEmbeddings: true,
      ...config,
    };
  }

  /**
   * Store a new message and update working memory
   */
  async storeMessage(
    sessionId: string,
    role: "user" | "assistant" | "tool" | "system",
    content: string,
    options: {
      stateKey?: string;
      intentReasoning?: string;
      toolCalls?: any[];
      toolCallId?: string;
      toolResults?: ToolResult[];
      metadata?: Record<string, any>;
    } = {}
  ): Promise<StoredMessage> {
    // Store in persistent storage
    const message = await this.storage.storeMessage({
      sessionId,
      role,
      content,
      intentReasoning: options.intentReasoning,
      stateKey: options.stateKey,
      toolCalls: options.toolCalls,
      toolCallId: options.toolCallId,
      toolResults: options.toolResults,
      metadata: options.metadata || {},
    });

    // Update working memory
    await this.updateWorkingMemory(sessionId, message);

    // Update session activity
    await this.storage.upsertSession({
      id: sessionId,
      metadata: {},
    });

    return message;
  }

  /**
   * Get relevant conversation history for context
   */
  async getRelevantHistory(
    sessionId: string,
    currentQuery: string,
    options: Partial<ConversationQueryOptions> = {}
  ): Promise<{
    messages: Array<{
      role: "user" | "assistant" | "tool";
      content: string;
      intentReasoning?: string;
      toolCalls?: any[];
      toolCallId?: string;
      toolResults?: ToolResult[];
    }>;
    summary?: string;
    truncated: boolean;
  }> {
    const queryOptions: ConversationQueryOptions = {
      sessionId,
      currentQuery,
      limit: this.config.maxWorkingMemoryMessages,
      relevanceStrategy: this.config.defaultRelevanceStrategy,
      includeToolCalls: true,
      ...options,
    };

    const result = await this.storage.getConversationHistory(queryOptions);

    // Convert to format expected by Agent, filtering out invalid tool messages
    const messages = result.messages
      .filter((msg) => {
        // Filter out tool messages without tool_call_id as they're invalid for LLM APIs
        if (msg.role === "tool" && !msg.toolCallId) {
          console.warn(`Filtering out tool message without tool_call_id: ${msg.id}`);
          return false;
        }
        return true;
      })
      .map((msg) => ({
        role: msg.role as "user" | "assistant" | "tool",
        content: msg.content,
        intentReasoning: msg.intentReasoning,
        toolCalls: msg.toolCalls,
        toolCallId: msg.toolCallId,
        toolResults: msg.toolResults,
      }));

    return {
      messages,
      summary: result.sessionSummary,
      truncated: result.truncated,
    };
  }

  /**
   * Get optimized context for LLM processing
   */
  async getOptimizedContext(
    sessionId: string,
    currentQuery: string,
    maxTokens?: number
  ): Promise<{
    messages: Array<{
      role: "user" | "assistant" | "tool";
      content: string;
      toolCalls?: any[];
      toolCallId?: string;
      toolResults?: ToolResult[];
    }>;
    summary?: string;
    contextStrategy: "full" | "recent" | "summarized" | "relevant";
  }> {
    const tokenLimit = maxTokens || this.config.maxContextTokens!;
    
    // Try different strategies in order of preference
    
    // 1. Recent messages (most efficient)
    let result = await this.getRelevantHistory(sessionId, currentQuery, {
      relevanceStrategy: "recent",
      limit: 20,
    });

    let estimatedTokens = this.estimateTokenCount(result.messages);
    
    if (estimatedTokens <= tokenLimit) {
      return { ...result, contextStrategy: "recent" };
    }

    // 2. Semantic relevance (better quality)
    if (this.config.enableEmbeddings) {
      result = await this.getRelevantHistory(sessionId, currentQuery, {
        relevanceStrategy: "semantic",
        limit: 15,
        minSimilarityScore: 0.7,
      });

      estimatedTokens = this.estimateTokenCount(result.messages);
      
      if (estimatedTokens <= tokenLimit) {
        return { ...result, contextStrategy: "relevant" };
      }
    }

    // 3. Hybrid approach (balanced)
    result = await this.getRelevantHistory(sessionId, currentQuery, {
      relevanceStrategy: "hybrid",
      limit: 10,
      recentMinutes: 60, // Last hour
    });

    estimatedTokens = this.estimateTokenCount(result.messages);
    
    if (estimatedTokens <= tokenLimit) {
      return { ...result, contextStrategy: "relevant" };
    }

    // 4. Use summary if available
    if (result.summary && this.config.enableSummarization) {
      const recentMessages = result.messages.slice(-5); // Last 5 messages
      return {
        messages: recentMessages,
        summary: result.summary,
        contextStrategy: "summarized",
      };
    }

    // 5. Fallback to most recent messages
    const recentMessages = result.messages.slice(-3);
    return {
      messages: recentMessages,
      summary: result.summary,
      contextStrategy: "recent",
    };
  }

  /**
   * Create or update session summary for long conversations
   */
  async summarizeSession(sessionId: string, llmConfig?: LLMConfig): Promise<string> {
    if (!this.config.enableSummarization) {
      throw new Error("Session summarization is disabled");
    }

    const fullHistory = await this.storage.getConversationHistory({
      sessionId,
      limit: 1000, // Get more history for summarization
      relevanceStrategy: "recent",
    });

    if (fullHistory.messages.length < 10) {
      return ""; // Not enough messages to summarize
    }

    // Use LLM to create summary
    if (llmConfig) {
      const llmProvider = createLLMProvider(llmConfig);
      
      const conversationText = fullHistory.messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      const summaryPrompt = `Please provide a concise summary of this conversation, focusing on:
1. Key topics discussed
2. Important decisions or outcomes
3. Relevant context for future interactions
4. User preferences or requirements mentioned

Conversation:
${conversationText}

Summary:`;

      const response = await llmProvider.generateResponse([
        { role: "user", content: summaryPrompt }
      ]);

      const summary = response.content;
      await this.storage.updateSessionSummary(sessionId, summary);
      return summary;
    }

    // Simple text-based summary if no LLM provided
    const topics = new Set<string>();
    fullHistory.messages.forEach((msg) => {
      if (msg.stateKey) {
        topics.add(msg.stateKey);
      }
    });

    const summary = `Conversation covered ${topics.size} topics: ${Array.from(topics).join(", ")}. ${fullHistory.messages.length} messages exchanged.`;
    await this.storage.updateSessionSummary(sessionId, summary);
    return summary;
  }

  /**
   * Search across conversation history
   */
  async searchConversations(
    query: string,
    userId?: string,
    limit: number = 20
  ): Promise<StoredMessage[]> {
    if (this.storage.searchAcrossSessions) {
      return this.storage.searchAcrossSessions(query, userId, limit);
    }
    throw new Error("Cross-session search not supported by storage implementation");
  }

  /**
   * Clean up old conversations
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    if (this.storage.cleanup) {
      return this.storage.cleanup(retentionDays);
    }
    return 0;
  }

  /**
   * Update working memory for a session
   */
  private async updateWorkingMemory(sessionId: string, newMessage: StoredMessage): Promise<void> {
    let messages = this.workingMemory.get(sessionId) || [];
    
    messages.push(newMessage);
    
    // Keep only recent messages in working memory
    if (messages.length > this.config.maxWorkingMemoryMessages!) {
      messages = messages.slice(-this.config.maxWorkingMemoryMessages!);
    }
    
    this.workingMemory.set(sessionId, messages);
  }

  /**
   * Estimate token count for messages (rough approximation)
   */
  private estimateTokenCount(messages: Array<{ content: string }>): number {
    const totalChars = messages.reduce((total, msg) => total + msg.content.length, 0);
    return Math.ceil(totalChars / 4); // Rough approximation: 4 chars per token
  }

  /**
   * Get session metadata
   */
  async getSession(sessionId: string): Promise<ConversationSession | null> {
    return this.storage.getSession(sessionId);
  }

  /**
   * Generate embedding for semantic search
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (this.storage.generateEmbedding) {
      return this.storage.generateEmbedding(text);
    }
    return null;
  }
} 