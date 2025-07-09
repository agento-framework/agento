/**
 * Vector Database Adapters for Popular Vector Databases
 * Provides plug-and-play implementations for different vector database providers
 */

import type { VectorStorage, VectorEmbedding, VectorSearchResult, VectorSearchOptions } from './vector-storage';

/**
 * Pinecone Vector Database Adapter
 */
export class PineconeVectorStorage implements VectorStorage {
  private apiKey: string;
  private environment: string;
  private indexName: string;
  private baseUrl: string;

  constructor(config: {
    apiKey: string;
    environment: string;
    indexName: string;
  }) {
    this.apiKey = config.apiKey;
    this.environment = config.environment;
    this.indexName = config.indexName;
    this.baseUrl = `https://${config.indexName}-${config.environment}.svc.pinecone.io`;
  }

  async store(embedding: Omit<VectorEmbedding, 'timestamp'>): Promise<string> {
    const response = await fetch(`${this.baseUrl}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vectors: [{
          id: embedding.id,
          values: embedding.vector,
          metadata: {
            ...embedding.metadata,
            content: embedding.content,
            timestamp: new Date().toISOString()
          }
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Pinecone store failed: ${response.statusText}`);
    }

    return embedding.id;
  }

  async storeBatch(embeddings: Array<Omit<VectorEmbedding, 'timestamp'>>): Promise<string[]> {
    const vectors = embeddings.map(embedding => ({
      id: embedding.id,
      values: embedding.vector,
      metadata: {
        ...embedding.metadata,
        content: embedding.content,
        timestamp: new Date().toISOString()
      }
    }));

    const response = await fetch(`${this.baseUrl}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ vectors })
    });

    if (!response.ok) {
      throw new Error(`Pinecone batch store failed: ${response.statusText}`);
    }

    return embeddings.map(e => e.id);
  }

  async search(queryVector: number[], options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const {
      limit = 10,
      filter = {},
      includeMetadata = true
    } = options;

    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: {
        'Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector: queryVector,
        topK: limit,
        includeMetadata,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      })
    });

    if (!response.ok) {
      throw new Error(`Pinecone search failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.matches.map((match: any) => ({
      id: match.id,
      content: match.metadata?.content || '',
      metadata: match.metadata || {},
      similarity: match.score
    }));
  }

  async searchByText(queryText: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    throw new Error('Pinecone searchByText requires embedding provider - use search() with pre-generated vector');
  }

  async getById(id: string): Promise<VectorEmbedding | null> {
    const response = await fetch(`${this.baseUrl}/vectors/fetch?ids=${id}`, {
      headers: {
        'Api-Key': this.apiKey
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const vector = data.vectors[id];
    
    if (!vector) return null;

    return {
      id,
      vector: vector.values,
      content: vector.metadata?.content || '',
      metadata: vector.metadata || {},
      timestamp: new Date(vector.metadata?.timestamp || Date.now())
    };
  }

  async updateMetadata(id: string, metadata: Record<string, any>): Promise<boolean> {
    // Pinecone requires full vector upsert to update metadata
    const existing = await this.getById(id);
    if (!existing) return false;

    return this.store({
      id,
      vector: existing.vector,
      content: existing.content,
      metadata: { ...existing.metadata, ...metadata }
    }).then(() => true).catch(() => false);
  }

  async delete(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/vectors/delete`, {
      method: 'POST',
      headers: {
        'Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ids: [id]
      })
    });

    return response.ok;
  }

  async deleteBatch(ids: string[]): Promise<boolean[]> {
    const response = await fetch(`${this.baseUrl}/vectors/delete`, {
      method: 'POST',
      headers: {
        'Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ids
      })
    });

    if (response.ok) {
      return ids.map(() => true);
    } else {
      return ids.map(() => false);
    }
  }

  async getStats(): Promise<{
    totalCount: number;
    dimensions: number;
    lastUpdated?: Date;
  }> {
    const response = await fetch(`${this.baseUrl}/describe_index_stats`, {
      headers: {
        'Api-Key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Pinecone stats failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      totalCount: data.totalVectorCount || 0,
      dimensions: data.dimension || 0
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/describe_index_stats`, {
        headers: {
          'Api-Key': this.apiKey
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Weaviate Vector Database Adapter
 */
export class WeaviateVectorStorage implements VectorStorage {
  private baseUrl: string;
  private apiKey?: string;
  private className: string;

  constructor(config: {
    baseUrl: string;
    apiKey?: string;
    className: string;
  }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.className = config.className;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  async store(embedding: Omit<VectorEmbedding, 'timestamp'>): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/objects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        class: this.className,
        id: embedding.id,
        vector: embedding.vector,
        properties: {
          content: embedding.content,
          metadata: JSON.stringify(embedding.metadata),
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Weaviate store failed: ${response.statusText}`);
    }

    return embedding.id;
  }

  async storeBatch(embeddings: Array<Omit<VectorEmbedding, 'timestamp'>>): Promise<string[]> {
    const objects = embeddings.map(embedding => ({
      class: this.className,
      id: embedding.id,
      vector: embedding.vector,
      properties: {
        content: embedding.content,
        metadata: JSON.stringify(embedding.metadata),
        timestamp: new Date().toISOString()
      }
    }));

    const response = await fetch(`${this.baseUrl}/v1/batch/objects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        objects
      })
    });

    if (!response.ok) {
      throw new Error(`Weaviate batch store failed: ${response.statusText}`);
    }

    return embeddings.map(e => e.id);
  }

  async search(queryVector: number[], options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const {
      limit = 10,
      minSimilarity = 0.0,
      filter = {}
    } = options;

    let whereClause = {};
    if (Object.keys(filter).length > 0) {
      const conditions = Object.entries(filter).map(([key, value]) => ({
        path: [`metadata.${key}`],
        operator: 'Equal',
        valueString: String(value)
      }));
      
      whereClause = conditions.length === 1 ? conditions[0] : {
        operator: 'And',
        operands: conditions
      };
    }

    const response = await fetch(`${this.baseUrl}/v1/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: `
          {
            Get {
              ${this.className}(
                nearVector: {
                  vector: [${queryVector.join(', ')}]
                  certainty: ${minSimilarity}
                }
                limit: ${limit}
                ${Object.keys(whereClause).length > 0 ? `where: ${JSON.stringify(whereClause)}` : ''}
              ) {
                content
                metadata
                _additional {
                  id
                  certainty
                  distance
                }
              }
            }
          }
        `
      })
    });

    if (!response.ok) {
      throw new Error(`Weaviate search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const results = data.data?.Get?.[this.className] || [];

    return results.map((result: any) => ({
      id: result._additional.id,
      content: result.content,
      metadata: result.metadata ? JSON.parse(result.metadata) : {},
      similarity: result._additional.certainty,
      distance: result._additional.distance
    }));
  }

  async searchByText(queryText: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    throw new Error('Weaviate searchByText requires embedding provider - use search() with pre-generated vector');
  }

  async getById(id: string): Promise<VectorEmbedding | null> {
    const response = await fetch(`${this.baseUrl}/v1/objects/${id}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    return {
      id: data.id,
      vector: data.vector || [],
      content: data.properties?.content || '',
      metadata: data.properties?.metadata ? JSON.parse(data.properties.metadata) : {},
      timestamp: new Date(data.properties?.timestamp || Date.now())
    };
  }

  async updateMetadata(id: string, metadata: Record<string, any>): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    const response = await fetch(`${this.baseUrl}/v1/objects/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        class: this.className,
        properties: {
          content: existing.content,
          metadata: JSON.stringify({ ...existing.metadata, ...metadata }),
          timestamp: existing.timestamp.toISOString()
        }
      })
    });

    return response.ok;
  }

  async delete(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/v1/objects/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    return response.ok;
  }

  async deleteBatch(ids: string[]): Promise<boolean[]> {
    const results = await Promise.all(
      ids.map(id => this.delete(id))
    );
    return results;
  }

  async getStats(): Promise<{
    totalCount: number;
    dimensions: number;
    lastUpdated?: Date;
  }> {
    const response = await fetch(`${this.baseUrl}/v1/meta`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Weaviate stats failed: ${response.statusText}`);
    }

    // Weaviate meta doesn't provide direct count, so we'll estimate
    return {
      totalCount: 0, // Would need separate query to get actual count
      dimensions: 0   // Would need schema inspection
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/meta`, {
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Chroma Vector Database Adapter
 */
export class ChromaVectorStorage implements VectorStorage {
  private baseUrl: string;
  private collectionName: string;
  private apiKey?: string;

  constructor(config: {
    baseUrl: string;
    collectionName: string;
    apiKey?: string;
  }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.collectionName = config.collectionName;
    this.apiKey = config.apiKey;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  async store(embedding: Omit<VectorEmbedding, 'timestamp'>): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}/add`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ids: [embedding.id],
        embeddings: [embedding.vector],
        documents: [embedding.content],
        metadatas: [{
          ...embedding.metadata,
          timestamp: new Date().toISOString()
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Chroma store failed: ${response.statusText}`);
    }

    return embedding.id;
  }

  async storeBatch(embeddings: Array<Omit<VectorEmbedding, 'timestamp'>>): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}/add`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ids: embeddings.map(e => e.id),
        embeddings: embeddings.map(e => e.vector),
        documents: embeddings.map(e => e.content),
        metadatas: embeddings.map(e => ({
          ...e.metadata,
          timestamp: new Date().toISOString()
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Chroma batch store failed: ${response.statusText}`);
    }

    return embeddings.map(e => e.id);
  }

  async search(queryVector: number[], options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const {
      limit = 10,
      filter = {}
    } = options;

    const response = await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}/query`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query_embeddings: [queryVector],
        n_results: limit,
        where: Object.keys(filter).length > 0 ? filter : undefined,
        include: ['documents', 'metadatas', 'distances']
      })
    });

    if (!response.ok) {
      throw new Error(`Chroma search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const results = data.ids[0] || [];

    return results.map((id: string, index: number) => ({
      id,
      content: data.documents[0][index] || '',
      metadata: data.metadatas[0][index] || {},
      similarity: 1 - (data.distances[0][index] || 1), // Convert distance to similarity
      distance: data.distances[0][index]
    }));
  }

  async searchByText(queryText: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    throw new Error('Chroma searchByText requires embedding provider - use search() with pre-generated vector');
  }

  async getById(id: string): Promise<VectorEmbedding | null> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}/get`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ids: [id],
        include: ['documents', 'metadatas', 'embeddings']
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.ids || data.ids.length === 0) {
      return null;
    }

    return {
      id: data.ids[0],
      vector: data.embeddings ? data.embeddings[0] : [],
      content: data.documents ? data.documents[0] : '',
      metadata: data.metadatas ? data.metadatas[0] : {},
      timestamp: new Date(data.metadatas?.[0]?.timestamp || Date.now())
    };
  }

  async updateMetadata(id: string, metadata: Record<string, any>): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    // Chroma requires upsert for updates
    return this.store({
      id,
      vector: existing.vector,
      content: existing.content,
      metadata: { ...existing.metadata, ...metadata }
    }).then(() => true).catch(() => false);
  }

  async delete(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}/delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ids: [id]
      })
    });

    return response.ok;
  }

  async deleteBatch(ids: string[]): Promise<boolean[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}/delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ids
      })
    });

    if (response.ok) {
      return ids.map(() => true);
    } else {
      return ids.map(() => false);
    }
  }

  async getStats(): Promise<{
    totalCount: number;
    dimensions: number;
    lastUpdated?: Date;
  }> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Chroma stats failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      totalCount: data.count || 0,
      dimensions: data.dimension || 0
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/heartbeat`, {
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Factory for creating vector database adapters
 */
export class VectorAdapterFactory {
  static createPinecone(config: {
    apiKey: string;
    environment: string;
    indexName: string;
  }): VectorStorage {
    return new PineconeVectorStorage(config);
  }

  static createWeaviate(config: {
    baseUrl: string;
    apiKey?: string;
    className: string;
  }): VectorStorage {
    return new WeaviateVectorStorage(config);
  }

  static createChroma(config: {
    baseUrl: string;
    collectionName: string;
    apiKey?: string;
  }): VectorStorage {
    return new ChromaVectorStorage(config);
  }
} 