# Agento Framework Documentation

## 🚀 Complete Framework Documentation Suite

Welcome to the comprehensive documentation for the **Agento Framework** - a sophisticated TypeScript framework for building intelligent, production-ready conversational AI agents with advanced state management, context orchestration, and enterprise-grade capabilities.

## 📚 Documentation Structure

### Core Documentation

#### 1. **[Framework Overview](./FRAMEWORK_OVERVIEW.md)**
Complete technical overview covering the framework's architecture, philosophy, and core capabilities:
- 🏗️ **Architecture Components**: Agent, StateMachine, ContextOrchestrator, Vector Storage
- 🎯 **Core Features**: Intent-driven routing, hierarchical states, context orchestration
- 💼 **Use Cases**: Banking, E-commerce, Healthcare, Education, Customer Service
- 🔧 **Key Concepts**: State inheritance, guard functions, tool execution, conversation management
- 📊 **Performance**: Scalability patterns, caching strategies, optimization techniques

#### 2. **[API Reference](./API_REFERENCE.md)**
Comprehensive API documentation with detailed type definitions and examples:
- 🔗 **Agent Class**: Complete method reference with parameters and return types
- 🏛️ **State Management**: StateMachine operations and configuration
- 💬 **Conversation System**: Persistence, retrieval, and intelligent context selection
- 🗄️ **Vector Integration**: Multiple provider support and hybrid search capabilities
- 🛠️ **Tool Framework**: Registration, execution, validation, and error handling
- 🤖 **LLM Providers**: Multi-provider abstraction and configuration
- 🔒 **Security**: Guard functions, authentication, and access control

#### 3. **[Getting Started Guide](./GETTING_STARTED.md)**
Step-by-step guide for developers new to the framework:
- 📦 **Installation**: Environment setup and dependencies
- 🎯 **First Agent**: Building your first conversational AI agent
- 📖 **Core Concepts**: Understanding state-based architecture and inheritance
- 🔧 **Tool Development**: Creating custom tools and integrations
- 💾 **Persistence**: Setting up conversation and vector storage
- 🚀 **Deployment**: Production deployment patterns and best practices

#### 4. **[Advanced Features](./ADVANCED_FEATURES.md)**
Deep dive into sophisticated framework capabilities:
- 🧠 **Context Orchestration**: "Scanning Ball" architecture and intelligent context selection
- 🔒 **Advanced Security**: Complex permission systems, audit trails, and conditional routing
- 🛠️ **Sophisticated Tools**: Tool composition, middleware, streaming, and real-time capabilities
- 💾 **Intelligent Conversation Management**: Context optimization and cross-session learning
- 🔍 **Advanced Vector Integration**: Hybrid search, multiple indexes, and dynamic updates
- 📊 **Performance Optimization**: Multi-level caching, resource management, and scaling
- 🔍 **Monitoring**: Comprehensive metrics, health checks, and observability
- 🚀 **Production Deployment**: Kubernetes, Docker, load balancing, and auto-scaling

## 🏗️ Framework Architecture

The Agento framework is built around several core architectural components that work together to create sophisticated conversational AI experiences:

```typescript
┌─────────────────────────────────────────────────────────────┐
│                         Agent                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │   State         │ │   Context       │ │   Conversation  │ │
│  │   Machine       │ │   Orchestrator  │ │   Manager       │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │   Tool          │ │   Vector        │ │   LLM           │ │
│  │   Executor      │ │   Storage       │ │   Provider      │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Framework Principles

1. **Intent-Driven Architecture**: Uses LLM-powered intent analysis to route conversations through hierarchical state machines
2. **Additive State Inheritance**: Child states inherit and extend parent capabilities without overriding
3. **Context Orchestration**: Intelligent "scanning ball" system that continuously reasons about relevance and context
4. **Multi-LLM Abstraction**: Seamless switching between providers (OpenAI, Anthropic, Groq) with standardized APIs
5. **Production-Ready**: Enterprise-grade features including monitoring, scaling, security, and observability

## 🎯 Quick Start Examples

### Basic Customer Service Agent

```typescript
import { Agent, createOpenAIProvider } from 'agento';

const agent = new Agent({
  llmProvider: createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4",
  }),
  states: [
    {
      key: "customer_support",
      description: "Handle customer inquiries and support requests",
      children: [
        {
          key: "technical_support",
          description: "Technical issues and troubleshooting"
        },
        {
          key: "billing_support", 
          description: "Billing questions and account management"
        }
      ]
    }
  ]
});

// Register tools
agent.registerTool("lookup_order", async ({ orderId }) => {
  const order = await orderService.findById(orderId);
  return { success: true, order };
});

