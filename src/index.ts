// Core framework exports
export { Agent, type AgentConfig } from "./core/agent.js";
export { StateMachine } from "./core/state-machine.js";
export { IntentAnalyzer } from "./core/intent-analyzer.js";
export { ToolExecutor, type ToolFunction } from "./core/tool-executor.js";
export { ConversationManager } from "./core/conversation-manager.js";

// LLM provider exports
export {
  LLMProvider,
  GroqProvider,
  OpenAIProvider,
  AnthropicProvider,
  createLLMProvider,
  type LLMMessage,
  type LLMResponse,
} from "./llm/providers.js";

// Export vector storage abstractions and implementations
export {
  // Core interfaces
  type VectorEmbedding,
  type VectorSearchResult,
  type VectorSearchOptions,
  type EmbeddingProvider,
  type VectorStorage,
  type VectorKnowledgeBase,
  
  // Base implementations
  OpenAIEmbeddingProvider,
  HuggingFaceEmbeddingProvider,
  JinaEmbeddingProvider,
  OllamaEmbeddingProvider,
  InMemoryVectorStorage,
  VectorKnowledgeBaseImpl,
  VectorStorageFactory,
} from "./core/vector-storage.js";

export {
  // Vector database adapters
  PineconeVectorStorage,
  WeaviateVectorStorage,
  ChromaVectorStorage,
  VectorAdapterFactory,
} from "./core/vector-adapters.js";

// Embedding provider factory
export {
  EmbeddingProviderFactory,
} from "./core/embedding-factory.js";

// Type exports
export type {
  StateConfig,
  ResolvedState,
  Context,
  Tool,
  LLMConfig,
  GuardFunction,
  EnhancedGuardFunction,
  GuardResult,
  ToolResult,
  AgentContext,
  IntentAnalysis,
  StoredMessage,
  ConversationSession,
  ConversationQueryOptions,
  ConversationQueryResult,
  ConversationStorage,
  ConversationConfig,
} from "./types.js";

// Built-in tools exports
export { temporalTools, temporalToolImplementations } from './core/temporal-tools.js';
export { documentTools, documentToolImplementations } from './core/document-tools.js';
export { externalIntegrationTools, externalIntegrationToolImplementations } from './core/external-integration.js';

// Schema exports for validation
export {
  ToolParameterSchema,
  ToolFunctionSchema,
  ToolSchema,
} from "./types.js"; 