/**
 * Vector Storage Abstraction for Agento Framework
 * Provides interfaces and base implementations for vector databases
 */

export interface VectorEmbedding {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
  content: string;
  timestamp: Date;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  distance?: number;
}

export interface VectorSearchOptions {
  limit?: number;
  minSimilarity?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeVectors?: boolean;
}

export interface EmbeddingProvider {
  /**
   * Generate embeddings for text content
   */
  generateEmbedding(text: string): Promise<number[]>;
  
  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  
  /**
   * Get the dimension of embeddings produced by this provider
   */
  getDimension(): number;
  
  /**
   * Get the model name/identifier
   */
  getModelName(): string;
}

export interface VectorStorage {
  /**
   * Store a single vector embedding
   */
  store(embedding: Omit<VectorEmbedding, 'timestamp'>): Promise<string>;
  
  /**
   * Store multiple vector embeddings (batch operation)
   */
  storeBatch(embeddings: Array<Omit<VectorEmbedding, 'timestamp'>>): Promise<string[]>;
  
  /**
   * Search for similar vectors
   */
  search(
    queryVector: number[],
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]>;
  
  /**
   * Search using text query (will generate embedding internally)
   */
  searchByText(
    queryText: string,
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]>;
  
  /**
   * Get embedding by ID
   */
  getById(id: string): Promise<VectorEmbedding | null>;
  
  /**
   * Update embedding metadata
   */
  updateMetadata(id: string, metadata: Record<string, any>): Promise<boolean>;
  
  /**
   * Delete embedding by ID
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Delete multiple embeddings
   */
  deleteBatch(ids: string[]): Promise<boolean[]>;
  
  /**
   * Get collection/namespace statistics
   */
  getStats(): Promise<{
    totalCount: number;
    dimensions: number;
    avgSimilarity?: number;
    lastUpdated?: Date;
  }>;
  
  /**
   * Create index if needed (for databases that require explicit indexing)
   */
  createIndex?(indexConfig?: Record<string, any>): Promise<boolean>;
  
  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Base embedding provider implementations
 */

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimension: number;

  constructor(apiKey: string, model: string = 'text-embedding-3-small') {
    this.apiKey = apiKey;
    this.model = model;
    this.dimension = model.includes('3-large') ? 3072 : 1536;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: this.model
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: texts,
        model: this.model
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI batch embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.model;
  }
}

export class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimension: number;

  constructor(apiKey: string, model: string = 'sentence-transformers/all-MiniLM-L6-v2') {
    this.apiKey = apiKey;
    this.model = model;
    this.dimension = 384; // Default for all-MiniLM-L6-v2
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text
      })
    });

    if (!response.ok) {
      throw new Error(`HuggingFace embedding failed: ${response.statusText}`);
    }

    const embedding = await response.json();
    return Array.isArray(embedding[0]) ? embedding[0] : embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      texts.map(text => this.generateEmbedding(text))
    );
    return embeddings;
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.model;
  }
}

export class JinaEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimension: number;
  private baseUrl: string;

  constructor(apiKey: string, model: string = 'jina-embeddings-v2-base-en') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://api.jina.ai/v1/embeddings';
    
    // Set dimensions based on model
    this.dimension = this.getModelDimension(model);
  }

  private getModelDimension(model: string): number {
    const dimensionMap: Record<string, number> = {
      'jina-embeddings-v2-base-en': 768,
      'jina-embeddings-v2-small-en': 512,
      'jina-embeddings-v3': 1024,
      'jina-clip-v1': 768
    };
    
    return dimensionMap[model] || 768; // Default to 768
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        input: [text],
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      throw new Error(`Jina embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Jina supports batch processing
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      throw new Error(`Jina batch embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.model;
  }
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private baseUrl: string;
  private model: string;
  private dimension: number;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'nomic-embed-text') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.dimension = this.getModelDimension(model);
  }

  private getModelDimension(model: string): number {
    const dimensionMap: Record<string, number> = {
      'nomic-embed-text': 768,
      'all-minilm': 384,
      'mxbai-embed-large': 1024,
      'snowflake-arctic-embed': 1024,
      'bge-large': 1024,
      'bge-base': 768,
      'bge-small': 384
    };
    
    return dimensionMap[model] || 768; // Default to 768
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Ollama doesn't support batch processing, so we'll do sequential requests
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

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch {
      return [];
    }
  }
}

/**
 * Base vector storage implementations
 */

