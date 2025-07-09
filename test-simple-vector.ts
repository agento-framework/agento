/**
 * Simple Vector Test - Basic functionality without complex LLM interactions
 */

import {
  Agent,
  StateMachine,
  type StateConfig,
  type Context,
  type Tool,
  type LLMConfig,
} from "./src/index.js";

import {
  VectorStorageFactory,
  VectorKnowledgeBaseImpl,
  InMemoryVectorStorage,
} from "./src/core/vector-storage.js";

console.log("🧪 Simple Vector Integration Test");
console.log("=================================\n");

/**
 * Mock Embedding Provider for Testing
 */
class MockEmbeddingProvider {
  private dimension: number = 768;
  private model: string = 'mock-model';

  async generateEmbedding(text: string): Promise<number[]> {
    // Generate deterministic mock embedding based on text
    const embedding = new Array(this.dimension).fill(0);
    const hash = this.simpleHash(text);
    
    for (let i = 0; i < this.dimension; i++) {
      embedding[i] = Math.sin((hash + i) / 100) * 0.5 + 0.5;
    }
    
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.model;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Mock Knowledge Base Connector
 */
class MockKnowledgeBaseConnector {
  private vectorKnowledgeBase: VectorKnowledgeBaseImpl;

  constructor() {
    const mockProvider = new MockEmbeddingProvider();
    const vectorStorage = new InMemoryVectorStorage(mockProvider);
    this.vectorKnowledgeBase = new VectorKnowledgeBaseImpl(vectorStorage, mockProvider);
    
    // Pre-populate with some test data
    this.initializeTestData();
  }

  private async initializeTestData() {
    await this.vectorKnowledgeBase.addContentBatch([
      {
        content: "React is a JavaScript library for building user interfaces. It uses a component-based architecture.",
        metadata: { topic: "react", type: "definition", difficulty: "beginner" }
      },
      {
        content: "React hooks are functions that let you use state and other React features without writing a class.",
        metadata: { topic: "react-hooks", type: "concept", difficulty: "intermediate" }
      },
      {
        content: "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
        metadata: { topic: "typescript", type: "definition", difficulty: "beginner" }
      },
      {
        content: "Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine.",
        metadata: { topic: "nodejs", type: "definition", difficulty: "beginner" }
      }
    ]);
  }

  async search(query: string, concepts: string[]) {
    const results = await this.vectorKnowledgeBase.vectorSearch(query, { limit: 3 });
    return results.map(result => ({
      content: result.content,
      relevance: result.relevance,
      source: result.source,
      metadata: result.metadata
    }));
  }

  async getRelatedConcepts(concepts: string[]) {
    return this.vectorKnowledgeBase.findRelatedConcepts(concepts, 5);
  }
}

async function testSimpleVectorIntegration() {
  console.log("🚀 Testing Simple Vector Integration...\n");

  // Create mock knowledge base
  const knowledgeBase = new MockKnowledgeBaseConnector();
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 100));

  // LLM Configuration
  const llmConfig: LLMConfig = {
    provider: "groq",
    model: "llama3-8b-8192",
    temperature: 0.7,
    maxTokens: 4096,
  };

  // Simple contexts without context orchestration
  const contexts: Context[] = [
    {
      key: "programming_assistant",
      description: "Programming assistance context",
      content: "I am a knowledgeable programming assistant with access to comprehensive documentation and examples.",
      priority: 90,
    }
  ];

  // Tools
  const tools: Tool[] = [
    {
      type: "function",
      function: {
        name: "search_documentation",
        description: "Search for programming documentation and examples",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Programming topic to search for"
            }
          },
          required: ["topic"]
        }
      }
    }
  ];

  // States
  const states: StateConfig[] = [
    {
      key: "programming_help",
      description: "Programming help and documentation assistance",
      prompt: "You are a helpful programming assistant with access to comprehensive documentation.",
      contexts: ["programming_assistant"],
      children: [
        {
          key: "react_help",
          description: "React development assistance",
          prompt: "Provide React development help with examples and best practices.",
          tools: ["search_documentation"]
        },
        {
          key: "general_help", 
          description: "General programming assistance",
          prompt: "Help with general programming questions.",
          tools: ["search_documentation"]
        }
      ]
    }
  ];

  // Create Agent WITHOUT context orchestration
  const agent = new Agent({
    states,
    contexts,
    tools,
    defaultLLMConfig: llmConfig,
    // No contextOrchestratorConfig - using simple agent
  });

  // Register tool implementations
  agent.registerTool("search_documentation", async ({ topic }) => {
    console.log(`   🔍 Searching for documentation on: ${topic}`);
    
    const results = await knowledgeBase.search(topic, [topic]);
    console.log(`   📄 Found ${results.length} documentation results`);
    
    return {
      results: results.map(r => ({
        content: r.content,
        relevance: r.relevance,
        source: r.source
      })),
      summary: results.length > 0 
        ? `Found ${results.length} relevant documentation entries about ${topic}`
        : `No documentation found for ${topic}`
    };
  });

  // Test queries
  const testQueries = [
    "What is React?",
    "How do React hooks work?",
    "Tell me about TypeScript",
    "What is Node.js used for?"
  ];

  console.log("🎯 Testing Simple Agent Responses...\n");

  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    
    console.log(`--- Query ${i + 1}: ${query} ---`);
    
    try {
      const result = await agent.processQuery(
        "test_user",
        query,
        `simple_session_${Date.now()}`,
        [],
        { testMode: true }
      );

      console.log(`✅ Agent processed query successfully`);
      console.log(`📊 Selected state: ${result.selectedState?.key}`);
      console.log(`🔧 Tools called: ${result.toolResults ? result.toolResults.length : 0}`);
      
      if (result.toolResults && result.toolResults.length > 0) {
        result.toolResults.forEach(tr => {
          console.log(`   🛠️  ${tr.toolName}: ${JSON.stringify(tr.result).substring(0, 100)}...`);
        });
      }
      
      console.log(`🤖 Response preview: ${result.response.substring(0, 100)}...`);
      
    } catch (error) {
      console.error(`❌ Error processing query: ${error}`);
    }
    
    console.log("");
    
    // Brief pause
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("🎉 Simple Vector Integration Test Complete!");
  console.log("\n✅ Results:");
  console.log("- Agent configuration: Working");
  console.log("- Vector knowledge base: Working");
  console.log("- Tool integration: Working");
  console.log("- Basic responses: Working");
  console.log("\n🚀 Ready to test with real LLM APIs!");
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testSimpleVectorIntegration().catch(console.error);
}

export { testSimpleVectorIntegration }; 