# Agento Framework - Complete API Reference

## Core Classes

### `Agent`

The main orchestrator class that coordinates all framework components.

#### Constructor

```typescript
constructor(config: AgentConfig)
```

**Parameters:**
- `config: AgentConfig` - Agent configuration object

**AgentConfig Interface:**
```typescript
interface AgentConfig {
  states: StateConfig[];                                    // State machine definition
  contexts: Context[];                                      // Global contexts
  tools: Tool[];                                           // Available tools
  defaultLLMConfig: LLMConfig;                            // Default LLM settings
  intentAnalyzerConfig?: LLMConfig;                       // Intent analyzer LLM
  maxToolIterations?: number;                             // Max tool call iterations (default: 5)
  conversationConfig?: ConversationConfig;               // Conversation persistence
  contextOrchestratorConfig?: ContextOrchestratorConfig; // Context orchestration
  knowledgeBaseConnector?: KnowledgeBaseConnector;       // Knowledge base integration
}
```

#### Methods

##### `processQuery()`
Process a user query with full framework capabilities.

```typescript
async processQuery(
  userId: string,
  userQuery: string,
  sessionId?: string,
  conversationHistory?: ConversationMessage[],
  metadata?: Record<string, any>
): Promise<AgentResponse>
```

**Parameters:**
- `userId: string` - Unique user identifier
- `userQuery: string` - User's input query
- `sessionId?: string` - Session ID for conversation persistence
- `conversationHistory?: ConversationMessage[]` - Previous conversation messages
- `metadata?: Record<string, any>` - Additional context metadata

**Returns:**
```typescript
interface AgentResponse {
  response: string;                         // Generated response
  selectedState: ResolvedState;            // State that handled the query
  toolResults: ToolResult[];               // Results from tool calls
  confidence: number;                      // Intent confidence (0-100)
  reasoning: string;                       // Intent analysis reasoning
  sessionId?: string;                      // Session ID if persistence enabled
  contextOrchestrationResult?: any;        // Context orchestration details
}
```

##### `registerTool()`
Register a single tool implementation.

```typescript
registerTool(toolName: string, implementation: ToolFunction): void
```

**Parameters:**
- `toolName: string` - Name matching tool definition
- `implementation: ToolFunction` - Tool execution function

**Example:**
```typescript
agent.registerTool("get_weather", async ({ location }) => {
  const weather = await weatherAPI.getCurrentWeather(location);
  return { temperature: weather.temp, condition: weather.condition };
});
```

##### `registerTools()`
Register multiple tool implementations.

```typescript
registerTools(tools: Record<string, ToolFunction>): void
```

**Parameters:**
- `tools: Record<string, ToolFunction>` - Object mapping tool names to implementations

##### `getConversationHistory()`
Retrieve conversation history for a session.

```typescript
async getConversationHistory(
  userId: string,
  sessionId: string,
  currentQuery?: string,
  options?: ConversationQueryOptions
): Promise<ConversationQueryResult>
```

##### `summarizeSession()`
Generate a summary of a conversation session.

```typescript
async summarizeSession(sessionId: string): Promise<string>
```

##### `searchConversations()`
Search across multiple conversation sessions.

```typescript
async searchConversations(
  query: string,
  userId?: string,
  limit?: number
): Promise<StoredMessage[]>
```

##### `getAvailableStates()`
Get information about all available states.

```typescript
getAvailableStates(): Array<{
  key: string;
  description: string;
  path: string[];
}>
```

##### `getState()`
Get detailed information about a specific state.

```typescript
getState(key: string): ResolvedState | null
```

---

## State Management

### `StateMachine`

Manages hierarchical state definitions and inheritance.

#### Constructor

```typescript
constructor(
  rootStates: StateConfig[],
  contexts: Context[],
  tools: Tool[],
  defaultLLMConfig: LLMConfig
)
```

#### Methods

##### `getLeafStates()`
Get all terminal states (states without children).

```typescript
getLeafStates(): ResolvedState[]
```

##### `getStateByKey()`
Find a specific state by its key.

```typescript
getStateByKey(key: string): ResolvedState | null
```

##### `getStateByPath()`
Get a state by its hierarchical path.

```typescript
getStateByPath(path: string[]): ResolvedState | null
```

---

## Type Definitions

### Core Interfaces

#### `StateConfig`
Configuration for defining agent states.

