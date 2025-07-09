# Best Practices Guide

## 🏗️ State Machine Design

### Hierarchical State Organization

**✅ Good Practice:**
```typescript
const states: StateConfig[] = [
  {
    key: "customer_service",
    description: "Main customer service operations",
    prompt: "You are a professional customer service representative.",
    contexts: ["company_policies"],
    children: [
      {
        key: "order_support",
        description: "Order-related inquiries and support",
        prompt: "Focus specifically on order management and shipping.",
        tools: ["check_order", "update_shipping"],
      },
      {
        key: "billing_support", 
        description: "Billing and payment assistance",
        prompt: "Handle billing questions with sensitivity to customer concerns.",
        tools: ["process_refund", "update_payment"],
        onEnter: async ({ metadata }) => metadata?.paymentAuthorized === true
      }
    ]
  }
];
```

**❌ Avoid:**
```typescript
// Too many root states without hierarchy
const states: StateConfig[] = [
  { key: "order_check", description: "Check orders" },
  { key: "order_update", description: "Update orders" },
  { key: "billing_check", description: "Check billing" },
  { key: "billing_update", description: "Update billing" },
  // ... 20+ more root states
];
```

### State Description Guidelines

**✅ Good Descriptions:**
- "Handle customer billing inquiries and payment processing"
- "Provide technical support for software installation issues"
- "Process order cancellations and refund requests"

**❌ Poor Descriptions:**
- "Help customers" (too vague)
- "Order stuff" (unprofessional)
- "Fix things" (non-specific)

## 🔒 Security Best Practices

### Guard Function Implementation

**✅ Comprehensive Guard:**
```typescript
const secureGuard: EnhancedGuardFunction = async ({ userQuery, metadata }) => {
  // Authentication check
  if (!metadata?.authenticated) {
    return {
      allowed: false,
      reason: "Authentication required",
      alternativeAction: "custom_response",
      customMessage: "Please log in to access this feature."
    };
  }
  
  // Authorization check
  if (!hasPermission(metadata.userId, "admin_access")) {
    return {
      allowed: false,
      reason: "Insufficient permissions",
      alternativeAction: "fallback_state",
      fallbackStateKey: "general_support"
    };
  }
  
  // Rate limiting
  if (await isRateLimited(metadata.userId)) {
    return {
      allowed: false,
      reason: "Rate limit exceeded",
      customMessage: "Please wait before making another request."
    };
  }
  
  return { allowed: true };
};
```

**❌ Weak Guard:**
```typescript
const weakGuard = async ({ metadata }) => {
  return metadata?.isAdmin; // No error handling or user feedback
};
```

### Input Validation

**✅ Robust Validation:**
```typescript
agent.registerTool("process_payment", async ({ amount, currency, accountId }) => {
  // Input validation
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }
  
  if (!["USD", "EUR", "GBP"].includes(currency)) {
    throw new Error("Unsupported currency");
  }
  
  if (!/^[A-Za-z0-9]{8,20}$/.test(accountId)) {
    throw new Error("Invalid account ID format");
  }
  
  // Additional security checks
  if (amount > 10000) {
    await requireAdditionalVerification(accountId);
  }
  
  // Process payment...
});
```

## 🛠️ Tool Development

### Error Handling

**✅ Comprehensive Error Handling:**
```typescript
agent.registerTool("api_request", async ({ url, method = "GET", data }) => {
  try {
    // Input validation
    if (!isValidUrl(url)) {
      throw new Error("Invalid URL provided");
    }
    
    // Make request with timeout
    const response = await fetch(url, {
      method,
      body: data ? JSON.stringify(data) : undefined,
      headers: { "Content-Type": "application/json" },
      timeout: 10000 // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      data: result,
      status: response.status,
      url: url
    };
    
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error("Request timed out. Please try again later.");
    }
    
    if (error.name === 'NetworkError') {
      throw new Error("Network error. Please check your connection.");
    }
    
    // Log error for debugging (don't expose to user)
    console.error("API request failed:", error);
    
    throw new Error(`Request failed: ${error.message}`);
  }
});
```

### Tool Composition

