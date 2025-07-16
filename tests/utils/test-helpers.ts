import type { 
  StateConfig, 
  Context, 
  Tool, 
  LLMConfig, 
  ToolResult
} from '../../src/types.js';
import type { AgentConfig } from '../../src/core/agent.js';
import type { LLMMessage, LLMResponse } from '../../src/llm/providers.js';

// Mock LLM Config
export const mockLLMConfig: LLMConfig = {
  provider: 'groq',
  model: 'llama3-8b-8192',
  temperature: 0.7,
  maxTokens: 4096,
};

// Mock Contexts
export const mockContexts: Context[] = [
  {
    key: 'test_context',
    description: 'Test context for unit tests',
    content: 'This is test context content for unit testing',
    priority: 100,
  },
  {
    key: 'dynamic_context',
    description: 'Dynamic test context',
    content: () => `Dynamic content generated at ${new Date().toISOString()}`,
    priority: 50,
  },
];

// Mock Tools
export const mockTools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'test_tool',
      description: 'A test tool for unit testing',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Test input' },
          count: { type: 'number', description: 'Test count' },
        },
        required: ['input'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'math_tool',
      description: 'Simple math operations',
      parameters: {
        type: 'object',
        properties: {
          operation: { type: 'string', description: 'Math operation: add, subtract, multiply, divide' },
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' },
        },
        required: ['operation', 'a', 'b'],
      },
    },
  },
];

// Mock States
export const mockStates: StateConfig[] = [
  {
    key: 'root',
    description: 'Root state for testing',
    prompt: 'You are a test assistant.',
    contexts: ['test_context'],
    children: [
      {
        key: 'math_helper',
        description: 'Help with math operations',
        prompt: 'You help with mathematical calculations.',
        tools: ['math_tool'],
        contexts: ['test_context'],
      },
      {
        key: 'general_assistant',
        description: 'General assistance and conversation',
        prompt: 'You provide general assistance.',
        tools: ['test_tool'],
        children: [
          {
            key: 'specific_helper',
            description: 'Specific task assistance',
            prompt: 'You help with specific tasks.',
            contexts: ['dynamic_context'],
          },
        ],
      },
    ],
  },
];

// Mock Agent Config
export const mockAgentConfig: AgentConfig = {
  states: mockStates,
  contexts: mockContexts,
  tools: mockTools,
  defaultLLMConfig: mockLLMConfig,
  maxToolIterations: 3,
};

// Mock tool implementations
export const mockToolImplementations = {
  test_tool: async ({ input, count = 1 }: { input: string; count?: number }) => {
    return {
      result: `Test tool executed with input: ${input}, count: ${count}`,
      success: true,
    };
  },
  
  math_tool: async ({ operation, a, b }: { operation: string; a: number; b: number }) => {
    let result: number;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        result = b !== 0 ? a / b : NaN;
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    return { result, operation, a, b };
  },
};

// Mock LLM Response
export function createMockLLMResponse(content: string, toolCalls?: any[]): LLMResponse {
  return {
    content,
    toolCalls,
    finishReason: toolCalls ? 'tool_calls' : 'stop',
  };
}

// Mock LLM Provider
export class MockLLMProvider {
  private responses: LLMResponse[] = [];
  private callHistory: { messages: LLMMessage[]; tools?: Tool[] }[] = [];

  constructor(responses: LLMResponse[] = []) {
    this.responses = responses;
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
      return createMockLLMResponse('Default mock response');
    }

    return this.responses.shift() || createMockLLMResponse('Fallback response');
  }

  getCallHistory() {
    return this.callHistory;
  }

  getLastCall() {
    return this.callHistory[this.callHistory.length - 1];
  }
}

// Test data generators
export function createTestStateConfig(overrides: Partial<StateConfig> = {}): StateConfig {
  return {
    key: 'test_state',
    description: 'Test state description',
    prompt: 'Test prompt',
    ...overrides,
  };
}

export function createTestContext(overrides: Partial<Context> = {}): Context {
  return {
    key: 'test_context',
    description: 'Test context description',
    content: 'Test context content',
    priority: 100,
    ...overrides,
  };
}

export function createTestTool(overrides: Partial<Tool['function']> = {}): Tool {
  return {
    type: 'function',
    function: {
      name: 'test_tool',
      description: 'Test tool description',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string' },
        },
        required: ['input'],
      },
      ...overrides,
    },
  };
}

// Validation helpers
export function isValidStateConfig(state: any): state is StateConfig {
  return state && typeof state.key === 'string' && typeof state.description === 'string';
}

export function isValidToolResult(result: any): result is ToolResult {
  return result && 
    typeof result.toolName === 'string' && 
    typeof result.success === 'boolean' && 
    'result' in result;
}

// Mock conversation storage
export class MockConversationStorage {
  private messages: Map<string, any[]> = new Map();
  private sessions: Map<string, any> = new Map();

  async storeMessage(message: any) {
    const sessionMessages = this.messages.get(message.sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(message.sessionId, sessionMessages);
    return message;
  }

  async getMessages(sessionId: string) {
    return this.messages.get(sessionId) || [];
  }

  async createSession(sessionData: any) {
    this.sessions.set(sessionData.sessionId, sessionData);
    return sessionData;
  }

  async getSession(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  async updateSession(sessionId: string, updates: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
    return session;
  }

  async deleteSession(sessionId: string) {
    this.sessions.delete(sessionId);
    this.messages.delete(sessionId);
  }

  async queryMessages() {
    return [];
  }

  async getConversationStats() {
    return {
      totalSessions: this.sessions.size,
      totalMessages: Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0),
    };
  }

  clear() {
    this.messages.clear();
    this.sessions.clear();
  }
} 