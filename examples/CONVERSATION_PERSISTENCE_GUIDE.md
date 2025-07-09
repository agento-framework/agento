# Conversation Persistence Guide for Agento Framework

## Overview

The Agento framework provides sophisticated conversation persistence capabilities that go beyond simple in-memory storage. This guide covers best practices for implementing persistent conversation storage with intelligent relevance querying.

## Key Features

### 🚀 Storage Abstraction
- **Multi-storage support**: PostgreSQL, MongoDB, Redis, hybrid solutions
- **Custom implementations**: Implement `ConversationStorage` interface for any storage system
- **Backward compatibility**: Works with existing in-memory approach

### 🧠 Intelligent Context Retrieval
- **Semantic search**: Vector embeddings for relevance-based retrieval
- **Hybrid strategies**: Combines recency, keywords, and semantic similarity
- **Context optimization**: Automatic token management and summarization

### 📊 Production-Ready Features
- **Session management**: Automatic session tracking and metadata
- **Data retention**: Configurable cleanup policies
- **Analytics support**: Cross-conversation search and insights

## Quick Start

```typescript
import { Agent } from "../src/core/agent.js";
import { InMemoryConversationStorage } from "./storage-implementations.js";

const storage = new InMemoryConversationStorage();

const agent = new Agent({
  // ... your states, contexts, tools
  conversationConfig: {
    storage,
    maxWorkingMemoryMessages: 50,
    enableSummarization: true,
    maxContextTokens: 8000,
    defaultRelevanceStrategy: "hybrid",
    enableEmbeddings: true,
  }
});

// Use with session persistence
const response = await agent.processQuery(
  "Help me with my order",
  "user123_session1" // Session ID
);
```

## Storage Implementations

### 1. In-Memory Storage
**Best for**: Development, testing, small applications

```typescript
const storage = new InMemoryConversationStorage();
```

**Pros**:
- Zero setup
- Fast access
- Good for development

**Cons**:
- Data lost on restart
- Memory usage grows over time
- No cross-instance sharing

### 2. PostgreSQL + Vector Search
**Best for**: Production applications, complex querying, ACID compliance

```typescript
const storage = new PostgreSQLConversationStorage(connectionString);
```

**Features**:
- Vector embeddings with pgvector
- Complex SQL queries
- ACID transactions
- Scalable storage

**Required Setup**:
```sql
-- Enable pgvector extension
CREATE EXTENSION vector;

-- Create tables
CREATE TABLE conversation_sessions (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR,
  summary TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversation_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL,
  content TEXT NOT NULL,
  state_key VARCHAR,
  tool_calls JSONB,
  tool_results JSONB,
  metadata JSONB,
  embedding vector(1536), -- OpenAI embedding dimension
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_messages_session_timestamp ON conversation_messages(session_id, timestamp DESC);
CREATE INDEX idx_messages_embedding ON conversation_messages USING ivfflat (embedding vector_cosine_ops);
```

### 3. MongoDB Storage
**Best for**: Flexible schema, document-based queries, horizontal scaling

```typescript
const storage = new MongoDBConversationStorage(connectionString);
```

**Features**:
- Flexible document structure
- Text search capabilities
- Horizontal scaling
- Rich aggregation queries

### 4. Hybrid Redis + PostgreSQL
**Best for**: High-performance recent access + persistent long-term storage

```typescript
const storage = new HybridConversationStorage(redisClient, postgresStorage);
```

**Architecture**:
- Recent messages cached in Redis (fast access)
- All messages persisted in PostgreSQL
- Automatic cache warming and invalidation

## Relevance Strategies

### Recent Strategy
Returns messages in chronological order (newest first).

```typescript
const history = await agent.getConversationHistory(sessionId, query, {
  relevanceStrategy: "recent",
  limit: 20
});
```

**Best for**:
- Short conversations
- When context order matters
- Real-time chat applications

### Semantic Strategy
Uses vector embeddings to find semantically similar messages.

