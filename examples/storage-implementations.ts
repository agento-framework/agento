import type {
  ConversationStorage,
  StoredMessage,
  ConversationSession,
  ConversationQueryOptions,
  ConversationQueryResult,
} from "../src/types.js";

/**
 * In-Memory Storage Implementation
 * Good for: Development, testing, small applications
 */
export class InMemoryConversationStorage implements ConversationStorage {
  private messages: Map<string, StoredMessage[]> = new Map();
  private sessions: Map<string, ConversationSession> = new Map();
  private messageIdCounter = 0;

  async storeMessage(message: Omit<StoredMessage, "id" | "timestamp">): Promise<StoredMessage> {
    const storedMessage: StoredMessage = {
      ...message,
      id: `msg_${++this.messageIdCounter}`,
      timestamp: new Date(),
    };

    const sessionMessages = this.messages.get(message.sessionId) || [];
    sessionMessages.push(storedMessage);
    this.messages.set(message.sessionId, sessionMessages);

    return storedMessage;
  }

  async getConversationHistory(options: ConversationQueryOptions): Promise<ConversationQueryResult> {
    const messages = this.messages.get(options.sessionId) || [];
    let filteredMessages = [...messages];

    // Apply filters
    if (options.roles) {
      filteredMessages = filteredMessages.filter(msg => options.roles!.includes(msg.role));
    }

    if (options.stateKeys) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.stateKey && options.stateKeys!.includes(msg.stateKey)
      );
    }

    if (options.recentMinutes) {
      const cutoff = new Date(Date.now() - options.recentMinutes * 60 * 1000);
      filteredMessages = filteredMessages.filter(msg => msg.timestamp >= cutoff);
    }

    // Apply relevance strategy
    if (options.relevanceStrategy === "recent") {
      filteredMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } else if (options.relevanceStrategy === "keyword" && options.keywords) {
      const keywords = options.keywords.map(k => k.toLowerCase());
      filteredMessages = filteredMessages.filter(msg =>
        keywords.some(keyword => msg.content.toLowerCase().includes(keyword))
      );
    }

    // Apply limit
    const limit = options.limit || filteredMessages.length;
    const resultMessages = filteredMessages.slice(0, limit);

    const session = this.sessions.get(options.sessionId);

    return {
      messages: resultMessages,
      totalMessages: messages.length,
      sessionSummary: session?.summary,
      truncated: resultMessages.length < filteredMessages.length,
    };
  }

  async upsertSession(session: Omit<ConversationSession, "createdAt" | "lastActivityAt">): Promise<ConversationSession> {
    const existing = this.sessions.get(session.id);
    const now = new Date();

    const updatedSession: ConversationSession = {
      ...session,
      createdAt: existing?.createdAt || now,
      lastActivityAt: now,
    };

    this.sessions.set(session.id, updatedSession);
    return updatedSession;
  }

  async getSession(sessionId: string): Promise<ConversationSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async updateSessionSummary(sessionId: string, summary: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.summary = summary;
      this.sessions.set(sessionId, session);
    }
  }

  async cleanup(retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivityAt < cutoff) {
        this.sessions.delete(sessionId);
        this.messages.delete(sessionId);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

/**
 * PostgreSQL Storage Implementation with Vector Search
 * Good for: Production applications, complex querying, ACID compliance
 * Requires: pg, pgvector extension
 */
export class PostgreSQLConversationStorage implements ConversationStorage {
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async storeMessage(message: Omit<StoredMessage, "id" | "timestamp">): Promise<StoredMessage> {
    // This is a conceptual implementation - you'd need actual pg client
    const query = `
      INSERT INTO conversation_messages 
      (session_id, role, content, state_key, tool_calls, tool_results, metadata, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, timestamp
    `;

    // Generate embedding if content exists
    const embedding = await this.generateEmbedding?.(message.content);

    const values = [
      message.sessionId,
      message.role,
      message.content,
      message.stateKey,
      JSON.stringify(message.toolCalls),
      JSON.stringify(message.toolResults),
      JSON.stringify(message.metadata),
      embedding ? `[${embedding.join(',')}]` : null
    ];

    // Mock result - in real implementation, execute query
    const result = {
      id: `msg_${Date.now()}`,
      timestamp: new Date(),
    };

    return {
      ...message,
      id: result.id,
      timestamp: result.timestamp,
      embedding,
    };
  }

  async getConversationHistory(options: ConversationQueryOptions): Promise<ConversationQueryResult> {
    let query = `
      SELECT m.*, s.summary as session_summary
      FROM conversation_messages m
      LEFT JOIN conversation_sessions s ON m.session_id = s.id
      WHERE m.session_id = $1
    `;

    const values: any[] = [options.sessionId];
    let paramIndex = 2;

    // Add filters
    if (options.roles) {
      query += ` AND m.role = ANY($${paramIndex})`;
      values.push(options.roles);
      paramIndex++;
    }

    if (options.stateKeys) {
      query += ` AND m.state_key = ANY($${paramIndex})`;
      values.push(options.stateKeys);
      paramIndex++;
    }

    if (options.recentMinutes) {
      query += ` AND m.timestamp >= NOW() - INTERVAL '${options.recentMinutes} minutes'`;
    }

    // Semantic search using pgvector
    if (options.relevanceStrategy === "semantic" && options.currentQuery) {
      const queryEmbedding = await this.generateEmbedding?.(options.currentQuery);
      if (queryEmbedding) {
        query += ` ORDER BY m.embedding <-> $${paramIndex}`;
        values.push(`[${queryEmbedding.join(',')}]`);
        paramIndex++;

        if (options.minSimilarityScore) {
          // Convert similarity to distance threshold
          const distanceThreshold = 1 - options.minSimilarityScore;
          query += ` AND (m.embedding <-> $${paramIndex - 1}) < ${distanceThreshold}`;
        }
      }
    } else {
      query += ` ORDER BY m.timestamp DESC`;
    }

    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    // Mock result - in real implementation, execute query
    const mockMessages: StoredMessage[] = [];
    
    return {
      messages: mockMessages,
      totalMessages: 0,
      sessionSummary: undefined,
      truncated: false,
    };
  }

  async upsertSession(session: Omit<ConversationSession, "createdAt" | "lastActivityAt">): Promise<ConversationSession> {
    const query = `
      INSERT INTO conversation_sessions (id, user_id, metadata)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        metadata = EXCLUDED.metadata,
        last_activity_at = NOW()
      RETURNING *
    `;

    // Mock implementation
    return {
      ...session,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };
  }

  async getSession(sessionId: string): Promise<ConversationSession | null> {
    const query = `SELECT * FROM conversation_sessions WHERE id = $1`;
    // Mock implementation
    return null;
  }

  async updateSessionSummary(sessionId: string, summary: string): Promise<void> {
    const query = `UPDATE conversation_sessions SET summary = $1 WHERE id = $2`;
    // Mock implementation
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Integration with OpenAI embeddings API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  }

  async searchAcrossSessions(query: string, userId?: string, limit = 20): Promise<StoredMessage[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    let sql = `
      SELECT m.* FROM conversation_messages m
      JOIN conversation_sessions s ON m.session_id = s.id
      WHERE 1=1
    `;

    if (userId) {
      sql += ` AND s.user_id = $1`;
    }

    sql += `
      ORDER BY m.embedding <-> $${userId ? 2 : 1}
      LIMIT ${limit}
    `;

    // Mock implementation
    return [];
  }

  async cleanup(retentionDays: number): Promise<number> {
    const query = `
      DELETE FROM conversation_sessions 
      WHERE last_activity_at < NOW() - INTERVAL '${retentionDays} days'
    `;
    // Mock implementation
    return 0;
  }
}

/**
 * MongoDB Storage Implementation
 * Good for: Flexible schema, document-based queries, horizontal scaling
 */
export class MongoDBConversationStorage implements ConversationStorage {
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async storeMessage(message: Omit<StoredMessage, "id" | "timestamp">): Promise<StoredMessage> {
    // Mock MongoDB implementation
    const storedMessage: StoredMessage = {
      ...message,
      id: new Date().getTime().toString(),
      timestamp: new Date(),
    };

    // In real implementation:
    // await this.collection.insertOne(storedMessage);
    
    return storedMessage;
  }

  async getConversationHistory(options: ConversationQueryOptions): Promise<ConversationQueryResult> {
    // Build MongoDB aggregation pipeline
    const pipeline: any[] = [
      { $match: { sessionId: options.sessionId } }
    ];

    // Add filters
    if (options.roles) {
      pipeline.push({ $match: { role: { $in: options.roles } } });
    }

    if (options.recentMinutes) {
      const cutoff = new Date(Date.now() - options.recentMinutes * 60 * 1000);
      pipeline.push({ $match: { timestamp: { $gte: cutoff } } });
    }

    // Keyword search using text index
    if (options.relevanceStrategy === "keyword" && options.keywords) {
      pipeline.push({
        $match: {
          $text: { $search: options.keywords.join(" ") }
        }
      });
      pipeline.push({
        $addFields: { score: { $meta: "textScore" } }
      });
      pipeline.push({ $sort: { score: { $meta: "textScore" } } });
    } else {
      pipeline.push({ $sort: { timestamp: -1 } });
    }

    if (options.limit) {
      pipeline.push({ $limit: options.limit });
    }

    // Mock result
    return {
      messages: [],
      totalMessages: 0,
      truncated: false,
    };
  }

  async upsertSession(session: Omit<ConversationSession, "createdAt" | "lastActivityAt">): Promise<ConversationSession> {
    const now = new Date();
    const updatedSession: ConversationSession = {
      ...session,
      createdAt: now,
      lastActivityAt: now,
    };

    // Mock implementation:
    // await this.sessionsCollection.replaceOne(
    //   { id: session.id },
    //   updatedSession,
    //   { upsert: true }
    // );

    return updatedSession;
  }

  async getSession(sessionId: string): Promise<ConversationSession | null> {
    // Mock implementation
    return null;
  }

  async updateSessionSummary(sessionId: string, summary: string): Promise<void> {
    // Mock implementation
  }

  async cleanup(retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    // Mock implementation:
    // const result = await this.sessionsCollection.deleteMany({
    //   lastActivityAt: { $lt: cutoff }
    // });
    
    return 0;
  }
}

/**
 * Redis + PostgreSQL Hybrid Storage
 * Good for: High-performance recent access + persistent long-term storage
 */
export class HybridConversationStorage implements ConversationStorage {
  private redis: any; // Redis client
  private postgres: PostgreSQLConversationStorage;
  private recentCacheMinutes: number;

  constructor(redisClient: any, postgresStorage: PostgreSQLConversationStorage, recentCacheMinutes = 60) {
    this.redis = redisClient;
    this.postgres = postgresStorage;
    this.recentCacheMinutes = recentCacheMinutes;
  }

  async storeMessage(message: Omit<StoredMessage, "id" | "timestamp">): Promise<StoredMessage> {
    // Store in PostgreSQL for persistence
    const storedMessage = await this.postgres.storeMessage(message);
    
    // Cache recent messages in Redis
    const cacheKey = `session:${message.sessionId}:recent`;
    await this.redis.lpush(cacheKey, JSON.stringify(storedMessage));
    await this.redis.expire(cacheKey, this.recentCacheMinutes * 60);
    
    // Keep only last 50 messages in Redis
    await this.redis.ltrim(cacheKey, 0, 49);
    
    return storedMessage;
  }

  async getConversationHistory(options: ConversationQueryOptions): Promise<ConversationQueryResult> {
    // For recent queries, try Redis first
    if (options.relevanceStrategy === "recent" && options.recentMinutes && 
        options.recentMinutes <= this.recentCacheMinutes) {
      
      const cacheKey = `session:${options.sessionId}:recent`;
      const cachedMessages = await this.redis.lrange(cacheKey, 0, (options.limit || 50) - 1);
      
      if (cachedMessages.length > 0) {
        const messages = cachedMessages.map((msg: string) => JSON.parse(msg));
        return {
          messages,
          totalMessages: messages.length,
          truncated: false,
        };
      }
    }
    
    // Fallback to PostgreSQL for complex queries
    return this.postgres.getConversationHistory(options);
  }

  async upsertSession(session: Omit<ConversationSession, "createdAt" | "lastActivityAt">): Promise<ConversationSession> {
    return this.postgres.upsertSession(session);
  }

  async getSession(sessionId: string): Promise<ConversationSession | null> {
    return this.postgres.getSession(sessionId);
  }

  async updateSessionSummary(sessionId: string, summary: string): Promise<void> {
    return this.postgres.updateSessionSummary(sessionId, summary);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.postgres.generateEmbedding!(text);
  }

  async searchAcrossSessions(query: string, userId?: string, limit = 20): Promise<StoredMessage[]> {
    return this.postgres.searchAcrossSessions!(query, userId, limit);
  }

  async cleanup(retentionDays: number): Promise<number> {
    return this.postgres.cleanup!(retentionDays);
  }
} 