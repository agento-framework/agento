import type { Context } from "../types";

/**
 * Personalization Manager
 * Tracks user preferences, communication styles, and personalizes responses
 */

export interface UserPreferences {
  id: string;
  communicationStyle: {
    formality: 'very_formal' | 'formal' | 'neutral' | 'casual' | 'very_casual';
    verbosity: 'brief' | 'moderate' | 'detailed' | 'comprehensive';
    technicalLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    preferredTone: 'professional' | 'friendly' | 'empathetic' | 'direct' | 'encouraging';
  };
  interactionPatterns: {
    prefersStepByStep: boolean;
    likesExamples: boolean;
    wantsConfirmation: boolean;
    prefersOptions: boolean;
    needsContext: boolean;
  };
  domainKnowledge: {
    [domain: string]: {
      level: 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
      interests: string[];
      previousExperience: string[];
    };
  };
  responsePreferences: {
    maxLength: number;
    includeNextSteps: boolean;
    showRelevantLinks: boolean;
    preferStructuredResponses: boolean;
    wantsClarificationQuestions: boolean;
  };
  conversationHistory: {
    totalInteractions: number;
    commonTopics: Map<string, number>;
    successfulPatterns: string[];
    challenges: string[];
    lastInteraction: Date;
  };
  contextual: {
    timezone: string;
    locale: string;
    currentProject?: string;
    immediateGoals: string[];
  };
}

export interface PersonalizationInsight {
  preferenceArea: keyof UserPreferences;
  insight: string;
  confidence: number;
  suggestedAdjustment: any;
  evidence: string[];
}

export class PersonalizationManager {
  private userProfiles = new Map<string, UserPreferences>();
  private learningBuffer = new Map<string, any[]>(); // Temporary learning data

  /**
   * Get or create user profile
   */
  getUserProfile(userId: string): UserPreferences {
    if (!this.userProfiles.has(userId)) {
      const defaultProfile: UserPreferences = {
        id: userId,
        communicationStyle: {
          formality: 'neutral',
          verbosity: 'moderate',
          technicalLevel: 'intermediate',
          preferredTone: 'friendly',
        },
        interactionPatterns: {
          prefersStepByStep: false,
          likesExamples: true,
          wantsConfirmation: false,
          prefersOptions: true,
          needsContext: true,
        },
        domainKnowledge: {},
        responsePreferences: {
          maxLength: 500,
          includeNextSteps: true,
          showRelevantLinks: false,
          preferStructuredResponses: false,
          wantsClarificationQuestions: true,
        },
        conversationHistory: {
          totalInteractions: 0,
          commonTopics: new Map(),
          successfulPatterns: [],
          challenges: [],
          lastInteraction: new Date(),
        },
        contextual: {
          timezone: 'UTC',
          locale: 'en-US',
          immediateGoals: [],
        },
      };
      this.userProfiles.set(userId, defaultProfile);
    }
    
    return this.userProfiles.get(userId)!;
  }

  /**
   * Learn from user interaction
   */
  learnFromInteraction(
    userId: string,
    interaction: {
      userQuery: string;
      agentResponse: string;
      userFeedback?: 'positive' | 'negative' | 'neutral';
      topicsDiscussed: string[];
      responseLength: number;
      technicalTermsUsed: string[];
      questionsAsked: number;
      userSatisfaction?: number; // 1-10
      responseTime: number;
    }
  ): PersonalizationInsight[] {
    const profile = this.getUserProfile(userId);
    const insights: PersonalizationInsight[] = [];

    // Update interaction count
    profile.conversationHistory.totalInteractions++;
    profile.conversationHistory.lastInteraction = new Date();

    // Learn communication style preferences
    if (interaction.userFeedback) {
      const styleInsights = this.analyzeStylePreferences(interaction, profile);
      insights.push(...styleInsights);
    }

    // Learn verbosity preferences
    const verbosityInsight = this.analyzeVerbosityPreference(interaction, profile);
    if (verbosityInsight) insights.push(verbosityInsight);

    // Learn technical level
    const technicalInsight = this.analyzeTechnicalLevel(interaction, profile);
    if (technicalInsight) insights.push(technicalInsight);

    // Update domain knowledge
    this.updateDomainKnowledge(profile, interaction.topicsDiscussed, interaction.technicalTermsUsed);

    // Track common topics
    for (const topic of interaction.topicsDiscussed) {
      const currentCount = profile.conversationHistory.commonTopics.get(topic) || 0;
      profile.conversationHistory.commonTopics.set(topic, currentCount + 1);
    }

    // Learn interaction patterns
    const patternInsights = this.analyzeInteractionPatterns(interaction, profile);
    insights.push(...patternInsights);

    // Store learning data for future analysis
    this.addToLearningBuffer(userId, {
      timestamp: new Date(),
      interaction,
      insights,
    });

    return insights;
  }

