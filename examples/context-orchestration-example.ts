import {
  Agent,
  type AgentConfig,
  type StateConfig,
  type Context,
  type Tool,
  type LLMConfig,
} from "../src/index.js";
import { ContextOrchestrator, type ContextOrchestratorConfig, type KnowledgeBaseConnector } from "../src/core/context-orchestrator.js";

/**
 * Context Orchestration Example - "Scanning Ball" System
 * Demonstrates dynamic context management that accumulates and reasons about relevance
 */

// Mock Knowledge Base Connector
class MockKnowledgeBase implements KnowledgeBaseConnector {
  private knowledge = [
    {
      content: "JavaScript is a programming language commonly used for web development. It supports object-oriented, functional, and procedural programming paradigms.",
      source: "programming_guide",
      metadata: { topic: "javascript", difficulty: "beginner" }
    },
    {
      content: "React is a JavaScript library for building user interfaces, particularly web applications. It uses a component-based architecture and virtual DOM.",
      source: "react_docs",
      metadata: { topic: "react", difficulty: "intermediate" }
    },
    {
      content: "Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine. It allows JavaScript to be used for server-side development.",
      source: "nodejs_guide",
      metadata: { topic: "nodejs", difficulty: "intermediate" }
    },
    {
      content: "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds static type definitions to JavaScript.",
      source: "typescript_docs",
      metadata: { topic: "typescript", difficulty: "intermediate" }
    },
    {
      content: "API (Application Programming Interface) is a set of protocols and tools for building software applications. RESTful APIs use HTTP methods.",
      source: "api_guide",
      metadata: { topic: "api", difficulty: "beginner" }
    }
  ];

  async search(query: string, concepts: string[]): Promise<Array<{
    content: string;
    relevance: number;
    source: string;
    metadata: Record<string, any>;
  }>> {
    const results = this.knowledge
      .map(item => {
        let relevance = 0;
        const lowerQuery = query.toLowerCase();
        const lowerContent = item.content.toLowerCase();
        
        // Query text matching
        if (lowerContent.includes(lowerQuery)) relevance += 0.8;
        
        // Concept matching
        concepts.forEach(concept => {
          if (lowerContent.includes(concept.toLowerCase())) {
            relevance += 0.6;
          }
        });
        
        // Topic matching
        const topic = item.metadata.topic;
        if (concepts.some(c => c.toLowerCase().includes(topic)) || lowerQuery.includes(topic)) {
          relevance += 0.7;
        }
        
        return {
          content: item.content,
          relevance: Math.min(relevance, 1.0),
          source: item.source,
          metadata: item.metadata
        };
      })
      .filter(item => item.relevance > 0.2)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3);

    return results;
  }

  async getRelatedConcepts(concepts: string[]): Promise<string[]> {
    const relatedMap: Record<string, string[]> = {
      'javascript': ['programming', 'web', 'frontend', 'backend'],
      'react': ['javascript', 'component', 'ui', 'frontend'],
      'nodejs': ['javascript', 'server', 'backend', 'runtime'],
      'typescript': ['javascript', 'types', 'static', 'compiler'],
      'api': ['rest', 'http', 'endpoint', 'integration'],
      'programming': ['code', 'development', 'software', 'algorithm']
    };

    const related = new Set<string>();
    concepts.forEach(concept => {
      const lowerConcept = concept.toLowerCase();
      if (relatedMap[lowerConcept]) {
        relatedMap[lowerConcept].forEach(r => related.add(r));
      }
    });

    return Array.from(related);
  }
}

