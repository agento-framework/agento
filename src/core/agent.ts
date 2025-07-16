import type {
  StateConfig,
  Context,
  Tool,
  LLMConfig,
  AgentContext,
  ResolvedState,
  ToolResult,
  ConversationConfig,
} from "../types";
import type { LLMMessage } from "../llm/providers";
import { createLLMProvider } from "../llm/providers";
import { StateMachine } from "./state-machine";
import { IntentAnalyzer } from "./intent-analyzer";
import { ToolExecutor, type ToolFunction } from "./tool-executor";
import { ConversationManager } from "./conversation-manager";
import { createTemporalContext } from "./temporal-context";
import { temporalTools, temporalToolImplementations } from "./temporal-tools";
import { documentTools, documentToolImplementations } from "./document-tools";
import { createContextualAwarenessContext } from "./contextual-awareness";
import { createMemoryContext } from "./memory-system.js";
import { externalIntegrationTools, externalIntegrationToolImplementations } from "./external-integration.js";
import { ContextOrchestrator, type ContextOrchestratorConfig, type KnowledgeBaseConnector } from "./context-orchestrator";

export interface AgentConfig {
  states: StateConfig[];
  contexts: Context[];
  tools: Tool[];
  defaultLLMConfig: LLMConfig;
  intentAnalyzerConfig?: LLMConfig;
  maxToolIterations?: number;
  conversationConfig?: ConversationConfig;
  contextOrchestratorConfig?: ContextOrchestratorConfig;
  knowledgeBaseConnector?: KnowledgeBaseConnector;
}

export class Agent {
  private stateMachine: StateMachine;
  private intentAnalyzer: IntentAnalyzer;
  private toolExecutor: ToolExecutor;
  private maxToolIterations: number;
  private conversationManager?: ConversationManager;
  private contextOrchestrator?: ContextOrchestrator;

  constructor(config: AgentConfig) {
    // Add comprehensive context awareness to all agents by default
    const temporalContext = createTemporalContext();
    const contextualAwarenessContext = createContextualAwarenessContext();
    const memoryContext = createMemoryContext();
    const enhancedContexts = [...config.contexts, temporalContext, contextualAwarenessContext, memoryContext];
    
    // Add comprehensive tools to all agents by default
    const enhancedTools = [...config.tools, ...temporalTools, ...documentTools, ...externalIntegrationTools];
    
    this.stateMachine = new StateMachine(
      config.states,
      enhancedContexts,
      enhancedTools,
      config.defaultLLMConfig
    );

    const analyzerConfig = config.intentAnalyzerConfig || config.defaultLLMConfig;
    this.intentAnalyzer = new IntentAnalyzer(analyzerConfig, this.stateMachine);
    
    this.toolExecutor = new ToolExecutor();
    this.maxToolIterations = config.maxToolIterations || 5;

    // Register all tool implementations by default
    this.toolExecutor.registerTools(temporalToolImplementations);
    this.toolExecutor.registerTools(documentToolImplementations);
    this.toolExecutor.registerTools(externalIntegrationToolImplementations);

    // Initialize conversation manager if storage is provided
    if (config.conversationConfig) {
      this.conversationManager = new ConversationManager(config.conversationConfig);
    }

    // Initialize context orchestrator if configured
    if (config.contextOrchestratorConfig) {
      this.contextOrchestrator = new ContextOrchestrator({
        ...config.contextOrchestratorConfig,
        knowledgeBaseConnector: config.knowledgeBaseConnector
      });
    }
  }

  /**
   * Register tool function implementations
   */
  registerTool(toolName: string, implementation: ToolFunction): void {
    this.toolExecutor.registerTool(toolName, implementation);
  }

  /**
   * Register multiple tool function implementations
   */
  registerTools(tools: Record<string, ToolFunction>): void {
    this.toolExecutor.registerTools(tools);
  }