```typescript
const history = await agent.getConversationHistory(sessionId, query, {
  relevanceStrategy: "semantic",
  minSimilarityScore: 0.7,
  limit: 15
});
```

**Best for**:
- Long conversations with topic changes
- Finding relevant context across time
- Knowledge-heavy interactions

### Keyword Strategy
Simple text-based keyword matching.

```typescript
const history = await agent.getConversationHistory(sessionId, query, {
  relevanceStrategy: "keyword",
  keywords: ["order", "shipping", "return"],
  limit: 10
});
```

**Best for**:
- Specific term matching
- When embeddings aren't available
- Fast, lightweight queries

### Hybrid Strategy (Recommended)
Combines multiple approaches for optimal results.

```typescript
const history = await agent.getConversationHistory(sessionId, query, {
  relevanceStrategy: "hybrid",
  recentMinutes: 60, // Prioritize last hour
  limit: 20
});
```

**Algorithm**:
1. Recent messages (high priority)
2. Semantic similarity (medium priority)
3. Keyword matches (low priority)
4. Automatic fallback strategies

## Context Optimization

### Token Management
The framework automatically optimizes context to fit token limits:

```typescript
{
  maxContextTokens: 8000, // Target token limit
  maxWorkingMemoryMessages: 100, // Cache size
}
```

**Strategies Applied**:
1. **Recent first**: Use most recent messages
2. **Semantic relevance**: Filter by similarity
3. **Conversation summary**: Use AI-generated summaries
4. **Fallback**: Minimum required context

### Automatic Summarization
Long conversations are automatically summarized:

```typescript
{
  enableSummarization: true,
}

// Manual summarization
const summary = await agent.summarizeSession(sessionId);
```

**Summary Content**:
- Key topics discussed
- Important decisions or outcomes
- User preferences mentioned
- Relevant context for future interactions

## Production Best Practices

### 1. Session Management
Use meaningful session IDs with user context:

```typescript
const sessionId = `${userId}_${new Date().toISOString().split('T')[0]}`;
```

### 2. Metadata Enrichment
Store rich metadata for analytics:

```typescript
const metadata = {
  userId,
  timestamp: new Date().toISOString(),
  channel: "web", // web, mobile, api
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip,
  locale: "en-US",
};
```

### 3. Privacy and Compliance
Implement data retention policies:

```typescript
// Clean up old conversations (GDPR compliance)
const deletedCount = await agent.cleanupConversations(90); // 90 days

// Export user data
const userData = await agent.exportConversationData(sessionId);
```

### 4. Performance Monitoring
Track key metrics:

```typescript
const metrics = {
  responseTime: Date.now() - startTime,
  contextStrategy: result.contextStrategy, // "recent", "semantic", "summarized"
  messagesRetrieved: history.messages.length,
  tokensUsed: estimateTokens(context),
};
```

### 5. Error Handling
Graceful degradation for storage failures:

```typescript
try {
  const response = await agent.processQuery(query, sessionId);
} catch (error) {
  if (error.message.includes('storage')) {
    // Fallback to in-memory processing
    const response = await agent.processQueryLegacy(query, conversationHistory);
  }
}
```

## Scaling Considerations

### Database Performance
- **Indexing**: Create indexes on session_id, timestamp, and embedding columns
- **Partitioning**: Partition by date for time-series data
- **Connection pooling**: Use connection pools for high throughput
- **Read replicas**: Use read replicas for analytics queries

### Caching Strategy
- **Redis**: Cache recent conversations and frequent queries
- **Application cache**: Cache session summaries and user preferences
- **CDN**: Cache static contexts and tool definitions

### Horizontal Scaling
- **Microservices**: Separate conversation service from agent logic
- **Message queues**: Use queues for async summarization and cleanup
- **Sharding**: Shard by user ID or geographic region

## Analytics and Insights

### Cross-Conversation Search
Find patterns across all user conversations:

