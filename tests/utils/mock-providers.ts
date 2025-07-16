import type { LLMMessage, LLMResponse } from '../../src/llm/providers.js';
import type { LLMConfig, Tool } from '../../src/types.js';

export class MockLLMProvider {
  private responses: LLMResponse[] = [];
  private callHistory: { messages: LLMMessage[]; tools?: Tool[] }[] = [];

  constructor(config: LLMConfig, predefinedResponses: LLMResponse[] = []) {
    this.responses = [...predefinedResponses];
  }

  addResponse(response: LLMResponse) {
    this.responses.push(response);
  }

  setResponses(responses: LLMResponse[]) {
    this.responses = responses;
    this.callHistory = [];
  }

  async generateResponse(messages: LLMMessage[], tools?: Tool[]): Promise<LLMResponse> {
    this.callHistory.push({ messages: [...messages], tools });
    
    if (this.responses.length === 0) {
      // Default mock response for intent analysis
      return {
        content: JSON.stringify({
          selectedStateKey: 'specific_helper',
          confidence: 80,
          reasoning: 'Mock intent analysis response for testing',
        }),
        finishReason: 'stop',
      };
    }

    return this.responses.shift() || {
      content: 'Fallback mock response',
      finishReason: 'stop',
    };
  }

  getCallHistory() {
    return this.callHistory;
  }

  getLastCall() {
    return this.callHistory[this.callHistory.length - 1];
  }
}

// Mock the createLLMProvider function
export function createMockLLMProvider(config: LLMConfig): MockLLMProvider {
  return new MockLLMProvider(config);
}

export function createMockLLMResponse(content: string, toolCalls?: any[]): LLMResponse {
  return {
    content,
    toolCalls,
    finishReason: toolCalls ? 'tool_calls' : 'stop',
  };
} 