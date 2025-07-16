# Agento Framework - Testing Documentation

## 🧪 Test Suite Overview

This document describes the comprehensive testing strategy implemented for the Agento Framework, covering unit tests, integration tests, and coverage requirements.

## 📊 Test Coverage

The test suite provides comprehensive coverage across all major framework components:

### Core Components
- **StateMachine** (`tests/core/state-machine.test.ts`)
  - State hierarchy and inheritance
  - Leaf state identification and resolution
  - Context and tool inheritance
  - Guard function handling
  - Edge cases and error scenarios

- **ToolExecutor** (`tests/core/tool-executor.test.ts`)
  - Tool registration and execution
  - Error handling and validation
  - Concurrent execution
  - Performance testing
  - Edge cases with various argument types

- **Agent** (`tests/core/agent.test.ts`)
  - Agent initialization and configuration
  - Tool registration and management
  - Query processing workflows
  - Error handling and validation
  - Integration scenarios

- **Vector Storage** (`tests/core/vector-storage.test.ts`)
  - In-memory vector storage operations
  - Search and similarity matching
  - Batch operations
  - Knowledge base integration
  - Factory pattern implementations

### Integration Tests
- **Full Workflow** (`tests/integration/full-workflow.test.ts`)
  - End-to-end framework functionality
  - State machine and tool integration
  - Context orchestration
  - Guard function workflows
  - Real-world scenario testing

## 🛠️ Test Framework

The test suite uses **Bun Test** for fast, TypeScript-native testing:

- Native TypeScript support
- Fast execution and parallel test running
- Built-in mocking and assertion capabilities
- Comprehensive coverage reporting

## 🚀 Running Tests

### Basic Test Commands

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test tests/core/state-machine.test.ts

# Run tests matching a pattern
bun test --filter "StateMachine"
```

### Test Scripts (package.json)

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:legacy": "node test-framework.ts"
  }
}
```

## 📋 Test Categories

### 1. Unit Tests

**Purpose**: Test individual components in isolation

**Coverage**:
- Constructor validation
- Method functionality
- Error handling
- Edge cases
- Performance characteristics

**Example**:
```typescript
describe('ToolExecutor', () => {
  it('should execute registered tools successfully', async () => {
    const toolExecutor = new ToolExecutor();
    toolExecutor.registerTool('test_tool', async ({ input }) => {
      return { result: `Processed: ${input}` };
    });

    const result = await toolExecutor.executeTool('test_tool', { input: 'hello' });
    expect(result.success).toBe(true);
    expect(result.result.result).toBe('Processed: hello');
  });
});
```

### 2. Integration Tests

**Purpose**: Test component interactions and workflows

**Coverage**:
- Multi-component workflows
- State machine and tool integration
- Context orchestration
- Guard function execution
- Vector storage integration

**Example**:
```typescript
describe('Integration Tests', () => {
  it('should handle complete customer service workflow', async () => {
    const agent = new Agent(config);
    agent.registerTools(toolImplementations);
    
    const states = agent.getAvailableStates();
    const result = await toolExecutor.executeTool('get_user_info', { userId: 'user123' });
    
    expect(result.success).toBe(true);
    expect(result.result.name).toBe('John Doe');
  });
});
```

### 3. Performance Tests

**Purpose**: Validate framework performance under load

**Coverage**:
- Concurrent operation handling
- Memory usage validation
- Large dataset processing
- Stress testing scenarios

**Example**:
```typescript
describe('Performance', () => {
  it('should handle multiple concurrent tool executions', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      toolExecutor.executeTool('concurrent_tool', { id: i })
    );
    
    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);
    results.forEach(result => expect(result.success).toBe(true));
  });
});
```

## 🔧 Test Utilities

### Mock Helpers (`tests/utils/test-helpers.ts`)

Comprehensive utilities for creating test data and mocks:

```typescript
// Mock configurations
export const mockLLMConfig: LLMConfig = { /* ... */ };
export const mockStates: StateConfig[] = [ /* ... */ ];
export const mockTools: Tool[] = [ /* ... */ ];

// Mock implementations
export const mockToolImplementations = {
  test_tool: async ({ input }) => ({ result: `Processed: ${input}` }),
  math_tool: async ({ operation, a, b }) => { /* ... */ }
};

// Test data generators
export function createTestStateConfig(overrides = {}): StateConfig;
export function createTestContext(overrides = {}): Context;
export function createTestTool(overrides = {}): Tool;

// Validation helpers
export function isValidStateConfig(state: any): state is StateConfig;
export function isValidToolResult(result: any): result is ToolResult;

// Mock classes
export class MockLLMProvider { /* ... */ }
export class MockConversationStorage { /* ... */ }
```

