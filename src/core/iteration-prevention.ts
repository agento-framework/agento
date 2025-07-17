import type { ToolResult, Tool } from "../types";

/**
 * Iteration Prevention System
 * Prevents infinite loops, unnecessary tool calls, and repetitive behavior
 */

export interface IterationState {
  sessionId: string;
  userId: string;
  toolCallHistory: ToolCallRecord[];
  patternDetection: {
    repeatedCalls: Map<string, number>;
    loopDetection: ToolCallSequence[];
    ineffectiveCalls: Set<string>;
  };
  conversationState: {
    lastUserQuery: string;
    lastAgentResponse: string;
    queryRepetitionCount: number;
    solutionAttempts: number;
  };
  preventionRules: IterationRule[];
  timestamp: Date;
}

export interface ToolCallRecord {
  toolName: string;
  parameters: any;
  result: ToolResult;
  timestamp: Date;
  context: string; // User query that triggered this call
  sequenceId: string; // Groups related tool calls
  effectiveness: 'helpful' | 'redundant' | 'ineffective' | 'unknown';
}

export interface ToolCallSequence {
  id: string;
  calls: ToolCallRecord[];
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
  effectiveness: number; // 0-1 score
}

export interface IterationRule {
  name: string;
  description: string;
  condition: (state: IterationState, proposedTool: string, params: any) => boolean;
  action: 'block' | 'warn' | 'suggest_alternative';
  message: string;
  priority: number;
}

export interface IterationPreventionResult {
  shouldProceed: boolean;
  action: 'allow' | 'block' | 'modify' | 'suggest_alternative';
  reason: string;
  suggestedAlternative?: {
    toolName: string;
    parameters: any;
    reasoning: string;
  };
  warningMessage?: string;
}

export class IterationPreventionManager {
  private iterationStates = new Map<string, IterationState>();
  private globalPatterns = new Map<string, ToolCallSequence>();
  private defaultRules: IterationRule[];

  constructor() {
    this.defaultRules = this.createDefaultRules();
  }

  /**
   * Get or create iteration state for a session
   */
  getOrCreateIterationState(userId: string, sessionId: string): IterationState {
    const stateKey = `${userId}:${sessionId}`;
    
    if (!this.iterationStates.has(stateKey)) {
      const state: IterationState = {
        sessionId,
        userId,
        toolCallHistory: [],
        patternDetection: {
          repeatedCalls: new Map(),
          loopDetection: [],
          ineffectiveCalls: new Set(),
        },
        conversationState: {
          lastUserQuery: '',
          lastAgentResponse: '',
          queryRepetitionCount: 0,
          solutionAttempts: 0,
        },
        preventionRules: [...this.defaultRules],
        timestamp: new Date(),
      };
      
      this.iterationStates.set(stateKey, state);
    }
    
    return this.iterationStates.get(stateKey)!;
  }

  /**
   * Check if a tool call should be allowed
   */
  shouldAllowToolCall(
    userId: string,
    sessionId: string,
    toolName: string,
    parameters: any,
    userQuery: string
  ): IterationPreventionResult {
    const state = this.getOrCreateIterationState(userId, sessionId);
    
    // Update conversation state
    this.updateConversationState(state, userQuery);
    
    // Check all prevention rules
    for (const rule of state.preventionRules.sort((a, b) => b.priority - a.priority)) {
      if (rule.condition(state, toolName, parameters)) {
        if (rule.action === 'block') {
          return {
            shouldProceed: false,
            action: 'block',
            reason: rule.message,
          };
        } else if (rule.action === 'warn') {
          return {
            shouldProceed: true,
            action: 'allow',
            reason: 'Allowed with warning',
            warningMessage: rule.message,
          };
        } else if (rule.action === 'suggest_alternative') {
          const alternative = this.generateAlternative(state, toolName, parameters);
          return {
            shouldProceed: false,
            action: 'suggest_alternative',
            reason: rule.message,
            suggestedAlternative: alternative,
          };
        }
      }
    }

    return {
      shouldProceed: true,
      action: 'allow',
      reason: 'No prevention rules triggered',
    };
  }

