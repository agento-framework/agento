/**
 * Vector Database Integration Examples
 * Shows how to integrate different vector databases with the Agento Framework
 */

import {
  Agent,
  type AgentConfig,
  type StateConfig,
  type Context,
  type Tool,
  type LLMConfig,
} from "../src/index.js";

import {
  VectorStorageFactory,
  VectorKnowledgeBaseImpl,
  OllamaEmbeddingProvider,
  type VectorStorage,
  type EmbeddingProvider,
  type VectorKnowledgeBase
} from "../src/core/vector-storage.js";

import {
  VectorAdapterFactory,
  PineconeVectorStorage,
  WeaviateVectorStorage,
  ChromaVectorStorage
} from "../src/core/vector-adapters.js";

import { type KnowledgeBaseConnector } from "../src/core/context-orchestrator.js";

/**
 * Example 1: In-Memory Vector Storage (Development/Testing)
 */
async function createInMemoryVectorExample() {
  console.log("🧠 Setting up In-Memory Vector Storage...");

  // Create embedding provider
  const embeddingProvider = VectorStorageFactory.createOpenAIEmbedding(
    process.env.OPENAI_API_KEY || 'your-api-key'
  );

  // Create in-memory vector storage
  const vectorStorage = VectorStorageFactory.createInMemory(embeddingProvider);

  // Create knowledge base wrapper
  const knowledgeBase = new VectorKnowledgeBaseAdapter(vectorStorage, embeddingProvider);

  // Add some sample content
  await knowledgeBase.addContentBatch([
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
    }
  ]);

  console.log("✅ In-Memory Vector Storage ready!");
  return knowledgeBase;
}

/**
 * Example 2: Pinecone Vector Storage (Production)
 */
async function createPineconeVectorExample() {
  console.log("🌲 Setting up Pinecone Vector Storage...");

  // Create Pinecone adapter
  const vectorStorage = VectorAdapterFactory.createPinecone({
    apiKey: process.env.PINECONE_API_KEY || 'your-pinecone-api-key',
    environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp-free',
    indexName: process.env.PINECONE_INDEX || 'agento-knowledge'
  });

  // Create embedding provider
  const embeddingProvider = VectorStorageFactory.createOpenAIEmbedding(
    process.env.OPENAI_API_KEY || 'your-openai-api-key'
  );

  // Create knowledge base wrapper
  const vectorKnowledgeBase = new VectorKnowledgeBaseAdapter(vectorStorage, embeddingProvider);

  console.log("✅ Pinecone Vector Storage ready!");
  return vectorKnowledgeBase;
}

/**
 * Example 3: Weaviate Vector Storage (Self-hosted/Cloud)
 */
async function createWeaviateVectorExample() {
  console.log("🔄 Setting up Weaviate Vector Storage...");

  // Create Weaviate adapter
  const vectorStorage = VectorAdapterFactory.createWeaviate({
    baseUrl: process.env.WEAVIATE_URL || 'http://localhost:8080',
    apiKey: process.env.WEAVIATE_API_KEY, // Optional for local instances
    className: 'AgentoKnowledge'
  });

  // Create embedding provider (can use HuggingFace for self-hosted)
  const embeddingProvider = VectorStorageFactory.createHuggingFaceEmbedding(
    process.env.HUGGINGFACE_API_KEY || 'your-hf-api-key'
  );

  // Create knowledge base wrapper
  const vectorKnowledgeBase = new VectorKnowledgeBaseAdapter(vectorStorage, embeddingProvider);

  console.log("✅ Weaviate Vector Storage ready!");
  return vectorKnowledgeBase;
}

/**
 * Example 4: Chroma Vector Storage (Open Source)
 */
async function createChromaVectorExample() {
  console.log("🎨 Setting up Chroma Vector Storage...");

  // Create Chroma adapter
  const vectorStorage = VectorAdapterFactory.createChroma({
    baseUrl: process.env.CHROMA_URL || 'http://localhost:8000',
    collectionName: 'agento_knowledge',
    apiKey: process.env.CHROMA_API_KEY // Optional
  });

  // Create embedding provider
  const embeddingProvider = VectorStorageFactory.createOpenAIEmbedding(
    process.env.OPENAI_API_KEY || 'your-openai-api-key'
  );

  // Create knowledge base wrapper
  const vectorKnowledgeBase = new VectorKnowledgeBaseAdapter(vectorStorage, embeddingProvider);

  console.log("✅ Chroma Vector Storage ready!");
  return vectorKnowledgeBase;
}

/**
 * Example 5: Jina AI Embeddings (Specialized)
 */
