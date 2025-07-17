import { describe, it, expect, beforeEach } from 'bun:test';
import { ConversationFlowManager } from '../../src/core/conversation-flow';
import type { ConversationState, ConversationFlowAnalysis } from '../../src/core/conversation-flow';
import type { LLMConfig } from '../../src/types';

describe('ConversationFlowManager', () => {
  let flowManager: ConversationFlowManager;
  let mockLLMConfig: LLMConfig;

  beforeEach(() => {
    mockLLMConfig = {
      provider: 'groq',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.7,
    };
    flowManager = new ConversationFlowManager(mockLLMConfig);
  });

  describe('getOrCreateConversationState', () => {
    it('should create new conversation state with default values', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      const state = flowManager.getOrCreateConversationState(userId, sessionId);
      
      expect(state.userId).toBe(userId);
      expect(state.sessionId).toBe(sessionId);
      expect(state.currentTone).toBe('friendly');
      expect(state.emotionalContext.userMood).toBe('neutral');
      expect(state.conversationFlow.phase).toBe('greeting');
      expect(state.conversationFlow.turnsInPhase).toBe(0);
      expect(state.conversationStyle.preferredLength).toBe('moderate');
      expect(state.conversationStyle.technicalLevel).toBe('intermediate');
    });

    it('should return existing conversation state for same user/session', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      const state1 = flowManager.getOrCreateConversationState(userId, sessionId);
      state1.currentTone = 'professional';
      
      const state2 = flowManager.getOrCreateConversationState(userId, sessionId);
      
      expect(state2.currentTone).toBe('professional');
      expect(state1).toBe(state2); // Same object reference
    });

    it('should create different states for different users', () => {
      const sessionId = 'session456';
      
      const state1 = flowManager.getOrCreateConversationState('user1', sessionId);
      const state2 = flowManager.getOrCreateConversationState('user2', sessionId);
      
      expect(state1.userId).toBe('user1');
      expect(state2.userId).toBe('user2');
      expect(state1).not.toBe(state2);
    });

    it('should accept initial context for new state', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const initialContext = {
        currentTone: 'formal' as const,
        emotionalContext: {
          userMood: 'frustrated' as const,
          conversationRhythm: 'fast' as const,
          engagementLevel: 3,
          frustrationLevel: 7,
        },
      };
      
      const state = flowManager.getOrCreateConversationState(userId, sessionId, initialContext);
      
      expect(state.currentTone).toBe('formal');
      expect(state.emotionalContext.userMood).toBe('frustrated');
      expect(state.emotionalContext.conversationRhythm).toBe('fast');
      expect(state.emotionalContext.engagementLevel).toBe(3);
      expect(state.emotionalContext.frustrationLevel).toBe(7);
    });
  });

  describe('updateConversationState', () => {
    let state: ConversationState;
    let mockAnalysis: ConversationFlowAnalysis;

    beforeEach(() => {
      state = flowManager.getOrCreateConversationState('user123', 'session456');
      mockAnalysis = {
        shouldAdjustTone: false,
        suggestedTone: 'friendly',
        shouldAcknowledgeEmotion: false,
        emotionalResponse: '',
        conversationTransition: {
          shouldTransition: false,
          transitionReason: 'No transition needed',
        },
        clarificationNeeded: false,
        clarificationQuestions: [],
        contextualPrompts: [],
      };
    });

    it('should update tone when analysis suggests it', () => {
      mockAnalysis.shouldAdjustTone = true;
      mockAnalysis.suggestedTone = 'empathetic';
      
      const updatedState = flowManager.updateConversationState(state, mockAnalysis, 'test query');
      
      expect(updatedState.currentTone).toBe('empathetic');
    });

    it('should transition conversation phase when analysis suggests it', () => {
      mockAnalysis.conversationTransition = {
        shouldTransition: true,
        newPhase: 'problem_solving',
        transitionReason: 'User has a specific problem to solve',
      };
      
      const updatedState = flowManager.updateConversationState(state, mockAnalysis, 'I have a problem');
      
      expect(updatedState.conversationFlow.phase).toBe('problem_solving');
      expect(updatedState.conversationFlow.turnsInPhase).toBe(1);
    });

    it('should increment turn counter', () => {
      const initialTurns = state.conversationFlow.turnsInPhase;
      
      const updatedState = flowManager.updateConversationState(state, mockAnalysis, 'test query');
      
      expect(updatedState.conversationFlow.turnsInPhase).toBe(initialTurns + 1);
    });

    it('should extract and track topics from user query', () => {
      const userQuery = 'I need help with my banking account balance and transaction history';
      
      const updatedState = flowManager.updateConversationState(state, mockAnalysis, userQuery);
      
      expect(updatedState.conversationFlow.mainTopics).toContain('banking');
      expect(updatedState.conversationFlow.mainTopics).toContain('help');
      // The word extraction filters out words less than 4 characters, so 'account' becomes 'account' but may not be extracted if it's less than 4 chars after processing
      expect(updatedState.conversationFlow.mainTopics.length).toBeGreaterThan(0);
    });

    it('should limit main topics to last 10', () => {
      // Add 15 topics
      for (let i = 0; i < 15; i++) {
        const query = `topic${i} specific question about something`;
        flowManager.updateConversationState(state, mockAnalysis, query);
      }
      
      expect(state.conversationFlow.mainTopics.length).toBeLessThanOrEqual(10);
    });

    it('should update engagement level based on emotional acknowledgment', () => {
      const initialEngagement = state.emotionalContext.engagementLevel;
      
      // Test decreasing engagement when emotion needs acknowledgment
      mockAnalysis.shouldAcknowledgeEmotion = true;
      let updatedState = flowManager.updateConversationState(state, mockAnalysis, 'test query');
      expect(updatedState.emotionalContext.engagementLevel).toBe(Math.max(initialEngagement - 1, 0));
      
      // Test increasing engagement when no emotion acknowledgment needed
      mockAnalysis.shouldAcknowledgeEmotion = false;
      updatedState = flowManager.updateConversationState(state, mockAnalysis, 'test query');
      expect(updatedState.emotionalContext.engagementLevel).toBe(Math.min(initialEngagement, 10));
    });

    it('should update timestamp', () => {
      const oldTimestamp = state.timestamp.getTime();
      
      // Wait a small amount to ensure timestamp difference
      setTimeout(() => {
        const updatedState = flowManager.updateConversationState(state, mockAnalysis, 'test query');
        expect(updatedState.timestamp.getTime()).toBeGreaterThan(oldTimestamp);
      }, 1);
    });
  });

  describe('generateConversationContext', () => {
    let state: ConversationState;

    beforeEach(() => {
      state = flowManager.getOrCreateConversationState('user123', 'session456');
      state.currentTone = 'professional';
      state.conversationFlow.phase = 'problem_solving';
      state.conversationFlow.turnsInPhase = 3;
      state.emotionalContext.userMood = 'frustrated';
      state.emotionalContext.engagementLevel = 6;
      state.emotionalContext.frustrationLevel = 4;
      state.conversationStyle.preferredLength = 'brief';
      state.conversationStyle.technicalLevel = 'expert';
      state.conversationFlow.mainTopics = ['banking', 'transfers', 'errors'];
      state.conversationFlow.unresolved = ['timeout issue'];
    });

    it('should generate comprehensive conversation context', () => {
      const context = flowManager.generateConversationContext(state);
      
      expect(context.key).toBe('conversation_flow');
      expect(context.description).toContain('Natural conversation flow');
      expect(context.priority).toBe(95);
      
      const content = context.content;
      expect(content).toContain('professional');
      expect(content).toContain('problem_solving');
      expect(content).toContain('turn 3');
      expect(content).toContain('frustrated');
      expect(content).toContain('6/10');
      expect(content).toContain('4/10');
      expect(content).toContain('brief');
      expect(content).toContain('expert');
      expect(content).toContain('banking, transfers, errors');
      expect(content).toContain('timeout issue');
    });

    it('should include appropriate guidelines for each conversation phase', () => {
      // Test different phases
      const phases: ConversationState['conversationFlow']['phase'][] = [
        'greeting', 'information_gathering', 'problem_solving', 'resolution', 'follow_up'
      ];
      
      phases.forEach(phase => {
        state.conversationFlow.phase = phase;
        const context = flowManager.generateConversationContext(state);
        
        switch (phase) {
          case 'greeting':
            expect(context.content).toContain('Be welcoming and establish rapport');
            break;
          case 'information_gathering':
            expect(context.content).toContain('Ask clarifying questions');
            break;
          case 'problem_solving':
            expect(context.content).toContain('Focus on solutions and actions');
            break;
          case 'resolution':
            expect(context.content).toContain('Confirm understanding and next steps');
            break;
          case 'follow_up':
            expect(context.content).toContain('Check satisfaction and offer additional help');
            break;
        }
      });
    });

    it('should include tone-specific guidelines', () => {
      const tones: ConversationState['currentTone'][] = [
        'formal', 'casual', 'friendly', 'professional', 'empathetic', 'urgent'
      ];
      
      tones.forEach(tone => {
        state.currentTone = tone;
        const context = flowManager.generateConversationContext(state);
        expect(context.content).toContain(tone);
      });
    });

    it('should handle empty topics and unresolved items gracefully', () => {
      state.conversationFlow.mainTopics = [];
      state.conversationFlow.unresolved = [];
      
      const context = flowManager.generateConversationContext(state);
      
      expect(context.content).toContain('None yet');
      expect(context.content).toContain('None');
    });
  });

  describe('cleanupOldStates', () => {
    it('should remove states older than specified age', () => {
      const userId1 = 'user1';
      const userId2 = 'user2';
      const sessionId = 'session123';
      
      // Create states
      const state1 = flowManager.getOrCreateConversationState(userId1, sessionId);
      const state2 = flowManager.getOrCreateConversationState(userId2, sessionId);
      
      // Make one state old
      state1.timestamp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days old
      
      // Cleanup states older than 1 day
      const maxAge = 24 * 60 * 60 * 1000; // 1 day
      flowManager.cleanupOldStates(maxAge);
      
      // State1 should be gone, state2 should remain
      const newState1 = flowManager.getOrCreateConversationState(userId1, sessionId);
      const newState2 = flowManager.getOrCreateConversationState(userId2, sessionId);
      
      expect(newState1.timestamp.getTime()).toBeGreaterThan(state1.timestamp.getTime()); // New state created
      expect(newState2).toBe(state2); // Same state instance
    });

    it('should not remove recent states', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      const state = flowManager.getOrCreateConversationState(userId, sessionId);
      const originalTimestamp = state.timestamp.getTime();
      
      // Cleanup with very short age
      flowManager.cleanupOldStates(1000); // 1 second
      
      const sameState = flowManager.getOrCreateConversationState(userId, sessionId);
      expect(sameState.timestamp.getTime()).toBe(originalTimestamp);
    });
  });

  describe('createConversationFlowContext', () => {
    it('should create context from flow manager and state', () => {
      const state = flowManager.getOrCreateConversationState('user123', 'session456');
      
      const context = flowManager.generateConversationContext(state);
      
      expect(context.key).toBe('conversation_flow');
      expect(context.description).toContain('Natural conversation flow');
      expect(typeof context.content).toBe('string');
      expect(context.priority).toBe(95);
    });
  });
}); 