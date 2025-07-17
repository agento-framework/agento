import type { LLMConfig, Context } from "../types";
import type { LLMMessage } from "../llm/providers";
import { createLLMProvider } from "../llm/providers";

/**
 * Conversation Flow Manager
 * Handles natural conversation patterns, emotional intelligence, and conversation state
 */

export interface ConversationState {
  id: string;
  userId: string;
  sessionId: string;
  currentTone: 'formal' | 'casual' | 'friendly' | 'professional' | 'empathetic' | 'urgent';
  emotionalContext: {
    userMood: 'positive' | 'neutral' | 'frustrated' | 'confused' | 'excited' | 'concerned';
    conversationRhythm: 'slow' | 'normal' | 'fast';
    engagementLevel: number; // 0-10
    frustrationLevel: number; // 0-10
  };
  conversationFlow: {
    phase: 'greeting' | 'information_gathering' | 'problem_solving' | 'resolution' | 'follow_up';
    turnsInPhase: number;
    lastTopicShift: Date;
    mainTopics: string[];
    unresolved: string[];
  };
  conversationStyle: {
    preferredLength: 'brief' | 'moderate' | 'detailed';
    technicalLevel: 'simple' | 'intermediate' | 'expert';
    interactionPattern: 'direct' | 'exploratory' | 'methodical';
  };
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface ConversationFlowAnalysis {
  shouldAdjustTone: boolean;
  suggestedTone: ConversationState['currentTone'];
  shouldAcknowledgeEmotion: boolean;
  emotionalResponse: string;
  conversationTransition: {
    shouldTransition: boolean;
    newPhase?: ConversationState['conversationFlow']['phase'];
    transitionReason: string;
  };
  clarificationNeeded: boolean;
  clarificationQuestions: string[];
  contextualPrompts: string[];
}

export class ConversationFlowManager {
  private conversationStates = new Map<string, ConversationState>();
  private llmProvider: any;

  constructor(llmConfig: LLMConfig) {
    this.llmProvider = createLLMProvider(llmConfig);
  }

  /**
   * Initialize or get conversation state for a session
   */
  getOrCreateConversationState(
    userId: string, 
    sessionId: string,
    initialContext?: Partial<ConversationState>
  ): ConversationState {
    const stateKey = `${userId}:${sessionId}`;
    
    if (!this.conversationStates.has(stateKey)) {
      const state: ConversationState = {
        id: stateKey,
        userId,
        sessionId,
        currentTone: 'friendly',
        emotionalContext: {
          userMood: 'neutral',
          conversationRhythm: 'normal',
          engagementLevel: 5,
          frustrationLevel: 0,
        },
        conversationFlow: {
          phase: 'greeting',
          turnsInPhase: 0,
          lastTopicShift: new Date(),
          mainTopics: [],
          unresolved: [],
        },
        conversationStyle: {
          preferredLength: 'moderate',
          technicalLevel: 'intermediate',
          interactionPattern: 'exploratory',
        },
        metadata: {},
        timestamp: new Date(),
        ...initialContext,
      };
      
      this.conversationStates.set(stateKey, state);
    }
    
    return this.conversationStates.get(stateKey)!;
  }