async function createJinaEmbeddingExample() {
  console.log("🔬 Setting up Jina AI Embeddings...");

  // Create Jina embedding provider
  const embeddingProvider = VectorStorageFactory.createJinaEmbedding(
    process.env.JINA_API_KEY || 'your-jina-api-key',
    'jina-embeddings-v2-base-en' // or jina-embeddings-v3, jina-clip-v1
  );

  // Use with any vector storage (example with in-memory)
  const vectorStorage = VectorStorageFactory.createInMemory(embeddingProvider);
  const vectorKnowledgeBase = new VectorKnowledgeBaseAdapter(vectorStorage, embeddingProvider);

  console.log("✅ Jina AI Embeddings ready!");
  return vectorKnowledgeBase;
}

/**
 * Example 6: Ollama Embeddings (Self-hosted)
 */
async function createOllamaEmbeddingExample() {
  console.log("🦙 Setting up Ollama Embeddings...");

  // Create Ollama embedding provider
  const embeddingProvider = VectorStorageFactory.createOllamaEmbedding(
    process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    'nomic-embed-text' // or all-minilm, mxbai-embed-large, etc.
  );

  // Check if Ollama is available
  try {
    const testEmbedding = await embeddingProvider.generateEmbedding("test");
    console.log(`✅ Ollama connection successful (dimension: ${testEmbedding.length})`);
  } catch (error) {
    console.log("⚠️  Ollama not available - make sure it's running on localhost:11434");
    console.log("   Install: https://ollama.ai/download");
    console.log("   Run: ollama pull nomic-embed-text");
    console.log(`   Error: ${error}`);
  }

  // Use with any vector storage (example with in-memory)
  const vectorStorage = VectorStorageFactory.createInMemory(embeddingProvider);
  const vectorKnowledgeBase = new VectorKnowledgeBaseAdapter(vectorStorage, embeddingProvider);

  console.log("✅ Ollama Embeddings ready!");
  return vectorKnowledgeBase;
}

/**
 * Adapter to bridge VectorKnowledgeBase with KnowledgeBaseConnector
 */
class VectorKnowledgeBaseAdapter implements KnowledgeBaseConnector {
  private vectorKnowledgeBase: VectorKnowledgeBase;

  constructor(vectorStorage: VectorStorage, embeddingProvider: EmbeddingProvider) {
    this.vectorKnowledgeBase = new VectorKnowledgeBaseImpl(vectorStorage, embeddingProvider);
  }

  async search(query: string, concepts: string[]): Promise<Array<{
    content: string;
    relevance: number;
    source: string;
    metadata: Record<string, any>;
  }>> {
    // Use hybrid search for best results
    return this.vectorKnowledgeBase.hybridSearch(query, concepts, {
      limit: 5,
      minSimilarity: 0.3
    });
  }

  async getRelatedConcepts(concepts: string[]): Promise<string[]> {
    return this.vectorKnowledgeBase.findRelatedConcepts(concepts, 10);
  }

  // Helper methods for content management
  async addContent(content: string, metadata: Record<string, any>): Promise<string> {
    return this.vectorKnowledgeBase.addContent(content, metadata);
  }

  async addContentBatch(items: Array<{ content: string; metadata: Record<string, any> }>): Promise<string[]> {
    return this.vectorKnowledgeBase.addContentBatch(items);
  }
}

/**
 * Complete example showing agent with vector-enabled context orchestration
 */