```typescript
const insights = await agent.searchConversations(
  "billing issues",
  userId,
  50 // limit
);
```

### Conversation Analytics
Track conversation quality and topics:

```typescript
const analytics = {
  averageSessionLength: history.messages.length / 2, // user + assistant pairs
  topicDistribution: groupBy(history.messages, 'stateKey'),
  userSatisfaction: extractSentiment(history.messages),
  resolutionRate: calculateResolutionRate(history.messages),
};
```

### Usage Patterns
Monitor system usage for optimization:

```typescript
const patterns = {
  peakHours: analyzeTimestamps(conversations),
  commonTopics: extractTopics(conversations),
  averageResponseTime: calculateAverageResponseTime(conversations),
  contextEfficiency: analyzeContextStrategies(conversations),
};
```

## Security Considerations

### Data Encryption
- **At rest**: Encrypt sensitive conversation data
- **In transit**: Use TLS for all API communications
- **Field-level**: Encrypt PII fields specifically

### Access Control
- **User isolation**: Ensure users can only access their conversations
- **Role-based access**: Implement admin, user, and service roles
- **Audit logging**: Log all data access and modifications

### Data Minimization
- **PII detection**: Automatically detect and redact sensitive information
- **Retention policies**: Delete data after retention period
- **Anonymization**: Convert old data to anonymous analytics

## Migration Guide

### From In-Memory to Persistent Storage

1. **Install storage dependencies**:
```bash
npm install pg pgvector  # PostgreSQL
# or
npm install mongodb      # MongoDB
```

2. **Implement storage interface**:
```typescript
class YourStorage implements ConversationStorage {
  // Implement required methods
}
```

3. **Update agent configuration**:
```typescript
const agent = new Agent({
  // ... existing config
  conversationConfig: {
    storage: new YourStorage(),
    // ... other options
  }
});
```

4. **Migrate existing conversations** (if needed):
```typescript
const existingConversations = await getExistingConversations();
for (const conversation of existingConversations) {
  await storage.storeMessage(conversation);
}
```

### Backward Compatibility
The framework maintains backward compatibility:

```typescript
// Old approach (still works)
const response = await agent.processQueryLegacy(
  query,
  conversationHistory,
  metadata
);

// New approach with persistence
const response = await agent.processQuery(
  query,
  sessionId,
  [], // conversationHistory optional when using persistence
  metadata
);
```

## Troubleshooting

### Common Issues

**Storage Connection Failures**:
```typescript
if (!agent.isPersistenceEnabled()) {
  console.warn("Persistence not available, using in-memory fallback");
}
```

**Context Too Large**:
```typescript
// Reduce context tokens or enable summarization
{
  maxContextTokens: 4000, // Reduce from 8000
  enableSummarization: true,
}
```

**Slow Queries**:
- Check database indexes
- Monitor embedding generation time
- Consider caching strategies

**Memory Usage**:
- Reduce `maxWorkingMemoryMessages`
- Implement cleanup policies
- Monitor garbage collection

### Performance Tuning

**Vector Search Optimization**:
```sql
-- Tune vector index parameters
CREATE INDEX CONCURRENTLY idx_embedding_ivfflat 
ON conversation_messages 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100); -- Adjust based on data size
```

**Query Optimization**:
```typescript
// Use appropriate relevance strategy
const strategy = messageCount > 100 ? "semantic" : "recent";
```

## Conclusion

The Agento framework's conversation persistence system provides production-ready capabilities for building sophisticated AI agents. By choosing the right storage implementation and relevance strategy for your use case, you can build agents that maintain context across long conversations while scaling to serve thousands of users.

Key takeaways:
- Start with in-memory storage for development
- Use PostgreSQL + vectors for production
- Implement hybrid relevance strategies
- Monitor performance and optimize based on usage patterns
- Plan for data privacy and retention compliance

For more examples and implementation details, see the `examples/` directory. 