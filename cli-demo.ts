#!/usr/bin/env bun

/**
 * Agento Framework CLI Demo
 * Comprehensive demonstration of vector-enabled AI agent with CLI interface
 */

import {
  Agent,
  type StateConfig,
  type Context,
  type Tool,
  type LLMConfig,
} from "./src/index.js";

import {
  VectorStorageFactory,
  VectorKnowledgeBaseImpl,
  type EmbeddingProvider,
  type VectorStorage,
} from "./src/core/vector-storage.js";

import { type KnowledgeBaseConnector } from "./src/core/context-orchestrator.js";
import * as readline from 'readline';

/**
 * Mock Embedding Provider for Demo (same as test)
 */
class DemoEmbeddingProvider implements EmbeddingProvider {
  private dimension: number;
  private model: string;

  constructor(dimension: number = 768, model: string = 'demo-embedding-model') {
    this.dimension = dimension;
    this.model = model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Generate sophisticated mock embeddings based on text content
    const embedding = new Array(this.dimension).fill(0);
    const hash = this.simpleHash(text);
    
    // Add semantic-like patterns based on keywords
    const keywords = [
      'react', 'javascript', 'typescript', 'node', 'function', 'component', 'hook', 'state',
      'vue', 'angular', 'express', 'mongodb', 'database', 'docker', 'container', 'api',
      'frontend', 'backend', 'fullstack', 'web', 'app', 'server', 'client', 'development'
    ];
    
    for (let i = 0; i < this.dimension; i++) {
      let value = Math.sin((hash + i) / 100) * 0.5 + 0.5;
      
      // Boost similarity for related terms
      keywords.forEach((keyword, keywordIndex) => {
        if (text.toLowerCase().includes(keyword)) {
          const boost = Math.sin((keywordIndex + i) / 50) * 0.3;
          value += boost;
        }
      });
      
      // Normalize to [-1, 1] range
      embedding[i] = Math.max(-1, Math.min(1, value));
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
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
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

/**
 * Vector Knowledge Base for Demo
 */
class DemoVectorKnowledgeBase implements KnowledgeBaseConnector {
  private vectorKnowledgeBase: VectorKnowledgeBaseImpl;

  constructor(vectorStorage: VectorStorage, embeddingProvider: EmbeddingProvider) {
    this.vectorKnowledgeBase = new VectorKnowledgeBaseImpl(vectorStorage, embeddingProvider);
  }

  async search(query: string, concepts: string[]): Promise<Array<{
    content: string;
    relevance: number;
    source: string;
    metadata: Record<string, any>;
  }>> {
    return this.vectorKnowledgeBase.hybridSearch(query, concepts, {
      limit: 5,
      minSimilarity: 0.1
    });
  }

  async getRelatedConcepts(concepts: string[]): Promise<string[]> {
    return this.vectorKnowledgeBase.findRelatedConcepts(concepts, 10);
  }

  async addContent(content: string, metadata: Record<string, any>): Promise<string> {
    return this.vectorKnowledgeBase.addContent(content, metadata);
  }

  async addContentBatch(items: Array<{ content: string; metadata: Record<string, any> }>): Promise<string[]> {
    return this.vectorKnowledgeBase.addContentBatch(items);
  }
}

/**
 * Interactive CLI Application
 */
class AgentoCLI {
  private agent: Agent;
  private knowledgeBase: DemoVectorKnowledgeBase;
  private rl: readline.Interface;
  private sessionId: string;

  constructor() {
    this.sessionId = `cli_session_${Date.now()}`;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖 Agento> '
    });
  }

  async initialize() {
    console.log("🚀 Initializing Agento Framework CLI Demo");
    console.log("=========================================\n");

    // Initialize vector system
    console.log("📚 Setting up vector knowledge base...");
    const embeddingProvider = new DemoEmbeddingProvider(768, 'agento-demo-v1');
    const vectorStorage = VectorStorageFactory.createInMemory(embeddingProvider);
    this.knowledgeBase = new DemoVectorKnowledgeBase(vectorStorage, embeddingProvider);

    // Pre-populate knowledge base with comprehensive documentation
    await this.populateKnowledgeBase();

    // Configure LLM (using Groq since it's in the config)
    const llmConfig: LLMConfig = {
      provider: "groq",
      model: "llama3-8b-8192",
      temperature: 0.7,
      maxTokens: 4096,
    };

    // Define contexts
    const contexts: Context[] = [
      {
        key: "programming_expert",
        description: "Expert programming assistant context",
        content: "I am an expert programming assistant with comprehensive knowledge of modern web development, including React, TypeScript, Node.js, databases, and best practices.",
        priority: 95,
      },
      {
        key: "agento_framework",
        description: "Agento framework specialist context",
        content: "I have deep knowledge of the Agento framework, including state machines, vector integration, context orchestration, and agent development patterns.",
        priority: 90,
      }
    ];

    // Define tools
    const tools: Tool[] = [
      {
        type: "function",
        function: {
          name: "search_documentation",
          description: "Search the comprehensive programming and framework documentation",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query for documentation"
              },
              concepts: {
                type: "array",
                items: { type: "string" },
                description: "Related concepts to enhance search"
              },
              topic_filter: {
                type: "string",
                enum: ["react", "typescript", "nodejs", "database", "agento", "general"],
                description: "Filter by specific technology or topic"
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "explain_concept",
          description: "Get detailed explanation of a programming concept with examples",
          parameters: {
            type: "object",
            properties: {
              concept: {
                type: "string",
                description: "The programming concept to explain"
              },
              level: {
                type: "string",
                enum: ["beginner", "intermediate", "advanced"],
                description: "Complexity level for explanation"
              },
              include_examples: {
                type: "boolean",
                description: "Whether to include code examples"
              }
            },
            required: ["concept"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "compare_technologies",
          description: "Compare different technologies, frameworks, or approaches",
          parameters: {
            type: "object",
            properties: {
              technology_a: {
                type: "string",
                description: "First technology to compare"
              },
              technology_b: {
                type: "string",
                description: "Second technology to compare"
              },
              comparison_aspects: {
                type: "array",
                items: { type: "string" },
                description: "Specific aspects to compare (performance, ease of use, etc.)"
              }
            },
            required: ["technology_a", "technology_b"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_knowledge",
          description: "Add new information to the knowledge base",
          parameters: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "Content to add to knowledge base"
              },
              topic: {
                type: "string",
                description: "Topic/category for the content"
              },
              source: {
                type: "string",
                description: "Source of the information"
              }
            },
            required: ["content", "topic"]
          }
        }
      }
    ];

    // Define states with hierarchical structure
    const states: StateConfig[] = [
      {
        key: "programming_assistant",
        description: "Main programming assistance hub",
        prompt: "You are an expert programming assistant with access to comprehensive documentation.",
        contexts: ["programming_expert"],
        children: [
          {
            key: "concept_explanation",
            description: "Explain programming concepts and technologies",
            prompt: "Provide clear, detailed explanations of programming concepts with examples when helpful.",
            tools: ["search_documentation", "explain_concept"],
          },
          {
            key: "technology_comparison",
            description: "Compare different technologies and frameworks",
            prompt: "Provide balanced, informative comparisons between technologies, highlighting pros and cons.",
            tools: ["search_documentation", "compare_technologies"],
          },
          {
            key: "framework_guidance",
            description: "Provide guidance on framework usage and best practices",
            prompt: "Offer expert guidance on framework usage, architecture decisions, and best practices.",
            contexts: ["agento_framework"],
            tools: ["search_documentation", "explain_concept"],
          }
        ]
      },
      {
        key: "knowledge_management",
        description: "Manage and extend the knowledge base",
        prompt: "Help users add new information and manage the knowledge base effectively.",
        tools: ["add_knowledge", "search_documentation"],
      }
    ];

    // Create agent
    this.agent = new Agent({
      states,
      contexts,
      tools,
      defaultLLMConfig: llmConfig,
    });

    // Register tool implementations
    this.registerTools();

    console.log("✅ Agento framework initialized successfully!");
    console.log("🧠 Vector knowledge base populated with comprehensive documentation");
    console.log("🔧 Tools registered and ready");
    console.log("\n📖 Available commands:");
    console.log("  help     - Show this help message");
    console.log("  stats    - Show knowledge base statistics");
    console.log("  clear    - Clear screen");
    console.log("  exit     - Exit the application");
    console.log("  <query>  - Ask any programming question\n");
  }

  private async populateKnowledgeBase() {
    const knowledgeItems = [
      // React Documentation
      {
        content: "React is a JavaScript library for building user interfaces. It uses a component-based architecture where UI is broken down into reusable components. React uses a virtual DOM for efficient updates and supports both class and functional components with hooks.",
        metadata: { topic: "react", type: "overview", difficulty: "beginner", source: "React Docs" }
      },
      {
        content: "React Hooks are functions that let you use state and other React features without writing a class. The most common hooks include useState for state management, useEffect for side effects, useContext for consuming context, and useCallback for memoizing functions.",
        metadata: { topic: "react", type: "hooks", difficulty: "intermediate", source: "React Docs" }
      },
      {
        content: "React component lifecycle includes mounting (componentDidMount/useEffect), updating (componentDidUpdate/useEffect with dependencies), and unmounting (componentWillUnmount/useEffect cleanup). Modern React favors hooks over class lifecycle methods.",
        metadata: { topic: "react", type: "lifecycle", difficulty: "intermediate", source: "React Docs" }
      },

      // TypeScript Documentation
      {
        content: "TypeScript is a statically typed superset of JavaScript that compiles to plain JavaScript. It adds optional static typing, interfaces, generics, and modern ECMAScript features. TypeScript helps catch errors at compile time and provides better IDE support.",
        metadata: { topic: "typescript", type: "overview", difficulty: "beginner", source: "TypeScript Docs" }
      },
      {
        content: "TypeScript interfaces define the shape of objects and can be used for type checking. They support optional properties, readonly properties, index signatures, and can extend other interfaces. Interfaces are purely for compile-time type checking.",
        metadata: { topic: "typescript", type: "interfaces", difficulty: "intermediate", source: "TypeScript Docs" }
      },
      {
        content: "TypeScript generics provide a way to create reusable components that work with multiple types. They allow you to create functions, classes, and interfaces that work with any type while maintaining type safety. Common patterns include T, K, V for type parameters.",
        metadata: { topic: "typescript", type: "generics", difficulty: "advanced", source: "TypeScript Docs" }
      },

      // Node.js Documentation
      {
        content: "Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine. It uses an event-driven, non-blocking I/O model that makes it lightweight and efficient. Node.js is perfect for building scalable network applications and APIs.",
        metadata: { topic: "nodejs", type: "overview", difficulty: "beginner", source: "Node.js Docs" }
      },
      {
        content: "Express.js is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. It provides middleware, routing, templating, and error handling capabilities.",
        metadata: { topic: "nodejs", type: "express", difficulty: "intermediate", source: "Express Docs" }
      },
      {
        content: "Node.js streams are objects that let you read data from a source or write data to a destination in continuous fashion. There are four types: Readable, Writable, Duplex, and Transform streams. They're useful for handling large amounts of data efficiently.",
        metadata: { topic: "nodejs", type: "streams", difficulty: "advanced", source: "Node.js Docs" }
      },

      // Database Documentation
      {
        content: "MongoDB is a NoSQL document database that stores data in flexible, JSON-like documents. It provides horizontal scaling, flexible schema design, and powerful querying capabilities. MongoDB is ideal for applications with evolving data requirements.",
        metadata: { topic: "database", type: "mongodb", difficulty: "beginner", source: "MongoDB Docs" }
      },
      {
        content: "PostgreSQL is a powerful, open-source relational database system with advanced features like JSONB support, full-text search, and custom data types. It provides ACID compliance, complex queries, and excellent performance for analytical workloads.",
        metadata: { topic: "database", type: "postgresql", difficulty: "intermediate", source: "PostgreSQL Docs" }
      },

      // Agento Framework Documentation
      {
        content: "Agento is an advanced AI agent framework that provides state machine-based conversation management, vector database integration, and contextual awareness. It supports multiple LLM providers and enables building sophisticated AI applications with memory and tool integration.",
        metadata: { topic: "agento", type: "overview", difficulty: "beginner", source: "Agento Docs" }
      },
      {
        content: "Agento's state machine allows defining hierarchical conversation states with inheritance. Each state can have its own prompt, contexts, and tools. The framework automatically selects appropriate states based on user intent and maintains conversation context.",
        metadata: { topic: "agento", type: "state-machine", difficulty: "intermediate", source: "Agento Docs" }
      },
      {
        content: "Agento's vector integration provides pluggable support for multiple vector databases including Pinecone, Weaviate, and Chroma. It includes embedding providers for OpenAI, HuggingFace, Jina AI, and Ollama, with a factory pattern for easy configuration.",
        metadata: { topic: "agento", type: "vector-integration", difficulty: "advanced", source: "Agento Docs" }
      },

      // General Programming
      {
        content: "RESTful APIs follow REST architectural principles for web services. They use HTTP methods (GET, POST, PUT, DELETE) for different operations, are stateless, use standard HTTP status codes, and typically exchange JSON data. REST APIs should be resource-oriented and use consistent URL patterns.",
        metadata: { topic: "general", type: "rest-api", difficulty: "intermediate", source: "Web Standards" }
      },
      {
        content: "Clean Code principles include meaningful names, small functions, single responsibility, and clear comments. Code should be readable, testable, and maintainable. Follow consistent formatting, avoid deep nesting, and prefer composition over inheritance.",
        metadata: { topic: "general", type: "clean-code", difficulty: "intermediate", source: "Clean Code Book" }
      }
    ];

    await this.knowledgeBase.addContentBatch(knowledgeItems);
    console.log(`   ✅ Added ${knowledgeItems.length} knowledge base entries`);
  }

  private registerTools() {
    // Search documentation tool
    this.agent.registerTool("search_documentation", async ({ query, concepts = [], topic_filter }) => {
      console.log(`   🔍 Searching documentation: "${query}"`);
      if (topic_filter) console.log(`   🏷️  Filtered by topic: ${topic_filter}`);
      
      const results = await this.knowledgeBase.search(query, concepts);
      
      // Filter by topic if specified
      const filteredResults = topic_filter 
        ? results.filter(r => r.metadata.topic === topic_filter)
        : results;
      
      const relatedConcepts = await this.knowledgeBase.getRelatedConcepts([query, ...concepts]);
      
      console.log(`   📄 Found ${filteredResults.length} relevant documents`);
      if (relatedConcepts.length > 0) {
        console.log(`   🔗 Related concepts: ${relatedConcepts.slice(0, 5).join(', ')}`);
      }
      
      return {
        results: filteredResults.map(r => ({
          content: r.content,
          relevance: r.relevance,
          metadata: r.metadata
        })),
        relatedConcepts,
        query,
        topicFilter: topic_filter
      };
    });

    // Explain concept tool
    this.agent.registerTool("explain_concept", async ({ concept, level = "intermediate", include_examples = true }) => {
      console.log(`   📚 Explaining concept: "${concept}" (${level} level)`);
      
      const searchQuery = `${concept} explanation ${level}`;
      const results = await this.knowledgeBase.search(searchQuery, [concept]);
      
      return {
        concept,
        level,
        includeExamples: include_examples,
        documentation: results,
        explanation: `Detailed explanation of ${concept} at ${level} level`
      };
    });

    // Compare technologies tool
    this.agent.registerTool("compare_technologies", async ({ technology_a, technology_b, comparison_aspects = [] }) => {
      console.log(`   ⚖️  Comparing: ${technology_a} vs ${technology_b}`);
      
      const searchQueries = [
        `${technology_a} features advantages disadvantages`,
        `${technology_b} features advantages disadvantages`,
        `${technology_a} vs ${technology_b} comparison`
      ];
      
      const allResults = [];
      for (const query of searchQueries) {
        const results = await this.knowledgeBase.search(query, [technology_a, technology_b]);
        allResults.push(...results);
      }
      
      return {
        technologyA: technology_a,
        technologyB: technology_b,
        comparisonAspects: comparison_aspects,
        documentation: allResults,
        summary: `Comparison between ${technology_a} and ${technology_b}`
      };
    });

    // Add knowledge tool
    this.agent.registerTool("add_knowledge", async ({ content, topic, source = "User Input" }) => {
      console.log(`   📝 Adding knowledge: topic="${topic}"`);
      
      const id = await this.knowledgeBase.addContent(content, {
        topic,
        source,
        type: "user-added",
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        id,
        content: content.substring(0, 100) + "...",
        topic,
        source
      };
    });
  }

  async showStats() {
    console.log("\n📊 Knowledge Base Statistics");
    console.log("============================");
    // Since we don't have direct access to stats, we'll search for different topics
    const topics = ["react", "typescript", "nodejs", "database", "agento", "general"];
    
    for (const topic of topics) {
      const results = await this.knowledgeBase.search(`${topic}`, []);
      const topicResults = results.filter(r => r.metadata.topic === topic);
      console.log(`${topic.padEnd(12)}: ${topicResults.length} documents`);
    }
    
    console.log("");
  }

  async processQuery(query: string) {
    try {
      console.log(`\n🤔 Processing: "${query}"`);
      console.log("─".repeat(50));

      const result = await this.agent.processQuery(
        "cli_user",
        query,
        this.sessionId,
        [],
        { cliMode: true }
      );

      console.log(`\n🎯 Selected State: ${result.selectedState?.key}`);
      
      if (result.toolResults && result.toolResults.length > 0) {
        console.log(`🔧 Tools Used: ${result.toolResults.length}`);
        result.toolResults.forEach(tr => {
          console.log(`   • ${tr.toolName}: ${tr.success ? 'Success' : 'Failed'}`);
        });
      }

      console.log(`\n💬 Response:`);
      console.log("─".repeat(50));
      console.log(result.response);
      console.log("─".repeat(50));

    } catch (error) {
      console.error("❌ Error processing query:", error);
    }
  }

  async start() {
    await this.initialize();
    
    console.log("🎉 Welcome to Agento CLI! Ask me anything about programming.\n");
    this.rl.prompt();

    this.rl.on('line', async (line: string) => {
      const input = line.trim();
      
      if (!input) {
        this.rl.prompt();
        return;
      }

      switch (input.toLowerCase()) {
        case 'help':
          console.log("\n📖 Available commands:");
          console.log("  help     - Show this help message");
          console.log("  stats    - Show knowledge base statistics");
          console.log("  clear    - Clear screen");
          console.log("  exit     - Exit the application");
          console.log("  <query>  - Ask any programming question");
          break;
        
        case 'stats':
          await this.showStats();
          break;
        
        case 'clear':
          console.clear();
          break;
        
        case 'exit':
          console.log("👋 Thank you for using Agento CLI!");
          this.rl.close();
          return;
        
        default:
          await this.processQuery(input);
          break;
      }

      console.log("");
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });
  }
}

// Handle CLI mode vs programmatic import
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new AgentoCLI();
  cli.start().catch(console.error);
}

export { AgentoCLI }; 