**✅ Modular Tool Design:**
```typescript
// Base functions
async function validateUser(userId: string) {
  // User validation logic
}

async function processPayment(amount: number, method: string) {
  // Payment processing logic
}

async function updateInventory(items: any[]) {
  // Inventory update logic
}

// Composed tool
agent.registerTool("complete_purchase", async ({ userId, items, paymentMethod }) => {
  const operations = [];
  
  try {
    // Step 1: Validate user
    const user = await validateUser(userId);
    operations.push({ step: "user_validation", status: "completed" });
    
    // Step 2: Calculate total
    const total = calculateTotal(items);
    operations.push({ step: "total_calculation", status: "completed", amount: total });
    
    // Step 3: Process payment
    const payment = await processPayment(total, paymentMethod);
    operations.push({ step: "payment_processing", status: "completed", transactionId: payment.id });
    
    // Step 4: Update inventory
    await updateInventory(items);
    operations.push({ step: "inventory_update", status: "completed" });
    
    return {
      success: true,
      orderId: generateOrderId(),
      operations,
      total,
      paymentId: payment.id
    };
    
  } catch (error) {
    // Rollback completed operations
    await rollbackOperations(operations);
    throw error;
  }
});
```

## 💾 Conversation Management

### Storage Strategy

**✅ Efficient Storage Pattern:**
```typescript
class OptimizedConversationStorage implements ConversationStorage {
  private recentCache = new LRUCache<string, StoredMessage[]>({ max: 1000 });
  
  async storeMessage(message: Omit<StoredMessage, "id" | "timestamp">): Promise<StoredMessage> {
    const storedMessage: StoredMessage = {
      ...message,
      id: generateUUID(),
      timestamp: new Date(),
    };
    
    // Store in database
    await this.database.insert(storedMessage);
    
    // Update cache
    const sessionMessages = this.recentCache.get(message.sessionId) || [];
    sessionMessages.push(storedMessage);
    
    // Keep only recent messages in cache
    if (sessionMessages.length > 50) {
      sessionMessages.splice(0, sessionMessages.length - 50);
    }
    
    this.recentCache.set(message.sessionId, sessionMessages);
    
    return storedMessage;
  }
  
  async getConversationHistory(options: ConversationQueryOptions): Promise<ConversationQueryResult> {
    // Try cache first for recent queries
    if (options.relevanceStrategy === "recent" && options.limit <= 50) {
      const cached = this.recentCache.get(options.sessionId);
      if (cached && cached.length >= (options.limit || 20)) {
        return {
          messages: cached.slice(-(options.limit || 20)),
          totalMessages: cached.length,
          truncated: false
        };
      }
    }
    
    // Fall back to database query
    return this.queryDatabase(options);
  }
}
```

### Context Optimization

**✅ Smart Context Selection:**
```typescript
const contextOrchestratorConfig = {
  contextLLMConfig: {
    provider: "groq",
    model: "llama3-8b-8192",
    temperature: 0.2, // Low for consistency
  },
  maxContextTokens: 6000, // Leave room for response
  relevanceThreshold: 0.6, // Balance quality vs quantity
  enableConceptMapping: true,
  enableSemanticClustering: true,
  timeDecayFactor: 0.1, // Gradual relevance decay
};
```

## 🚀 Performance Optimization

### Caching Strategies

**✅ Multi-Level Caching:**
```typescript
class ProductionAgentCache {
  private l1Cache: LRUCache<string, any>; // In-memory
  private l2Cache: Redis; // Distributed
  
  constructor(redis: Redis) {
    this.l1Cache = new LRUCache({
      max: 1000,
      ttl: 300000, // 5 minutes
    });
    this.l2Cache = redis;
  }
  
  async getCachedResponse(key: string): Promise<any> {
    // L1 cache (fastest)
    let result = this.l1Cache.get(key);
    if (result) return result;
    
    // L2 cache (shared across instances)
    const cached = await this.l2Cache.get(key);
    if (cached) {
      result = JSON.parse(cached);
      this.l1Cache.set(key, result); // Promote to L1
      return result;
    }
    
    return null;
  }
  
  async setCachedResponse(key: string, value: any, ttl: number = 300): Promise<void> {
    this.l1Cache.set(key, value);
    await this.l2Cache.setex(key, ttl, JSON.stringify(value));
  }
}
```

### Batch Processing

**✅ Efficient Batch Operations:**
```typescript
agent.registerTool("process_multiple_orders", async ({ orderIds }) => {
  const batchSize = 10;
  const results = [];
  
  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < orderIds.length; i += batchSize) {
    const batch = orderIds.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(orderId => processOrder(orderId));
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Handle results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push({ orderId: batch[index], status: 'success', data: result.value });
      } else {
        results.push({ orderId: batch[index], status: 'error', error: result.reason.message });
      }
    });
    
    // Brief pause between batches to avoid rate limiting
    if (i + batchSize < orderIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return {
    totalProcessed: orderIds.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'error').length,
    results
  };
});
```

## 📊 Monitoring & Observability

### Comprehensive Logging

