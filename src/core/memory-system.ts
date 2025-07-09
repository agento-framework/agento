import type { Context } from "../types";

/**
 * Memory and Learning System for Agents
 * Provides persistent memory, learning capabilities, and knowledge management
 */

export interface MemoryEntry {
  id: string;
  type: 'fact' | 'preference' | 'pattern' | 'skill' | 'relationship' | 'experience';
  content: string;
  context: string;
  importance: number; // 1-10
  confidence: number; // 0-1
  timestamp: Date;
  lastAccessed: Date;
  accessCount: number;
  tags: string[];
  associatedMemories: string[];
  source: 'user' | 'observation' | 'inference' | 'external';
}

export interface LearningPattern {
  id: string;
  pattern: string;
  frequency: number;
  contexts: string[];
  effectiveness: number;
  lastSeen: Date;
  examples: string[];
}

export interface UserProfile {
  id: string;
  preferences: Record<string, any>;
  communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly';
  expertise: string[];
  goals: string[];
  constraints: string[];
  history: {
    interactions: number;
    topics: string[];
    patterns: string[];
  };
}

export interface KnowledgeGraph {
  entities: Map<string, {
    type: string;
    properties: Record<string, any>;
    relationships: string[];
  }>;
  relationships: Map<string, {
    from: string;
    to: string;
    type: string;
    strength: number;
  }>;
}

export class MemorySystemManager {
  private memories: Map<string, MemoryEntry> = new Map();
  private patterns: Map<string, LearningPattern> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();
  private knowledgeGraph: KnowledgeGraph = {
    entities: new Map(),
    relationships: new Map(),
  };
  
