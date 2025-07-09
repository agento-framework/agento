# Getting Started with Agento Framework

## 🚀 Quick Start

### Installation

```bash
# Using npm
npm install agento-framework

# Using yarn
yarn add agento-framework

# Using bun
bun add agento-framework
```

### Environment Setup

Create a `.env` file with your LLM provider API keys:

```bash
# Choose your preferred LLM provider(s)
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Vector database keys for advanced features
PINECONE_API_KEY=your_pinecone_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
```

### Your First Agent

```typescript
import { Agent, type StateConfig, type Context, type Tool, type LLMConfig } from 'agento-framework';

// 1. Define LLM Configuration
const llmConfig: LLMConfig = {
  provider: "groq",
  model: "llama3-8b-8192",
  temperature: 0.7,
  maxTokens: 4096,
};

// 2. Define Contexts (Knowledge Base)
const contexts: Context[] = [
  {
    key: "company_info",
    description: "Company information and policies",
    content: `
      Company: TechCorp Solutions
      Founded: 2020
      Services: Software development and AI consulting
      Support Hours: Mon-Fri 9AM-6PM EST
      Contact: support@techcorp.com
    `,
    priority: 100,
  },
];

// 3. Define Tools (Functions your agent can call)
const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "Check the status of a customer order",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The order ID to check",
          },
        },
        required: ["orderId"],
      },
    },
  },
];

// 4. Define State Machine (Agent Behavior)
const states: StateConfig[] = [
  {
    key: "customer_support",
    description: "Main customer support assistant",
    prompt: "You are a helpful customer support agent for TechCorp Solutions.",
    contexts: ["company_info"],
    children: [
      {
        key: "order_assistance",
        description: "Help with order-related questions",
        prompt: "Focus on helping customers with their orders and shipping questions.",
        tools: ["get_order_status"],
      },
      {
        key: "general_inquiry",
        description: "Handle general questions about services and company",
        prompt: "Answer general questions about our company, services, and policies.",
      },
    ],
  },
];

// 5. Create Agent
const agent = new Agent({
  states,
  contexts,
  tools,
  defaultLLMConfig: llmConfig,
});

// 6. Register Tool Implementation
agent.registerTool("get_order_status", async ({ orderId }) => {
  // Mock order lookup - replace with your actual implementation
  const orders = {
    "12345": { status: "shipped", tracking: "TK123456789", estimatedDelivery: "2024-01-15" },
    "67890": { status: "processing", estimatedShip: "2024-01-12" },
  };
  
  return orders[orderId] || { status: "not_found", message: "Order not found" };
});

// 7. Process User Queries
const result = await agent.processQuery(
  "user123",           // User ID
  "What's the status of order 12345?"  // User query
);

console.log(result.response);
console.log("Confidence:", result.confidence);
console.log("Selected state:", result.selectedState.key);
```

## 📚 Core Concepts

### 1. State-Based Architecture

Agento organizes agent behavior into hierarchical states that represent different intents or capabilities:

```typescript
const states: StateConfig[] = [
  {
    key: "ecommerce_assistant",
    description: "E-commerce customer assistant",
    prompt: "You help customers with their shopping experience",
    children: [
      {
        key: "product_search",
        description: "Search for products and recommendations",
        tools: ["search_products", "get_recommendations"],
      },
      {
        key: "order_management", 
        description: "Handle order tracking and modifications",
        tools: ["track_order", "modify_order"],
        onEnter: async ({ metadata }) => {
          // Require authentication for order operations
          return metadata?.authenticated === true;
        }
      }
    ]
  }
];
```

### 2. Inheritance System

Child states inherit properties from their parents in an additive way:

```typescript
const states: StateConfig[] = [
  {
    key: "customer_service",
    prompt: "You are a professional customer service agent.",
    contexts: ["company_policies"],
    tools: ["create_ticket"],
    children: [
      {
        key: "billing_support",
        prompt: "You specialize in billing and payment issues.", // Concatenated with parent
        contexts: ["billing_info"],  // Added to parent contexts
        tools: ["process_refund"],   // Added to parent tools
      }
    ]
  }
];

// The resolved billing_support state will have:
// - Full prompt: "You are a professional customer service agent.\n\nYou specialize in billing and payment issues."
// - Contexts: ["company_policies", "billing_info"]  
// - Tools: ["create_ticket", "process_refund"]
```

