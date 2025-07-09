import {
  Agent,
  StateMachine,
  type StateConfig,
  type Context,
  type Tool,
  type LLMConfig,
} from "./src/index.js";

// Test the framework structure without API calls
console.log("🧪 Testing Agento Framework Structure");
console.log("=====================================\n");

// Define test configuration
const llmConfig: LLMConfig = {
  provider: "groq",
  model: "llama3-8b-8192",
  temperature: 0.7,
};

const contexts: Context[] = [
  {
    key: "test_context",
    description: "Test context",
    content: "This is test content",
    priority: 100,
  },
];

const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "test_tool",
      description: "A test tool",
      parameters: {
        type: "object",
        properties: {
          input: { type: "string" },
        },
        required: ["input"],
      },
    },
  },
];

const states: StateConfig[] = [
  {
    key: "root",
    description: "Root state",
    prompt: "You are a test assistant.",
    contexts: ["test_context"],
    children: [
      {
        key: "child1",
        description: "First child state",
        prompt: "Handle child1 requests.",
        tools: ["test_tool"],
      },
      {
        key: "child2",
        description: "Second child state",
        prompt: "Handle child2 requests.",
      },
    ],
  },
];

// Test StateMachine
console.log("1. Testing StateMachine...");
const stateMachine = new StateMachine(states, contexts, tools, llmConfig);

const leafStates = stateMachine.getLeafStates();
console.log(`✅ Found ${leafStates.length} leaf states:`);
leafStates.forEach((state) => {
  console.log(`   - ${state.key}: ${state.description}`);
  console.log(`     Full prompt: "${state.fullPrompt}"`);
  console.log(`     Contexts: [${state.contexts.map(c => c.key).join(", ")}]`);
  console.log(`     Tools: [${state.tools.map(t => t.function.name).join(", ")}]`);
  console.log(`     Path: ${state.path.join(" > ")}`);
  console.log("");
});

// Test state inheritance
console.log("2. Testing State Inheritance...");
const child1State = stateMachine.getStateByKey("child1");
if (child1State) {
  console.log("✅ child1 state resolved successfully:");
  console.log(`   Inherited prompt: "${child1State.fullPrompt}"`);
  console.log(`   Inherited contexts: [${child1State.contexts.map(c => c.key).join(", ")}]`);
  console.log(`   Own tools: [${child1State.tools.map(t => t.function.name).join(", ")}]`);
}

// Test state tree
console.log("\n3. Testing State Tree...");
const stateTree = stateMachine.getLeafStateTree();
console.log("✅ Leaf state tree for intent analysis:");
stateTree.forEach((state) => {
  console.log(`   - ${state.key}: ${state.description} (${state.path.join(" > ")})`);
});

console.log("\n🎉 Framework structure test completed successfully!");
console.log("\nTo use with real API calls, set your GROQ_API_KEY environment variable:");
console.log("export GROQ_API_KEY=your_api_key_here");
console.log("\nThen run: bun run dev"); 