  /**
   * Process a user query with advanced context orchestration
   */
  async processQuery(
    userId: string,
    userQuery: string,
    sessionId?: string,
    conversationHistory: Array<{
      role: "user" | "assistant" | "tool";
      content: string;
      intentReasoning?: string;
      toolCalls?: any[];
      toolCallId?: string;
      toolResults?: ToolResult[];
      timestamp?: Date;
    }> = [],
    metadata: Record<string, any> = {}
  ): Promise<{
    response: string;
    selectedState: ResolvedState;
    toolResults: ToolResult[];
    confidence: number;
    reasoning: string;
    sessionId?: string;
    contextOrchestrationResult?: any;
  }> {
    let effectiveHistory = conversationHistory;
    let effectiveSessionId = sessionId;

    // If conversation manager is available and sessionId is provided, get optimized history
    if (this.conversationManager && sessionId) {
      const optimizedContext = await this.conversationManager.getOptimizedContext(
        sessionId,
        userQuery
      );
      effectiveHistory = optimizedContext.messages;
      
      // Include summary in metadata if available
      if (optimizedContext.summary) {
        metadata.conversationSummary = optimizedContext.summary;
        metadata.contextStrategy = optimizedContext.contextStrategy;
      }
    }
    console.log('effectiveHistory: ', effectiveHistory);

    // CONTEXT ORCHESTRATION - The "Scanning Ball" in Action
    let contextOrchestrationResult;
    let enhancedContexts = this.stateMachine.getAllContexts();
    
    if (this.contextOrchestrator) {
      contextOrchestrationResult = await this.contextOrchestrator.orchestrateContext(
        userQuery,
        effectiveHistory.map(h => ({ 
          role: h.role, 
          content: h.content, 
          timestamp: h.timestamp || new Date() 
        })),
        this.stateMachine.getAllTools(),
        enhancedContexts,
        metadata
      );

      // Create dynamic contexts from orchestration results
      const dynamicContexts = contextOrchestrationResult.selectedContexts.map((candidate, index) => ({
        key: `dynamic_context_${index}`,
        description: `Dynamic context: ${candidate.reasoning}`,
        content: candidate.content,
        priority: 100 + candidate.relevanceScore * 10 // High priority for orchestrated contexts
      }));

      // Merge with existing contexts
      enhancedContexts = [...enhancedContexts, ...dynamicContexts];
      
      // Add orchestration insights to metadata
      metadata.contextOrchestration = {
        strategy: contextOrchestrationResult.contextStrategy,
        totalRelevanceScore: contextOrchestrationResult.totalRelevanceScore,
        conceptMap: Object.fromEntries(contextOrchestrationResult.conceptMap),
        reasoningChain: contextOrchestrationResult.reasoningChain.map(r => r.reasoning)
      };
    }

    // Step 1: Analyze intent to determine the appropriate state
    const intentAnalysis = await this.intentAnalyzer.analyzeIntentWithContext(
      userId,
      userQuery,
      effectiveHistory.map((h) => ({ 
        role: h.role, 
        content: h.content,
        intentReasoning: h.intentReasoning 
      })),
      metadata
    );

    const selectedState = this.stateMachine.getStateByKey(intentAnalysis.selectedStateKey);
    if (!selectedState) {
      throw new Error(`Selected state '${intentAnalysis.selectedStateKey}' not found`);
    }

    // Update the selected state with orchestrated contexts
    const enhancedState = {
      ...selectedState,
      contexts: enhancedContexts.filter(ctx => 
        selectedState.contexts.some(stateCtx => stateCtx.key === ctx.key) ||
        ctx.key.startsWith('dynamic_context_')
      )
    };

    // Step 2: Check onEnter guard
    if (selectedState.onEnter) {
      const guardContext = {
        userId,
        userQuery,
        previousState: effectiveHistory.length > 0 
          ? effectiveHistory[effectiveHistory.length - 1].content 
          : undefined,
        metadata,
      };
      const guardResult = await this.executeGuard(selectedState.onEnter, guardContext);

      if (!guardResult.allowed) {
        const guardResponse = await this.handleGuardFailure(userId, guardResult, userQuery, effectiveHistory, metadata);
        
        // Store guard failure response if persistence is enabled
        if (this.conversationManager && sessionId) {
          await this.conversationManager.storeMessage(sessionId, "user", userQuery, { 
            metadata,
            intentReasoning: intentAnalysis.reasoning 
          });
          await this.conversationManager.storeMessage(sessionId, "assistant", guardResponse.response, {
            stateKey: guardResponse.selectedState.key,
            metadata: { ...metadata, guardFailure: true }
          });
        }
        
        return { ...guardResponse, contextOrchestrationResult };
      }
    }

    // Step 3: Store user message with intent reasoning if persistence is enabled
    if (this.conversationManager && sessionId) {
      await this.conversationManager.storeMessage(sessionId, "user", userQuery, { 
        metadata,
        intentReasoning: intentAnalysis.reasoning 
      });
    }

    // Step 4: Build context for the LLM using enhanced state
    // Include intent analysis reasoning in metadata for LLM context
    const enhancedMetadata = {
      ...metadata,
      intentAnalysis: {
        selectedState: intentAnalysis.selectedStateKey,
        confidence: intentAnalysis.confidence,
        reasoning: intentAnalysis.reasoning
      }
    };

    const agentContext: AgentContext = {
      userQuery,
      selectedState: enhancedState,
      toolResults: [],
      conversationHistory: effectiveHistory,
      metadata: enhancedMetadata,
    };

    // Step 5: Process with LLM and tools
    const result = await this.processWithLLM(agentContext);

    // CONTEXT ORCHESTRATION - Process Agent Response
    if (this.contextOrchestrator) {
      await this.contextOrchestrator.processAgentResponse(
        result.response,
        result.toolResults.map(tr => ({ toolName: tr.toolName, result: tr.result })),
        userQuery
      );
    }

    // Step 6: Store assistant response and tool results if persistence is enabled
    if (this.conversationManager && sessionId) {
      await this.conversationManager.storeMessage(sessionId, "assistant", result.response, {
        stateKey: selectedState.key,
        toolResults: result.toolResults,
        metadata: {
          ...metadata,
          confidence: intentAnalysis.confidence,
          reasoning: intentAnalysis.reasoning,
          contextOrchestration: metadata.contextOrchestration
        }
      });
    }

    // Step 7: Check onLeave guard
    if (selectedState.onLeave) {
      const guardContext = {
        userId,
        userQuery,
        previousState: effectiveHistory.length > 0
          ? effectiveHistory[effectiveHistory.length - 1].content
          : undefined,
        metadata,
      };
      const guardResult = await this.executeGuard(selectedState.onLeave, guardContext);

      if (!guardResult.allowed) {
        // Since onLeave guards typically don't have complex fallbacks,
        // we'll just throw an error.
        throw new Error(`Cannot leave state '${selectedState.key}' due to onLeave guard: ${guardResult.reason || 'Condition not met'}`);
      }
    }

    return {
      response: result.response,
      selectedState,
      toolResults: result.toolResults,
      confidence: intentAnalysis.confidence,
      reasoning: intentAnalysis.reasoning,
      sessionId: effectiveSessionId,
      contextOrchestrationResult
    };
  }