### 3. Guard Functions

Control access to states with security and validation logic:

```typescript
{
  key: "admin_panel",
  description: "Administrative functions",
  onEnter: async ({ userQuery, metadata }) => {
    // Basic guard returning boolean
    return metadata.userRole === "admin";
  }
}

// Enhanced guard with detailed responses
{
  key: "payment_processing",
  description: "Process payments and refunds",
  onEnter: async ({ userQuery, metadata }) => {
    if (!metadata.authenticated) {
      return {
        allowed: false,
        reason: "Authentication required",
        customMessage: "Please log in to access payment features."
      };
    }
    
    if (!metadata.paymentPermission) {
      return {
        allowed: false,
        reason: "Insufficient permissions",
        alternativeAction: "fallback_state",
        fallbackStateKey: "general_support"
      };
    }
    
    return { allowed: true };
  }
}
```

### 4. Context Management

Contexts provide knowledge and background information to your agent:

```typescript
const contexts: Context[] = [
  // Static context
  {
    key: "company_info",
    description: "Basic company information",
    content: "Company: TechCorp...",
    priority: 100,
  },
  
  // Dynamic context (function)
  {
    key: "current_time",
    description: "Current date and time",
    content: () => new Date().toISOString(),
    priority: 50,
  },
  
  // Async context
  {
    key: "user_preferences",
    description: "User preferences and settings",
    content: async () => {
      const prefs = await database.getUserPreferences();
      return JSON.stringify(prefs);
    },
    priority: 75,
  },
];
```

## 🛠️ Tool Development

### Basic Tool Implementation

```typescript
// 1. Define the tool schema
const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "calculate_shipping",
      description: "Calculate shipping cost for an order",
      parameters: {
        type: "object",
        properties: {
          weight: { type: "number", description: "Package weight in pounds" },
          destination: { type: "string", description: "Destination zip code" },
          expedited: { type: "boolean", description: "Whether to use expedited shipping" }
        },
        required: ["weight", "destination"]
      }
    }
  }
];

// 2. Register the implementation
agent.registerTool("calculate_shipping", async ({ weight, destination, expedited = false }) => {
  const baseRate = weight * 0.5;
  const zoneMultiplier = destination.startsWith('9') ? 1.5 : 1.0;
  const expeditedMultiplier = expedited ? 2.0 : 1.0;
  
  const cost = baseRate * zoneMultiplier * expeditedMultiplier;
  
  return {
    cost: Math.round(cost * 100) / 100,
    estimatedDays: expedited ? 2 : 5,
    carrier: expedited ? "FedEx Express" : "UPS Ground"
  };
});
```

### Advanced Tool Patterns

```typescript
// Error handling in tools
agent.registerTool("fetch_user_data", async ({ userId }) => {
  try {
    const user = await database.getUser(userId);
    if (!user) {
      return {
        error: "User not found",
        errorCode: "USER_NOT_FOUND"
      };
    }
    return user;
  } catch (error) {
    return {
      error: "Database connection failed",
      errorCode: "DB_ERROR",
      retryable: true
    };
  }
});

// Tool with external API integration
agent.registerTool("get_weather", async ({ location }) => {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.WEATHER_API_KEY}`
  );
  
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }
  
  const data = await response.json();
  return {
    temperature: Math.round(data.main.temp - 273.15), // Convert K to C
    condition: data.weather[0].description,
    humidity: data.main.humidity,
    location: data.name
  };
});

// Async tool with validation
agent.registerTool("schedule_appointment", async ({ date, time, service, customerEmail }) => {
  // Validate input
  const appointmentDate = new Date(`${date} ${time}`);
  if (appointmentDate < new Date()) {
    return {
      success: false,
      error: "Cannot schedule appointments in the past"
    };
  }
  
  // Check availability
  const isAvailable = await checkAvailability(appointmentDate, service);
  if (!isAvailable) {
    return {
      success: false,
      error: "Time slot not available",
      suggestedTimes: await getSuggestedTimes(date, service)
    };
  }
  
  // Create appointment
  const appointment = await createAppointment({
    date: appointmentDate,
    service,
    customerEmail
  });
  
  return {
    success: true,
    appointmentId: appointment.id,
    confirmationCode: appointment.confirmationCode
  };
});
```

## 💾 Conversation Persistence

### Basic Persistence Setup

```typescript
import { InMemoryConversationStorage } from './storage-implementations';

