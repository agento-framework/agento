import { Agent } from "../src/core/agent.js";
import { InMemoryConversationStorage } from "./storage-implementations.js";
import type { ConversationStorage } from "../src/types.js";

/**
 * Example: Setting up conversation persistence with different strategies
 */

// 1. Basic In-Memory Storage (for development/testing)
async function basicPersistenceExample() {
  const storage = new InMemoryConversationStorage();
  
  const agent = new Agent({
    states: [
      {
        key: "support",
        description: "Handle customer support inquiries",
        prompt: "You are a helpful customer support agent.",
        children: [
          {
            key: "order_inquiry",
            description: "Handle order-related questions",
            prompt: "Focus on order status, shipping, and delivery information.",
            tools: ["getOrderStatus"],
          },
          {
            key: "technical_support",
            description: "Handle technical issues",
            prompt: "Help troubleshoot technical problems with products.",
            tools: ["createSupportTicket"],
          }
        ]
      }
    ],
         contexts: [
       {
         key: "company_policies",
         description: "Company return and shipping policies",
         content: "Return policy: 30 days. Shipping: 3-5 business days.",
         priority: 10,
       }
     ],
         tools: [
       {
         type: "function",
         function: {
           name: "getOrderStatus",
           description: "Get the status of a customer order",
           parameters: {
             type: "object",
             properties: {
               orderId: { type: "string", description: "Order ID" }
             },
             required: ["orderId"]
           }
         }
       },
       {
         type: "function",
         function: {
           name: "createSupportTicket",
           description: "Create a support ticket",
           parameters: {
             type: "object",
             properties: {
               issue: { type: "string", description: "Description of the issue" }
             },
             required: ["issue"]
           }
         }
       }
     ],
    defaultLLMConfig: {
      provider: "openai",
      model: "gpt-4",
      apiKey: process.env.OPENAI_API_KEY!,
    },
    conversationConfig: {
      storage,
      maxWorkingMemoryMessages: 50,
      enableSummarization: true,
      maxContextTokens: 4000,
      defaultRelevanceStrategy: "hybrid",
      enableEmbeddings: false, // No embeddings for in-memory storage
    }
  });

  // Register tool implementations
  agent.registerTools({
    getOrderStatus: async ({ orderId }) => {
      return { status: "shipped", trackingNumber: "TRK123", orderId };
    },
    createSupportTicket: async ({ issue }) => {
      return { ticketId: "TICK-001", status: "created", issue };
    }
  });

  // Simulate a conversation
  const sessionId = "user123_session1";
  
  // First interaction
  const response1 = await agent.processQuery(
    "Hi, I need help with my order",
    sessionId
  );
  console.log("Response 1:", response1.response);

  // Second interaction (context aware)
  const response2 = await agent.processQuery(
    "The order ID is ORD-456",
    sessionId
  );
  console.log("Response 2:", response2.response);

  // Third interaction (different topic)
  const response3 = await agent.processQuery(
    "Actually, I'm having trouble with my product not working",
    sessionId
  );
  console.log("Response 3:", response3.response);

  // Get conversation history
  const history = await agent.getConversationHistory(sessionId);
  console.log(`Conversation has ${history.messages.length} messages`);

  return { agent, sessionId };
}

/**
 * Example: Advanced relevance querying strategies
 */