export class InMemoryVectorStorage implements VectorStorage {
  private vectors: Map<string, VectorEmbedding> = new Map();
  private embeddingProvider: EmbeddingProvider;

  constructor(embeddingProvider: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider;
  }

  async store(embedding: Omit<VectorEmbedding, 'timestamp'>): Promise<string> {
    const fullEmbedding: VectorEmbedding = {
      ...embedding,
      timestamp: new Date()
    };
    
    this.vectors.set(embedding.id, fullEmbedding);
    return embedding.id;
  }

  async storeBatch(embeddings: Array<Omit<VectorEmbedding, 'timestamp'>>): Promise<string[]> {
    const ids: string[] = [];
    for (const embedding of embeddings) {
      const id = await this.store(embedding);
      ids.push(id);
    }
    return ids;
  }

  async search(queryVector: number[], options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const {
      limit = 10,
      minSimilarity = 0.0,
      filter = {},
      includeMetadata = true
    } = options;

    const results: VectorSearchResult[] = [];

    for (const [id, embedding] of this.vectors) {
      // Apply metadata filters
      if (Object.keys(filter).length > 0) {
        const matchesFilter = Object.entries(filter).every(([key, value]) => 
          embedding.metadata[key] === value
        );
        if (!matchesFilter) continue;
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryVector, embedding.vector);
      
      if (similarity >= minSimilarity) {
        results.push({
          id,
          content: embedding.content,
          metadata: includeMetadata ? embedding.metadata : {},
          similarity
        });
      }
    }

    // Sort by similarity (highest first) and limit
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async searchByText(queryText: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const queryVector = await this.embeddingProvider.generateEmbedding(queryText);
    return this.search(queryVector, options);
  }

  async getById(id: string): Promise<VectorEmbedding | null> {
    return this.vectors.get(id) || null;
  }

  async updateMetadata(id: string, metadata: Record<string, any>): Promise<boolean> {
    const embedding = this.vectors.get(id);
    if (!embedding) return false;
    
    embedding.metadata = { ...embedding.metadata, ...metadata };
    this.vectors.set(id, embedding);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    return this.vectors.delete(id);
  }

  async deleteBatch(ids: string[]): Promise<boolean[]> {
    const results: boolean[] = [];
    for (const id of ids) {
      const result = await this.delete(id);
      results.push(result);
    }
    return results;
  }

  async getStats(): Promise<{
    totalCount: number;
    dimensions: number;
    lastUpdated?: Date;
  }> {
    const embeddings = Array.from(this.vectors.values());
    return {
      totalCount: embeddings.length,
      dimensions: this.embeddingProvider.getDimension(),
      lastUpdated: embeddings.length > 0 
        ? new Date(Math.max(...embeddings.map(e => e.timestamp.getTime())))
        : undefined
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Vector-enabled knowledge base that extends the basic knowledge base connector
 */
export interface VectorKnowledgeBase {
  /**
   * Add content to the vector knowledge base
   */
  addContent(content: string, metadata: Record<string, any>): Promise<string>;
  
  /**
   * Add multiple content items
   */
  addContentBatch(items: Array<{
    content: string;
    metadata: Record<string, any>;
  }>): Promise<string[]>;
  
  /**
   * Search using vector similarity
   */
  vectorSearch(
    query: string,
    options?: VectorSearchOptions
  ): Promise<Array<{
    content: string;
    relevance: number;
    source: string;
    metadata: Record<string, any>;
  }>>;
  
  /**
   * Hybrid search (combines vector similarity with keyword matching)
   */
  hybridSearch(
    query: string,
    concepts: string[],
    options?: VectorSearchOptions & {
      vectorWeight?: number;
      keywordWeight?: number;
    }
  ): Promise<Array<{
    content: string;
    relevance: number;
    source: string;
    metadata: Record<string, any>;
  }>>;
  
  /**
   * Find related concepts using vector similarity
   */
  findRelatedConcepts(concepts: string[], limit?: number): Promise<string[]>;
}

export class VectorKnowledgeBaseImpl implements VectorKnowledgeBase {
  private vectorStorage: VectorStorage;
  private embeddingProvider: EmbeddingProvider;

  constructor(vectorStorage: VectorStorage, embeddingProvider: EmbeddingProvider) {
    this.vectorStorage = vectorStorage;
    this.embeddingProvider = embeddingProvider;
  }

  async addContent(content: string, metadata: Record<string, any>): Promise<string> {
    const vector = await this.embeddingProvider.generateEmbedding(content);
    const id = `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.vectorStorage.store({
      id,
      vector,
      content,
      metadata: {
        ...metadata,
        source: metadata.source || 'unknown',
        addedAt: new Date().toISOString()
      }
    });
    
    return id;
  }

  async addContentBatch(items: Array<{
    content: string;
    metadata: Record<string, any>;
  }>): Promise<string[]> {
    const vectors = await this.embeddingProvider.generateEmbeddings(
      items.map(item => item.content)
    );
    
    const embeddings = items.map((item, index) => ({
      id: `content_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      vector: vectors[index],
      content: item.content,
      metadata: {
        ...item.metadata,
        source: item.metadata.source || 'unknown',
        addedAt: new Date().toISOString()
      }
    }));
    
    return this.vectorStorage.storeBatch(embeddings);
  }

  async vectorSearch(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<Array<{
    content: string;
    relevance: number;
    source: string;
    metadata: Record<string, any>;
  }>> {
    const results = await this.vectorStorage.searchByText(query, options);
    
    return results.map(result => ({
      content: result.content,
      relevance: result.similarity,
      source: result.metadata.source || 'unknown',
      metadata: result.metadata
    }));
  }

  async hybridSearch(
    query: string,
    concepts: string[],
    options: VectorSearchOptions & {
      vectorWeight?: number;
      keywordWeight?: number;
    } = {}
  ): Promise<Array<{
    content: string;
    relevance: number;
    source: string;
    metadata: Record<string, any>;
  }>> {
    const {
      vectorWeight = 0.7,
      keywordWeight = 0.3,
      ...searchOptions
    } = options;

    // Get vector search results
    const vectorResults = await this.vectorSearch(query, searchOptions);
    
    // Enhance with keyword matching
    const enhancedResults = vectorResults.map(result => {
      let keywordScore = 0;
      const lowerContent = result.content.toLowerCase();
      const lowerQuery = query.toLowerCase();
      
      // Query keyword matching
      if (lowerContent.includes(lowerQuery)) {
        keywordScore += 0.8;
      }
      
      // Concept keyword matching
      concepts.forEach(concept => {
        if (lowerContent.includes(concept.toLowerCase())) {
          keywordScore += 0.6;
        }
      });
      
      // Normalize keyword score
      keywordScore = Math.min(keywordScore, 1.0);
      
      // Combine scores
      const hybridRelevance = (result.relevance * vectorWeight) + (keywordScore * keywordWeight);
      
      return {
        ...result,
        relevance: hybridRelevance
      };
    });
    
    // Re-sort by hybrid relevance
    return enhancedResults.sort((a, b) => b.relevance - a.relevance);
  }

  async findRelatedConcepts(concepts: string[], limit: number = 10): Promise<string[]> {
    const relatedConcepts = new Set<string>();
    
    for (const concept of concepts) {
      const results = await this.vectorSearch(concept, { limit: 5 });
      
      results.forEach(result => {
        // Extract potential concepts from content
        const words = result.content.toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 3 && !['the', 'and', 'or', 'but', 'for', 'with'].includes(word));
        
        words.forEach(word => {
          if (!concepts.includes(word)) {
            relatedConcepts.add(word);
          }
        });
      });
    }
    
    return Array.from(relatedConcepts).slice(0, limit);
  }
}

/**
 * Factory function to create vector storage implementations
 */
export class VectorStorageFactory {
  static createInMemory(embeddingProvider: EmbeddingProvider): VectorStorage {
    return new InMemoryVectorStorage(embeddingProvider);
  }
  
  static createOpenAIEmbedding(apiKey: string, model?: string): EmbeddingProvider {
    return new OpenAIEmbeddingProvider(apiKey, model);
  }
  
  static createHuggingFaceEmbedding(apiKey: string, model?: string): EmbeddingProvider {
    return new HuggingFaceEmbeddingProvider(apiKey, model);
  }
  
  static createJinaEmbedding(apiKey: string, model?: string): EmbeddingProvider {
    return new JinaEmbeddingProvider(apiKey, model);
  }
  
  static createOllamaEmbedding(baseUrl?: string, model?: string): EmbeddingProvider {
    return new OllamaEmbeddingProvider(baseUrl, model);
  }
  
  static createVectorKnowledgeBase(
    vectorStorage: VectorStorage,
    embeddingProvider: EmbeddingProvider
  ): VectorKnowledgeBase {
    return new VectorKnowledgeBaseImpl(vectorStorage, embeddingProvider);
  }
} 