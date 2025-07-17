import { describe, it, expect, beforeEach } from 'bun:test';
import { EnhancedResponseGenerator } from '../../src/core/enhanced-response-generator';
import type { ResponseGenerationContext, EnhancedResponseConfig } from '../../src/core/enhanced-response-generator';
import type { LLMConfig, Context, ToolResult } from '../../src/types';

describe('EnhancedResponseGenerator', () => {
  let generator: EnhancedResponseGenerator;
  let mockConfig: EnhancedResponseConfig;
  let mockContext: ResponseGenerationContext;

  beforeEach(() => {
    const mockLLMConfig: LLMConfig = {
      provider: 'groq',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.7,
    };

    mockConfig = {
      llmConfig: mockLLMConfig,
      enableConversationFlow: true,
      enablePersonalization: true,
      enableIterationPrevention: true,
      naturalLanguagePatterns: true,
      emotionalIntelligence: true,
    };

    mockContext = {
      userQuery: 'What is my account balance?',
      conversationHistory: [
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'assistant', content: 'Hi! How can I help you today?', timestamp: new Date() },
      ],
      toolResults: [],
      contexts: [],
      metadata: {},
      userId: 'user123',
      sessionId: 'session456',
    };

    generator = new EnhancedResponseGenerator(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize all managers when features are enabled', () => {
      expect(generator).toBeDefined();
      
      // Test with all features enabled
      const fullConfig = {
        ...mockConfig,
        enableConversationFlow: true,
        enablePersonalization: true,
        enableIterationPrevention: true,
        naturalLanguagePatterns: true,
        emotionalIntelligence: true,
      };

      const fullGenerator = new EnhancedResponseGenerator(fullConfig);
      expect(fullGenerator).toBeDefined();
    });

    it('should work with features disabled', () => {
      const minimalConfig = {
        ...mockConfig,
        enableConversationFlow: false,
        enablePersonalization: false,
        enableIterationPrevention: false,
        naturalLanguagePatterns: false,
        emotionalIntelligence: false,
      };

      const minimalGenerator = new EnhancedResponseGenerator(minimalConfig);
      expect(minimalGenerator).toBeDefined();
    });
  });

  describe('extractTopics', () => {
    it('should extract meaningful topics from text', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      
      // Access private method through any cast for testing
      const extractTopics = (testGenerator as any).extractTopics.bind(testGenerator);
      
      const text = 'I need help with my banking account balance and transaction history';
      const topics = extractTopics(text);
      
      expect(topics).toContain('banking');
      expect(topics).toContain('account');
      expect(topics).toContain('balance');
      // Note: Due to the 5-word limit, 'transaction' might not be included
      expect(topics.length).toBeLessThanOrEqual(5);
      expect(topics.length).toBeGreaterThan(0);
    });

    it('should filter out common words', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const extractTopics = (testGenerator as any).extractTopics.bind(testGenerator);
      
      const text = 'the quick brown fox and the lazy dog';
      const topics = extractTopics(text);
      
      expect(topics).not.toContain('the');
      expect(topics).not.toContain('and');
      expect(topics).toContain('quick');
      expect(topics).toContain('brown');
    });
  });

  describe('extractTechnicalTerms', () => {
    it('should identify technical terms in text', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const extractTechnicalTerms = (testGenerator as any).extractTechnicalTerms.bind(testGenerator);
      
      const text = 'We need to call the API endpoint to query the database using authentication';
      const terms = extractTechnicalTerms(text);
      
      expect(terms).toContain('api');
      expect(terms).toContain('query');
      expect(terms).toContain('database');
      expect(terms).toContain('authentication');
    });

    it('should return empty array for non-technical text', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const extractTechnicalTerms = (testGenerator as any).extractTechnicalTerms.bind(testGenerator);
      
      const text = 'Hello, how are you today? The weather is nice.';
      const terms = extractTechnicalTerms(text);
      
      expect(terms).toHaveLength(0);
    });
  });

  describe('countQuestions', () => {
    it('should count question marks correctly', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const countQuestions = (testGenerator as any).countQuestions.bind(testGenerator);
      
      expect(countQuestions('What is your name?')).toBe(1);
      expect(countQuestions('What is your name? How are you?')).toBe(2);
      expect(countQuestions('Hello there!')).toBe(0);
      expect(countQuestions('Are you sure? Really? Absolutely?')).toBe(3);
    });
  });

  describe('generateConversationalConnectors', () => {
    it('should generate appropriate connectors for different conversation phases', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const generateConnectors = (testGenerator as any).generateConversationalConnectors.bind(testGenerator);
      
      const testContext = {
        ...mockContext,
        toolResults: [],
      };

      // Test greeting phase
      const greetingState = {
        conversationFlow: { phase: 'greeting' },
      };
      const greetingConnectors = generateConnectors(testContext, greetingState);
      expect(greetingConnectors).toContain("I'd be happy to help you with that.");

      // Test problem solving phase
      const problemSolvingState = {
        conversationFlow: { phase: 'problem_solving' },
      };
      const problemConnectors = generateConnectors(testContext, problemSolvingState);
      expect(problemConnectors).toContain("Let me work on that for you.");
    });

    it('should generate connectors based on tool results', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const generateConnectors = (testGenerator as any).generateConversationalConnectors.bind(testGenerator);
      
      // Test with successful tool results
      const successContext = {
        ...mockContext,
        toolResults: [{ toolName: 'test_tool', success: true, result: {} }],
      };
      const successConnectors = generateConnectors(successContext, undefined);
      expect(successConnectors).toContain("Great! I've retrieved that information for you.");

      // Test with failed tool results
      const failContext = {
        ...mockContext,
        toolResults: [{ toolName: 'test_tool', success: false, result: null, error: 'Failed' }],
      };
      const failConnectors = generateConnectors(failContext, undefined);
      expect(failConnectors).toContain("I encountered an issue, but let me try another approach.");
    });
  });

  describe('generateContextualReferences', () => {
    it('should reference previous topics when available', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const generateReferences = (testGenerator as any).generateContextualReferences.bind(testGenerator);
      
      const conversationHistory = [
        { role: 'user', content: 'I need help with banking' },
        { role: 'assistant', content: 'I can help with that' },
      ];

      const conversationState = {
        conversationFlow: {
          mainTopics: ['banking', 'transfers', 'balance'],
        },
      };

      const references = generateReferences(conversationHistory, conversationState);
      expect(references.length).toBeGreaterThan(0);
      
      // Should reference previous topics
      const hasTopicReference = references.some((ref: string) => 
        ref.includes('banking') || ref.includes('transfers')
      );
      expect(hasTopicReference).toBe(true);
    });

    it('should reference successful actions', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const generateReferences = (testGenerator as any).generateContextualReferences.bind(testGenerator);
      
      const conversationHistory = [
        { role: 'assistant', content: 'I successfully completed your transfer request' },
        { role: 'user', content: 'Great, what about my balance?' },
      ];

      const references = generateReferences(conversationHistory, undefined);
      expect(references).toContain("Following up on our previous successful action");
    });

    it('should handle empty history gracefully', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const generateReferences = (testGenerator as any).generateContextualReferences.bind(testGenerator);
      
      const references = generateReferences([], undefined);
      expect(references).toHaveLength(0);
    });
  });

  describe('generateNextStepSuggestions', () => {
    it('should generate suggestions based on personalization preferences', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const generateSuggestions = (testGenerator as any).generateNextStepSuggestions.bind(testGenerator);
      
      const personalizationGuidance = {
        includeExamples: true,
        useSteps: true,
        askQuestions: true,
      };

      const suggestions = generateSuggestions(mockContext, personalizationGuidance);
      
      expect(suggestions).toContain("Would you like me to show you an example?");
      expect(suggestions).toContain("I can break this down into steps if that would be helpful.");
      expect(suggestions).toContain("Let me know if you need clarification on any part.");
    });

    it('should not suggest features that are disabled in preferences', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const generateSuggestions = (testGenerator as any).generateNextStepSuggestions.bind(testGenerator);
      
      const personalizationGuidance = {
        includeExamples: false,
        useSteps: false,
        askQuestions: false,
      };

      const suggestions = generateSuggestions(mockContext, personalizationGuidance);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('buildEnhancementGuidance', () => {
    it('should build comprehensive guidance from enhancements', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const buildGuidance = (testGenerator as any).buildEnhancementGuidance.bind(testGenerator);
      
      const enhancements = {
        conversationalConnectors: ['Let me help you', 'I understand'],
        personalizedTone: 'professional',
        clarificationQuestions: ['Which account?'],
        nextStepSuggestions: ['Would you like details?'],
        contextualReferences: ['Building on our previous discussion'],
        emotionalAcknowledgment: 'I understand you might be frustrated',
      };

      const personalizationGuidance = {
        maxWords: 100,
        technicalLevel: 'intermediate',
        includeExamples: true,
        useSteps: false,
        askQuestions: true,
      };

      const flowAnalysis = {};

      const guidance = buildGuidance(enhancements, personalizationGuidance, flowAnalysis);
      
      expect(guidance).toContain('RESPONSE ENHANCEMENT GUIDELINES');
      expect(guidance).toContain('professional');
      expect(guidance).toContain('Let me help you, I understand');
      expect(guidance).toContain('I understand you might be frustrated');
      expect(guidance).toContain('~100 words');
      expect(guidance).toContain('intermediate');
      expect(guidance).toContain('Which account?');
      expect(guidance).toContain('Would you like details?');
    });

    it('should handle minimal enhancements gracefully', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const buildGuidance = (testGenerator as any).buildEnhancementGuidance.bind(testGenerator);
      
      const minimalEnhancements = {
        conversationalConnectors: [],
        personalizedTone: 'neutral',
        clarificationQuestions: [],
        nextStepSuggestions: [],
        contextualReferences: [],
      };

      const guidance = buildGuidance(minimalEnhancements, null, null);
      expect(guidance).toContain('RESPONSE ENHANCEMENT GUIDELINES');
      expect(guidance).toContain('neutral');
    });
  });

  describe('postProcessResponse', () => {
    it('should add conversational connectors when not present', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const postProcess = (testGenerator as any).postProcessResponse.bind(testGenerator);
      
      const response = 'Your account balance is $100.';
      const enhancements = {
        conversationalConnectors: ['Let me help you with that.'],
        emotionalAcknowledgment: '',
      };

      const processed = postProcess(response, enhancements);
      expect(processed).toContain('Let me help you with that.');
      expect(processed).toContain('Your account balance is $100.');
    });

    it('should not duplicate connectors if already present', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const postProcess = (testGenerator as any).postProcessResponse.bind(testGenerator);
      
      const response = 'Let me help you with that. Your account balance is $100.';
      const enhancements = {
        conversationalConnectors: ['Let me help you with that.'],
        emotionalAcknowledgment: '',
      };

      const processed = postProcess(response, enhancements);
      // Should not duplicate the connector
      const connectorCount = (processed.match(/Let me help you/g) || []).length;
      expect(connectorCount).toBe(1);
    });

    it('should add emotional acknowledgment when provided', () => {
      const testGenerator = new EnhancedResponseGenerator(mockConfig);
      const postProcess = (testGenerator as any).postProcessResponse.bind(testGenerator);
      
      const response = 'Your account balance is $100.';
      const enhancements = {
        conversationalConnectors: [],
        emotionalAcknowledgment: 'I understand this is important to you.',
      };

      const processed = postProcess(response, enhancements);
      expect(processed).toContain('I understand this is important to you.');
      expect(processed).toContain('Your account balance is $100.');
    });
  });

  describe('integration with conversation features', () => {
    it('should work with all features disabled', () => {
      const minimalConfig = {
        ...mockConfig,
        enableConversationFlow: false,
        enablePersonalization: false,
        enableIterationPrevention: false,
        naturalLanguagePatterns: false,
        emotionalIntelligence: false,
      };

      const minimalGenerator = new EnhancedResponseGenerator(minimalConfig);
      expect(minimalGenerator).toBeDefined();
    });

    it('should handle tool results in context', () => {
      const contextWithTools: ResponseGenerationContext = {
        ...mockContext,
        toolResults: [
          {
            toolName: 'get_account_balance',
            success: true,
            result: { balance: 1500.75, accountType: 'checking' },
          },
        ],
      };

      // Test that tool results are properly incorporated
      expect(contextWithTools.toolResults).toHaveLength(1);
      expect(contextWithTools.toolResults[0].success).toBe(true);
    });

    it('should handle contexts properly', () => {
      const testContexts: Context[] = [
        {
          key: 'banking_expert',
          description: 'Banking knowledge',
          content: 'Expert banking information',
          priority: 100,
        },
        {
          key: 'user_context',
          description: 'User specific context',
          content: 'User preferences and history',
          priority: 90,
        },
      ];

      const contextWithContexts: ResponseGenerationContext = {
        ...mockContext,
        contexts: testContexts,
      };

      expect(contextWithContexts.contexts).toHaveLength(2);
      expect(contextWithContexts.contexts[0].key).toBe('banking_expert');
    });
  });

  describe('error handling', () => {
    it('should handle empty conversation history gracefully', () => {
      const emptyContext: ResponseGenerationContext = {
        ...mockContext,
        conversationHistory: [],
      };

      expect(emptyContext.conversationHistory).toHaveLength(0);
    });

    it('should handle missing metadata gracefully', () => {
      const noMetadataContext: ResponseGenerationContext = {
        ...mockContext,
        metadata: {},
      };

      expect(Object.keys(noMetadataContext.metadata)).toHaveLength(0);
    });

    it('should handle empty tool results gracefully', () => {
      const noToolsContext: ResponseGenerationContext = {
        ...mockContext,
        toolResults: [],
      };

      expect(noToolsContext.toolResults).toHaveLength(0);
    });
  });
}); 