// Process queries
const response = await agent.processQuery(
  "user123", 
  "I need help with my recent order #12345"
);
```

### Banking Agent with Security

```typescript
const bankingAgent = new Agent({
  llmProvider: createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4",
  }),
  states: [
    {
      key: "banking_services",
      description: "Banking and financial services",
      onEnter: async ({ metadata }) => {
        // Security check
        if (!metadata.authenticated || !metadata.mfaVerified) {
          return {
            allowed: false,
            reason: "Authentication required",
            customMessage: "Please complete authentication to access banking services.",
            alternativeAction: "fallback_state",
            fallbackStateKey: "authentication"
          };
        }
        return { allowed: true };
      },
      children: [
        {
          key: "account_inquiry",
          description: "Check account balances and transaction history"
        },
        {
          key: "transfer_funds",
          description: "Transfer money between accounts",
          onEnter: async ({ userQuery, metadata }) => {
            // Additional security for transfers
            const amount = extractTransferAmount(userQuery);
            if (amount > 10000 && !metadata.enhancedVerification) {
              return {
                allowed: false,
                reason: "Enhanced verification required for large transfers",
                customMessage: "Transfers over $10,000 require additional verification.",
                alternativeAction: "fallback_state",
                fallbackStateKey: "enhanced_verification"
              };
            }
            return { allowed: true };
          }
        }
      ]
    }
  ]
});
```

### E-commerce Agent with Vector Knowledge

```typescript
const ecommerceAgent = new Agent({
  llmProvider: createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4",
  }),
  vectorKnowledgeBase: new VectorKnowledgeBaseImpl({
    storage: createPineconeStorage({
      apiKey: process.env.PINECONE_API_KEY,
      indexName: "product-knowledge"
    }),
    embeddingProvider: createOpenAIEmbeddingProvider({
      apiKey: process.env.OPENAI_API_KEY
    })
  }),
  conversationManager: new ConversationManagerImpl({
    storage: createPostgreSQLStorage({
      connectionString: process.env.DATABASE_URL
    })
  }),
  states: [
    {
      key: "product_assistance",
      description: "Help customers find and learn about products",
      children: [
        {
          key: "product_search",
          description: "Search for products based on customer needs"
        },
        {
          key: "product_comparison",
          description: "Compare different products and features"
        },
        {
          key: "order_management",
          description: "Handle orders, returns, and shipping inquiries"
        }
      ]
    }
  ]
});

// Register e-commerce tools
agent.registerTool("search_products", async ({ query, filters }) => {
  const products = await productService.search(query, filters);
  return { success: true, products };
});

agent.registerTool("get_product_details", async ({ productId }) => {
  const product = await productService.getDetails(productId);
  return { success: true, product };
});
```

## 🔧 Key Capabilities

### 🎯 **Intelligent Routing**
- Intent-driven state selection using LLM analysis
- Hierarchical state inheritance with additive capabilities
- Context-aware routing based on conversation history and user patterns

### 🧠 **Context Orchestration** 
- "Scanning Ball" architecture for dynamic context selection
- Multi-source knowledge integration (vector, database, APIs)
- Intelligent relevance scoring and time-based decay

### 💾 **Conversation Management**
- Persistent conversation storage with multiple backends
- Intelligent context optimization and token management
- Cross-session learning and personalization

### 🔍 **Vector Integration**
- Multi-provider vector database support (Pinecone, Weaviate, Chroma)
- Hybrid search combining vector similarity and keyword matching
- Dynamic knowledge base updates from conversations

### 🛠️ **Tool Framework**
- Comprehensive tool registration and execution system
- Tool composition and chaining for complex workflows
- Middleware support for authentication, logging, and rate limiting

### 🔒 **Enterprise Security**
- Role-based access control with hierarchical permissions
- Guard functions for state and tool access control
- Comprehensive audit trails and compliance features

### 📊 **Production Features**
- Multi-level caching for performance optimization
- Resource management and connection pooling
- Health monitoring and metrics collection
- Auto-scaling and load balancing capabilities

## 🚀 Use Cases

### **Customer Service**
- Multi-channel support with consistent experiences
- Escalation workflows and human handoff
- Knowledge base integration and FAQ handling
- Sentiment analysis and proactive assistance

### **Banking & Finance**
- Secure transaction processing with multi-factor authentication
- Account management and balance inquiries
- Fraud detection and prevention
- Regulatory compliance and audit trails

### **E-commerce**
- Product recommendations and search
- Order management and tracking
- Customer support and returns processing
- Personalized shopping experiences

### **Healthcare**
- HIPAA-compliant patient interactions
- Appointment scheduling and management
- Medical knowledge base integration
- Symptom assessment and triage

### **Education**
- Adaptive learning and tutoring systems
- Student progress tracking
- Educational content recommendations
- Administrative assistance

## 🌟 Why Choose Agento?

### **Production-Ready**
- Enterprise-grade security and compliance features
- Comprehensive monitoring and observability
- Scalable architecture supporting high-volume deployments
- Multi-provider abstractions for vendor independence

### **Developer-Friendly**
- TypeScript-first with complete type safety
- Intuitive APIs with extensive documentation
- Rich ecosystem of examples and patterns
- Active community and support

### **Intelligent by Design**
- LLM-powered intent analysis and routing
- Context-aware conversation management
- Learning capabilities that improve over time
- Sophisticated state management with inheritance

### **Extensible Architecture**
- Plugin system for custom functionality
- Tool framework for external integrations
- Multiple storage backend support
- Configurable LLM providers and models

## 📈 Performance & Scalability

The Agento framework is designed for production environments with:

- **High Throughput**: Support for thousands of concurrent conversations
- **Low Latency**: Optimized response times through intelligent caching
- **Horizontal Scaling**: Kubernetes-native with auto-scaling capabilities
- **Resource Efficiency**: Connection pooling and resource management
- **Fault Tolerance**: Circuit breakers and graceful degradation

## 🛠️ Getting Started

1. **[Read the Getting Started Guide](./GETTING_STARTED.md)** - Complete tutorial for new developers
2. **[Explore the API Reference](./API_REFERENCE.md)** - Detailed API documentation
3. **[Review Advanced Features](./ADVANCED_FEATURES.md)** - Sophisticated patterns and capabilities
4. **[Study the Framework Overview](./FRAMEWORK_OVERVIEW.md)** - Deep architectural understanding

## 🤝 Community & Support

- **Documentation**: Comprehensive guides and API references
- **Examples**: Real-world implementations and patterns
- **Best Practices**: Production deployment and optimization guides
- **Framework Evolution**: Regular updates with new capabilities and improvements

## 📄 License

The Agento framework is open source and available under the MIT License. See the main repository for complete license information.

---

**Start building sophisticated conversational AI applications with the Agento framework today!** 