**✅ Structured Logging:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Production logging wrapper
export async function processQueryWithLogging(
  userId: string,
  query: string,
  sessionId?: string
) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  logger.info('Query started', {
    requestId,
    userId,
    sessionId,
    query: query.substring(0, 100), // Truncate for privacy
    timestamp: new Date().toISOString()
  });
  
  try {
    const result = await agent.processQuery(userId, query, sessionId);
    
    const duration = Date.now() - startTime;
    
    logger.info('Query completed', {
      requestId,
      userId,
      sessionId,
      duration,
      confidence: result.confidence,
      selectedState: result.selectedState.key,
      toolsUsed: result.toolResults.map(t => t.toolName),
      success: true
    });
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Query failed', {
      requestId,
      userId,
      sessionId,
      duration,
      error: error.message,
      stack: error.stack,
      success: false
    });
    
    throw error;
  }
}
```

### Health Monitoring

**✅ Comprehensive Health Checks:**
```typescript
class AgentHealthMonitor {
  private agent: Agent;
  private healthChecks: Map<string, () => Promise<boolean>>;
  
  constructor(agent: Agent) {
    this.agent = agent;
    this.healthChecks = new Map([
      ['database', this.checkDatabase.bind(this)],
      ['redis', this.checkRedis.bind(this)],
      ['llm_providers', this.checkLLMProviders.bind(this)],
      ['vector_storage', this.checkVectorStorage.bind(this)],
      ['memory_usage', this.checkMemoryUsage.bind(this)],
    ]);
  }
  
  async performHealthCheck(): Promise<HealthStatus> {
    const results = new Map();
    
    for (const [name, check] of this.healthChecks) {
      try {
        const startTime = Date.now();
        const healthy = await Promise.race([
          check(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        
        results.set(name, {
          healthy,
          responseTime: Date.now() - startTime,
          error: null
        });
      } catch (error) {
        results.set(name, {
          healthy: false,
          responseTime: Date.now() - startTime,
          error: error.message
        });
      }
    }
    
    const healthyChecks = Array.from(results.values()).filter(r => r.healthy).length;
    const totalChecks = results.size;
    
    return {
      status: healthyChecks === totalChecks ? 'healthy' : 
              healthyChecks > totalChecks / 2 ? 'degraded' : 'unhealthy',
      checks: Object.fromEntries(results),
      score: healthyChecks / totalChecks,
      timestamp: new Date().toISOString()
    };
  }
  
  private async checkDatabase(): Promise<boolean> {
    // Database connectivity check
    return true; // Implement actual check
  }
  
  private async checkMemoryUsage(): Promise<boolean> {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    return heapUsedMB < 512; // Alert if using more than 512MB
  }
}
```

## 🔧 Testing Strategies

### Unit Testing

**✅ Comprehensive Test Coverage:**
```typescript
import { Agent } from 'agento-framework';
import { jest } from '@jest/globals';

describe('Customer Service Agent', () => {
  let agent: Agent;
  let mockTools: Record<string, jest.Mock>;
  
  beforeEach(() => {
    mockTools = {
      check_order: jest.fn(),
      process_refund: jest.fn(),
    };
    
    agent = new Agent({
      states: testStates,
      contexts: testContexts,
      tools: testTools,
      defaultLLMConfig: mockLLMConfig,
    });
    
    // Register mock tools
    Object.entries(mockTools).forEach(([name, mock]) => {
      agent.registerTool(name, mock);
    });
  });
  
  describe('Order Support', () => {
    test('routes order inquiries correctly', async () => {
      const result = await agent.processQuery(
        'test-user',
        'I need to check my order status',
        'test-session'
      );
      
      expect(result.selectedState.key).toBe('order_support');
      expect(result.confidence).toBeGreaterThan(70);
    });
    
    test('handles order lookup with valid ID', async () => {
      mockTools.check_order.mockResolvedValue({
        orderId: 'ORD123',
        status: 'shipped',
        tracking: 'TRACK123'
      });
      
      const result = await agent.processQuery(
        'test-user',
        'Check order ORD123',
        'test-session'
      );
      
      expect(mockTools.check_order).toHaveBeenCalledWith({ orderId: 'ORD123' });
      expect(result.toolResults).toHaveLength(1);
      expect(result.toolResults[0].success).toBe(true);
    });
    
    test('handles tool errors gracefully', async () => {
      mockTools.check_order.mockRejectedValue(new Error('Order not found'));
      
      const result = await agent.processQuery(
        'test-user',
        'Check order INVALID123',
        'test-session'
      );
      
      expect(result.toolResults[0].success).toBe(false);
      expect(result.toolResults[0].error).toBe('Order not found');
      expect(result.response).toContain('unable to find');
    });
  });
  
  describe('Guard Functions', () => {
    test('enforces authentication guards', async () => {
      const result = await agent.processQuery(
        'test-user',
        'I need admin access',
        'test-session',
        [],
        { authenticated: false }
      );
      
      expect(result.response).toContain('authentication required');
    });
    
    test('allows access with proper permissions', async () => {
      const result = await agent.processQuery(
        'test-user',
        'Process a refund',
        'test-session',
        [],
        { authenticated: true, userId: 'U123' }
      );
      
      expect(result.selectedState.key).toBe('billing_support');
    });
  });
});
```

### Integration Testing

**✅ End-to-End Testing:**
```typescript
describe('Agent Integration Tests', () => {
  let agent: Agent;
  let testStorage: ConversationStorage;
  
  beforeAll(async () => {
    testStorage = new InMemoryConversationStorage();
    
    agent = new Agent({
      states: productionStates,
      contexts: productionContexts,
      tools: productionTools,
      defaultLLMConfig: testLLMConfig,
      conversationConfig: {
        storage: testStorage,
      }
    });
    
    // Register real tool implementations
    registerProductionTools(agent);
  });
  
  test('maintains conversation context across multiple queries', async () => {
    const sessionId = 'integration-test-session';
    
    // First query - establish context
    const result1 = await agent.processQuery(
      'test-user',
      'My name is John Smith and I need help with my account',
      sessionId
    );
    
    expect(result1.response).toContain('John');
    
    // Second query - should remember context
    const result2 = await agent.processQuery(
      'test-user',
      'What is my name?',
      sessionId
    );
    
    expect(result2.response).toContain('John Smith');
  });
  
  test('handles complex multi-tool workflows', async () => {
    const result = await agent.processQuery(
      'test-user',
      'I want to return my order ORD123 and get a refund',
      'workflow-test-session',
      [],
      { authenticated: true, userId: 'U123' }
    );
    
    // Should use multiple tools in sequence
    const toolNames = result.toolResults.map(t => t.toolName);
    expect(toolNames).toContain('check_order');
    expect(toolNames).toContain('process_return');
    expect(toolNames).toContain('issue_refund');
    
    // All tools should succeed
    expect(result.toolResults.every(t => t.success)).toBe(true);
  });
});
```

## 🔐 Security Guidelines

### Data Privacy

**✅ Privacy-First Approach:**
```typescript
// Sanitize sensitive data in logs
function sanitizeForLogging(data: any): any {
  const sensitive = ['password', 'ssn', 'creditCard', 'apiKey'];
  
  if (typeof data === 'string') {
    return data.length > 100 ? data.substring(0, 100) + '...' : data;
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeForLogging(sanitized[key]);
      }
    });
    
    return sanitized;
  }
  