async function runVectorIntegrationExample() {
  console.log("🚀 Vector Database Integration Example");
  console.log("=" .repeat(50));

  // Choose vector storage method (change this to test different providers)
  const vectorMethod = process.env.VECTOR_METHOD || 'inmemory'; // 'inmemory', 'pinecone', 'weaviate', 'chroma'

  let knowledgeBase: KnowledgeBaseConnector;

  switch (vectorMethod) {
    case 'pinecone':
      knowledgeBase = await createPineconeVectorExample();
      break;
    case 'weaviate':
      knowledgeBase = await createWeaviateVectorExample();
      break;
    case 'chroma':
      knowledgeBase = await createChromaVectorExample();
      break;
    default:
      knowledgeBase = await createInMemoryVectorExample();
  }

  // LLM Configuration
  const llmConfig: LLMConfig = {
    provider: "groq",
    model: "llama3-8b-8192",
    temperature: 0.7,
    maxTokens: 4096,
  };

  // Context Orchestrator Configuration with Vector Integration
  const contextOrchestratorConfig = {
    contextLLMConfig: llmConfig,
    maxContextTokens: 8000,
    maxReasoningHistory: 15,
    relevanceThreshold: 0.3,
    enableConceptMapping: true,
    enableSemanticClustering: true,
    timeDecayFactor: 0.1,
  };

  // Contexts
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
        name: "search_code_examples",
        description: "Search for code examples and documentation",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Programming topic to search for"
            },
            language: {
              type: "string",
              description: "Programming language"
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
          tools: ["search_code_examples"]
        },
        {
          key: "typescript_help",
          description: "TypeScript development assistance",
          prompt: "Help with TypeScript development, types, and configuration.",
          tools: ["search_code_examples"]
        }
      ]
    }
  ];

  // Create Agent with Vector-Enabled Context Orchestration
  const agent = new Agent({
    states,
    contexts,
    tools,
    defaultLLMConfig: llmConfig,
    contextOrchestratorConfig,
    knowledgeBaseConnector: knowledgeBase
  });

  // Register tool implementations
  agent.registerTool("search_code_examples", async ({ topic, language }) => {
    console.log(`🔍 Searching for ${topic} examples in ${language || 'any language'}`);
    
    // Use the vector knowledge base directly for richer results
    if (knowledgeBase instanceof VectorKnowledgeBaseAdapter) {
      const results = await knowledgeBase.search(topic, [topic, language].filter(Boolean));
      return {
        examples: results.map(r => r.content),
        sources: results.map(r => r.source),
        relevanceScores: results.map(r => r.relevance)
      };
    }
    
    return {
      examples: [`Example for ${topic}`, `Another example for ${topic}`],
      sources: ["documentation", "tutorial"],
      relevanceScores: [0.9, 0.8]
    };
  });

  // Test queries
  const testQueries = [
    "How do I use React hooks?",
    "What's the difference between TypeScript interfaces and types?",
    "Show me examples of React components",
    "How do I set up TypeScript with React?"
  ];

  console.log(`\n🎯 Testing Vector-Enhanced Context Orchestration (${vectorMethod})`);
  console.log("Vector database provides semantic search capabilities...\n");

  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    
    console.log(`\n--- Query ${i + 1}: ${query} ---`);
    
    try {
      const result = await agent.processQuery(
        "test_user",
        query,
        `vector_session_${Date.now()}`,
        [],
        { vectorMethod }
      );

      console.log(`🤖 Response: ${result.response.substring(0, 200)}...`);
      
      if (result.contextOrchestrationResult) {
        const orchestration = result.contextOrchestrationResult;
        console.log(`📊 Context Strategy: ${orchestration.contextStrategy}`);
        console.log(`📊 Relevance Score: ${orchestration.totalRelevanceScore.toFixed(2)}`);
        console.log(`📊 Selected Contexts: ${orchestration.selectedContexts.length}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing query: ${error}`);
    }
    
    // Brief pause
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n🎉 Vector Integration Example Complete!");
  console.log(`\nUsed Vector Method: ${vectorMethod}`);
  console.log("Key Benefits:");
  console.log("1. Semantic search finds relevant content by meaning");
  console.log("2. Context orchestration leverages vector similarity");
  console.log("3. Knowledge base provides rich, relevant context");
  console.log("4. Pluggable architecture supports any vector database");
}

/**
 * Configuration examples for different vector databases
 */
function showVectorConfigurationExamples() {
  console.log("\n📋 Vector Database Configuration Examples:");
  
  console.log("\n1. In-Memory (Development):");
  console.log(`
  const embeddingProvider = VectorStorageFactory.createOpenAIEmbedding(apiKey);
  const vectorStorage = VectorStorageFactory.createInMemory(embeddingProvider);
  `);

  console.log("\n2. Pinecone (Managed Cloud):");
  console.log(`
  const vectorStorage = VectorAdapterFactory.createPinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
    indexName: process.env.PINECONE_INDEX
  });
  `);

  console.log("\n3. Weaviate (Self-hosted/Cloud):");
  console.log(`
  const vectorStorage = VectorAdapterFactory.createWeaviate({
    baseUrl: process.env.WEAVIATE_URL,
    apiKey: process.env.WEAVIATE_API_KEY, // optional
    className: 'AgentoKnowledge'
  });
  `);

  console.log("\n4. Chroma (Open Source):");
  console.log(`
  const vectorStorage = VectorAdapterFactory.createChroma({
    baseUrl: process.env.CHROMA_URL,
    collectionName: 'agento_knowledge',
    apiKey: process.env.CHROMA_API_KEY // optional
  });
  `);

  console.log("\n5. Jina AI Embeddings:");
  console.log(`
  const embeddingProvider = VectorStorageFactory.createJinaEmbedding(
    process.env.JINA_API_KEY,
    'jina-embeddings-v2-base-en'
  );
  `);

  console.log("\n6. Ollama Embeddings (Self-hosted):");
  console.log(`
  const embeddingProvider = VectorStorageFactory.createOllamaEmbedding(
    process.env.OLLAMA_BASE_URL,
    'nomic-embed-text'
  );
  `);

  console.log("\n7. Custom Implementation:");
  console.log(`
  class YourVectorStorage implements VectorStorage {
    async store(embedding) { /* your implementation */ }
    async search(queryVector, options) { /* your implementation */ }
    // ... implement all required methods
  }
  `);
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  runVectorIntegrationExample()
    .then(() => {
      showVectorConfigurationExamples();
    })
    .catch(console.error);
}

export {
  runVectorIntegrationExample,
  VectorKnowledgeBaseAdapter,
  createInMemoryVectorExample,
  createPineconeVectorExample,
  createWeaviateVectorExample,
  createChromaVectorExample,
  createJinaEmbeddingExample,
  createOllamaEmbeddingExample
}; 