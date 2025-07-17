import type { LLMConfig, Context, ToolResult } from "../types";
import type { LLMMessage } from "../llm/providers";
import { createLLMProvider } from "../llm/providers";
import { ConversationFlowManager } from "./conversation-flow";
import type { ConversationState } from "./conversation-flow";
import { PersonalizationManager } from "./personalization-manager";
import { IterationPreventionManager } from "./iteration-prevention";

/**
 * Enhanced Response Generator
 * Generates natural, fluent responses using conversation flow, personalization, and iteration prevention
 */

export interface ResponseGenerationContext {
  userQuery: string;
  conversationHistory: Array<{ role: string; content: string; timestamp?: Date }>;
  toolResults: ToolResult[];
  contexts: Context[];
  metadata: Record<string, any>;
  userId: string;
  sessionId: string;
}

export interface EnhancedResponseConfig {
  llmConfig: LLMConfig;
  enableConversationFlow: boolean;
  enablePersonalization: boolean;
  enableIterationPrevention: boolean;
  naturalLanguagePatterns: boolean;
  emotionalIntelligence: boolean;
}

export interface ResponseEnhancement {
  conversationalConnectors: string[];
  emotionalAcknowledgment?: string;
  personalizedTone: string;
  clarificationQuestions: string[];
  nextStepSuggestions: string[];
  contextualReferences: string[];
}

export class EnhancedResponseGenerator {
  private flowManager: ConversationFlowManager;
  private personalizationManager: PersonalizationManager;
  private iterationPreventionManager: IterationPreventionManager;
  private llmProvider: any;
  private config: EnhancedResponseConfig;

  constructor(config: EnhancedResponseConfig) {
    this.config = config;
    this.llmProvider = createLLMProvider(config.llmConfig);
    this.flowManager = new ConversationFlowManager(config.llmConfig);
    this.personalizationManager = new PersonalizationManager();
    this.iterationPreventionManager = new IterationPreventionManager();
  }

  /**
   * Generate enhanced, natural response
   */
  async generateEnhancedResponse(
    context: ResponseGenerationContext
  ): Promise<{
    response: string;
    enhancements: ResponseEnhancement;
    conversationState?: ConversationState;
    personalizationInsights: any[];
    iterationInsights: any;
  }> {
    
    // Step 1: Analyze conversation flow
    let conversationState: ConversationState | undefined;
    let flowAnalysis: any = null;
    
    if (this.config.enableConversationFlow) {
      conversationState = this.flowManager.getOrCreateConversationState(
        context.userId,
        context.sessionId
      );
      
      flowAnalysis = await this.flowManager.analyzeConversationFlow(
        context.userQuery,
        context.conversationHistory,
        conversationState
      );
      
      conversationState = this.flowManager.updateConversationState(
        conversationState,
        flowAnalysis,
        context.userQuery
      );
    }

    // Step 2: Get personalization guidance
    let personalizationGuidance: any = null;
    let personalizationInsights: any[] = [];
    
    if (this.config.enablePersonalization) {
      personalizationGuidance = this.personalizationManager.getResponseGuidance(context.userId);
      
      // Learn from current interaction (we'll update this after response generation)
      personalizationInsights = [];
    }

    // Step 3: Get iteration prevention insights
    let iterationInsights: any = {};
    
    if (this.config.enableIterationPrevention) {
      iterationInsights = this.iterationPreventionManager.getIterationInsights(
        context.userId,
        context.sessionId
      );
    }

    // Step 4: Build enhanced context
    const enhancedContexts = [...context.contexts];
    
    if (conversationState) {
      enhancedContexts.push(this.flowManager.generateConversationContext(conversationState));
    }
    
    if (personalizationGuidance) {
      enhancedContexts.push(this.personalizationManager.generatePersonalizationContext(context.userId));
    }

    // Step 5: Generate response enhancements
    const enhancements = await this.generateResponseEnhancements(
      context,
      flowAnalysis,
      personalizationGuidance,
      conversationState
    );

    // Step 6: Build enhanced system message
    const systemMessage = this.buildEnhancedSystemMessage(
      enhancedContexts,
      enhancements,
      personalizationGuidance,
      flowAnalysis
    );

    // Step 7: Generate the actual response
    const response = await this.generateActualResponse(
      context,
      systemMessage,
      enhancements
    );

    // Step 8: Learn from interaction (post-generation)
    if (this.config.enablePersonalization) {
      personalizationInsights = this.personalizationManager.learnFromInteraction(
        context.userId,
        {
          userQuery: context.userQuery,
          agentResponse: response,
          topicsDiscussed: this.extractTopics(context.userQuery),
          responseLength: response.length,
          technicalTermsUsed: this.extractTechnicalTerms(response),
          questionsAsked: this.countQuestions(response),
          responseTime: 0, // Would be measured in real implementation
        }
      );
    }

    return {
      response,
      enhancements,
      conversationState,
      personalizationInsights,
      iterationInsights,
    };
  }

