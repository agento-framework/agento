import { z } from "zod";

// Tool calling schema compatible with OpenAI, Anthropic, and Groq
export const ToolParameterSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
  enum: z.array(z.string()).optional(),
  items: z.any().optional(),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
  default: z.any().optional(),
});

export const ToolFunctionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.object({
    type: z.literal("object"),
    properties: z.record(ToolParameterSchema),
    required: z.array(z.string()).optional(),
  }),
});

export const ToolSchema = z.object({
  type: z.literal("function"),
  function: ToolFunctionSchema,
});

export type Tool = z.infer<typeof ToolSchema>;
export type ToolFunction = z.infer<typeof ToolFunctionSchema>;

// Context definition
export interface Context {
  key: string;
  description: string;
  content: string | (() => string | Promise<string>);
  priority?: number;
}

// LLM Configuration
export interface LLMConfig {
  provider: "groq" | "openai" | "anthropic";
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  apiKey?: string;
}

// Guard function types
export type GuardFunction = (context: {
  userQuery: string;
  previousState?: string;
  metadata?: Record<string, any>;
}) => boolean | Promise<boolean>;

export type GuardResult = {
  allowed: boolean;
  reason?: string; // Optional explanation for why access was denied
  alternativeAction?: "fallback_state" | "custom_response";
  fallbackStateKey?: string;
  customMessage?: string;
};

export type EnhancedGuardFunction = (context: {
  userQuery: string;
  previousState?: string;
  metadata?: Record<string, any>;
}) => GuardResult | Promise<GuardResult>;

// State definition
export interface StateConfig {
  key: string;
  description: string;
  prompt?: string;
  llmConfig?: Partial<LLMConfig>;
  contexts?: string[]; // References to context keys
  tools?: string[]; // References to tool names
  children?: StateConfig[];
  onEnter?: GuardFunction | EnhancedGuardFunction;
  onLeave?: GuardFunction | EnhancedGuardFunction;
  metadata?: Record<string, any>;
}

// Resolved state (with inherited properties)
export interface ResolvedState {
  key: string;
  description: string;
  fullPrompt: string;
  llmConfig: LLMConfig;
  contexts: Context[];
  tools: Tool[];
  onEnter?: GuardFunction | EnhancedGuardFunction;
  onLeave?: GuardFunction | EnhancedGuardFunction;
  metadata: Record<string, any>;
  isLeaf: boolean;
  path: string[];
}

// Tool execution result
export interface ToolResult {
  toolName: string;
  success: boolean;
  result: any;
  error?: string;
}

// Agent execution context
export interface AgentContext {
  userQuery: string;
  selectedState: ResolvedState;
  toolResults: ToolResult[];
  conversationHistory: Array<{
    role: "user" | "assistant" | "tool";
    content: string;
    toolCalls?: any[];
    toolCallId?: string;
    toolResults?: ToolResult[];
  }>;
  metadata: Record<string, any>;
}

// Intent analysis result
export interface IntentAnalysis {
  selectedStateKey: string;
  confidence: number;
  reasoning: string;
}

/**
 * Represents a stored conversation message with metadata
 */
export interface StoredMessage {
  /** Unique identifier for the message */
  id: string;
  /** Session/conversation identifier */
  sessionId: string;
  /** Message role */
  role: "user" | "assistant" | "tool" | "system";
  /** Message content */
  content: string;
  /** Tool calls made by assistant */
  toolCalls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  /** Tool call ID for tool response messages */
  toolCallId?: string;
  /** Tool execution results */
  toolResults?: ToolResult[];
  /** Message timestamp */
  timestamp: Date;
  /** State that was active when this message was processed */
  stateKey?: string;
  /** Vector embedding for semantic search (optional) */
  embedding?: number[];
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Conversation session metadata
 */
export interface ConversationSession {
  /** Unique session identifier */
  id: string;
  /** Session creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** User identifier (optional) */
  userId?: string;
  /** Session summary for long conversations */
  summary?: string;
  /** Session metadata */
  metadata: Record<string, any>;
}

/**
 * Query parameters for retrieving relevant conversation history
 */
export interface ConversationQueryOptions {
  /** Session ID to query */
  sessionId: string;
  /** Current user query for semantic similarity */
  currentQuery?: string;
  /** Maximum number of messages to retrieve */
  limit?: number;
  /** Include messages from last N minutes */
  recentMinutes?: number;
  /** Minimum semantic similarity score (0-1) */
  minSimilarityScore?: number;
  /** Filter by specific states */
  stateKeys?: string[];
  /** Filter by roles */
  roles?: Array<"user" | "assistant" | "tool" | "system">;
  /** Include tool interactions */
  includeToolCalls?: boolean;
  /** Strategy for relevance ranking */
  relevanceStrategy?: "recent" | "semantic" | "hybrid" | "keyword";
  /** Keywords for keyword-based filtering */
  keywords?: string[];
}

/**
 * Result of conversation query with relevance scoring
 */
export interface ConversationQueryResult {
  /** Retrieved messages ordered by relevance */
  messages: StoredMessage[];
  /** Total number of messages in session */
  totalMessages: number;
  /** Session summary if available */
  sessionSummary?: string;
  /** Whether the conversation history was truncated */
  truncated: boolean;
}

/**
 * Storage interface for conversation persistence
 */
export interface ConversationStorage {
  /**
   * Store a message in a conversation session
   */
  storeMessage(message: Omit<StoredMessage, "id" | "timestamp">): Promise<StoredMessage>;

  /**
   * Retrieve conversation history with relevance filtering
   */
  getConversationHistory(options: ConversationQueryOptions): Promise<ConversationQueryResult>;

  /**
   * Create or update a conversation session
   */
  upsertSession(session: Omit<ConversationSession, "createdAt" | "lastActivityAt">): Promise<ConversationSession>;

  /**
   * Get session metadata
   */
  getSession(sessionId: string): Promise<ConversationSession | null>;

  /**
   * Update session summary (useful for long conversations)
   */
  updateSessionSummary(sessionId: string, summary: string): Promise<void>;

  /**
   * Generate embeddings for semantic search (optional)
   */
  generateEmbedding?(text: string): Promise<number[]>;

  /**
   * Search across multiple sessions (optional)
   */
  searchAcrossSessions?(query: string, userId?: string, limit?: number): Promise<StoredMessage[]>;

  /**
   * Clean up old conversations based on retention policy
   */
  cleanup?(retentionDays: number): Promise<number>;
}

/**
 * Configuration for conversation management
 */
export interface ConversationConfig {
  /** Storage implementation */
  storage: ConversationStorage;
  /** Maximum messages to keep in working memory */
  maxWorkingMemoryMessages?: number;
  /** Enable automatic session summarization */
  enableSummarization?: boolean;
  /** Token limit for conversation context */
  maxContextTokens?: number;
  /** Default relevance strategy */
  defaultRelevanceStrategy?: "recent" | "semantic" | "hybrid" | "keyword";
  /** Enable embeddings for semantic search */
  enableEmbeddings?: boolean;
} 