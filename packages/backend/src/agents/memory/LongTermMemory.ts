/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Long-term memory with vector embeddings for agents
 */

import { v4 as uuidv4 } from 'uuid';
import { IMemoryEntry } from '@/types';
import { log } from '@/utils/logger';
import { LLMProvider } from '../LLMProvider';

/**
 * Vector similarity search result
 */
export interface SimilaritySearchResult {
  entry: IMemoryEntry;
  score: number;
}

/**
 * Long-term memory storage with vector embeddings
 */
export class LongTermMemory {
  private memories: Map<string, IMemoryEntry>;
  private llmProvider: LLMProvider | null;
  private agentId: string;
  private maxMemories: number;

  constructor(
    agentId: string,
    llmProvider: LLMProvider | null = null,
    maxMemories: number = 10000
  ) {
    this.agentId = agentId;
    this.llmProvider = llmProvider;
    this.maxMemories = maxMemories;
    this.memories = new Map();
  }

  /**
   * Store a memory with embedding
   */
  async store(
    content: string,
    metadata: Record<string, any> = {},
    ttl?: Date
  ): Promise<IMemoryEntry> {
    // Generate embedding if provider available
    let embedding: number[] | undefined;
    if (this.llmProvider) {
      try {
        embedding = await this.llmProvider.generateEmbedding(content);
      } catch (error: any) {
        log.warn('Failed to generate embedding for memory', { error: error.message });
      }
    }

    const entry: IMemoryEntry = {
      id: uuidv4(),
      content,
      embedding,
      metadata: {
        ...metadata,
        agentId: this.agentId,
      },
      timestamp: new Date(),
      ttl,
    };

    this.memories.set(entry.id, entry);

    // Check if we need to evict old memories
    if (this.memories.size > this.maxMemories) {
      await this.evictOldest();
    }

    log.debug('Memory stored', {
      agentId: this.agentId,
      id: entry.id,
      hasEmbedding: !!embedding,
    });

    return entry;
  }

  /**
   * Retrieve a memory by ID
   */
  retrieve(id: string): IMemoryEntry | undefined {
    const entry = this.memories.get(id);

    // Check TTL
    if (entry && entry.ttl && entry.ttl < new Date()) {
      this.memories.delete(id);
      log.debug('Memory expired and removed', { id });
      return undefined;
    }

    return entry;
  }

  /**
   * Search memories by similarity using embeddings
   */
  async similaritySearch(
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<SimilaritySearchResult[]> {
    if (!this.llmProvider) {
      log.warn('No LLM provider available for similarity search');
      return [];
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.llmProvider.generateEmbedding(query);

      // Calculate cosine similarity for all memories with embeddings
      const results: SimilaritySearchResult[] = [];

      for (const entry of this.memories.values()) {
        // Skip expired entries
        if (entry.ttl && entry.ttl < new Date()) {
          continue;
        }

        if (entry.embedding) {
          const score = this.cosineSimilarity(queryEmbedding, entry.embedding);
          if (score >= threshold) {
            results.push({ entry, score });
          }
        }
      }

      // Sort by score (highest first) and limit
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    } catch (error: any) {
      log.error('Similarity search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Search memories by metadata
   */
  searchByMetadata(
    predicate: (metadata: Record<string, any>) => boolean,
    limit?: number
  ): IMemoryEntry[] {
    const results: IMemoryEntry[] = [];

    for (const entry of this.memories.values()) {
      // Skip expired entries
      if (entry.ttl && entry.ttl < new Date()) {
        continue;
      }

      if (predicate(entry.metadata)) {
        results.push(entry);
        if (limit && results.length >= limit) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Search memories by content (text search)
   */
  searchByContent(query: string, limit?: number): IMemoryEntry[] {
    const lowerQuery = query.toLowerCase();
    const results: IMemoryEntry[] = [];

    for (const entry of this.memories.values()) {
      // Skip expired entries
      if (entry.ttl && entry.ttl < new Date()) {
        continue;
      }

      if (entry.content.toLowerCase().includes(lowerQuery)) {
        results.push(entry);
        if (limit && results.length >= limit) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Get recent memories
   */
  getRecent(limit: number = 10): IMemoryEntry[] {
    const validMemories = Array.from(this.memories.values()).filter(
      (entry) => !entry.ttl || entry.ttl >= new Date()
    );

    return validMemories
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Delete a memory
   */
  delete(id: string): boolean {
    const deleted = this.memories.delete(id);
    if (deleted) {
      log.debug('Memory deleted', { agentId: this.agentId, id });
    }
    return deleted;
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memories.clear();
    log.debug('All memories cleared', { agentId: this.agentId });
  }

  /**
   * Clean up expired memories
   */
  cleanupExpired(): number {
    const now = new Date();
    let count = 0;

    for (const [id, entry] of this.memories.entries()) {
      if (entry.ttl && entry.ttl < now) {
        this.memories.delete(id);
        count++;
      }
    }

    if (count > 0) {
      log.debug('Expired memories cleaned up', { agentId: this.agentId, count });
    }

    return count;
  }

  /**
   * Get all memories
   */
  getAll(): IMemoryEntry[] {
    return Array.from(this.memories.values()).filter(
      (entry) => !entry.ttl || entry.ttl >= new Date()
    );
  }

  /**
   * Get memory count
   */
  count(): number {
    return this.memories.size;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
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

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Evict oldest memories when limit is reached
   */
  private async evictOldest(): Promise<void> {
    const sortedMemories = Array.from(this.memories.entries()).sort(
      ([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const toRemove = Math.ceil(this.maxMemories * 0.1); // Remove 10%
    for (let i = 0; i < toRemove; i++) {
      if (sortedMemories[i]) {
        this.memories.delete(sortedMemories[i][0]);
      }
    }

    log.debug('Evicted old memories', { agentId: this.agentId, count: toRemove });
  }

  /**
   * Export memories
   */
  export(): IMemoryEntry[] {
    return this.getAll();
  }

  /**
   * Import memories
   */
  import(memories: IMemoryEntry[]): void {
    memories.forEach((memory) => {
      this.memories.set(memory.id, memory);
    });
    log.info('Memories imported', {
      agentId: this.agentId,
      count: memories.length,
    });
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalMemories: number;
    withEmbeddings: number;
    expired: number;
    avgContentLength: number;
  } {
    let withEmbeddings = 0;
    let expired = 0;
    let totalContentLength = 0;
    const now = new Date();

    for (const entry of this.memories.values()) {
      if (entry.embedding) withEmbeddings++;
      if (entry.ttl && entry.ttl < now) expired++;
      totalContentLength += entry.content.length;
    }

    return {
      totalMemories: this.memories.size,
      withEmbeddings,
      expired,
      avgContentLength: this.memories.size > 0 ? totalContentLength / this.memories.size : 0,
    };
  }
}

/**
 * Create a new long-term memory instance
 */
export function createLongTermMemory(
  agentId: string,
  llmProvider?: LLMProvider,
  maxMemories?: number
): LongTermMemory {
  return new LongTermMemory(agentId, llmProvider || null, maxMemories);
}