```typescript
interface StateConfig {
  key: string;                                    // Unique state identifier
  description: string;                           // Intent description for routing
  prompt?: string;                               // State-specific prompt
  llmConfig?: Partial<LLMConfig>;               // LLM configuration override
  contexts?: string[];                           // Referenced context keys
  tools?: string[];                              // Referenced tool names
  children?: StateConfig[];                      // Child states
  onEnter?: GuardFunction | EnhancedGuardFunction; // Entry guard
  onLeave?: GuardFunction | EnhancedGuardFunction; // Exit guard
  metadata?: Record<string, any>;                // Additional metadata
}
```

#### `Context`
Reusable context definitions.

```typescript
interface Context {
  key: string;                                   // Unique context identifier
  description: string;                           // Context description
  content: string | (() => string | Promise<string>); // Static or dynamic content
  priority?: number;                             // Priority for ordering (higher = first)
}
```

#### `Tool`
Tool definition following OpenAI function calling schema.

```typescript
interface Tool {
  type: "function";
  function: {
    name: string;                                // Tool name
    description: string;                         // Tool description
    parameters: {                                // JSON Schema for parameters
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}
```

#### `LLMConfig`
LLM provider configuration.

```typescript
interface LLMConfig {
  provider: "groq" | "openai" | "anthropic";     // LLM provider
  model: string;                                  // Model name
  temperature?: number;                           // Creativity (0-1)
  maxTokens?: number;                            // Max response tokens
  topP?: number;                                 // Nucleus sampling
  frequencyPenalty?: number;                     // Frequency penalty
  presencePenalty?: number;                      // Presence penalty
  apiKey?: string;                               // Provider API key
}
```

---

## Conversation Management

### `ConversationManager`

Handles conversation persistence and context optimization.

#### Constructor

```typescript
constructor(config: ConversationConfig)
```

**ConversationConfig:**
```typescript
interface ConversationConfig {
  storage: ConversationStorage;                  // Storage implementation
  maxWorkingMemoryMessages?: number;             // Memory message limit (default: 50)
  enableSummarization?: boolean;                 // Auto-summarization (default: true)
  maxContextTokens?: number;                     // Token limit (default: 8000)
  defaultRelevanceStrategy?: RelevanceStrategy;  // Default retrieval strategy
  enableEmbeddings?: boolean;                    // Semantic search (default: true)
}
```

#### Methods

##### `storeMessage()`
Store a conversation message.

```typescript
async storeMessage(
  sessionId: string,
  role: "user" | "assistant" | "tool" | "system",
  content: string,
  options?: MessageOptions
): Promise<StoredMessage>
```

##### `getRelevantHistory()`
Retrieve relevant conversation history.

```typescript
async getRelevantHistory(
  sessionId: string,
  currentQuery: string,
  options?: Partial<ConversationQueryOptions>
): Promise<ConversationQueryResult>
```

##### `getOptimizedContext()`
Get optimized context for LLM processing.

```typescript
async getOptimizedContext(
  sessionId: string,
  currentQuery: string,
  maxTokens?: number
): Promise<OptimizedContext>
```

---

## Vector Integration

### `VectorStorage`

Abstract interface for vector database operations.

#### Methods

##### `store()`
Store a single vector embedding.

```typescript
async store(embedding: Omit<VectorEmbedding, 'timestamp'>): Promise<string>
```

##### `storeBatch()`
Store multiple embeddings efficiently.

```typescript
async storeBatch(embeddings: Array<Omit<VectorEmbedding, 'timestamp'>>): Promise<string[]>
```

##### `search()`
Search for similar vectors.

```typescript
async search(
  queryVector: number[],
  options?: VectorSearchOptions
): Promise<VectorSearchResult[]>
```

##### `searchByText()`
Search using text query (generates embedding internally).

```typescript
async searchByText(
  queryText: string,
  options?: VectorSearchOptions
): Promise<VectorSearchResult[]>
```

### Vector Storage Implementations

#### `InMemoryVectorStorage`
Development and testing implementation.

```typescript
const storage = new InMemoryVectorStorage(embeddingProvider);
```

#### `PineconeVectorStorage`
Production-ready Pinecone integration.

```typescript
const storage = new PineconeVectorStorage({
  apiKey: process.env.PINECONE_API_KEY,
  environment: "us-west1-gcp",
  indexName: "agento-knowledge"
});
```

