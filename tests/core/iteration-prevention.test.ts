import { describe, it, expect, beforeEach } from 'bun:test';
import { IterationPreventionManager } from '../../src/core/iteration-prevention';
import type { ToolResult } from '../../src/types';

describe('IterationPreventionManager', () => {
  let manager: IterationPreventionManager;

  beforeEach(() => {
    manager = new IterationPreventionManager();
  });

  describe('shouldAllowToolCall', () => {
    it('should allow first-time tool calls', () => {
      const result = manager.shouldAllowToolCall(
        'user123',
        'session456',
        'get_account_balance',
        { accountNumber: 'ACC001' },
        'What is my balance?'
      );

      expect(result.shouldProceed).toBe(true);
      expect(result.action).toBe('allow');
    });

    it('should block excessive repetition of same tool call', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const toolName = 'get_account_balance';
      const params = { accountNumber: 'ACC001' };
      const userQuery = 'What is my balance?';

      // Call the same tool multiple times
      for (let i = 0; i < 3; i++) {
        manager.recordToolCall(
          userId,
          sessionId,
          toolName,
          params,
          { toolName, success: true, result: { balance: 100 } },
          userQuery
        );
      }

      const result = manager.shouldAllowToolCall(userId, sessionId, toolName, params, userQuery);

      expect(result.shouldProceed).toBe(false);
      expect(result.action).toBe('block');
      expect(result.reason).toContain('multiple times with the same parameters');
    });

    it('should suggest alternative when same query repeated', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const state = manager.getOrCreateIterationState(userId, sessionId);

      // Simulate repeated same query
      state.conversationState.lastUserQuery = 'What is my balance?';
      state.conversationState.queryRepetitionCount = 3;
      state.conversationState.solutionAttempts = 6;

      const result = manager.shouldAllowToolCall(
        userId,
        sessionId,
        'get_account_balance',
        { accountNumber: 'ACC001' },
        'What is my balance?'
      );

      expect(result.shouldProceed).toBe(false);
      expect(result.action).toBe('suggest_alternative');
      expect(result.suggestedAlternative).toBeDefined();
    });

    it('should block ineffective tool patterns', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const toolName = 'search_transactions';
      const params = { query: 'test' };

      // Record an ineffective call
      manager.recordToolCall(
        userId,
        sessionId,
        toolName,
        params,
        { toolName, success: false, result: null, error: 'No results' },
        'Find transactions'
      );

      const result = manager.shouldAllowToolCall(userId, sessionId, toolName, params, 'Find transactions');

      expect(result.shouldProceed).toBe(false);
      expect(result.action).toBe('suggest_alternative');
      expect(result.reason).toContain('ineffective before');
    });

    it('should warn about rapid fire calls', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const state = manager.getOrCreateIterationState(userId, sessionId);

      // Simulate rapid calls
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        state.toolCallHistory.push({
          toolName: `tool${i}`,
          parameters: {},
          result: { toolName: `tool${i}`, success: true, result: {} },
          timestamp: new Date(now.getTime() - (5 - i) * 1000), // Last 5 seconds
          context: 'test query',
          sequenceId: 'seq123',
          effectiveness: 'helpful',
        });
      }

      const result = manager.shouldAllowToolCall(
        userId,
        sessionId,
        'another_tool',
        {},
        'Another query'
      );

      expect(result.shouldProceed).toBe(true);
      expect(result.action).toBe('allow');
      expect(result.warningMessage).toContain('Multiple tools are being called rapidly');
    });

    it('should block circular dependencies', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const state = manager.getOrCreateIterationState(userId, sessionId);

      // Create a circular pattern that was ineffective
      const sequence = {
        id: 'circular1',
        calls: [],
        pattern: 'toolA -> toolB -> toolC -> toolA',
        frequency: 3,
        lastOccurrence: new Date(),
        effectiveness: 0.3, // Low effectiveness
      };
      state.patternDetection.loopDetection.push(sequence);

      // Add recent calls that would create the pattern
      state.toolCallHistory.push(
        {
          toolName: 'toolA',
          parameters: {},
          result: { toolName: 'toolA', success: true, result: {} },
          timestamp: new Date(),
          context: 'test',
          sequenceId: 'seq1',
          effectiveness: 'helpful',
        },
        {
          toolName: 'toolB',
          parameters: {},
          result: { toolName: 'toolB', success: true, result: {} },
          timestamp: new Date(),
          context: 'test',
          sequenceId: 'seq1',
          effectiveness: 'helpful',
        },
        {
          toolName: 'toolC',
          parameters: {},
          result: { toolName: 'toolC', success: true, result: {} },
          timestamp: new Date(),
          context: 'test',
          sequenceId: 'seq1',
          effectiveness: 'helpful',
        }
      );

      const result = manager.shouldAllowToolCall(userId, sessionId, 'toolA', {}, 'Complete the circle');

      expect(result.shouldProceed).toBe(false);
      expect(result.action).toBe('block');
      expect(result.reason).toContain('circular pattern');
    });

    it('should block redundant information gathering', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const toolName = 'get_account_balance';
      const params = { accountNumber: 'ACC001' };

      // Record a recent successful call
      manager.recordToolCall(
        userId,
        sessionId,
        toolName,
        params,
        { toolName, success: true, result: { balance: 100 } },
        'Check balance'
      );

      const result = manager.shouldAllowToolCall(userId, sessionId, toolName, params, 'Check balance again');

      expect(result.shouldProceed).toBe(false);
      expect(result.action).toBe('block');
      expect(result.reason).toContain('already retrieved recently');
    });
  });

  describe('recordToolCall', () => {
    it('should record tool call with correct metadata', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const toolName = 'get_account_balance';
      const params = { accountNumber: 'ACC001' };
      const result: ToolResult = { toolName, success: true, result: { balance: 100 } };
      const userQuery = 'What is my balance?';

      manager.recordToolCall(userId, sessionId, toolName, params, result, userQuery);

      const state = manager.getOrCreateIterationState(userId, sessionId);
      expect(state.toolCallHistory).toHaveLength(1);

      const record = state.toolCallHistory[0];
      expect(record.toolName).toBe(toolName);
      expect(record.parameters).toEqual(params);
      expect(record.result).toEqual(result);
      expect(record.context).toBe(userQuery);
      expect(record.effectiveness).toBe('helpful');
    });

    it('should assess effectiveness correctly', () => {
      const userId = 'user123';
      const sessionId = 'session456';

      // Test successful call
      manager.recordToolCall(
        userId,
        sessionId,
        'tool1',
        {},
        { toolName: 'tool1', success: true, result: { data: 'test' } },
        'query1'
      );

      // Test failed call
      manager.recordToolCall(
        userId,
        sessionId,
        'tool2',
        {},
        { toolName: 'tool2', success: false, result: null, error: 'Failed' },
        'query2'
      );

      // Test empty result
      manager.recordToolCall(
        userId,
        sessionId,
        'tool3',
        {},
        { toolName: 'tool3', success: true, result: {} },
        'query3'
      );

      const state = manager.getOrCreateIterationState(userId, sessionId);
      expect(state.toolCallHistory[0].effectiveness).toBe('helpful');
      expect(state.toolCallHistory[1].effectiveness).toBe('ineffective');
      expect(state.toolCallHistory[2].effectiveness).toBe('ineffective');
    });

    it('should update pattern detection', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const toolName = 'test_tool';
      const params = { test: 'value' };

      // Record multiple calls
      for (let i = 0; i < 3; i++) {
        manager.recordToolCall(
          userId,
          sessionId,
          toolName,
          params,
          { toolName, success: true, result: {} },
          'test query'
        );
      }

      const state = manager.getOrCreateIterationState(userId, sessionId);
      const key = `${toolName}:${JSON.stringify(params)}`;
      expect(state.patternDetection.repeatedCalls.get(key)).toBe(3);
    });

    it('should limit tool call history', () => {
      const userId = 'user123';
      const sessionId = 'session456';

      // Record more than 100 calls
      for (let i = 0; i < 105; i++) {
        manager.recordToolCall(
          userId,
          sessionId,
          `tool${i}`,
          {},
          { toolName: `tool${i}`, success: true, result: {} },
          `query${i}`
        );
      }

      const state = manager.getOrCreateIterationState(userId, sessionId);
      expect(state.toolCallHistory).toHaveLength(100);
    });
  });

  describe('getIterationInsights', () => {
    it('should provide comprehensive insights', () => {
      const userId = 'user123';
      const sessionId = 'session456';

      // Set up some data
      const state = manager.getOrCreateIterationState(userId, sessionId);
      
      // Add repeated calls
      state.patternDetection.repeatedCalls.set('tool1:{}', 3);
      state.patternDetection.repeatedCalls.set('tool2:{}', 1);
      
      // Add ineffective calls
      state.patternDetection.ineffectiveCalls.add('tool3:{}');
      
      // Add detected loops
      state.patternDetection.loopDetection.push({
        id: 'loop1',
        calls: [],
        pattern: 'A -> B -> A',
        frequency: 2,
        lastOccurrence: new Date(),
        effectiveness: 0.3,
      });

      // Add tool call history for effectiveness calculation
      state.toolCallHistory.push(
        {
          toolName: 'tool1',
          parameters: {},
          result: { toolName: 'tool1', success: true, result: {} },
          timestamp: new Date(),
          context: 'test',
          sequenceId: 'seq1',
          effectiveness: 'helpful',
        },
        {
          toolName: 'tool2',
          parameters: {},
          result: { toolName: 'tool2', success: false, result: null },
          timestamp: new Date(),
          context: 'test',
          sequenceId: 'seq1',
          effectiveness: 'ineffective',
        }
      );

      const insights = manager.getIterationInsights(userId, sessionId);

      expect(insights.totalToolCalls).toBe(2);
      expect(insights.repeatedCalls).toBe(1); // Only tool1 has count > 1
      expect(insights.ineffectiveCalls).toBe(1);
      expect(insights.detectedLoops).toBe(1);
      expect(insights.averageEffectiveness).toBe(0.5); // 1 helpful + 0 ineffective / 2
      expect(insights.recommendations).toContain('Consider caching results to avoid repeated tool calls');
      expect(insights.recommendations).toContain('Some tool calls have been ineffective - review parameters');
      expect(insights.recommendations).toContain('Circular patterns detected - implement better flow control');
    });

    it('should handle empty state gracefully', () => {
      const insights = manager.getIterationInsights('newUser', 'newSession');

      expect(insights.totalToolCalls).toBe(0);
      expect(insights.repeatedCalls).toBe(0);
      expect(insights.ineffectiveCalls).toBe(0);
      expect(insights.detectedLoops).toBe(0);
      expect(insights.averageEffectiveness).toBe(0);
      expect(insights.recommendations).toHaveLength(0);
    });

    it('should provide recommendations based on metrics', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const state = manager.getOrCreateIterationState(userId, sessionId);

      // Set up low effectiveness scenario
      state.toolCallHistory = [
        {
          toolName: 'tool1',
          parameters: {},
          result: { toolName: 'tool1', success: false, result: null },
          timestamp: new Date(),
          context: 'test',
          sequenceId: 'seq1',
          effectiveness: 'ineffective',
        },
        {
          toolName: 'tool2',
          parameters: {},
          result: { toolName: 'tool2', success: false, result: null },
          timestamp: new Date(),
          context: 'test',
          sequenceId: 'seq1',
          effectiveness: 'ineffective',
        },
      ];

      const insights = manager.getIterationInsights(userId, sessionId);
      expect(insights.averageEffectiveness).toBe(0);
      expect(insights.recommendations).toContain('Tool call effectiveness is low - review tool selection logic');
    });
  });

  describe('cleanupOldStates', () => {
    it('should remove old states', () => {
      const userId1 = 'user1';
      const userId2 = 'user2';
      const sessionId = 'session123';

      // Create states
      const state1 = manager.getOrCreateIterationState(userId1, sessionId);
      const state2 = manager.getOrCreateIterationState(userId2, sessionId);

      // Make one state old
      state1.timestamp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days old

      // Cleanup states older than 1 day
      const maxAge = 24 * 60 * 60 * 1000;
      manager.cleanupOldStates(maxAge);

      // Check that state1 was removed and state2 remains
      const newState1 = manager.getOrCreateIterationState(userId1, sessionId);
      const newState2 = manager.getOrCreateIterationState(userId2, sessionId);

      expect(newState1.timestamp.getTime()).toBeGreaterThan(state1.timestamp.getTime());
      expect(newState2).toBe(state2);
    });

    it('should not remove recent states', () => {
      const userId = 'user123';
      const sessionId = 'session456';

      const state = manager.getOrCreateIterationState(userId, sessionId);
      const originalTimestamp = state.timestamp.getTime();

      // Cleanup with very short age
      manager.cleanupOldStates(1000); // 1 second

      const sameState = manager.getOrCreateIterationState(userId, sessionId);
      expect(sameState.timestamp.getTime()).toBe(originalTimestamp);
    });
  });

  describe('sequence detection', () => {
    it('should detect call sequences', () => {
      const userId = 'user123';
      const sessionId = 'session456';

      // Create a sequence of related calls
      const sequenceId = 'seq123';
      const calls = ['toolA', 'toolB', 'toolA', 'toolB', 'toolA'];

      calls.forEach((toolName, index) => {
        const state = manager.getOrCreateIterationState(userId, sessionId);
        const record = {
          toolName,
          parameters: {},
          result: { toolName, success: true, result: {} },
          timestamp: new Date(),
          context: 'test query',
          sequenceId,
          effectiveness: 'helpful' as const,
        };
        
        state.toolCallHistory.push(record);
        
        // Manually trigger pattern detection (normally done in recordToolCall)
        if (state.toolCallHistory.length >= 3) {
          const recentCalls = state.toolCallHistory
            .filter(call => call.sequenceId === sequenceId)
            .slice(-5);
          
          if (recentCalls.length >= 3) {
            const pattern = recentCalls.map(call => call.toolName).join(' -> ');
            const existingSequence = state.patternDetection.loopDetection.find(seq => seq.pattern === pattern);
            
            if (!existingSequence) {
              state.patternDetection.loopDetection.push({
                id: `seq_${Date.now()}`,
                calls: recentCalls,
                pattern,
                frequency: 1,
                lastOccurrence: new Date(),
                effectiveness: 1.0,
              });
            }
          }
        }
      });

      const state = manager.getOrCreateIterationState(userId, sessionId);
      expect(state.patternDetection.loopDetection.length).toBeGreaterThan(0);
    });
  });
}); 