  /**
   * Generate response enhancements
   */
  private async generateResponseEnhancements(
    context: ResponseGenerationContext,
    flowAnalysis: any,
    personalizationGuidance: any,
    conversationState?: ConversationState
  ): Promise<ResponseEnhancement> {
    
    const enhancements: ResponseEnhancement = {
      conversationalConnectors: [],
      personalizedTone: personalizationGuidance?.tone || 'friendly',
      clarificationQuestions: [],
      nextStepSuggestions: [],
      contextualReferences: [],
    };

    // Add conversational connectors based on conversation flow
    if (this.config.naturalLanguagePatterns) {
      enhancements.conversationalConnectors = this.generateConversationalConnectors(
        context,
        conversationState
      );
    }

    // Add emotional acknowledgment if needed
    if (this.config.emotionalIntelligence && flowAnalysis?.shouldAcknowledgeEmotion) {
      enhancements.emotionalAcknowledgment = flowAnalysis.emotionalResponse;
    }

    // Add clarification questions based on flow analysis
    if (flowAnalysis?.clarificationNeeded) {
      enhancements.clarificationQuestions = flowAnalysis.clarificationQuestions || [];
    }

    // Add contextual references
    enhancements.contextualReferences = this.generateContextualReferences(
      context.conversationHistory,
      conversationState
    );

    // Add next step suggestions
    enhancements.nextStepSuggestions = this.generateNextStepSuggestions(
      context,
      personalizationGuidance
    );

    return enhancements;
  }

  /**
   * Generate conversational connectors
   */
  private generateConversationalConnectors(
    context: ResponseGenerationContext,
    conversationState?: ConversationState
  ): string[] {
    const connectors: string[] = [];
    
    // Based on conversation phase
    if (conversationState) {
      switch (conversationState.conversationFlow.phase) {
        case 'greeting':
          connectors.push("I'd be happy to help you with that.");
          break;
        case 'information_gathering':
          connectors.push("Let me get that information for you.");
          connectors.push("I see what you're looking for.");
          break;
        case 'problem_solving':
          connectors.push("Let me work on that for you.");
          connectors.push("I understand the issue.");
          break;
        case 'resolution':
          connectors.push("Here's what I found:");
          connectors.push("Perfect! I've completed that for you.");
          break;
        case 'follow_up':
          connectors.push("Is there anything else I can help you with?");
          break;
      }
    }

    // Based on tool results
    if (context.toolResults.length > 0) {
      const hasErrors = context.toolResults.some(r => !r.success);
      if (hasErrors) {
        connectors.push("I encountered an issue, but let me try another approach.");
      } else {
        connectors.push("Great! I've retrieved that information for you.");
      }
    }

    return connectors;
  }

  /**
   * Generate contextual references
   */
  private generateContextualReferences(
    conversationHistory: Array<{ role: string; content: string; timestamp?: Date }>,
    conversationState?: ConversationState
  ): string[] {
    const references: string[] = [];
    
    // Reference previous topics
    if (conversationState?.conversationFlow.mainTopics && conversationState.conversationFlow.mainTopics.length > 0) {
      const recentTopics = conversationState.conversationFlow.mainTopics.slice(-3);
      if (recentTopics.length > 1) {
        references.push(`Building on our previous discussion about ${recentTopics.slice(0, -1).join(', ')}`);
      }
    }

    // Reference previous successful actions
    const recentHistory = conversationHistory.slice(-3);
    for (const msg of recentHistory) {
      if (msg.role === 'assistant' && msg.content.includes('successfully')) {
        references.push("Following up on our previous successful action");
        break;
      }
    }

    return references;
  }

  /**
   * Generate next step suggestions
   */
  private generateNextStepSuggestions(
    context: ResponseGenerationContext,
    personalizationGuidance: any
  ): string[] {
    const suggestions: string[] = [];
    
    // Based on personalization preferences
    if (personalizationGuidance?.includeExamples) {
      suggestions.push("Would you like me to show you an example?");
    }
    
    if (personalizationGuidance?.useSteps) {
      suggestions.push("I can break this down into steps if that would be helpful.");
    }
    
    if (personalizationGuidance?.askQuestions) {
      suggestions.push("Let me know if you need clarification on any part.");
    }

    return suggestions;
  }