### Embedding Providers

#### `OpenAIEmbeddingProvider`
```typescript
const provider = new OpenAIEmbeddingProvider(
  process.env.OPENAI_API_KEY,
  "text-embedding-3-small"  // or "text-embedding-3-large"
);
```

#### `HuggingFaceEmbeddingProvider`
```typescript
const provider = new HuggingFaceEmbeddingProvider(
  process.env.HUGGINGFACE_API_KEY,
  "sentence-transformers/all-MiniLM-L6-v2"
);
```

---

## Context Orchestration

### `ContextOrchestrator`

Intelligent context management system.

#### Constructor

```typescript
constructor(config: ContextOrchestratorConfig)
```

**ContextOrchestratorConfig:**
```typescript
interface ContextOrchestratorConfig {
  contextLLMConfig: LLMConfig;                   // LLM for context analysis
  maxContextTokens: number;                      // Context token limit
  maxReasoningHistory: number;                   // Reasoning history size
  relevanceThreshold: number;                    // Minimum relevance score
  enableConceptMapping: boolean;                 // Concept relationship tracking
  enableSemanticClustering: boolean;             // Context clustering
  timeDecayFactor: number;                       // Time-based relevance decay
  knowledgeBaseConnector?: KnowledgeBaseConnector; // Knowledge base integration
}
```

#### Methods

##### `orchestrateContext()`
Main context orchestration method.

```typescript
async orchestrateContext(
  userQuery: string,
  conversationHistory: ConversationMessage[],
  availableTools: Tool[],
  existingContexts: Context[],
  metadata?: Record<string, any>
): Promise<ContextScanResult>
```

**Returns:**
```typescript
interface ContextScanResult {
  selectedContexts: ContextCandidate[];          // Selected context items
  reasoningChain: ContextReasoningEntry[];       // AI reasoning steps
  conceptMap: Map<string, number>;               // Concept importance scores
  totalRelevanceScore: number;                   // Combined relevance
  contextStrategy: 'focused' | 'exploratory' | 'comprehensive' | 'minimal';
}
```

---

## Tool Execution

### `ToolExecutor`

Manages tool registration and execution.

#### Methods

##### `registerTool()`
Register a single tool implementation.

```typescript
registerTool(toolName: string, implementation: ToolFunction): void
```

##### `executeTool()`
Execute a specific tool.

```typescript
async executeTool(toolName: string, args: any): Promise<ToolResult>
```

##### `executeTools()`
Execute multiple tools in parallel.

```typescript
async executeTools(
  toolCalls: Array<{ name: string; args: any }>
): Promise<ToolResult[]>
```

##### `executeToolsSequentially()`
Execute tools one after another.

```typescript
async executeToolsSequentially(
  toolCalls: Array<{ name: string; args: any }>
): Promise<ToolResult[]>
```

---

## LLM Providers

### `LLMProvider`

Abstract base class for LLM integrations.

#### Implementations

##### `GroqProvider`
```typescript
const provider = new GroqProvider({
  provider: "groq",
  model: "llama3-8b-8192",
  apiKey: process.env.GROQ_API_KEY
});
```

##### `OpenAIProvider`
```typescript
const provider = new OpenAIProvider({
  provider: "openai",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY
});
```

##### `AnthropicProvider`
```typescript
const provider = new AnthropicProvider({
  provider: "anthropic",
  model: "claude-3-sonnet-20240229",
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

---

## Guard Functions

### Basic Guard Function
```typescript
type GuardFunction = (context: {
  userQuery: string;
  previousState?: string;
  metadata?: Record<string, any>;
}) => boolean | Promise<boolean>;
```

### Enhanced Guard Function
```typescript
type EnhancedGuardFunction = (context: {
  userQuery: string;
  previousState?: string;
  metadata?: Record<string, any>;
}) => GuardResult | Promise<GuardResult>;