  /**
   * Record a tool call execution
   */
  recordToolCall(
    userId: string,
    sessionId: string,
    toolName: string,
    parameters: any,
    result: ToolResult,
    userQuery: string
  ): void {
    const state = this.getOrCreateIterationState(userId, sessionId);
    const sequenceId = this.generateSequenceId(userQuery);
    
    const record: ToolCallRecord = {
      toolName,
      parameters,
      result,
      timestamp: new Date(),
      context: userQuery,
      sequenceId,
      effectiveness: this.assessEffectiveness(result),
    };

    // Add to history
    state.toolCallHistory.push(record);
    
    // Keep history manageable
    if (state.toolCallHistory.length > 100) {
      state.toolCallHistory = state.toolCallHistory.slice(-100);
    }

    // Update pattern detection
    this.updatePatternDetection(state, record);
    
    // Update global patterns
    this.updateGlobalPatterns(record);
  }

  /**
   * Update conversation state
   */
  private updateConversationState(state: IterationState, userQuery: string): void {
    if (state.conversationState.lastUserQuery === userQuery) {
      state.conversationState.queryRepetitionCount++;
    } else {
      state.conversationState.lastUserQuery = userQuery;
      state.conversationState.queryRepetitionCount = 0;
    }
    
    state.conversationState.solutionAttempts++;
    state.timestamp = new Date();
  }

  /**
   * Update pattern detection
   */
  private updatePatternDetection(state: IterationState, record: ToolCallRecord): void {
    const key = `${record.toolName}:${JSON.stringify(record.parameters)}`;
    
    // Track repeated calls
    const count = state.patternDetection.repeatedCalls.get(key) || 0;
    state.patternDetection.repeatedCalls.set(key, count + 1);
    
    // Track ineffective calls
    if (record.effectiveness === 'ineffective') {
      state.patternDetection.ineffectiveCalls.add(key);
    }
    
    // Detect call sequences/loops
    this.detectCallSequences(state, record);
  }

  /**
   * Detect repetitive call sequences
   */
  private detectCallSequences(state: IterationState, record: ToolCallRecord): void {
    const recentCalls = state.toolCallHistory
      .filter(call => call.sequenceId === record.sequenceId)
      .slice(-5); // Look at last 5 calls in sequence

    if (recentCalls.length >= 3) {
      const pattern = recentCalls.map(call => call.toolName).join(' -> ');
      
      // Check if this pattern exists
      let sequence = state.patternDetection.loopDetection.find(seq => seq.pattern === pattern);
      
      if (!sequence) {
        sequence = {
          id: `seq_${Date.now()}`,
          calls: recentCalls,
          pattern,
          frequency: 1,
          lastOccurrence: new Date(),
          effectiveness: this.calculateSequenceEffectiveness(recentCalls),
        };
        state.patternDetection.loopDetection.push(sequence);
      } else {
        sequence.frequency++;
        sequence.lastOccurrence = new Date();
        sequence.effectiveness = this.calculateSequenceEffectiveness(recentCalls);
      }
    }
  }

  /**
   * Calculate effectiveness of a call sequence
   */
  private calculateSequenceEffectiveness(calls: ToolCallRecord[]): number {
    const effectivenessScores = {
      'helpful': 1.0,
      'redundant': 0.3,
      'ineffective': 0.0,
      'unknown': 0.5,
    };

    const totalScore = calls.reduce((sum, call) => 
      sum + effectivenessScores[call.effectiveness], 0
    );
    
    return totalScore / calls.length;
  }