  /**
   * Analyze style preferences from interaction
   */
  private analyzeStylePreferences(
    interaction: any,
    profile: UserPreferences
  ): PersonalizationInsight[] {
    const insights: PersonalizationInsight[] = [];

    if (interaction.userFeedback === 'positive') {
      // Current style is working, reinforce it
      insights.push({
        preferenceArea: 'communicationStyle',
        insight: 'User responded positively to current communication style',
        confidence: 0.7,
        suggestedAdjustment: null, // Keep current style
        evidence: ['Positive user feedback'],
      });
    } else if (interaction.userFeedback === 'negative') {
      // Try adjusting style
      let suggestedTone = profile.communicationStyle.preferredTone;
      
      if (profile.communicationStyle.preferredTone === 'professional') {
        suggestedTone = 'friendly';
      } else if (profile.communicationStyle.preferredTone === 'direct') {
        suggestedTone = 'empathetic';
      }

      insights.push({
        preferenceArea: 'communicationStyle',
        insight: 'User seemed unsatisfied, adjusting communication tone',
        confidence: 0.6,
        suggestedAdjustment: { preferredTone: suggestedTone },
        evidence: ['Negative user feedback'],
      });
    }

    return insights;
  }

  /**
   * Analyze verbosity preferences
   */
  private analyzeVerbosityPreference(
    interaction: any,
    profile: UserPreferences
  ): PersonalizationInsight | null {
    const responseWords = interaction.agentResponse.split(/\s+/).length;
    const userQueryWords = interaction.userQuery.split(/\s+/).length;

    // If user asks short questions but agent gives long answers and user seems unsatisfied
    if (userQueryWords < 10 && responseWords > 200 && interaction.userSatisfaction && interaction.userSatisfaction < 6) {
      return {
        preferenceArea: 'communicationStyle',
        insight: 'User may prefer more concise responses',
        confidence: 0.6,
        suggestedAdjustment: { verbosity: 'brief' },
        evidence: [`Short user query (${userQueryWords} words)`, `Long response (${responseWords} words)`, 'Low satisfaction'],
      };
    }

    // If user asks detailed questions and seems satisfied with detailed answers
    if (userQueryWords > 30 && responseWords > 150 && interaction.userSatisfaction && interaction.userSatisfaction > 7) {
      return {
        preferenceArea: 'communicationStyle',
        insight: 'User appreciates detailed responses',
        confidence: 0.7,
        suggestedAdjustment: { verbosity: 'detailed' },
        evidence: [`Detailed user query (${userQueryWords} words)`, `Detailed response (${responseWords} words)`, 'High satisfaction'],
      };
    }

    return null;
  }

  /**
   * Analyze technical level preferences
   */
  private analyzeTechnicalLevel(
    interaction: any,
    profile: UserPreferences
  ): PersonalizationInsight | null {
    const technicalTermCount = interaction.technicalTermsUsed.length;
    const userQuery = interaction.userQuery.toLowerCase();

    // Check if user uses technical language
    const userTechnicalIndicators = [
      'api', 'endpoint', 'json', 'database', 'query', 'function', 'method',
      'algorithm', 'implementation', 'optimization', 'architecture', 'protocol'
    ];

    const userTechnicalScore = userTechnicalIndicators.filter(term => 
      userQuery.includes(term)
    ).length;

    if (userTechnicalScore > 2 && profile.communicationStyle.technicalLevel !== 'advanced') {
      return {
        preferenceArea: 'communicationStyle',
        insight: 'User demonstrates advanced technical knowledge',
        confidence: 0.8,
        suggestedAdjustment: { technicalLevel: 'advanced' },
        evidence: [`Used ${userTechnicalScore} technical terms`, 'Technical language in query'],
      };
    }

    if (userTechnicalScore === 0 && technicalTermCount > 3 && interaction.userSatisfaction && interaction.userSatisfaction < 6) {
      return {
        preferenceArea: 'communicationStyle',
        insight: 'User may need simpler explanations',
        confidence: 0.7,
        suggestedAdjustment: { technicalLevel: 'beginner' },
        evidence: ['No technical terms in user query', 'Agent used many technical terms', 'Low satisfaction'],
      };
    }

    return null;
  }