async function relevanceQueryingExample() {
  const storage = new InMemoryConversationStorage();
  
  const agent = new Agent({
    states: [
      {
        key: "general",
        description: "General purpose assistant",
        prompt: "You are a helpful assistant.",
      }
    ],
    contexts: [],
    tools: [],
    defaultLLMConfig: {
      provider: "openai",
      model: "gpt-4",
      apiKey: process.env.OPENAI_API_KEY!,
    },
    conversationConfig: {
      storage,
      maxContextTokens: 2000, // Limited context for demonstration
      defaultRelevanceStrategy: "hybrid",
    }
  });

  const sessionId = "demo_session";

  // Build a conversation history
  const interactions = [
    "Tell me about machine learning",
    "What are neural networks?",
    "How do I train a model?",
    "What's the weather like?", // Different topic
    "Can you recommend a restaurant?", // Different topic
    "How do I evaluate model performance?", // Back to ML
    "What are some ML frameworks?",
  ];

  for (const query of interactions) {
    await agent.processQuery(query, sessionId);
  }

  // Test different relevance strategies
  console.log("\n=== Testing Relevance Strategies ===");

  // 1. Recent strategy (chronological)
  const recentHistory = await agent.getConversationHistory(sessionId, "machine learning model", {
    relevanceStrategy: "recent",
    limit: 3,
  });
  console.log("Recent strategy:", recentHistory.messages.map(m => m.content.substring(0, 50) + "..."));

  // 2. Keyword strategy
  const keywordHistory = await agent.getConversationHistory(sessionId, "machine learning", {
    relevanceStrategy: "keyword",
    limit: 3,
  });
  console.log("Keyword strategy:", keywordHistory.messages.map(m => m.content.substring(0, 50) + "..."));

  // 3. Hybrid strategy (combines recent + relevance)
  const hybridHistory = await agent.getConversationHistory(sessionId, "neural network training", {
    relevanceStrategy: "hybrid",
    limit: 3,
  });
  console.log("Hybrid strategy:", hybridHistory.messages.map(m => m.content.substring(0, 50) + "..."));

  return agent;
}

/**
 * Example: Production-ready storage patterns
 */
class ProductionStorageExample {
  private agent: Agent;

  constructor() {
    // In production, you'd use PostgreSQL, MongoDB, etc.
    const storage = new InMemoryConversationStorage();

    this.agent = new Agent({
      states: [
        {
          key: "ecommerce",
          description: "E-commerce customer service",
          prompt: "You are an e-commerce customer service agent.",
          children: [
            {
              key: "orders",
              description: "Order management",
              prompt: "Handle order inquiries with care and accuracy.",
              tools: ["getOrderStatus", "cancelOrder", "trackShipment"],
            },
            {
              key: "products",
              description: "Product support",
              prompt: "Help customers with product questions and issues.",
              tools: ["getProductInfo", "createReturn"],
            }
          ]
        }
      ],
             contexts: [
         {
           key: "policies",
           description: "Company policies and guarantees",
           content: `Company policies:
- Free returns within 30 days
- Free shipping on orders over $50
- Customer satisfaction guarantee`,
           priority: 10,
         }
       ],
       tools: [
         {
           type: "function",
           function: {
             name: "getOrderStatus",
             description: "Get order status and details",
             parameters: {
               type: "object",
               properties: {
                 orderId: { type: "string" }
               },
               required: ["orderId"]
             }
           }
         },
         {
           type: "function",
           function: {
             name: "getProductInfo",
             description: "Get product information",
             parameters: {
               type: "object",
               properties: {
                 productId: { type: "string" }
               },
               required: ["productId"]
             }
           }
         }
       ],
      defaultLLMConfig: {
        provider: "openai",
        model: "gpt-4",
        apiKey: process.env.OPENAI_API_KEY!,
      },
      conversationConfig: {
        storage,
        maxWorkingMemoryMessages: 100,
        enableSummarization: true,
        maxContextTokens: 8000,
        defaultRelevanceStrategy: "hybrid",
        enableEmbeddings: true,
      }
    });

    this.agent.registerTools({
      getOrderStatus: async ({ orderId }) => ({
        orderId,
        status: "processing",
        estimatedDelivery: "2024-01-15",
      }),
      getProductInfo: async ({ productId }) => ({
        productId,
        name: "Wireless Headphones",
        price: 199.99,
        inStock: true,
      }),
    });
  }