const storage = new InMemoryConversationStorage();

const agent = new Agent({
  states,
  contexts,
  tools,
  defaultLLMConfig,
  conversationConfig: {
    storage,
    maxWorkingMemoryMessages: 50,
    enableSummarization: true,
    maxContextTokens: 8000,
  }
});

// Use with session persistence
const result = await agent.processQuery(
  "user123",
  "What's my order status?",
  "session_456"  // Session ID for persistence
);
```

### Production Storage with PostgreSQL

```typescript
import { PostgreSQLConversationStorage } from './storage-implementations';

const storage = new PostgreSQLConversationStorage(
  "postgresql://user:password@localhost:5432/agento_db"
);

const agent = new Agent({
  states,
  contexts,
  tools,
  defaultLLMConfig,
  conversationConfig: {
    storage,
    enableSummarization: true,
    maxContextTokens: 8000,
    defaultRelevanceStrategy: "hybrid",
    enableEmbeddings: true,
  }
});

// The agent will automatically:
// - Store all conversation messages
// - Retrieve relevant history for context
// - Generate summaries for long conversations
// - Use semantic search for relevant message retrieval
```

## 🔍 Vector Integration

### Setting Up Vector Knowledge Base

```typescript
import { 
  VectorStorageFactory, 
  VectorKnowledgeBaseImpl,
  OpenAIEmbeddingProvider 
} from 'agento-framework';

// 1. Create embedding provider
const embeddingProvider = new OpenAIEmbeddingProvider(
  process.env.OPENAI_API_KEY,
  "text-embedding-3-small"
);

// 2. Create vector storage (in-memory for development)
const vectorStorage = VectorStorageFactory.createInMemory(embeddingProvider);

// 3. Create knowledge base
const knowledgeBase = new VectorKnowledgeBaseImpl(vectorStorage, embeddingProvider);

// 4. Populate with knowledge
await knowledgeBase.addContentBatch([
  {
    content: "Our return policy allows returns within 30 days of purchase with receipt.",
    metadata: { category: "policy", topic: "returns" }
  },
  {
    content: "We offer free shipping on orders over $50 within the continental US.",
    metadata: { category: "policy", topic: "shipping" }
  },
  {
    content: "Customer service is available Monday-Friday 9AM-6PM EST at 1-800-SUPPORT.",
    metadata: { category: "contact", topic: "support" }
  }
]);

// 5. Create agent with vector knowledge base
const agent = new Agent({
  states,
  contexts,
  tools,
  defaultLLMConfig,
  contextOrchestratorConfig: {
    contextLLMConfig: llmConfig,
    maxContextTokens: 8000,
    enableConceptMapping: true,
  },
  knowledgeBaseConnector: {
    search: async (query, concepts) => {
      const results = await knowledgeBase.vectorSearch(query, { limit: 5 });
      return results.map(r => ({
        content: r.content,
        relevance: r.relevance,
        source: "knowledge_base",
        metadata: r.metadata
      }));
    },
    getRelatedConcepts: async (concepts) => {
      return await knowledgeBase.findRelatedConcepts(concepts, 10);
    }
  }
});
```

### Production Vector Setup with Pinecone

```typescript
import { PineconeVectorStorage } from 'agento-framework';

const vectorStorage = new PineconeVectorStorage({
  apiKey: process.env.PINECONE_API_KEY,
  environment: "us-west1-gcp",
  indexName: "agento-knowledge",
  dimension: 1536,
});

const knowledgeBase = new VectorKnowledgeBaseImpl(vectorStorage, embeddingProvider);

// Agent will now use Pinecone for semantic search
```

## 🎯 Advanced Configuration

### Multi-LLM Setup

Use different LLMs for different capabilities:

```typescript
const states: StateConfig[] = [
  {
    key: "creative_assistant",
    description: "Creative writing and content generation",
    llmConfig: {
      provider: "openai",
      model: "gpt-4",
      temperature: 0.9,  // High creativity
    },
    children: [
      {
        key: "technical_analysis",
        description: "Technical document analysis and summarization",
        llmConfig: {
          provider: "anthropic",
          model: "claude-3-sonnet-20240229",
          temperature: 0.3,  // Low creativity, high precision
        }
      }
    ]
  }
];
```

### Context Orchestration

Enable intelligent context management:

```typescript
const agent = new Agent({
  states,
  contexts,
  tools,
  defaultLLMConfig,
  contextOrchestratorConfig: {
    contextLLMConfig: {
      provider: "groq",
      model: "llama3-8b-8192",
      temperature: 0.5,
    },
    maxContextTokens: 8000,
    maxReasoningHistory: 20,
    relevanceThreshold: 0.7,
    enableConceptMapping: true,
    enableSemanticClustering: true,
    timeDecayFactor: 0.1,
  }
});