  /**
   * Update domain knowledge based on topics
   */
  private updateDomainKnowledge(
    profile: UserPreferences,
    topics: string[],
    technicalTerms: string[]
  ): void {
    for (const topic of topics) {
      if (!profile.domainKnowledge[topic]) {
        profile.domainKnowledge[topic] = {
          level: 'novice',
          interests: [],
          previousExperience: [],
        };
      }

      // Increment experience
      const currentLevel = profile.domainKnowledge[topic].level;
      const interactionCount = profile.conversationHistory.commonTopics.get(topic) || 0;

      if (interactionCount > 10 && currentLevel === 'novice') {
        profile.domainKnowledge[topic].level = 'beginner';
      } else if (interactionCount > 25 && currentLevel === 'beginner') {
        profile.domainKnowledge[topic].level = 'intermediate';
      } else if (interactionCount > 50 && currentLevel === 'intermediate') {
        profile.domainKnowledge[topic].level = 'advanced';
      }

      // Add technical terms to experience
      for (const term of technicalTerms) {
        if (!profile.domainKnowledge[topic].previousExperience.includes(term)) {
          profile.domainKnowledge[topic].previousExperience.push(term);
        }
      }
    }
  }

  /**
   * Analyze interaction patterns
   */
  private analyzeInteractionPatterns(
    interaction: any,
    profile: UserPreferences
  ): PersonalizationInsight[] {
    const insights: PersonalizationInsight[] = [];

    // Check if user asks follow-up questions (likes step-by-step)
    if (interaction.questionsAsked > 0 && interaction.userSatisfaction && interaction.userSatisfaction > 7) {
      insights.push({
        preferenceArea: 'interactionPatterns',
        insight: 'User benefits from step-by-step guidance',
        confidence: 0.7,
        suggestedAdjustment: { prefersStepByStep: true },
        evidence: [`Asked ${interaction.questionsAsked} follow-up questions`, 'High satisfaction'],
      });
    }

    // Check if user seems to want confirmation
    const confirmationWords = ['right?', 'correct?', 'is that ok?', 'does that make sense?'];
    if (confirmationWords.some(word => interaction.userQuery.toLowerCase().includes(word))) {
      insights.push({
        preferenceArea: 'interactionPatterns',
        insight: 'User seeks confirmation and validation',
        confidence: 0.8,
        suggestedAdjustment: { wantsConfirmation: true },
        evidence: ['User asked for confirmation'],
      });
    }

    return insights;
  }

  /**
   * Apply personalization insights to user profile
   */
  applyPersonalizationInsights(userId: string, insights: PersonalizationInsight[]): void {
    const profile = this.getUserProfile(userId);

    for (const insight of insights) {
      if (insight.confidence > 0.6 && insight.suggestedAdjustment) {
        // Apply the suggested adjustment
        const targetObject = profile[insight.preferenceArea] as any;
        Object.assign(targetObject, insight.suggestedAdjustment);
      }
    }
  }