  /**
   * Assess tool call effectiveness
   */
  private assessEffectiveness(result: ToolResult): ToolCallRecord['effectiveness'] {
    if (!result.success) {
      return 'ineffective';
    }
    
    // Check if result provides meaningful data
    if (result.result && typeof result.result === 'object') {
      const keys = Object.keys(result.result);
      if (keys.length === 0) {
        return 'ineffective';
      }
    }
    
    return 'helpful'; // Default for successful calls
  }

  /**
   * Create default prevention rules
   */
  private createDefaultRules(): IterationRule[] {
    return [
      {
        name: 'excessive_repetition',
        description: 'Prevent excessive repetition of the same tool call',
        priority: 100,
        condition: (state, toolName, params) => {
          const key = `${toolName}:${JSON.stringify(params)}`;
          const count = state.patternDetection.repeatedCalls.get(key) || 0;
          return count >= 3;
        },
        action: 'block',
        message: 'This tool has been called multiple times with the same parameters. Please try a different approach.',
      },
      
      {
        name: 'same_query_repetition',
        description: 'Prevent calling tools repeatedly for the same user query',
        priority: 90,
        condition: (state, toolName, params) => {
          return state.conversationState.queryRepetitionCount >= 2 && 
                 state.conversationState.solutionAttempts > 5;
        },
        action: 'suggest_alternative',
        message: 'You\'ve asked the same question multiple times. Let me try a different approach.',
      },
      
      {
        name: 'ineffective_tool_pattern',
        description: 'Prevent using tools that have been consistently ineffective',
        priority: 80,
        condition: (state, toolName, params) => {
          const key = `${toolName}:${JSON.stringify(params)}`;
          return state.patternDetection.ineffectiveCalls.has(key);
        },
        action: 'suggest_alternative',
        message: 'This tool call has been ineffective before. Let me try a different approach.',
      },
      
      {
        name: 'rapid_fire_calls',
        description: 'Prevent too many tool calls in rapid succession',
        priority: 85,
        condition: (state, toolName, params) => {
          const recentCalls = state.toolCallHistory.filter(call => 
            Date.now() - call.timestamp.getTime() < 10000 // Last 10 seconds
          );
          return recentCalls.length >= 5;
        },
        action: 'warn',
        message: 'Multiple tools are being called rapidly. This might indicate an efficiency issue.',
      },
      
      {
        name: 'circular_dependency',
        description: 'Prevent circular tool call patterns',
        priority: 95,
        condition: (state, toolName, params) => {
          // Check if current tool call would create a circular pattern
          const recentSequence = state.toolCallHistory.slice(-3).map(call => call.toolName);
          recentSequence.push(toolName);
          
          const pattern = recentSequence.join(' -> ');
          const existingLoop = state.patternDetection.loopDetection.find(seq => 
            seq.pattern.includes(pattern) || pattern.includes(seq.pattern)
          );
          
          return !!(existingLoop && existingLoop.effectiveness < 0.5);
        },
        action: 'block',
        message: 'This would create a circular pattern that has been ineffective before.',
      },
      
      {
        name: 'redundant_information_gathering',
        description: 'Prevent gathering the same information multiple times',
        priority: 75,
        condition: (state, toolName, params) => {
          // Check if this is an information-gathering tool that was recently used successfully
          const infoGatheringTools = ['get_account_balance', 'get_account_details', 'get_transaction_history'];
          
          if (!infoGatheringTools.includes(toolName)) return false;
          
          const recentSuccessfulCall = state.toolCallHistory
            .slice(-5)
            .find(call => 
              call.toolName === toolName && 
              call.result.success &&
              JSON.stringify(call.parameters) === JSON.stringify(params)
            );
          
          return !!recentSuccessfulCall;
        },
        action: 'block',
        message: 'This information was already retrieved recently. Using cached result.',
      },
    ];
  }