  return data;
}

// Use in logging
logger.info('Processing request', sanitizeForLogging({ 
  userId, 
  query, 
  metadata 
}));
```

### Input Sanitization

**✅ Robust Input Validation:**
```typescript
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

function sanitizeInput(input: string): string {
  // Remove HTML
  const cleaned = DOMPurify.sanitize(input, { USE_PROFILES: { html: false } });
  
  // Validate length
  if (cleaned.length > 10000) {
    throw new Error('Input too long');
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /<script/i,
    /eval\(/i,
    /expression\(/i,
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(cleaned))) {
    throw new Error('Potentially malicious input detected');
  }
  
  return cleaned.trim();
}
```

## 📈 Scalability Patterns

### Resource Management

**✅ Efficient Resource Usage:**
```typescript
class ResourceManager {
  private connectionPool: Pool;
  private requestQueue: Queue;
  private activeRequests = 0;
  private readonly maxConcurrentRequests = 100;
  
  async processRequest(request: any): Promise<any> {
    // Queue requests if at capacity
    if (this.activeRequests >= this.maxConcurrentRequests) {
      await this.requestQueue.add(request);
      return;
    }
    
    this.activeRequests++;
    
    try {
      const result = await this.executeRequest(request);
      return result;
    } finally {
      this.activeRequests--;
      
      // Process next queued request
      if (!this.requestQueue.isEmpty()) {
        setImmediate(() => this.processRequest(this.requestQueue.next()));
      }
    }
  }
  
  private async executeRequest(request: any): Promise<any> {
    const connection = await this.connectionPool.connect();
    
    try {
      return await this.processWithConnection(connection, request);
    } finally {
      connection.release();
    }
  }
}
```

Following these best practices will help you build robust, secure, and scalable applications with the Agento framework. 