/**
 * Local embeddings using Xenova Transformers (no OpenAI needed!)
 */

import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';

let embedderInstance: FeatureExtractionPipeline | null = null;

/**
 * Get or initialize the embedding pipeline
 */
async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedderInstance) {
    console.log('Initializing embedder pipeline...');
    embedderInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Pipeline initialized successfully');
  }
  return embedderInstance;
}

/**
 * Generate embeddings for text using local Xenova transformers model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const pipe = await getEmbedder();
    const result = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Check if an idea is unique enough (similarity threshold)
 */
export function isIdeaUnique(
  maxSimilarity: number,
  threshold: number = 0.85
): boolean {
  return maxSimilarity < threshold;
}

/**
 * Generate embedding for an idea (combines title and description)
 */
export async function generateIdeaEmbedding(
  title: string,
  description: string
): Promise<number[]> {
  const combinedText = `${title}\n\n${description}`;
  return generateEmbedding(combinedText);
}