  /**
   * Backward compatible processQuery method
   */
  async processQueryLegacy(
    userId: string,
    userQuery: string,
    conversationHistory: Array<{
      role: "user" | "assistant" | "tool";
      content: string;
      toolCalls?: any[];
      toolCallId?: string;
      toolResults?: ToolResult[];
    }> = [],
    metadata: Record<string, any> = {}
  ): Promise<{
    response: string;
    selectedState: ResolvedState;
    toolResults: ToolResult[];
    confidence: number;
    reasoning: string;
  }> {
    return this.processQuery(
      userId,
      userQuery,
      undefined, // No session ID in legacy mode
      conversationHistory,
      metadata
    );
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(
    sessionId: string,
    currentQuery?: string,
    options?: {
      limit?: number;
      relevanceStrategy?: "recent" | "semantic" | "hybrid" | "keyword";
      minSimilarityScore?: number;
    }
  ): Promise<{
    messages: Array<{
      role: "user" | "assistant" | "tool";
      content: string;
      toolCalls?: any[];
      toolCallId?: string;
      toolResults?: ToolResult[];
    }>;
    summary?: string;
    truncated: boolean;
  }> {
    if (!this.conversationManager) {
      throw new Error("Conversation persistence is not enabled");
    }
    return this.conversationManager.getRelevantHistory(
      sessionId,
      currentQuery || '',
      options
    );
  }

  /**
   * Summarize a conversation session
   */
  async summarizeSession(sessionId: string): Promise<string> {
    if (!this.conversationManager) {
      throw new Error("Conversation persistence is not enabled");
    }
    // This is a simplified call; you might need to pass an LLM config
    // if your implementation requires it.
    return this.conversationManager.summarizeSession(sessionId);
  }

  /**
   * Search across all conversations
   */
  async searchConversations(
    query: string,
    userId?: string,
    limit: number = 20
  ): Promise<Array<{
    sessionId: string;
    content: string;
    timestamp: Date;
    stateKey?: string;
  }>> {
    if (!this.conversationManager) {
      throw new Error("Conversation persistence is not enabled");
    }
    const results = await this.conversationManager.searchConversations(query, userId, limit);
    return results.map(r => ({
      sessionId: r.sessionId,
      content: r.content,
      timestamp: r.timestamp,
      stateKey: r.stateKey
    }));
  }

  /**
   * Clean up old conversations based on a retention policy
   */
  async cleanupConversations(retentionDays: number = 90): Promise<number> {
    if (!this.conversationManager) {
      throw new Error("Conversation persistence is not enabled");
    }
    return this.conversationManager.cleanup(retentionDays);
  }

  /**
   * Check if conversation persistence is enabled
   */
  isPersistenceEnabled(): boolean {
    return !!this.conversationManager;
  }

  /**
   * Process with LLM including tool calling iterations
   */
  private async processWithLLM(context: AgentContext): Promise<{
    response: string;
    toolResults: ToolResult[];
  }> {
    const llmProvider = createLLMProvider(context.selectedState.llmConfig);
    const allToolResults: ToolResult[] = [];
    let iterations = 0;

    // Build initial context
    let contextContent = await this.buildContextContent(context.selectedState.contexts);
    
    // Build system message with context and prompt
    const systemMessage = this.buildSystemMessage(
      context.selectedState.fullPrompt,
      contextContent,
      context.metadata
    );

    // Build conversation messages
    const messages: LLMMessage[] = [
      { role: "system", content: systemMessage },
      ...context.conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        toolCallId: msg.toolCallId,
      })),
      { role: "user", content: context.userQuery },
    ];

    while (iterations < this.maxToolIterations) {
      // Get LLM response
      const response = await llmProvider.generateResponse(
        messages,
        context.selectedState.tools
      );

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return {
          response: response.content,
          toolResults: allToolResults,
        };
      }

      // Execute tool calls
      const toolCalls = response.toolCalls.map((tc) => ({
        name: tc.function.name,
        args: tc.function.arguments,
      }));

      const toolResults = await this.toolExecutor.executeTools(toolCalls);
      allToolResults.push(...toolResults);

      // Add tool results to conversation
      messages.push({
        role: "assistant",
        content: response.content,
        toolCalls: response.toolCalls,
      });

      // Add tool result messages with proper tool_call_id linking
      for (let i = 0; i < toolResults.length; i++) {
        const toolResult = toolResults[i];
        const toolCall = response.toolCalls[i];
        
        messages.push({
          role: "tool" as const,
          content: toolResult.success
            ? typeof toolResult.result === "object"
              ? JSON.stringify(toolResult.result, null, 2)
              : String(toolResult.result)
            : `Error: ${toolResult.error}`,
          toolCallId: toolCall.id,
        });
      }

      iterations++;
    }

    // If we hit max iterations, return the last response
    throw new Error(
      `Maximum tool iterations (${this.maxToolIterations}) reached without completion`
    );
  }

  /**
   * Build context content from context definitions
   */
  private async buildContextContent(contexts: Context[]): Promise<string> {
    const contextParts: string[] = [];

    for (const context of contexts) {
      let content: string;
      
      if (typeof context.content === "function") {
        content = await context.content();
      } else {
        content = context.content;
      }

      contextParts.push(`${context.description}:\n${content}`);
    }

    return contextParts.join("\n\n");
  }

  /**
   * Build system message combining prompt, context, and metadata
   */
  private buildSystemMessage(
    prompt: string,
    contextContent: string,
    metadata: Record<string, any>
  ): string {
    let systemMessage = prompt;

    if (contextContent) {
      systemMessage += `\n\n--- Context ---\n${contextContent}`;
    }

    // Handle intent analysis reasoning specially for better formatting
    if (metadata.intentAnalysis) {
      const { selectedState, confidence, reasoning } = metadata.intentAnalysis;
      systemMessage += `\n\n--- Intent Analysis ---\nSelected State: ${selectedState} (${confidence}% confidence)\nReasoning: ${reasoning}\n`;
      
      // Remove intentAnalysis from metadata to avoid duplication
      const { intentAnalysis, ...otherMetadata } = metadata;
      metadata = otherMetadata;
    }

    if (Object.keys(metadata).length > 0) {
      const metadataStr = Object.entries(metadata)
        .filter(([key, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          // Handle complex objects better
          if (typeof value === 'object') {
            return `${key}: ${JSON.stringify(value, null, 2)}`;
          }
          return `${key}: ${value}`;
        })
        .join("\n");
      
      if (metadataStr) {
        systemMessage += `\n\n--- Additional Information ---\n${metadataStr}`;
      }
    }

    return systemMessage;
  }

  /**
   * Get available leaf states
   */
  getAvailableStates(): Array<{
    key: string;
    description: string;
    path: string[];
  }> {
    return this.stateMachine.getLeafStateTree();
  }

  /**
   * Get state by key
   */
  getState(key: string): ResolvedState | null {
    return this.stateMachine.getStateByKey(key);
  }

  /**
   * Get registered tools
   */
  getRegisteredTools(): string[] {
    return this.toolExecutor.getRegisteredTools();
  }

  /**
   * Execute a guard function and normalize the result
   */
  private async executeGuard(
    guard: any,
    context: {
      userId: string;
      userQuery: string;
      previousState?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ allowed: boolean; reason?: string; alternativeAction?: string; fallbackStateKey?: string; customMessage?: string }> {
    // The context is now passed in correctly, so we don't need to create a new one.
    
    // Check if it's an enhanced guard function
    if (typeof guard === 'function' && guard.length === 1) {
        const result = await Promise.resolve(guard(context));
        if (typeof result === 'boolean') {
            return { allowed: result };
        }
        // It's an enhanced guard
        return result;
    }
    
    // Fallback for simple boolean guards
    const isAllowed = await Promise.resolve(guard(context));
    return { allowed: isAllowed };
  }

  /**
   * Handle guard failure with intelligent LLM response
   */
  private async handleGuardFailure(
    userId: string,
    guardResult: { allowed: boolean; reason?: string; alternativeAction?: string; fallbackStateKey?: string; customMessage?: string },
    userQuery: string,
    conversationHistory: Array<{
      role: "user" | "assistant" | "tool";
      content: string;
      toolCalls?: any[];
      toolCallId?: string;
      toolResults?: ToolResult[];
    }>,
    metadata: Record<string, any>
  ): Promise<{
    response: string;
    selectedState: ResolvedState;
    toolResults: ToolResult[];
    confidence: number;
    reasoning: string;
  }> {
    switch (guardResult.alternativeAction) {
      case "fallback_state":
        if (guardResult.fallbackStateKey) {
          const fallbackState = this.stateMachine.getStateByKey(
            guardResult.fallbackStateKey
          );
          if (fallbackState) {
            return {
              response:
                guardResult.customMessage ||
                `Action not allowed. Falling back to ${fallbackState.description}.`,
              selectedState: fallbackState,
              toolResults: [],
              confidence: 1.0,
              reasoning: `Guard failure fallback: ${guardResult.reason}`,
            };
          }
        }
        break;
      case "custom_response":
        return {
          response:
            guardResult.customMessage ||
            guardResult.reason ||
            "Action not allowed.",
          selectedState: this.stateMachine.getLeafStates()[0],
          toolResults: [],
          confidence: 1.0,
          reasoning: `Guard failure: ${guardResult.reason}`,
        };
      default:
        // Use LLM to generate a helpful response for the guard failure
        return this.handleGuardFailureWithLLM(
          userId,
          guardResult,
          userQuery,
          conversationHistory,
          metadata
        );
    }
    // Default fallback if the above logic fails
    return {
        response: guardResult.reason || "Action not allowed.",
        selectedState: this.stateMachine.getLeafStates()[0],
        toolResults: [],
        confidence: 1.0,
        reasoning: "Guard failure with no specific fallback action."
    };
  }

  /**
   * Use LLM to handle guard failure contextually
   */
  private async handleGuardFailureWithLLM(
    userId: string,
    guardResult: { allowed: boolean; reason?: string },
    userQuery: string,
    conversationHistory: Array<{
      role: "user" | "assistant" | "tool";
      content: string;
      toolCalls?: any[];
      toolCallId?: string;
      toolResults?: ToolResult[];
    }>,
    metadata: Record<string, any>
  ): Promise<{
    response: string;
    selectedState: ResolvedState;
    toolResults: ToolResult[];
    confidence: number;
    reasoning: string;
  }> {
    const llm = createLLMProvider(this.stateMachine.getLeafStates()[0].llmConfig);

    const systemMessage = `You are a helpful assistant. The user's request was denied for the following reason: "${
      guardResult.reason
    }". Please provide a helpful and polite response explaining this to the user. Do not offer to perform the denied action.`;

    const messages: LLMMessage[] = [
      { role: "system", content: systemMessage },
      ...conversationHistory.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: userQuery },
    ];

    const llmResponse = await llm.generateResponse(messages);

    return {
      response: llmResponse.content,
      selectedState: this.stateMachine.getLeafStates()[0],
      toolResults: [],
      confidence: 1.0,
      reasoning: "Guard failure response generated by LLM.",
    };
  }

  /**
   * Get context orchestration insights
   */
  getContextOrchestrationInsights(): any {
    if (!this.contextOrchestrator) {
      return null;
    }
    return this.contextOrchestrator.getOrchestrationInsights();
  }

  /**
   * Check if context orchestration is enabled
   */
  isContextOrchestrationEnabled(): boolean {
    return !!this.contextOrchestrator;
  }
} 