### Environment Setup

The test suite automatically configures mock environment variables:

```typescript
// Mock API keys for testing
process.env.GROQ_API_KEY = 'test_groq_key';
process.env.OPENAI_API_KEY = 'test_openai_key';
process.env.ANTHROPIC_API_KEY = 'test_anthropic_key';
process.env.NODE_ENV = 'test';
```

## 📈 Coverage Goals

### Target Coverage Metrics
- **Lines**: 90%+
- **Functions**: 95%+
- **Branches**: 85%+
- **Statements**: 90%+

### Critical Path Coverage
- State machine resolution and inheritance
- Tool execution and error handling
- Agent query processing workflow
- Vector storage operations
- Context orchestration logic

## 🔍 Test Patterns

### 1. Arrange-Act-Assert Pattern
```typescript
it('should process user query', async () => {
  // Arrange
  const agent = new Agent(mockConfig);
  agent.registerTools(mockImplementations);
  
  // Act
  const result = await agent.processQuery('user123', 'test query');
  
  // Assert
  expect(result).toBeDefined();
  expect(result.response).toBeTruthy();
});
```

### 2. Given-When-Then Pattern
```typescript
describe('Given a configured agent', () => {
  let agent: Agent;
  
  beforeEach(() => {
    agent = new Agent(mockConfig);
  });
  
  describe('When processing a query', () => {
    it('Then should return valid response', async () => {
      // Test implementation
    });
  });
});
```

### 3. Error Testing Pattern
```typescript
it('should handle invalid inputs gracefully', async () => {
  const result = await toolExecutor.executeTool('invalid_tool', {});
  
  expect(result.success).toBe(false);
  expect(result.error).toContain('not registered');
});
```

## 🧩 Mocking Strategy

### LLM Provider Mocking
```typescript
export class MockLLMProvider {
  private responses: LLMResponse[] = [];
  
  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    return this.responses.shift() || createMockLLMResponse('Default response');
  }
}
```

### Vector Storage Mocking
```typescript
export class MockConversationStorage {
  private messages: Map<string, any[]> = new Map();
  
  async storeMessage(message: any) {
    // Mock implementation
  }
}
```

## 📊 Test Reporting

### Coverage Reports
- HTML coverage report: `coverage/index.html`
- LCOV format for CI integration
- Console summary for quick feedback

### Test Output
- Detailed test results with timing
- Failed test details and stack traces
- Performance metrics for slow tests

## 🔄 Continuous Integration

### Test Pipeline
1. Install dependencies
2. Run linting and type checks
3. Execute unit tests
4. Run integration tests
5. Generate coverage report
6. Publish results

### Quality Gates
- All tests must pass
- Coverage thresholds must be met
- No linting errors
- TypeScript compilation successful

## 🚨 Debugging Tests

### Common Issues
1. **Mock API Keys**: Ensure test environment variables are set
2. **Type Errors**: Update TypeScript imports and types
3. **Async Issues**: Properly handle promises and async operations
4. **Memory Leaks**: Clean up resources in `afterEach` hooks

### Debug Commands
```bash
# Run single test with debug output
DEBUG=1 bun test tests/core/agent.test.ts

# Run tests with verbose logging
bun test --verbose

# Run specific test pattern
bun test --filter "should handle tool execution"
```

## 📝 Writing New Tests

### Guidelines
1. **Descriptive Names**: Use clear, descriptive test names
2. **Single Responsibility**: Each test should verify one behavior
3. **Proper Setup**: Use `beforeEach`/`afterEach` for clean state
4. **Mock External Dependencies**: Don't rely on real API calls
5. **Edge Cases**: Test boundary conditions and error scenarios

### Template
```typescript
describe('ComponentName', () => {
  let component: ComponentName;
  
  beforeEach(() => {
    // Setup
    component = new ComponentName(mockConfig);
  });
  
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });
    
    it('should handle edge case', () => {
      // Test implementation
    });
    
    it('should handle error case', () => {
      // Test implementation
    });
  });
});
```

## 🎯 Best Practices

1. **Test First**: Write tests before implementation when possible
2. **Readable Tests**: Tests should serve as documentation
3. **Fast Execution**: Keep tests fast and independent
4. **Deterministic**: Tests should produce consistent results
5. **Comprehensive**: Cover happy path, edge cases, and errors
6. **Maintainable**: Keep tests simple and focused

## 📚 Additional Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Framework Documentation](./docs/README.md) 