  /**
   * Build enhanced system message
   */
  private buildEnhancedSystemMessage(
    contexts: Context[],
    enhancements: ResponseEnhancement,
    personalizationGuidance: any,
    flowAnalysis: any
  ): string {
    
    const contextContent = contexts
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .map(ctx => typeof ctx.content === 'function' ? ctx.content() : ctx.content)
      .join('\n\n');

    const enhancementGuidance = this.buildEnhancementGuidance(
      enhancements,
      personalizationGuidance,
      flowAnalysis
    );

    return `${contextContent}

${enhancementGuidance}

CRITICAL RESPONSE GUIDELINES:
1. Use natural, conversational language that flows smoothly
2. Incorporate appropriate conversational connectors
3. Acknowledge emotions when appropriate
4. Reference previous conversation context naturally
5. Provide clear, actionable next steps
6. Match the user's preferred communication style
7. Keep responses focused and helpful
8. Use examples and analogies when beneficial
9. Ask clarifying questions when needed
10. Maintain consistent tone throughout the conversation

Remember: The goal is to have a natural, helpful conversation that feels fluent and personalized.`;
  }

  /**
   * Build enhancement guidance for LLM
   */
  private buildEnhancementGuidance(
    enhancements: ResponseEnhancement,
    personalizationGuidance: any,
    flowAnalysis: any
  ): string {
    let guidance = `=== RESPONSE ENHANCEMENT GUIDELINES ===

CONVERSATION FLOW:
- Current tone: ${enhancements.personalizedTone}
- Use these connectors naturally: ${enhancements.conversationalConnectors.join(', ')}`;

    if (enhancements.emotionalAcknowledgment) {
      guidance += `\n- Emotional context: ${enhancements.emotionalAcknowledgment}`;
    }

    if (enhancements.contextualReferences.length > 0) {
      guidance += `\n- Reference context: ${enhancements.contextualReferences.join(', ')}`;
    }

    if (personalizationGuidance) {
      guidance += `

PERSONALIZATION:
- Maximum response length: ~${personalizationGuidance.maxWords} words
- Technical level: ${personalizationGuidance.technicalLevel}
- Include examples: ${personalizationGuidance.includeExamples}
- Use step-by-step: ${personalizationGuidance.useSteps}
- Ask questions: ${personalizationGuidance.askQuestions}`;
    }

    if (enhancements.clarificationQuestions.length > 0) {
      guidance += `

CLARIFICATION NEEDED:
- Consider asking: ${enhancements.clarificationQuestions.join(', ')}`;
    }

    if (enhancements.nextStepSuggestions.length > 0) {
      guidance += `

NEXT STEPS:
- Suggest: ${enhancements.nextStepSuggestions.join(', ')}`;
    }

    return guidance;
  }

  /**
   * Generate the actual response
   */
  private async generateActualResponse(
    context: ResponseGenerationContext,
    systemMessage: string,
    enhancements: ResponseEnhancement
  ): Promise<string> {
    
    // Build conversation messages
    const messages: LLMMessage[] = [
      { role: "system", content: systemMessage },
      ...context.conversationHistory.slice(-5).map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: context.userQuery },
    ];

    // Add tool results context if any
    if (context.toolResults.length > 0) {
      const toolContext = context.toolResults
        .map(result => `Tool ${result.toolName}: ${result.success ? 'Success' : 'Error'} - ${JSON.stringify(result.result)}`)
        .join('\n');
      
      messages.push({
        role: "assistant",
        content: `Based on the tool results:\n${toolContext}\n\nLet me provide you with a comprehensive response:`
      });
    }

    const response = await this.llmProvider.generateResponse(messages);
    return this.postProcessResponse(response.content, enhancements);
  }

  /**
   * Post-process response to add final enhancements
   */
  private postProcessResponse(
    response: string,
    enhancements: ResponseEnhancement
  ): string {
    let processedResponse = response;

    // Add conversational connectors if not already present
    if (enhancements.conversationalConnectors.length > 0) {
      const firstConnector = enhancements.conversationalConnectors[0];
      if (!processedResponse.toLowerCase().includes(firstConnector.toLowerCase().substring(0, 10))) {
        processedResponse = `${firstConnector} ${processedResponse}`;
      }
    }

    // Add emotional acknowledgment if specified
    if (enhancements.emotionalAcknowledgment) {
      processedResponse = `${enhancements.emotionalAcknowledgment} ${processedResponse}`;
    }

    return processedResponse;
  }

  /**
   * Extract topics from text
   */
  private extractTopics(text: string): string[] {
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 5);
  }

  /**
   * Extract technical terms from text
   */
  private extractTechnicalTerms(text: string): string[] {
    const technicalTerms = [
      'api', 'endpoint', 'json', 'database', 'query', 'function', 'method',
      'algorithm', 'implementation', 'optimization', 'architecture', 'protocol',
      'authentication', 'authorization', 'encryption', 'algorithm', 'workflow'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    return technicalTerms.filter(term => words.some(word => word.includes(term)));
  }

  /**
   * Count questions in response
   */
  private countQuestions(text: string): number {
    return (text.match(/\?/g) || []).length;
  }
} 