// The agent will now:
// - Intelligently select relevant contexts
// - Learn from conversation patterns  
// - Adapt context selection over time
// - Provide reasoning for context choices
```

### Complete Production Setup

```typescript
import {
  Agent,
  PostgreSQLConversationStorage,
  PineconeVectorStorage,
  OpenAIEmbeddingProvider,
  VectorKnowledgeBaseImpl
} from 'agento-framework';

// Vector knowledge base setup
const embeddingProvider = new OpenAIEmbeddingProvider(
  process.env.OPENAI_API_KEY,
  "text-embedding-3-small"
);

const vectorStorage = new PineconeVectorStorage({
  apiKey: process.env.PINECONE_API_KEY,
  environment: "us-west1-gcp",
  indexName: "production-knowledge",
});

const knowledgeBase = new VectorKnowledgeBaseImpl(vectorStorage, embeddingProvider);

// Conversation persistence setup
const conversationStorage = new PostgreSQLConversationStorage(
  process.env.DATABASE_URL
);

// Production agent configuration
const agent = new Agent({
  states: productionStates,
  contexts: productionContexts,
  tools: productionTools,
  defaultLLMConfig: {
    provider: "groq",
    model: "llama3-8b-8192",
    temperature: 0.7,
    maxTokens: 4096,
  },
  intentAnalyzerConfig: {
    provider: "openai",
    model: "gpt-3.5-turbo",
    temperature: 0.3,  // Low temperature for consistent intent analysis
  },
  maxToolIterations: 5,
  conversationConfig: {
    storage: conversationStorage,
    enableSummarization: true,
    maxContextTokens: 8000,
    defaultRelevanceStrategy: "hybrid",
    enableEmbeddings: true,
  },
  contextOrchestratorConfig: {
    contextLLMConfig: {
      provider: "anthropic",
      model: "claude-3-haiku-20240307",
      temperature: 0.4,
    },
    maxContextTokens: 8000,
    maxReasoningHistory: 50,
    relevanceThreshold: 0.75,
    enableConceptMapping: true,
    enableSemanticClustering: true,
    timeDecayFactor: 0.1,
  },
  knowledgeBaseConnector: {
    search: async (query, concepts) => {
      const results = await knowledgeBase.hybridSearch(query, concepts, {
        limit: 10,
        vectorWeight: 0.7,
        keywordWeight: 0.3,
      });
      return results;
    },
    getRelatedConcepts: async (concepts) => {
      return await knowledgeBase.findRelatedConcepts(concepts, 15);
    }
  }
});

// Register all tool implementations
agent.registerTools(productionToolImplementations);
```

## 🧪 Testing Your Agent

### Unit Testing States and Tools

```typescript
import { describe, it, expect } from 'your-test-framework';

describe('Customer Service Agent', () => {
  let agent: Agent;
  
  beforeEach(() => {
    agent = new Agent({
      states: testStates,
      contexts: testContexts,
      tools: testTools,
      defaultLLMConfig: testLLMConfig,
    });
    
    // Register test tool implementations
    agent.registerTool('test_tool', async (params) => ({ success: true, ...params }));
  });

  it('should route order questions to order_assistance state', async () => {
    const result = await agent.processQuery(
      'test_user',
      'What is the status of my order?'
    );
    
    expect(result.selectedState.key).toBe('order_assistance');
    expect(result.confidence).toBeGreaterThan(80);
  });

  it('should require authentication for sensitive operations', async () => {
    const result = await agent.processQuery(
      'test_user', 
      'I want to cancel my order',
      undefined,
      [],
      { authenticated: false }
    );
    
    expect(result.response).toContain('authentication');
  });
});
```

### Integration Testing

```typescript
describe('Agent Integration Tests', () => {
  it('should handle full conversation flow', async () => {
    const sessionId = 'test_session_' + Date.now();
    
    // First interaction
    const result1 = await agent.processQuery(
      'user123',
      'Hello, I need help with my order',
      sessionId
    );
    
    expect(result1.selectedState.key).toBe('order_assistance');
    
    // Follow-up interaction with context
    const result2 = await agent.processQuery(
      'user123',
      'The order number is 12345',
      sessionId
    );
    
    expect(result2.toolResults).toHaveLength(1);
    expect(result2.toolResults[0].toolName).toBe('get_order_status');
  });
});
```

## 🚀 Deployment

### Basic Server Setup

```typescript
import express from 'express';
import { Agent } from 'agento-framework';