  /**
   * Handle customer interaction with session management
   */
  async handleCustomerInteraction(userId: string, query: string, metadata: Record<string, any> = {}) {
    // Generate session ID with user context
    const sessionId = `${userId}_${new Date().toISOString().split('T')[0]}`;

    // Add user context to metadata
    const enrichedMetadata = {
      ...metadata,
      userId,
      timestamp: new Date().toISOString(),
      channel: metadata.channel || "web",
    };

    // Process query with persistence
    const response = await this.agent.processQuery(query, sessionId, [], enrichedMetadata);

    // Check if we should summarize long conversations
    const history = await this.agent.getConversationHistory(sessionId);
    if (history.messages.length > 50 && !history.summary) {
      console.log("Conversation getting long, creating summary...");
      await this.agent.summarizeSession(sessionId);
    }

    return {
      response: response.response,
      sessionId,
      confidence: response.confidence,
      state: response.selectedState.key,
    };
  }

  /**
   * Analytics: Search conversations for insights
   */
  async searchForInsights(query: string, userId?: string) {
    return this.agent.searchConversations(query, userId, 10);
  }

  /**
   * Maintenance: Clean up old conversations
   */
  async performMaintenance() {
    const deletedCount = await this.agent.cleanupConversations(90); // 90 days retention
    console.log(`Cleaned up ${deletedCount} old conversations`);
    return deletedCount;
  }

  /**
   * Export conversation data (for analytics, backups, etc.)
   */
  async exportConversationData(sessionId: string) {
    const history = await this.agent.getConversationHistory(sessionId);
    const session = await this.agent['conversationManager']?.getSession(sessionId);
    
    return {
      sessionId,
      session,
      messages: history.messages,
      summary: history.summary,
      messageCount: history.messages.length,
      exportedAt: new Date().toISOString(),
    };
  }
}

/**
 * Example: Context optimization strategies
 */
async function contextOptimizationExample() {
  const storage = new InMemoryConversationStorage();
  
  const agent = new Agent({
    states: [
      {
        key: "assistant",
        description: "General assistant",
        prompt: "You are a helpful assistant.",
      }
    ],
    contexts: [],
    tools: [],
    defaultLLMConfig: {
      provider: "openai",
      model: "gpt-4",
      apiKey: process.env.OPENAI_API_KEY!,
    },
    conversationConfig: {
      storage,
      maxContextTokens: 1000, // Very limited for demonstration
      defaultRelevanceStrategy: "hybrid",
      enableSummarization: true,
    }
  });

  const sessionId = "context_demo";

  // Build up a long conversation
  const longConversation = [
    "What is the capital of France?",
    "Tell me about French cuisine",
    "What are some popular French dishes?",
    "How do I make a croissant?",
    "What about baguettes?",
    "Tell me about French wine regions",
    "What's the difference between Bordeaux and Burgundy?",
    "How should I store wine?",
    "What temperature should I serve red wine?",
    "Now tell me about Italian food", // Topic shift
  ];

  for (const query of longConversation) {
    await agent.processQuery(query, sessionId);
  }

  // Test context optimization with a new query
  console.log("\n=== Testing Context Optimization ===");
  
  // This query should get relevant French cuisine context, not all messages
  const response = await agent.processQuery(
    "What French dessert would you recommend?",
    sessionId
  );
  
  console.log("Optimized response:", response.response);
  
  // Check what context strategy was used
  const history = await agent.getConversationHistory(sessionId, "French dessert");
  console.log(`Context included ${history.messages.length} messages`);
  if (history.summary) {
    console.log("Used conversation summary for context efficiency");
  }

  return agent;
}

// Example usage
async function runExamples() {
  console.log("=== Basic Persistence Example ===");
  await basicPersistenceExample();

  console.log("\n=== Relevance Querying Example ===");
  await relevanceQueryingExample();

  console.log("\n=== Production Storage Example ===");
  const productionExample = new ProductionStorageExample();
  
  await productionExample.handleCustomerInteraction("user123", "I need help with my order");
  await productionExample.handleCustomerInteraction("user123", "Order ID is ORD-789");
  
  const insights = await productionExample.searchForInsights("order problems");
  console.log("Found insights:", insights.length, "relevant conversations");

  console.log("\n=== Context Optimization Example ===");
  await contextOptimizationExample();
}

export {
  basicPersistenceExample,
  relevanceQueryingExample,
  ProductionStorageExample,
  contextOptimizationExample,
  runExamples,
}; 