  /**
   * Store a new memory
   */
  storeMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp' | 'lastAccessed' | 'accessCount'>): string {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memory: MemoryEntry = {
      ...entry,
      id,
      timestamp: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
    };
    
    this.memories.set(id, memory);
    this.updateKnowledgeGraph(memory);
    return id;
  }
  
  /**
   * Retrieve memories by query
   */
  retrieveMemories(
    query: string,
    type?: MemoryEntry['type'],
    limit: number = 10
  ): MemoryEntry[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results: Array<{ memory: MemoryEntry; relevance: number }> = [];
    
    for (const memory of this.memories.values()) {
      if (type && memory.type !== type) continue;
      
      // Calculate relevance score
      let relevance = 0;
      const content = memory.content.toLowerCase();
      const context = memory.context.toLowerCase();
      
      // Exact matches
      for (const term of queryTerms) {
        if (content.includes(term)) relevance += 2;
        if (context.includes(term)) relevance += 1;
        if (memory.tags.some(tag => tag.toLowerCase().includes(term))) relevance += 1.5;
      }
      
      // Boost by importance and confidence
      relevance *= memory.importance * 0.1;
      relevance *= memory.confidence;
      
      // Boost recently accessed memories
      const daysSinceAccess = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
      relevance *= Math.max(0.1, 1 - daysSinceAccess * 0.1);
      
      if (relevance > 0) {
        results.push({ memory, relevance });
      }
    }
    
    // Sort by relevance and return top results
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
      .map(r => {
        // Update access tracking
        r.memory.lastAccessed = new Date();
        r.memory.accessCount++;
        return r.memory;
      });
  }
  
  /**
   * Learn from patterns and interactions
   */
  learnFromInteraction(
    query: string,
    response: string,
    context: string,
    effectiveness: number
  ): void {
    // Extract patterns from successful interactions
    if (effectiveness > 0.7) {
      const patternId = this.extractPattern(query, response, context);
      if (patternId) {
        const pattern = this.patterns.get(patternId);
        if (pattern) {
          pattern.frequency++;
          pattern.effectiveness = (pattern.effectiveness + effectiveness) / 2;
          pattern.lastSeen = new Date();
          pattern.examples.push(`${query} -> ${response}`);
        }
      }
    }
    
    // Store as experience memory
    this.storeMemory({
      type: 'experience',
      content: `Query: ${query}\nResponse: ${response}\nEffectiveness: ${effectiveness}`,
      context,
      importance: Math.min(10, effectiveness * 10),
      confidence: effectiveness,
      tags: ['interaction', 'experience'],
      associatedMemories: [],
      source: 'observation',
    });
  }
  
  /**
   * Update user profile based on interactions
   */
  updateUserProfile(userId: string, interaction: {
    query: string;
    topics: string[];
    style: string;
    preferences: Record<string, any>;
  }): void {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = {
        id: userId,
        preferences: {},
        communicationStyle: 'casual',
        expertise: [],
        goals: [],
        constraints: [],
        history: {
          interactions: 0,
          topics: [],
          patterns: [],
        },
      };
      this.userProfiles.set(userId, profile);
    }
    
    // Update profile
    profile.history.interactions++;
    profile.history.topics.push(...interaction.topics);
    
    // Update preferences
    Object.assign(profile.preferences, interaction.preferences);
    
    // Infer communication style
    if (interaction.style) {
      profile.communicationStyle = interaction.style as any;
    }
    
    // Extract expertise from topics
    const topicCounts = new Map<string, number>();
    for (const topic of profile.history.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }
    
    profile.expertise = Array.from(topicCounts.entries())
      .filter(([_, count]) => count >= 3)
      .map(([topic]) => topic);
  }
  
  /**
   * Get user profile
   */
  getUserProfile(userId: string): UserProfile | null {
    return this.userProfiles.get(userId) || null;
  }
  
  /**
   * Get relevant knowledge for a query
   */
  getRelevantKnowledge(query: string, userId?: string): {
    memories: MemoryEntry[];
    patterns: LearningPattern[];
    profile: UserProfile | null;
    suggestions: string[];
  } {
    const memories = this.retrieveMemories(query);
    const patterns = this.getRelevantPatterns(query);
    const profile = userId ? this.getUserProfile(userId) : null;
    const suggestions = this.generateSuggestions(query, memories, patterns, profile);
    
    return { memories, patterns, profile, suggestions };
  }
  
  /**
   * Generate contextual suggestions
   */
  private generateSuggestions(
    query: string,
    memories: MemoryEntry[],
    patterns: LearningPattern[],
    profile: UserProfile | null
  ): string[] {
    const suggestions: string[] = [];
    
    // Based on memories
    const relatedMemories = memories.filter(m => m.type === 'fact' || m.type === 'skill');
    if (relatedMemories.length > 0) {
      suggestions.push(`Consider: ${relatedMemories[0].content}`);
    }
    
    // Based on patterns
    const relevantPatterns = patterns.filter(p => p.effectiveness > 0.8);
    if (relevantPatterns.length > 0) {
      suggestions.push(`Pattern suggests: ${relevantPatterns[0].pattern}`);
    }
    
    // Based on user profile
    if (profile) {
      const userExpertise = profile.expertise.find(e => 
        query.toLowerCase().includes(e.toLowerCase())
      );
      if (userExpertise) {
        suggestions.push(`Based on your expertise in ${userExpertise}...`);
      }
    }
    
    return suggestions;
  }
  
  /**
   * Get relevant patterns for a query
   */
  private getRelevantPatterns(query: string): LearningPattern[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results: Array<{ pattern: LearningPattern; relevance: number }> = [];
    
    for (const pattern of this.patterns.values()) {
      let relevance = 0;
      
      for (const term of queryTerms) {
        if (pattern.pattern.toLowerCase().includes(term)) relevance += 1;
        if (pattern.contexts.some(ctx => ctx.toLowerCase().includes(term))) relevance += 0.5;
      }
      
      relevance *= pattern.effectiveness;
      relevance *= Math.log(pattern.frequency + 1);
      
      if (relevance > 0) {
        results.push({ pattern, relevance });
      }
    }
    
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      .map(r => r.pattern);
  }
  
  /**
   * Extract patterns from interactions
   */
  private extractPattern(query: string, response: string, context: string): string | null {
    // Simple pattern extraction - in a real system this would be more sophisticated
    const queryType = this.classifyQuery(query);
    const responseType = this.classifyResponse(response);
    
    if (queryType && responseType) {
      const patternId = `${queryType}_${responseType}`;
      
      if (!this.patterns.has(patternId)) {
        this.patterns.set(patternId, {
          id: patternId,
          pattern: `${queryType} queries respond well to ${responseType} responses`,
          frequency: 1,
          contexts: [context],
          effectiveness: 0.8,
          lastSeen: new Date(),
          examples: [],
        });
      }
      
      return patternId;
    }
    
    return null;
  }
  
  /**
   * Classify query type
   */
  private classifyQuery(query: string): string | null {
    const q = query.toLowerCase();
    
    if (q.includes('how') || q.includes('what') || q.includes('why')) return 'informational';
    if (q.includes('calculate') || q.includes('compute')) return 'computational';
    if (q.includes('help') || q.includes('assist')) return 'assistance';
    if (q.includes('recommend') || q.includes('suggest')) return 'recommendation';
    if (q.includes('compare') || q.includes('versus')) return 'comparison';
    
    return 'general';
  }
  
  /**
   * Classify response type
   */
  private classifyResponse(response: string): string | null {
    const r = response.toLowerCase();
    
    if (r.includes('step') || r.includes('first') || r.includes('then')) return 'procedural';
    if (r.includes('because') || r.includes('due to')) return 'explanatory';
    if (r.includes('$') || r.includes('%') || r.includes('number')) return 'quantitative';
    if (r.includes('recommend') || r.includes('suggest')) return 'advisory';
    if (r.includes('example') || r.includes('instance')) return 'illustrative';
    
    return 'informative';
  }
  
  /**
   * Update knowledge graph with new memory
   */
  private updateKnowledgeGraph(memory: MemoryEntry): void {
    // Extract entities from memory content
    const entities = this.extractEntities(memory.content);
    
    for (const entity of entities) {
      if (!this.knowledgeGraph.entities.has(entity.id)) {
        this.knowledgeGraph.entities.set(entity.id, {
          type: entity.type,
          properties: entity.properties,
          relationships: [],
        });
      }
    }
    
    // Create relationships between entities
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const relationshipId = `${entities[i].id}_${entities[j].id}`;
        this.knowledgeGraph.relationships.set(relationshipId, {
          from: entities[i].id,
          to: entities[j].id,
          type: 'co_occurrence',
          strength: 0.5,
        });
      }
    }
  }
  
  /**
   * Extract entities from text (simplified)
   */
  private extractEntities(text: string): Array<{
    id: string;
    type: string;
    properties: Record<string, any>;
  }> {
    const entities: Array<{
      id: string;
      type: string;
      properties: Record<string, any>;
    }> = [];
    
    // Simple entity extraction - in a real system this would use NLP
    const words = text.split(/\s+/);
    
    for (const word of words) {
      if (word.length > 3 && /^[A-Z]/.test(word)) {
        entities.push({
          id: word.toLowerCase(),
          type: 'concept',
          properties: { name: word },
        });
      }
    }
    
    return entities;
  }
  
  /**
   * Create memory system context for agents
   */
  createMemoryContext(userId?: string, sessionId?: string): Context {
    return {
      key: "memory_system",
      description: "Persistent memory and learning capabilities",
      content: () => {
        const profile = userId ? this.getUserProfile(userId) : null;
        const recentMemories = Array.from(this.memories.values())
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 5);
        
        const topPatterns = Array.from(this.patterns.values())
          .sort((a, b) => b.effectiveness - a.effectiveness)
          .slice(0, 3);
        
        return `=== MEMORY & LEARNING SYSTEM ===

MEMORY CAPABILITIES:
- I can remember facts, preferences, patterns, and experiences
- I learn from our interactions and improve over time
- I maintain a knowledge graph of related concepts
- I track what works well and what doesn't
- I build understanding of your preferences and expertise

CURRENT MEMORY STATUS:
- Total memories stored: ${this.memories.size}
- Active learning patterns: ${this.patterns.size}
- User profiles: ${this.userProfiles.size}
- Knowledge graph entities: ${this.knowledgeGraph.entities.size}

${profile ? `
USER PROFILE:
- Interactions: ${profile.history.interactions}
- Communication style: ${profile.communicationStyle}
- Expertise areas: ${profile.expertise.join(', ') || 'Learning about you...'}
- Main topics: ${profile.history.topics.slice(-5).join(', ') || 'None yet'}
- Preferences: ${Object.keys(profile.preferences).join(', ') || 'None set'}
` : ''}

RECENT MEMORIES:
${recentMemories.map(m => `- ${m.type}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`).join('\n')}

TOP LEARNING PATTERNS:
${topPatterns.map(p => `- ${p.pattern} (effectiveness: ${(p.effectiveness * 100).toFixed(1)}%)`).join('\n')}

MEMORY SYSTEM FEATURES:
- Contextual memory retrieval based on current conversation
- Pattern recognition and learning from successful interactions
- User preference tracking and personalization
- Knowledge graph for understanding relationships
- Confidence scoring for memory reliability
- Importance weighting for memory prioritization
- Temporal awareness for memory freshness

LEARNING CAPABILITIES:
- I learn what types of responses work best for different queries
- I remember your preferences and adapt my communication style
- I build expertise in topics we discuss frequently
- I recognize patterns in successful problem-solving approaches
- I maintain context across conversations and sessions
- I improve my responses based on feedback and outcomes

Use my memory system to:
- Reference previous conversations and decisions
- Maintain consistency in recommendations
- Build on established preferences and patterns
- Provide personalized and contextual responses
- Learn from feedback and improve over time
- Maintain long-term context and relationships`;
      },
      priority: 85, // High priority for memory system
    };
  }
  
  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    totalMemories: number;
    memoryTypes: Record<string, number>;
    averageImportance: number;
    averageConfidence: number;
    totalPatterns: number;
    totalUsers: number;
  } {
    const memoryTypes: Record<string, number> = {};
    let totalImportance = 0;
    let totalConfidence = 0;
    
    for (const memory of this.memories.values()) {
      memoryTypes[memory.type] = (memoryTypes[memory.type] || 0) + 1;
      totalImportance += memory.importance;
      totalConfidence += memory.confidence;
    }
    
    const memoryCount = this.memories.size;
    
    return {
      totalMemories: memoryCount,
      memoryTypes,
      averageImportance: memoryCount > 0 ? totalImportance / memoryCount : 0,
      averageConfidence: memoryCount > 0 ? totalConfidence / memoryCount : 0,
      totalPatterns: this.patterns.size,
      totalUsers: this.userProfiles.size,
    };
  }
}

// Export singleton instance
export const memorySystemManager = new MemorySystemManager();

// Export utility functions
export function createMemoryContext(userId?: string, sessionId?: string): Context {
  return memorySystemManager.createMemoryContext(userId, sessionId);
}

export function storeMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp' | 'lastAccessed' | 'accessCount'>): string {
  return memorySystemManager.storeMemory(entry);
}

export function retrieveMemories(query: string, type?: MemoryEntry['type'], limit?: number): MemoryEntry[] {
  return memorySystemManager.retrieveMemories(query, type, limit);
}

export function learnFromInteraction(
  query: string,
  response: string,
  context: string,
  effectiveness: number
): void {
  memorySystemManager.learnFromInteraction(query, response, context, effectiveness);
}

export function updateUserProfile(userId: string, interaction: {
  query: string;
  topics: string[];
  style: string;
  preferences: Record<string, any>;
}): void {
  memorySystemManager.updateUserProfile(userId, interaction);
}

export function getUserProfile(userId: string): UserProfile | null {
  return memorySystemManager.getUserProfile(userId);
}

export function getRelevantKnowledge(query: string, userId?: string) {
  return memorySystemManager.getRelevantKnowledge(query, userId);
} 