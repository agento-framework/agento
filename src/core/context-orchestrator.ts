import type { Context, LLMConfig, Tool } from "../types";
import type { LLMMessage } from "../llm/providers";
import { createLLMProvider } from "../llm/providers";

/**
 * Context Orchestration System - "Scanning Ball" Implementation
 * Dynamically manages and evolves context based on conversation flow
 */

export interface ContextReasoningEntry {
  id: string;
  timestamp: Date;
  trigger: 'user_query' | 'agent_response' | 'tool_execution' | 'knowledge_retrieval';
  reasoning: string;
  extractedConcepts: string[];
  relevanceScore: number;
  contextSources: string[];
  connectionPattern: string;
}

export interface ContextCandidate {
  source: 'conversation' | 'knowledge_base' | 'tool_result' | 'user_profile' | 'temporal' | 'cultural';
  content: string;
  relevanceScore: number;
  reasoning: string;
  concepts: string[];
  timeDecay: number;
  connectionStrength: number;
}

export interface ContextScanResult {
  selectedContexts: ContextCandidate[];
  reasoningChain: ContextReasoningEntry[];
  conceptMap: Map<string, number>;
  totalRelevanceScore: number;
  contextStrategy: 'focused' | 'exploratory' | 'comprehensive' | 'minimal';
}

export interface ContextOrchestratorConfig {
  contextLLMConfig: LLMConfig;
  maxContextTokens: number;
  maxReasoningHistory: number;
  relevanceThreshold: number;
  enableConceptMapping: boolean;
  enableSemanticClustering: boolean;
  timeDecayFactor: number;
  knowledgeBaseConnector?: KnowledgeBaseConnector;
}

export interface KnowledgeBaseConnector {
  search(query: string, concepts: string[]): Promise<Array<{
    content: string;
    relevance: number;
    source: string;
    metadata: Record<string, any>;
  }>>;
  
  getRelatedConcepts(concepts: string[]): Promise<string[]>;
}

export class ContextOrchestrator {
  private contextLLM: any;
  private config: ContextOrchestratorConfig;
  private reasoningHistory: ContextReasoningEntry[] = [];
  private conceptEvolution: Map<string, Array<{ timestamp: Date; strength: number }>> = new Map();
  private contextMemory: Map<string, ContextCandidate> = new Map();

  constructor(config: ContextOrchestratorConfig) {
    this.config = config;
    this.contextLLM = createLLMProvider(config.contextLLMConfig);
  }

  /**
   * Main orchestration method - the "scanning ball" in action
   */
  async orchestrateContext(
    userQuery: string,
    conversationHistory: Array<{ role: string; content: string; timestamp?: Date }>,
    availableTools: Tool[],
    existingContexts: Context[],
    metadata: Record<string, any> = {}
  ): Promise<ContextScanResult> {
    
    // Step 1: Analyze current query for concepts and intent
    const queryAnalysis = await this.analyzeQueryConcepts(userQuery, conversationHistory);
    
    // Step 2: Scan and reason about previous context reasoning
    const previousReasoningInsights = await this.scanPreviousReasoning(queryAnalysis.concepts);
    
    // Step 3: Perform knowledge base RAG search
    const knowledgeResults = await this.performKnowledgeSearch(
      userQuery, 
      queryAnalysis.concepts,
      previousReasoningInsights.relatedConcepts
    );
    
    // Step 4: Assess tool relevance
    const toolRelevance = await this.assessToolRelevance(
      userQuery,
      queryAnalysis.concepts,
      availableTools
    );
    
    // Step 5: Synthesize all context candidates
    const contextCandidates = await this.synthesizeContextCandidates(
      queryAnalysis,
      previousReasoningInsights,
      knowledgeResults,
      toolRelevance,
      conversationHistory,
      existingContexts
    );
    
    // Step 6: Select optimal context set
    const selectedContexts = await this.selectOptimalContexts(
      contextCandidates,
      queryAnalysis.intent,
      this.config.maxContextTokens
    );
    
    // Step 7: Update reasoning history
    const reasoningEntry = await this.createReasoningEntry(
      userQuery,
      queryAnalysis,
      selectedContexts,
      'user_query'
    );
    
    this.addToReasoningHistory(reasoningEntry);
    
    // Step 8: Update concept evolution tracking
    this.updateConceptEvolution(queryAnalysis.concepts, selectedContexts);
    
    return {
      selectedContexts,
      reasoningChain: this.reasoningHistory.slice(-5), // Last 5 reasoning steps
      conceptMap: this.buildConceptMap(selectedContexts),
      totalRelevanceScore: selectedContexts.reduce((sum, c) => sum + c.relevanceScore, 0),
      contextStrategy: this.determineContextStrategy(selectedContexts, queryAnalysis)
    };
  }