  /**
   * Analyze conversation flow and provide recommendations
   */
  async analyzeConversationFlow(
    userQuery: string,
    conversationHistory: Array<{ role: string; content: string; timestamp?: Date }>,
    currentState: ConversationState
  ): Promise<ConversationFlowAnalysis> {
    
    const recentHistory = conversationHistory
      .slice(-5)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const analysisPrompt = `Analyze this conversation for emotional intelligence and flow patterns.

CURRENT CONVERSATION STATE:
- Tone: ${currentState.currentTone}
- User Mood: ${currentState.emotionalContext.userMood}
- Phase: ${currentState.conversationFlow.phase}
- Turns in phase: ${currentState.conversationFlow.turnsInPhase}
- Frustration Level: ${currentState.emotionalContext.frustrationLevel}/10
- Engagement Level: ${currentState.emotionalContext.engagementLevel}/10

RECENT CONVERSATION:
${recentHistory}

CURRENT USER QUERY: "${userQuery}"

Analyze for:
1. Emotional indicators in user's language
2. Signs of frustration, confusion, or satisfaction
3. Whether conversation phase should change
4. If tone adjustment is needed
5. Whether clarification questions would help
6. Contextual prompts to improve flow

Respond with JSON:
{
  "shouldAdjustTone": boolean,
  "suggestedTone": "formal|casual|friendly|professional|empathetic|urgent",
  "shouldAcknowledgeEmotion": boolean,
  "emotionalResponse": "brief empathetic response if needed",
  "conversationTransition": {
    "shouldTransition": boolean,
    "newPhase": "greeting|information_gathering|problem_solving|resolution|follow_up",
    "transitionReason": "explanation"
  },
  "clarificationNeeded": boolean,
  "clarificationQuestions": ["question1", "question2"],
  "contextualPrompts": ["prompt1", "prompt2"]
}`;

    try {
      const response = await this.llmProvider.generateResponse([
        { 
          role: "system", 
          content: "You are an expert in conversation analysis and emotional intelligence. Respond with ONLY valid JSON, no explanations." 
        },
        { role: "user", content: analysisPrompt }
      ]);

      return JSON.parse(this.cleanJsonResponse(response.content));
    } catch (error) {
      console.error('Error analyzing conversation flow:', error);
      // Return safe defaults
      return {
        shouldAdjustTone: false,
        suggestedTone: currentState.currentTone,
        shouldAcknowledgeEmotion: false,
        emotionalResponse: "",
        conversationTransition: {
          shouldTransition: false,
          transitionReason: "Analysis error, maintaining current phase"
        },
        clarificationNeeded: false,
        clarificationQuestions: [],
        contextualPrompts: []
      };
    }
  }

  /**
   * Update conversation state based on analysis
   */
  updateConversationState(
    state: ConversationState,
    analysis: ConversationFlowAnalysis,
    userQuery: string
  ): ConversationState {
    const updatedState = { ...state };

    // Update tone if suggested
    if (analysis.shouldAdjustTone) {
      updatedState.currentTone = analysis.suggestedTone;
    }

    // Update conversation phase
    if (analysis.conversationTransition.shouldTransition && analysis.conversationTransition.newPhase) {
      if (updatedState.conversationFlow.phase !== analysis.conversationTransition.newPhase) {
        updatedState.conversationFlow.phase = analysis.conversationTransition.newPhase;
        updatedState.conversationFlow.turnsInPhase = 0;
        updatedState.conversationFlow.lastTopicShift = new Date();
      }
    }

    // Increment turn counter
    updatedState.conversationFlow.turnsInPhase++;

    // Extract and track main topics
    const topics = this.extractTopics(userQuery);
    updatedState.conversationFlow.mainTopics.push(...topics);
    
    // Keep only recent topics (last 10)
    if (updatedState.conversationFlow.mainTopics.length > 10) {
      updatedState.conversationFlow.mainTopics = updatedState.conversationFlow.mainTopics.slice(-10);
    }

    // Update emotional context based on analysis
    if (analysis.shouldAcknowledgeEmotion) {
      updatedState.emotionalContext.engagementLevel = Math.max(
        updatedState.emotionalContext.engagementLevel - 1, 
        0
      );
    } else {
      updatedState.emotionalContext.engagementLevel = Math.min(
        updatedState.emotionalContext.engagementLevel + 1, 
        10
      );
    }

    updatedState.timestamp = new Date();
    
    // Update the stored state
    this.conversationStates.set(state.id, updatedState);
    
    return updatedState;
  }