// Example setup
async function runContextOrchestrationExample() {
  console.log("🧠 Context Orchestration Example - 'Scanning Ball' System");
  console.log("=" .repeat(60));

  // LLM Configuration
  const llmConfig: LLMConfig = {
    provider: "groq",
    model: "llama3-8b-8192",
    temperature: 0.7,
    maxTokens: 4096,
  };

  // Context Orchestrator Configuration
  const contextOrchestratorConfig: ContextOrchestratorConfig = {
    contextLLMConfig: llmConfig,
    maxContextTokens: 6000,
    maxReasoningHistory: 10,
    relevanceThreshold: 0.3,
    enableConceptMapping: true,
    enableSemanticClustering: true,
    timeDecayFactor: 0.1, // Slow decay for educational content
  };

  // Knowledge Base
  const knowledgeBase = new MockKnowledgeBase();

  // Contexts
  const contexts: Context[] = [
    {
      key: "programming_mentor",
      description: "Programming mentorship context",
      content: "I am an experienced programming mentor who helps developers learn and solve coding problems. I provide clear explanations, practical examples, and encourage best practices.",
      priority: 90,
    },
    {
      key: "learning_style",
      description: "Learning style adaptation",
      content: () => "I adapt my teaching style based on the learner's experience level and preferences. I can provide step-by-step tutorials, conceptual explanations, or practical examples as needed.",
      priority: 80,
    }
  ];

  // Tools
  const tools: Tool[] = [
    {
      type: "function",
      function: {
        name: "run_code",
        description: "Execute code snippets and return results",
        parameters: {
          type: "object",
          properties: {
            language: {
              type: "string",
              enum: ["javascript", "typescript", "python"],
              description: "Programming language"
            },
            code: {
              type: "string",
              description: "Code to execute"
            }
          },
          required: ["language", "code"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "search_documentation",
        description: "Search programming documentation and tutorials",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Topic to search for"
            },
            language: {
              type: "string",
              description: "Programming language context"
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
      key: "programming_tutor",
      description: "Programming tutor and mentor",
      prompt: "You are a helpful programming tutor.",
      contexts: ["programming_mentor"],
      children: [
        {
          key: "javascript_help",
          description: "JavaScript programming assistance and tutorials",
          prompt: "Provide JavaScript programming help, explanations, and code examples.",
          tools: ["run_code", "search_documentation"],
          contexts: ["learning_style"]
        },
        {
          key: "react_help",
          description: "React development assistance and best practices",
          prompt: "Help with React development, components, hooks, and best practices.",
          tools: ["run_code", "search_documentation"]
        },
        {
          key: "general_programming",
          description: "General programming concepts and problem solving",
          prompt: "Explain programming concepts and help solve coding problems.",
          tools: ["search_documentation"]
        }
      ]
    }
  ];

  // Create Agent with Context Orchestration
  const agent = new Agent({
    states,
    contexts,
    tools,
    defaultLLMConfig: llmConfig,
    contextOrchestratorConfig,
    knowledgeBaseConnector: knowledgeBase
  });

  // Register tool implementations
  agent.registerTool("run_code", async ({ language, code }) => {
    // Mock code execution
    console.log(`🔧 Executing ${language} code: ${code.substring(0, 50)}...`);
    return {
      output: `// Mock execution result for ${language}\n// Code: ${code}\n"Hello, World!"`,
      success: true,
      language
    };
  });

  agent.registerTool("search_documentation", async ({ topic, language }) => {
    console.log(`📚 Searching documentation for: ${topic} (${language || 'general'})`);
    return {
      results: [
        `Documentation for ${topic}: This covers the basics and advanced concepts.`,
        `Tutorial: Getting started with ${topic}`,
        `Best practices for ${topic} development`
      ],
      topic,
      language
    };
  });

  // Test conversation showing context evolution
  const conversationFlow = [
    "I want to learn JavaScript",
    "How do I create a function in JavaScript?",
    "Can you show me an example with React?",
    "What's the difference between JavaScript and TypeScript?",
    "How do I make an API call in React?"
  ];

  let conversationHistory: Array<{
    role: "user" | "assistant" | "tool";
    content: string;
    timestamp: Date;
  }> = [];

  const sessionId = `context_demo_${Date.now()}`;
  const userId = "demo_user";

  console.log("\n🎯 Starting Context Orchestration Demo");
  console.log("Watch how context evolves and accumulates knowledge...\n");

  for (let i = 0; i < conversationFlow.length; i++) {
    const userQuery = conversationFlow[i];
    
    console.log(`\n--- Conversation Step ${i + 1} ---`);
    console.log(`👤 User: ${userQuery}`);
    
    // Process query with context orchestration
    const result = await agent.processQuery(
      userId,
      userQuery,
      sessionId,
      conversationHistory,
      { stepNumber: i + 1 }
    );

    console.log(`🤖 Assistant: ${result.response.substring(0, 200)}...`);
    
    // Show context orchestration insights
    if (result.contextOrchestrationResult) {
      const orchestration = result.contextOrchestrationResult;
      console.log(`\n📊 Context Orchestration Analysis:`);
      console.log(`   Strategy: ${orchestration.contextStrategy}`);
      console.log(`   Total Relevance: ${orchestration.totalRelevanceScore.toFixed(2)}`);
      console.log(`   Selected Contexts: ${orchestration.selectedContexts.length}`);
      
      // Show top concepts
      const topConcepts = Array.from(orchestration.conceptMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      console.log(`   Top Concepts: ${topConcepts.map(([concept, score]) => `${concept}(${score.toFixed(1)})`).join(', ')}`);
      
      // Show reasoning chain
      if (orchestration.reasoningChain.length > 0) {
        console.log(`   Latest Reasoning: ${orchestration.reasoningChain[orchestration.reasoningChain.length - 1]}`);
      }
    }

    // Update conversation history
    conversationHistory.push({
      role: "user",
      content: userQuery,
      timestamp: new Date()
    });
    
    conversationHistory.push({
      role: "assistant",
      content: result.response,
      timestamp: new Date()
    });

    // Show accumulated context insights
    if (agent.isContextOrchestrationEnabled()) {
      const insights = agent.getContextOrchestrationInsights();
      if (insights) {
        console.log(`\n🧠 Accumulated Knowledge:`);
        console.log(`   Total Reasoning Steps: ${insights.totalReasoningSteps}`);
        console.log(`   Top Evolved Concepts: ${insights.topConcepts.slice(0, 3).map(c => c.concept).join(', ')}`);
      }
    }

    // Pause between steps for readability
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n🎉 Context Orchestration Demo Complete!");
  console.log("\nKey Observations:");
  console.log("1. Context 'scanning ball' accumulated relevant knowledge");
  console.log("2. Concepts evolved and strengthened through conversation");
  console.log("3. Knowledge base integration provided targeted information");
  console.log("4. Tool relevance was assessed dynamically");
  console.log("5. Reasoning chain maintained conversation coherence");

  // Final insights
  if (agent.isContextOrchestrationEnabled()) {
    const finalInsights = agent.getContextOrchestrationInsights();
    if (finalInsights) {
      console.log("\n📈 Final Context Evolution:");
      console.log("Top Concepts by Strength:");
      finalInsights.topConcepts.slice(0, 5).forEach((concept, index) => {
        console.log(`   ${index + 1}. ${concept.concept}: ${concept.totalStrength.toFixed(2)}`);
      });
    }
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  runContextOrchestrationExample().catch(console.error);
}

export { runContextOrchestrationExample }; 