  /**
   * Generate alternative tool suggestion
   */
  private generateAlternative(
    state: IterationState,
    originalTool: string,
    originalParams: any
  ): { toolName: string; parameters: any; reasoning: string } | undefined {
    
    // Simple alternative suggestions based on common patterns
    const alternatives: Record<string, any> = {
      'get_account_balance': {
        toolName: 'get_account_details',
        reasoning: 'Getting comprehensive account details instead of just balance',
      },
      'verify_account': {
        toolName: 'get_customer_accounts_by_session',
        reasoning: 'Listing all customer accounts instead of verifying specific account',
      },
      'search_transactions': {
        toolName: 'get_transaction_history',
        reasoning: 'Getting general transaction history instead of searching',
      },
    };

    const alternative = alternatives[originalTool];
    if (alternative) {
      return {
        toolName: alternative.toolName,
        parameters: originalParams, // Use same parameters where applicable
        reasoning: alternative.reasoning,
      };
    }

    return undefined;
  }

  /**
   * Generate sequence ID for grouping related tool calls
   */
  private generateSequenceId(userQuery: string): string {
    // Simple hash of the user query to group related calls
    let hash = 0;
    for (let i = 0; i < userQuery.length; i++) {
      const char = userQuery.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `seq_${Math.abs(hash)}`;
  }

  /**
   * Update global patterns across all users
   */
  private updateGlobalPatterns(record: ToolCallRecord): void {
    const patternKey = `${record.toolName}_pattern`;
    
    if (!this.globalPatterns.has(patternKey)) {
      this.globalPatterns.set(patternKey, {
        id: patternKey,
        calls: [],
        pattern: record.toolName,
        frequency: 0,
        lastOccurrence: new Date(),
        effectiveness: 0,
      });
    }
    
    const globalPattern = this.globalPatterns.get(patternKey)!;
    globalPattern.calls.push(record);
    globalPattern.frequency++;
    globalPattern.lastOccurrence = new Date();
    
    // Keep global patterns manageable
    if (globalPattern.calls.length > 50) {
      globalPattern.calls = globalPattern.calls.slice(-50);
    }
    
    // Recalculate effectiveness
    globalPattern.effectiveness = this.calculateSequenceEffectiveness(globalPattern.calls);
  }

  /**
   * Get iteration prevention insights
   */
  getIterationInsights(userId: string, sessionId: string): {
    totalToolCalls: number;
    repeatedCalls: number;
    ineffectiveCalls: number;
    detectedLoops: number;
    averageEffectiveness: number;
    recommendations: string[];
  } {
    const state = this.getOrCreateIterationState(userId, sessionId);
    
    const totalCalls = state.toolCallHistory.length;
    const repeatedCalls = Array.from(state.patternDetection.repeatedCalls.values())
      .filter(count => count > 1).length;
    const ineffectiveCalls = state.patternDetection.ineffectiveCalls.size;
    const detectedLoops = state.patternDetection.loopDetection.length;
    
    const avgEffectiveness = state.toolCallHistory.length > 0 
      ? this.calculateSequenceEffectiveness(state.toolCallHistory)
      : 0;

    const recommendations: string[] = [];
    
    if (repeatedCalls > 0) {
      recommendations.push('Consider caching results to avoid repeated tool calls');
    }
    
    if (ineffectiveCalls > 0) {
      recommendations.push('Some tool calls have been ineffective - review parameters');
    }
    
    if (detectedLoops > 0) {
      recommendations.push('Circular patterns detected - implement better flow control');
    }
    
    if (totalCalls > 0 && avgEffectiveness < 0.7) {
      recommendations.push('Tool call effectiveness is low - review tool selection logic');
    }

    return {
      totalToolCalls: totalCalls,
      repeatedCalls,
      ineffectiveCalls,
      detectedLoops,
      averageEffectiveness: avgEffectiveness,
      recommendations,
    };
  }

  /**
   * Clean up old iteration states
   */
  cleanupOldStates(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge);
    
    for (const [key, state] of this.iterationStates.entries()) {
      if (state.timestamp < cutoff) {
        this.iterationStates.delete(key);
      }
    }
  }
} 