interface GuardResult {
  allowed: boolean;
  reason?: string;
  alternativeAction?: "fallback_state" | "custom_response";
  fallbackStateKey?: string;
  customMessage?: string;
}
```

---

## Built-in Tools

### Temporal Tools

#### `get_current_time_info`
Get comprehensive time information.

```typescript
{
  timezone?: string;                             // Target timezone
  includeConversationContext?: boolean;          // Include timing context
}
```

#### `calculate_time_difference`
Calculate time differences.

```typescript
{
  startDate: string;                             // Start time (ISO or relative)
  endDate?: string;                              // End time (default: now)
  unit?: "auto" | "minutes" | "hours" | "days"; // Output unit
}
```

#### `parse_relative_time`
Parse human-readable time expressions.

```typescript
{
  expression: string;                            // "tomorrow", "next friday", etc.
  referenceDate?: string;                        // Reference point
}
```

### External Integration Tools

#### `make_http_request`
Make HTTP API calls.

```typescript
{
  url: string;                                   // Request URL
  method?: "GET" | "POST" | "PUT" | "DELETE";   // HTTP method
  headers?: Record<string, string>;              // Request headers
  body?: any;                                    // Request body
  timeout?: number;                              // Request timeout (ms)
}
```

#### `transform_data`
Transform data structures.

```typescript
{
  data: any;                                     // Input data
  transformType: "json_to_csv" | "xml_to_json" | "flatten" | "extract_fields";
  options?: Record<string, any>;                // Transform options
}
```

---

## Factory Functions

### `createLLMProvider()`
Create LLM provider instances.

```typescript
function createLLMProvider(config: LLMConfig): LLMProvider
```

### `VectorStorageFactory`
Create vector storage instances.

```typescript
class VectorStorageFactory {
  static createInMemory(embeddingProvider: EmbeddingProvider): VectorStorage
  static createOpenAIEmbedding(apiKey: string, model?: string): EmbeddingProvider
  static createVectorKnowledgeBase(
    vectorStorage: VectorStorage,
    embeddingProvider: EmbeddingProvider
  ): VectorKnowledgeBase
}
```

---

## Configuration Examples

### Complete Agent Configuration

```typescript
const agent = new Agent({
  states: [
    {
      key: "customer_service",
      description: "Customer service operations",
      prompt: "You are a helpful customer service agent",
      contexts: ["company_info"],
      children: [
        {
          key: "order_support",
          description: "Handle order-related questions",
          tools: ["check_order_status", "update_order"],
          onEnter: async ({ metadata }) => {
            return metadata.authenticated === true;
          }
        }
      ]
    }
  ],
  contexts: [
    {
      key: "company_info",
      description: "Company information and policies",
      content: "Company: TechCorp...",
      priority: 100
    }
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "check_order_status",
        description: "Check order status",
        parameters: {
          type: "object",
          properties: {
            orderId: { type: "string", description: "Order ID" }
          },
          required: ["orderId"]
        }
      }
    }
  ],
  defaultLLMConfig: {
    provider: "groq",
    model: "llama3-8b-8192",
    temperature: 0.7
  },
  conversationConfig: {
    storage: new PostgreSQLConversationStorage(connectionString),
    enableSummarization: true,
    maxContextTokens: 8000
  },
  contextOrchestratorConfig: {
    contextLLMConfig: { provider: "groq", model: "llama3-8b-8192" },
    maxContextTokens: 8000,
    relevanceThreshold: 0.7,
    enableConceptMapping: true
  }
});
```

---

## Error Handling

### Common Error Types

#### `StateNotFoundError`
Thrown when a referenced state doesn't exist.

#### `ToolNotRegisteredError`
Thrown when executing an unregistered tool.

#### `LLMProviderError`
Thrown when LLM provider calls fail.

#### `StorageError`
Thrown during conversation storage operations.

### Error Handling Patterns

```typescript
try {
  const result = await agent.processQuery("user123", "Help me");
} catch (error) {
  if (error instanceof StateNotFoundError) {
    // Handle state routing errors
  } else if (error instanceof ToolNotRegisteredError) {
    // Handle missing tool implementations
  }
}
```

---

## TypeScript Support

### Full Type Safety

The framework provides complete TypeScript support with:

- **Strict typing** for all interfaces and classes
- **Generic types** for extensible components
- **Type guards** for runtime type checking
- **Utility types** for common patterns

### Custom Type Extensions

```typescript
// Extend metadata types
interface CustomMetadata extends Record<string, any> {
  userId: string;
  permissions: string[];
  sessionData: object;
}

// Use with agent
const result = await agent.processQuery<CustomMetadata>(
  "user123",
  "query",
  "session456",
  [],
  customMetadata
);
``` 