  /**
   * Generate personalized context for LLM
   */
  generatePersonalizationContext(userId: string): Context {
    const profile = this.getUserProfile(userId);
    
    return {
      key: "personalization",
      description: "User personalization and preference context",
      content: `=== USER PERSONALIZATION CONTEXT ===

USER PROFILE: ${profile.id}
Interactions: ${profile.conversationHistory.totalInteractions}
Last seen: ${profile.conversationHistory.lastInteraction.toLocaleDateString()}

COMMUNICATION PREFERENCES:
- Formality: ${profile.communicationStyle.formality}
- Verbosity: ${profile.communicationStyle.verbosity}
- Technical Level: ${profile.communicationStyle.technicalLevel}
- Preferred Tone: ${profile.communicationStyle.preferredTone}

INTERACTION PATTERNS:
- Prefers step-by-step: ${profile.interactionPatterns.prefersStepByStep}
- Likes examples: ${profile.interactionPatterns.likesExamples}
- Wants confirmation: ${profile.interactionPatterns.wantsConfirmation}
- Prefers options: ${profile.interactionPatterns.prefersOptions}
- Needs context: ${profile.interactionPatterns.needsContext}

RESPONSE PREFERENCES:
- Max length: ${profile.responsePreferences.maxLength} characters
- Include next steps: ${profile.responsePreferences.includeNextSteps}
- Structured responses: ${profile.responsePreferences.preferStructuredResponses}
- Wants clarification questions: ${profile.responsePreferences.wantsClarificationQuestions}

DOMAIN KNOWLEDGE:
${Object.entries(profile.domainKnowledge)
  .map(([domain, knowledge]) => `- ${domain}: ${knowledge.level} level`)
  .join('\n') || '- No specific domain knowledge tracked yet'}

COMMON TOPICS:
${Array.from(profile.conversationHistory.commonTopics.entries())
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([topic, count]) => `- ${topic} (${count} times)`)
  .join('\n') || '- No common topics yet'}

CONTEXTUAL INFO:
- Timezone: ${profile.contextual.timezone}
- Locale: ${profile.contextual.locale}
- Current goals: ${profile.contextual.immediateGoals.join(', ') || 'None specified'}

PERSONALIZATION GUIDELINES:

1. COMMUNICATION STYLE:
   - Use ${profile.communicationStyle.preferredTone} tone
   - Keep responses ${profile.communicationStyle.verbosity}
   - Adjust technical complexity to ${profile.communicationStyle.technicalLevel} level
   - Match ${profile.communicationStyle.formality} formality level

2. INTERACTION PATTERNS:
   ${profile.interactionPatterns.prefersStepByStep ? '- Break down complex tasks into clear steps' : ''}
   ${profile.interactionPatterns.likesExamples ? '- Include relevant examples and use cases' : ''}
   ${profile.interactionPatterns.wantsConfirmation ? '- Ask for confirmation before proceeding' : ''}
   ${profile.interactionPatterns.prefersOptions ? '- Provide multiple options when available' : ''}
   ${profile.interactionPatterns.needsContext ? '- Provide sufficient background context' : ''}

3. RESPONSE OPTIMIZATION:
   - Target around ${profile.responsePreferences.maxLength} characters
   ${profile.responsePreferences.includeNextSteps ? '- Always include clear next steps' : ''}
   ${profile.responsePreferences.preferStructuredResponses ? '- Use structured formatting (bullets, numbers, sections)' : ''}
   ${profile.responsePreferences.wantsClarificationQuestions ? '- Ask clarifying questions when needed' : ''}

4. DOMAIN ADAPTATION:
   ${Object.entries(profile.domainKnowledge)
     .map(([domain, knowledge]) => `- For ${domain}: assume ${knowledge.level} level knowledge`)
     .join('\n')}

Remember: This user has interacted ${profile.conversationHistory.totalInteractions} times. Build on established rapport and previous context.`,
      priority: 90,
    };
  }

  /**
   * Add interaction data to learning buffer
   */
  private addToLearningBuffer(userId: string, data: any): void {
    if (!this.learningBuffer.has(userId)) {
      this.learningBuffer.set(userId, []);
    }
    
    const buffer = this.learningBuffer.get(userId)!;
    buffer.push(data);
    
    // Keep only recent interactions in buffer
    if (buffer.length > 50) {
      this.learningBuffer.set(userId, buffer.slice(-50));
    }
  }

  /**
   * Get personalization suggestions for response adaptation
   */
  getResponseGuidance(userId: string): {
    maxWords: number;
    tone: string;
    includeExamples: boolean;
    useSteps: boolean;
    askQuestions: boolean;
    technicalLevel: string;
  } {
    const profile = this.getUserProfile(userId);
    
    return {
      maxWords: Math.floor(profile.responsePreferences.maxLength / 5), // Rough words estimate
      tone: profile.communicationStyle.preferredTone,
      includeExamples: profile.interactionPatterns.likesExamples,
      useSteps: profile.interactionPatterns.prefersStepByStep,
      askQuestions: profile.responsePreferences.wantsClarificationQuestions,
      technicalLevel: profile.communicationStyle.technicalLevel,
    };
  }

  /**
   * Export user profile for backup/analysis
   */
  exportUserProfile(userId: string): UserPreferences | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Import user profile from backup
   */
  importUserProfile(profile: UserPreferences): void {
    this.userProfiles.set(profile.id, profile);
  }
} 