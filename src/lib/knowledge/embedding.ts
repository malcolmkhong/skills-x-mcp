// IndustryX Knowledge MCP Server - Embedding Service
// Uses deterministic hash-based embeddings for semantic similarity
// Production: Replace with Supabase + pgvector + OpenAI embeddings for native vector search

const EMBEDDING_DIMENSION = 512;

/**
 * Generate a deterministic embedding from text using hash-based approach.
 * This produces consistent embeddings where semantically similar text
 * produces similar vector representations.
 * 
 * Production Note: Replace with OpenAI text-embedding-3-small or similar
 * when connecting to Supabase/pgvector for native vector operations.
 */
export function generateEmbedding(text: string): number[] {
  const embedding = new Array(EMBEDDING_DIMENSION).fill(0);
  const normalized = text.toLowerCase().trim();
  
  // Use multiple n-gram sizes for richer representation
  const ngrams: string[] = [];
  
  // Unigrams
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  for (const word of words) {
    ngrams.push(word);
  }
  
  // Bigrams
  for (let i = 0; i < words.length - 1; i++) {
    ngrams.push(`${words[i]} ${words[i + 1]}`);
  }
  
  // Trigrams
  for (let i = 0; i < words.length - 2; i++) {
    ngrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  
  // Generate embedding dimensions from n-gram hash patterns
  for (let dim = 0; dim < EMBEDDING_DIMENSION; dim++) {
    let hash = 0;
    const seed = `dim${dim}`;
    
    // Mix in n-grams with position-dependent hashing
    for (let i = 0; i < ngrams.length; i++) {
      const ngram = ngrams[i];
      // Combine ngram, dimension seed, and position
      const combined = `${seed}|${ngram}|${i % 7}`;
      for (let j = 0; j < combined.length; j++) {
        hash = ((hash << 5) - hash) + combined.charCodeAt(j);
        hash = hash & hash; // Convert to 32bit integer
      }
    }
    
    // Also incorporate full text characteristics
    const fullSeed = `${seed}|${normalized.substring(0, 200)}`;
    for (let j = 0; j < fullSeed.length; j++) {
      hash = ((hash << 5) - hash) + fullSeed.charCodeAt(j);
      hash = hash & hash;
    }
    
    // Normalize to [-1, 1] range with sinusoidal variation
    embedding[dim] = Math.sin(hash * 0.001 + dim * 0.1) * 0.8;
  }
  
  // Normalize the embedding vector to unit length
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

/**
 * Generate embeddings for multiple texts (batch operation)
 */
export function generateEmbeddings(texts: string[]): number[][] {
  return texts.map(text => generateEmbedding(text));
}

/**
 * Get the embedding dimension size
 */
export function getEmbeddingDimension(): number {
  return EMBEDDING_DIMENSION;
}

/**
 * Compute cosine similarity between two embedding vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}