const app = express();
app.use(express.json());

const agent = new Agent(agentConfig);

app.post('/chat', async (req, res) => {
  try {
    const { userId, message, sessionId, metadata } = req.body;
    
    const result = await agent.processQuery(
      userId,
      message,
      sessionId,
      [],
      metadata
    );
    
    res.json({
      response: result.response,
      confidence: result.confidence,
      selectedState: result.selectedState.key,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Agent server running on port 3000');
});
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production

# LLM Provider Configuration
GROQ_API_KEY=your_production_groq_key
OPENAI_API_KEY=your_production_openai_key
ANTHROPIC_API_KEY=your_production_anthropic_key

# Database Configuration
DATABASE_URL=postgresql://user:pass@db:5432/agento_prod
REDIS_URL=redis://redis:6379/0

# Vector Database Configuration
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX=production-knowledge

# Application Configuration
MAX_CONCURRENT_REQUESTS=100
REQUEST_TIMEOUT_MS=30000
LOG_LEVEL=info
```

## 📈 Performance Optimization

### Connection Pooling

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const conversationStorage = new PostgreSQLConversationStorage(pool);
```

### Caching

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache frequent LLM responses
const cachedProcessQuery = async (userId: string, query: string, sessionId?: string) => {
  const cacheKey = `query:${userId}:${Buffer.from(query).toString('base64')}`;
  
  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Process with agent
  const result = await agent.processQuery(userId, query, sessionId);
  
  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(result));
  
  return result;
};
```

### Monitoring

```typescript
// Add metrics collection
let totalRequests = 0;
let averageResponseTime = 0;

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    totalRequests++;
    averageResponseTime = ((averageResponseTime * (totalRequests - 1)) + duration) / totalRequests;
    
    console.log(`Request completed in ${duration}ms. Average: ${averageResponseTime.toFixed(2)}ms`);
  });
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await conversationStorage.healthCheck?.();
    
    // Check vector database
    await vectorStorage.healthCheck();
    
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      totalRequests,
      averageResponseTime: averageResponseTime.toFixed(2),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

## 🎯 Next Steps

1. **Explore Examples**: Check out the complete examples in the `/examples` directory
2. **Advanced Features**: Learn about [Context Orchestration](./ADVANCED_FEATURES.md)
3. **Production Deployment**: Read the [Deployment Guide](./DEPLOYMENT_GUIDE.md)
4. **Best Practices**: Review [Best Practices](./BEST_PRACTICES.md)
5. **API Reference**: Complete [API Documentation](./API_REFERENCE.md)

## 🆘 Common Issues

### Tool Not Found Errors
```typescript
// Ensure tool names match between definition and registration
const tool = { function: { name: "my_tool" } };  // Tool definition
agent.registerTool("my_tool", implementation);   // Must match exactly
```

### State Routing Issues
```typescript
// Ensure leaf states have good descriptions for intent analysis
{
  key: "order_support",
  description: "Handle order status, tracking, and shipping questions", // Be specific
  // NOT: description: "Orders"  // Too vague
}
```

### Memory Issues
```typescript
// Configure appropriate limits for production
conversationConfig: {
  maxWorkingMemoryMessages: 50,    // Adjust based on your needs
  maxContextTokens: 8000,          // Stay within LLM context limits
  enableSummarization: true,       // Enable for long conversations
}
```

### Performance Issues
```typescript
// Use appropriate storage for your scale
// Development: InMemoryConversationStorage
// Production: PostgreSQLConversationStorage with connection pooling
// High-scale: HybridConversationStorage (Redis + PostgreSQL)
``` 