  /**
   * Generate contextual conversation context for LLM
   */
  generateConversationContext(state: ConversationState): Context {
    return {
      key: "conversation_flow",
      description: "Natural conversation flow and emotional intelligence context",
      content: `=== CONVERSATION FLOW CONTEXT ===

CURRENT CONVERSATION STATE:
- Session: ${state.sessionId}
- Tone: ${state.currentTone}
- Phase: ${state.conversationFlow.phase} (turn ${state.conversationFlow.turnsInPhase})

EMOTIONAL INTELLIGENCE:
- User Mood: ${state.emotionalContext.userMood}
- Engagement Level: ${state.emotionalContext.engagementLevel}/10
- Frustration Level: ${state.emotionalContext.frustrationLevel}/10
- Conversation Rhythm: ${state.emotionalContext.conversationRhythm}

CONVERSATION STYLE:
- Preferred Length: ${state.conversationStyle.preferredLength}
- Technical Level: ${state.conversationStyle.technicalLevel}
- Interaction Pattern: ${state.conversationStyle.interactionPattern}

CONVERSATION FLOW:
- Main Topics: ${state.conversationFlow.mainTopics.slice(-5).join(', ') || 'None yet'}
- Unresolved Items: ${state.conversationFlow.unresolved.join(', ') || 'None'}
- Time in Current Phase: ${state.conversationFlow.turnsInPhase} turns

NATURAL CONVERSATION GUIDELINES:

1. TONE ADAPTATION:
   - ${state.currentTone}: Adjust language and approach accordingly
   - Match user's energy level and communication style
   - Be more empathetic if frustration is detected

2. CONVERSATION PHASE AWARENESS:
   - ${state.conversationFlow.phase}: Respond appropriately for this phase
   - Greeting: Be welcoming and establish rapport
   - Information Gathering: Ask clarifying questions
   - Problem Solving: Focus on solutions and actions
   - Resolution: Confirm understanding and next steps
   - Follow-up: Check satisfaction and offer additional help

3. EMOTIONAL INTELLIGENCE:
   - Acknowledge emotions when appropriate
   - Adjust complexity based on user's apparent mood
   - Offer reassurance if user seems frustrated or confused
   - Celebrate successes and positive outcomes

4. NATURAL FLOW PATTERNS:
   - Use conversational connectors ("I see", "That makes sense", "Let me help")
   - Reference previous parts of conversation naturally
   - Ask follow-up questions to maintain engagement
   - Summarize understanding before moving to solutions

5. PERSONALIZATION:
   - Remember topics and preferences from this conversation
   - Adapt technical level to user's demonstrated expertise
   - Use appropriate level of detail based on user preference
   - Build on established rapport and context

CONVERSATION ENHANCEMENT STRATEGIES:
- Use active listening phrases to show understanding
- Ask open-ended questions to encourage engagement
- Provide clear next steps and expectations
- Offer choices when multiple options exist
- Check understanding before proceeding with complex topics
- Use examples and analogies appropriate to user's context`,
      priority: 95
    };
  }

  /**
   * Extract main topics from user query
   */
  private extractTopics(query: string): string[] {
    // Simple topic extraction - could be enhanced with NLP
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'cannot', 'what', 'where', 'when', 'why', 'how', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);
    
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 3); // Keep top 3 topics
  }

  /**
   * Generate clarification prompts
   */
  generateClarificationPrompts(analysis: ConversationFlowAnalysis): string[] {
    const prompts: string[] = [];

    if (analysis.clarificationNeeded && analysis.clarificationQuestions.length > 0) {
      prompts.push(...analysis.clarificationQuestions);
    }

    prompts.push(...analysis.contextualPrompts);

    return prompts;
  }

  /**
   * Clean up old conversation states
   */
  cleanupOldStates(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge);
    
    for (const [key, state] of this.conversationStates.entries()) {
      if (state.timestamp < cutoff) {
        this.conversationStates.delete(key);
      }
    }
  }

  /**
   * Clean JSON response from LLM that might contain markdown formatting
   */
  private cleanJsonResponse(content: string): string {
    // Remove markdown code blocks
    let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Find the first { and last } to extract just the JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    return cleaned;
  }
}

/**
 * Create conversation flow context for enhanced natural conversations
 */
export function createConversationFlowContext(
  flowManager: ConversationFlowManager,
  state: ConversationState
): Context {
  return flowManager.generateConversationContext(state);
} 