  /**
   * Process agent response to update context understanding
   */
  async processAgentResponse(
    agentResponse: string,
    toolResults: Array<{ toolName: string; result: any }>,
    userQuery: string
  ): Promise<void> {
    
    // Analyze agent response for new concepts and patterns
    const responseAnalysis = await this.analyzeResponseConcepts(agentResponse, toolResults);
    
    // Create reasoning entry for agent response
    const reasoningEntry = await this.createReasoningEntry(
      agentResponse,
      responseAnalysis,
      [], // No context selection for responses, just analysis
      'agent_response'
    );
    
    this.addToReasoningHistory(reasoningEntry);
    
    // Update concept evolution with response insights
    this.updateConceptEvolution(responseAnalysis.concepts, []);
    
    // Learn from tool usage patterns
    if (toolResults.length > 0) {
      await this.learnFromToolUsage(toolResults, responseAnalysis.concepts);
    }
  }

  /**
   * Analyze query to extract concepts and intent
   */
  private async analyzeQueryConcepts(
    query: string,
    conversationHistory: Array<{ role: string; content: string; timestamp?: Date }>
  ): Promise<{
    concepts: string[];
    intent: string;
    complexity: 'simple' | 'moderate' | 'complex';
    contextNeeds: string[];
  }> {
    
    const recentHistory = conversationHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n');
    
    const prompt = `Analyze this user query in the context of recent conversation to extract key concepts and understand intent.

Recent Conversation:
${recentHistory}

Current Query: "${query}"

Extract:
1. Key concepts (entities, topics, themes)
2. User intent (what they're trying to accomplish)
3. Complexity level (simple/moderate/complex)
4. Context needs (what additional information would help)

Respond with JSON:
{
  "concepts": ["concept1", "concept2", ...],
  "intent": "clear description of user intent",
  "complexity": "simple|moderate|complex",
  "contextNeeds": ["type1", "type2", ...]
}`;

    const response = await this.contextLLM.generateResponse([
      { role: "system", content: "You are an expert at analyzing user queries. You MUST respond with ONLY valid JSON, no explanations or additional text." },
      { role: "user", content: prompt }
    ]);

    try {
      // Clean the response to ensure it's valid JSON
      let cleanedContent = response.content.trim();
      
      // Remove markdown code blocks if present
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Find JSON object if response has extra text
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }
      
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error("Failed to parse query analysis:", error);
      console.error("Raw response:", response.content);
      return {
        concepts: [query.toLowerCase()],
        intent: "general inquiry",
        complexity: "simple",
        contextNeeds: ["general"]
      };
    }
  }

  /**
   * Scan previous reasoning to identify patterns and connections
   */
  private async scanPreviousReasoning(currentConcepts: string[]): Promise<{
    relatedConcepts: string[];
    patterns: string[];
    connectionStrength: number;
    strategicInsights: string[];
  }> {
    
    if (this.reasoningHistory.length === 0) {
      return {
        relatedConcepts: [],
        patterns: [],
        connectionStrength: 0,
        strategicInsights: []
      };
    }

    const recentReasoning = this.reasoningHistory.slice(-5);
    const historicalConcepts = recentReasoning.flatMap(r => r.extractedConcepts);
    
    const prompt = `Analyze the connection between current concepts and previous reasoning to identify patterns and related concepts.

Current Concepts: ${currentConcepts.join(', ')}

Previous Reasoning History:
${recentReasoning.map(r => `- ${r.reasoning} (concepts: ${r.extractedConcepts.join(', ')})`).join('\n')}

Historical Concepts: ${historicalConcepts.join(', ')}

Identify:
1. Related concepts from history that connect to current concepts
2. Patterns in reasoning or concept evolution
3. Connection strength (0-1) between current and historical concepts
4. Strategic insights for context selection

Respond with JSON:
{
  "relatedConcepts": ["concept1", "concept2", ...],
  "patterns": ["pattern1", "pattern2", ...],
  "connectionStrength": 0.75,
  "strategicInsights": ["insight1", "insight2", ...]
}`;

    const response = await this.contextLLM.generateResponse([
      { role: "system", content: "You are an expert at analyzing reasoning patterns and concept relationships." },
      { role: "user", content: prompt }
    ]);

    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error("Failed to parse reasoning analysis:", error);
      return {
        relatedConcepts: [],
        patterns: [],
        connectionStrength: 0,
        strategicInsights: []
      };
    }
  }

  /**
   * Perform knowledge base search using concepts and query
   */
  private async performKnowledgeSearch(
    query: string,
    concepts: string[],
    relatedConcepts: string[]
  ): Promise<Array<{
    content: string;
    relevance: number;
    source: string;
    concepts: string[];
  }>> {
    
    if (!this.config.knowledgeBaseConnector) {
      return [];
    }

    try {
      const allConcepts = [...concepts, ...relatedConcepts];
      const searchResults = await this.config.knowledgeBaseConnector.search(query, allConcepts);
      
      return searchResults.map(result => ({
        content: result.content,
        relevance: result.relevance,
        source: result.source,
        concepts: allConcepts.filter(concept => 
          result.content.toLowerCase().includes(concept.toLowerCase())
        )
      }));
    } catch (error) {
      console.error("Knowledge base search failed:", error);
      return [];
    }
  }

  /**
   * Assess relevance of available tools for current context
   */
  private async assessToolRelevance(
    query: string,
    concepts: string[],
    availableTools: Tool[]
  ): Promise<Array<{
    toolName: string;
    relevance: number;
    reasoning: string;
    concepts: string[];
  }>> {
    
    const toolDescriptions = availableTools.map(tool => 
      `${tool.function.name}: ${tool.function.description}`
    ).join('\n');

    const prompt = `Assess the relevance of available tools for handling this query and concepts.

Query: "${query}"
Concepts: ${concepts.join(', ')}

Available Tools:
${toolDescriptions}

For each tool, assess:
1. Relevance score (0-1) for the current query/concepts
2. Reasoning for the relevance assessment
3. Which concepts the tool relates to

Respond with JSON array:
[
  {
    "toolName": "tool_name",
    "relevance": 0.85,
    "reasoning": "explanation of relevance",
    "concepts": ["related_concept1", "related_concept2"]
  }
]`;

    const response = await this.contextLLM.generateResponse([
      { role: "system", content: "You are an expert at assessing tool relevance for user queries." },
      { role: "user", content: prompt }
    ]);

    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error("Failed to parse tool relevance analysis:", error);
      return [];
    }
  }

  /**
   * Synthesize all context candidates from different sources
   */
  private async synthesizeContextCandidates(
    queryAnalysis: any,
    previousInsights: any,
    knowledgeResults: any[],
    toolRelevance: any[],
    conversationHistory: any[],
    existingContexts: Context[]
  ): Promise<ContextCandidate[]> {
    
    const candidates: ContextCandidate[] = [];
    const now = new Date();

    // Add conversation history as context candidates
    conversationHistory.slice(-5).forEach((msg, index) => {
      const timeDecay = this.calculateTimeDecay(msg.timestamp || now, now);
      candidates.push({
        source: 'conversation',
        content: `${msg.role}: ${msg.content}`,
        relevanceScore: this.calculateConversationRelevance(msg.content, queryAnalysis.concepts),
        reasoning: `Recent conversation context (${msg.role})`,
        concepts: this.extractConceptsFromText(msg.content),
        timeDecay,
        connectionStrength: previousInsights.connectionStrength * (1 - index * 0.1)
      });
    });

    // Add knowledge base results as candidates
    knowledgeResults.forEach(result => {
      candidates.push({
        source: 'knowledge_base',
        content: result.content,
        relevanceScore: result.relevance,
        reasoning: `Knowledge base match from ${result.source}`,
        concepts: result.concepts,
        timeDecay: 1.0, // Knowledge doesn't decay
        connectionStrength: 0.8
      });
    });

    // Add tool context candidates
    toolRelevance.filter(tool => tool.relevance > 0.3).forEach(tool => {
      candidates.push({
        source: 'tool_result',
        content: `Tool available: ${tool.toolName} - ${tool.reasoning}`,
        relevanceScore: tool.relevance,
        reasoning: tool.reasoning,
        concepts: tool.concepts,
        timeDecay: 1.0,
        connectionStrength: 0.7
      });
    });

    // Add existing framework contexts
    existingContexts.forEach(async (context) => {
      const content = typeof context.content === 'function' ? await context.content() : context.content;
      candidates.push({
        source: context.key.includes('temporal') ? 'temporal' : 
               context.key.includes('cultural') ? 'cultural' : 'user_profile',
        content: content,
        relevanceScore: this.calculateContextRelevance(content, queryAnalysis.concepts),
        reasoning: `Framework context: ${context.description}`,
        concepts: this.extractConceptsFromText(content),
        timeDecay: 1.0,
        connectionStrength: 0.6
      });
    });

    return candidates.sort((a, b) => 
      (b.relevanceScore * b.timeDecay * b.connectionStrength) - 
      (a.relevanceScore * a.timeDecay * a.connectionStrength)
    );
  }

  /**
   * Select optimal context set based on relevance and token limits
   */
  private async selectOptimalContexts(
    candidates: ContextCandidate[],
    intent: string,
    maxTokens: number
  ): Promise<ContextCandidate[]> {
    
    const selected: ContextCandidate[] = [];
    let currentTokens = 0;
    const tokenEstimate = (text: string) => Math.ceil(text.length / 4); // Rough token estimation

    // Always include highest relevance candidates first
    for (const candidate of candidates) {
      const candidateTokens = tokenEstimate(candidate.content);
      
      if (currentTokens + candidateTokens <= maxTokens) {
        selected.push(candidate);
        currentTokens += candidateTokens;
      } else {
        break;
      }
    }

    return selected;
  }

  /**
   * Create reasoning entry for the history
   */
  private async createReasoningEntry(
    input: string,
    analysis: any,
    contexts: ContextCandidate[],
    trigger: ContextReasoningEntry['trigger']
  ): Promise<ContextReasoningEntry> {
    
    return {
      id: `reasoning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      trigger,
      reasoning: `Analyzed "${input}" - Intent: ${analysis.intent}, Concepts: ${analysis.concepts?.join(', ')}, Selected ${contexts.length} contexts`,
      extractedConcepts: analysis.concepts || [],
      relevanceScore: contexts.reduce((sum, c) => sum + c.relevanceScore, 0) / Math.max(contexts.length, 1),
      contextSources: contexts.map(c => c.source),
      connectionPattern: this.identifyConnectionPattern(contexts)
    };
  }

  // Helper methods
  private addToReasoningHistory(entry: ContextReasoningEntry): void {
    this.reasoningHistory.push(entry);
    if (this.reasoningHistory.length > this.config.maxReasoningHistory) {
      this.reasoningHistory.shift();
    }
  }

  private updateConceptEvolution(concepts: string[], contexts: ContextCandidate[]): void {
    concepts.forEach(concept => {
      if (!this.conceptEvolution.has(concept)) {
        this.conceptEvolution.set(concept, []);
      }
      
      const strength = contexts.filter(c => c.concepts.includes(concept))
        .reduce((sum, c) => sum + c.relevanceScore, 0);
      
      this.conceptEvolution.get(concept)!.push({
        timestamp: new Date(),
        strength
      });
    });
  }

  private calculateTimeDecay(messageTime: Date, currentTime: Date): number {
    const timeDiff = currentTime.getTime() - messageTime.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    return Math.exp(-hoursDiff * this.config.timeDecayFactor);
  }

  private calculateConversationRelevance(content: string, concepts: string[]): number {
    const lowerContent = content.toLowerCase();
    const matches = concepts.filter(concept => 
      lowerContent.includes(concept.toLowerCase())
    ).length;
    return Math.min(matches / concepts.length, 1.0);
  }

  private calculateContextRelevance(content: string, concepts: string[]): number {
    // Simple relevance calculation - can be enhanced with embeddings
    const lowerContent = content.toLowerCase();
    const matches = concepts.filter(concept => 
      lowerContent.includes(concept.toLowerCase())
    ).length;
    return Math.min(matches / Math.max(concepts.length, 1), 1.0);
  }

  private extractConceptsFromText(text: string): string[] {
    // Simple concept extraction - can be enhanced with NLP
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => word.length > 3 && !['the', 'and', 'or', 'but', 'for', 'with'].includes(word));
  }

  private buildConceptMap(contexts: ContextCandidate[]): Map<string, number> {
    const conceptMap = new Map<string, number>();
    contexts.forEach(context => {
      context.concepts.forEach(concept => {
        conceptMap.set(concept, (conceptMap.get(concept) || 0) + context.relevanceScore);
      });
    });
    return conceptMap;
  }

  private determineContextStrategy(contexts: ContextCandidate[], analysis: any): 'focused' | 'exploratory' | 'comprehensive' | 'minimal' {
    const avgRelevance = contexts.reduce((sum, c) => sum + c.relevanceScore, 0) / contexts.length;
    const sourceVariety = new Set(contexts.map(c => c.source)).size;
    
    if (avgRelevance > 0.8 && contexts.length <= 3) return 'focused';
    if (sourceVariety >= 3 && contexts.length >= 5) return 'comprehensive';
    if (analysis.complexity === 'complex') return 'exploratory';
    return 'minimal';
  }

  private identifyConnectionPattern(contexts: ContextCandidate[]): string {
    const sources = contexts.map(c => c.source);
    const uniqueSources = new Set(sources);
    
    if (uniqueSources.has('conversation') && uniqueSources.has('knowledge_base')) {
      return 'conversation-knowledge-bridge';
    }
    if (uniqueSources.has('tool_result') && uniqueSources.has('temporal')) {
      return 'action-temporal-link';
    }
    if (sources.filter(s => s === 'conversation').length > 2) {
      return 'conversation-heavy';
    }
    return 'distributed';
  }

  private async analyzeResponseConcepts(response: string, toolResults: any[]): Promise<any> {
    // Analyze agent response for concept extraction
    const toolContext = toolResults.map(t => `${t.toolName}: ${JSON.stringify(t.result)}`).join('\n');
    
    const prompt = `Analyze this agent response and tool results to extract concepts and patterns.

Agent Response: "${response}"

Tool Results:
${toolContext}

Extract:
1. Key concepts mentioned or implied
2. Reasoning patterns used
3. Knowledge domains touched
4. Tool usage effectiveness

Respond with JSON:
{
  "concepts": ["concept1", "concept2", ...],
  "reasoningPatterns": ["pattern1", "pattern2", ...],
  "knowledgeDomains": ["domain1", "domain2", ...],
  "toolEffectiveness": 0.85
}`;

    const llmResponse = await this.contextLLM.generateResponse([
      { role: "system", content: "You are an expert at analyzing AI agent responses and tool usage." },
      { role: "user", content: prompt }
    ]);

    try {
      return JSON.parse(llmResponse.content);
    } catch (error) {
      return {
        concepts: [],
        reasoningPatterns: [],
        knowledgeDomains: [],
        toolEffectiveness: 0.5
      };
    }
  }

  private async learnFromToolUsage(toolResults: any[], concepts: string[]): Promise<void> {
    // Learn from tool usage patterns for future context selection
    toolResults.forEach(result => {
      const toolKey = `tool_${result.toolName}_${concepts.join('_')}`;
      // Store tool usage patterns for future reference
      this.contextMemory.set(toolKey, {
        source: 'tool_result',
        content: `Tool ${result.toolName} used successfully with concepts: ${concepts.join(', ')}`,
        relevanceScore: 0.8,
        reasoning: `Learned pattern: ${result.toolName} effective for ${concepts.join(', ')}`,
        concepts,
        timeDecay: 1.0,
        connectionStrength: 0.9
      });
    });
  }

  /**
   * Get context orchestration insights for debugging/monitoring
   */
  getOrchestrationInsights(): {
    reasoningHistory: ContextReasoningEntry[];
    conceptEvolution: Map<string, Array<{ timestamp: Date; strength: number }>>;
    contextMemory: Map<string, ContextCandidate>;
    totalReasoningSteps: number;
    topConcepts: Array<{ concept: string; totalStrength: number }>;
  } {
    const topConcepts = Array.from(this.conceptEvolution.entries())
      .map(([concept, history]) => ({
        concept,
        totalStrength: history.reduce((sum, h) => sum + h.strength, 0)
      }))
      .sort((a, b) => b.totalStrength - a.totalStrength)
      .slice(0, 10);

    return {
      reasoningHistory: this.reasoningHistory,
      conceptEvolution: this.conceptEvolution,
      contextMemory: this.contextMemory,
      totalReasoningSteps: this.reasoningHistory.length,
      topConcepts
    };
  }
} 