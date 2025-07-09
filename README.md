# Agento Framework v2

An advanced agentic framework for building AI agents using state machines with intent-based routing. Each state represents a specific intent and can have its own configuration including prompts, contexts, tools, and LLM settings.

## Features

🤖 **Intent-Based State Machine**: Define states as intents with hierarchical inheritance
🧠 **Multi-LLM Support**: Works with OpenAI, Anthropic, and Groq
🔧 **Tool Calling**: Standard tool calling compatible across all providers
🏗️ **Modular Architecture**: Separate contexts, tools, and state definitions
🔒 **Guard Functions**: onEnter and onLeave guards for state access control
📈 **Additive Inheritance**: Child states extend parents (prompts, contexts, tools)
🎯 **Smart Intent Analysis**: LLM-powered intent routing to appropriate states

## Quick Start

### Installation

```bash
bun install agento
```

### Basic Usage

```typescript
import {
  Agent,
  type AgentConfig,
  type StateConfig,
  type Context,
  type Tool,
  type LLMConfig,
} from "./src/index.js";

// Define LLM configuration
const llmConfig: LLMConfig = {
  provider: "groq",
  model: "llama3-8b-8192",
  temperature: 0.7,
  maxTokens: 4096,
};

// Define contexts (reusable knowledge)
const contexts: Context[] = [
  {
    key: "company_info",
    description: "Company information",
    content: "We are TechCorp, a software company...",
    priority: 100,
  },
];

// Define tools (functions the agent can call)
const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather information",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name" },
        },
        required: ["location"],
      },
    },
  },
];

// Define state machine
const states: StateConfig[] = [
  {
    key: "assistant",
    description: "General assistant",
    prompt: "You are a helpful assistant.",
    contexts: ["company_info"],
    children: [
      {
        key: "weather_helper",
        description: "Help with weather queries",
        prompt: "Provide weather information and forecasts.",
        tools: ["get_weather"],
      },
    ],
  },
];

// Create agent
const agent = new Agent({
  states,
  contexts,
  tools,
  defaultLLMConfig: llmConfig,
});

// Register tool implementations
agent.registerTool("get_weather", async ({ location }) => {
  // Your weather API call here
  return { location, temperature: "72°F", condition: "Sunny" };
});

// Process user queries
const result = await agent.processQuery("What's the weather in New York?");
console.log(result.response);
```

## Core Concepts

### States

States represent specific intents or capabilities of your agent. Each state can have:

- **key**: Unique identifier
- **description**: What this state handles (used for intent analysis)
- **prompt**: System prompt for this state
- **llmConfig**: LLM configuration overrides
- **contexts**: Referenced context keys (inherited additively)
- **tools**: Referenced tool names (inherited additively)
- **children**: Child states that inherit from this state
- **onEnter**: Guard function that must return true to enter state
- **onLeave**: Guard function that must return true to leave state
- **metadata**: Additional metadata for the state

### Inheritance

Child states inherit properties from their parents in an additive way:

- **Prompts**: Concatenated from root to leaf
- **Contexts**: Union of all parent contexts plus own
- **Tools**: Union of all parent tools plus own
- **LLM Config**: Child settings override parent settings
- **Metadata**: Child metadata overrides parent metadata

### Intent Analysis

The framework uses an LLM to analyze user queries and determine which leaf state should handle the request. The intent analyzer:

1. Gets descriptions of all leaf states
2. Analyzes the user query
3. Selects the most appropriate state
4. Returns confidence score and reasoning

### Tool Calling

Tools are defined separately and referenced by states. The framework:

1. Executes tool calls made by the LLM
2. Feeds results back to the LLM as context
3. Continues conversation with tool context
4. Supports multiple tool iterations

## Advanced Features

### Guard Functions

Control access to states with guard functions:

```typescript
{
  key: "admin_panel",
  description: "Administrative functions",
  onEnter: async ({ userQuery, metadata }) => {
    return metadata.userRole === "admin";
  },
  onLeave: async ({ userQuery, metadata }) => {
    // Log admin actions
    console.log(`Admin left: ${userQuery}`);
    return true;
  },
}
```

### Dynamic Contexts

Contexts can be functions that return dynamic content:

```typescript
{
  key: "current_time",
  description: "Current timestamp",
  content: () => new Date().toISOString(),
  priority: 50,
}
```

### Multi-Provider Support

Use different LLM providers for different states:

```typescript
{
  key: "creative_writing",
  description: "Creative writing assistance",
  llmConfig: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.9,
  },
}
```

## Example: Customer Service Agent

See `examples/customer-service-agent.ts` for a complete customer service agent with:

- Order inquiry handling
- Product support
- General questions
- Complaint resolution with automatic escalation

Run the example:

```bash
bun run dev
```

## API Reference

### Agent Class

```typescript
class Agent {
  constructor(config: AgentConfig)
  registerTool(name: string, implementation: ToolFunction): void
  registerTools(tools: Record<string, ToolFunction>): void
  processQuery(query: string, history?: ConversationHistory[], metadata?: Record<string, any>): Promise<AgentResponse>
  getAvailableStates(): StateInfo[]
  getState(key: string): ResolvedState | null
}
```

### Types

```typescript
interface StateConfig {
  key: string;
  description: string;
  prompt?: string;
  llmConfig?: Partial<LLMConfig>;
  contexts?: string[];
  tools?: string[];
  children?: StateConfig[];
  onEnter?: GuardFunction;
  onLeave?: GuardFunction;
  metadata?: Record<string, any>;
}

interface Context {
  key: string;
  description: string;
  content: string | (() => string | Promise<string>);
  priority?: number;
}

interface LLMConfig {
  provider: "groq" | "openai" | "anthropic";
  model: string;
  temperature?: number;
  maxTokens?: number;
  // ... other LLM parameters
}
```

## Environment Variables

Set up your API keys:

```bash
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
