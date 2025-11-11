/**
 * Pinecone Vector Database utilities for idea management
 */

import type { RecordMetadata } from '@pinecone-database/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';

export interface BlogIdea {
  id: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
  used: boolean;
  usedAt?: string;
}

interface IdeaMetadata extends RecordMetadata {
  title: string;
  description: string;
  tags: string;
  createdAt: string;
  used: string;
  usedAt: string;
}

let pineconeClient: Pinecone | null = null;

/**
 * Get or initialize Pinecone client
 */
function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY not configured');
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

/**
 * Get Pinecone index
 */
function getIndex() {
  const indexName = process.env.PINECONE_INDEX_NAME || 'blog-ideas';
  return getPineconeClient().index(indexName);
}

/**
 * Convert BlogIdea to Pinecone metadata
 */
function ideaToMetadata(idea: BlogIdea): IdeaMetadata {
  return {
    title: idea.title,
    description: idea.description,
    tags: JSON.stringify(idea.tags),
    createdAt: idea.createdAt,
    used: idea.used.toString(),
    usedAt: idea.usedAt || '',
  };
}

/**
 * Convert Pinecone metadata to BlogIdea
 */
function metadataToIdea(id: string, metadata: IdeaMetadata): BlogIdea {
  return {
    id,
    title: metadata.title,
    description: metadata.description,
    tags: JSON.parse(metadata.tags),
    createdAt: metadata.createdAt,
    used: metadata.used === 'true',
    usedAt: metadata.usedAt || undefined,
  };
}

/**
 * Upsert an idea with its embedding to Pinecone
 */
export async function upsertIdea(
  idea: BlogIdea,
  embedding: number[]
): Promise<void> {
  const index = getIndex();
  
  await index.upsert([
    {
      id: idea.id,
      values: embedding,
      metadata: ideaToMetadata(idea),
    },
  ]);
}

/**
 * Query similar ideas using vector similarity
 */
export async function querySimilarIdeas(
  embedding: number[],
  topK: number = 5,
  includeValues: boolean = false
): Promise<Array<{ id: string; score: number; metadata: BlogIdea }>> {
  const index = getIndex();

  const results = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
    includeValues,
  });

  return (results.matches || []).map((match) => ({
    id: match.id,
    score: match.score || 0,
    metadata: metadataToIdea(match.id, match.metadata as IdeaMetadata),
  }));
}

/**
 * Get all ideas from Pinecone
 */
export async function getAllIdeas(): Promise<BlogIdea[]> {
  const index = getIndex();

  // Pinecone doesn't have a direct "get all" - we need to use query with a dummy vector
  // or use the listPaginated API. For simplicity, we'll fetch by namespace
  const stats = await index.describeIndexStats();
  const totalVectors = stats.totalRecordCount || 0;

  if (totalVectors === 0) {
    return [];
  }

  // Query with a zero vector to get all results (with high topK)
  const zeroVector = new Array(384).fill(0); // all-MiniLM-L6-v2 produces 384-dimensional vectors
  
  const results = await index.query({
    vector: zeroVector,
    topK: Math.min(totalVectors, 10000), // Pinecone's max
    includeMetadata: true,
  });

  return (results.matches || []).map((match) =>
    metadataToIdea(match.id, match.metadata as IdeaMetadata)
  );
}

/**
 * Delete an idea from Pinecone
 */
export async function deleteIdea(id: string): Promise<void> {
  const index = getIndex();
  await index.deleteOne(id);
}

/**
 * Update idea metadata (mark as used)
 */
export async function markIdeaAsUsed(id: string): Promise<void> {
  const index = getIndex();

  // Fetch the existing vector
  const fetchResult = await index.fetch([id]);
  const existingRecord = fetchResult.records[id];

  if (!existingRecord) {
    throw new Error('Idea not found');
  }

  // Update the metadata
  const metadata = existingRecord.metadata as IdeaMetadata;
  const updatedIdea: BlogIdea = {
    ...metadataToIdea(id, metadata),
    used: true,
    usedAt: new Date().toISOString(),
  };

  // Upsert with updated metadata
  await index.upsert([
    {
      id,
      values: existingRecord.values,
      metadata: ideaToMetadata(updatedIdea),
    },
  ]);
}

/**
 * Create a new idea with auto-generated ID
 */
export function createIdea(
  title: string,
  description: string,
  tags: string[]
): BlogIdea {
  return {
    id: uuidv4(),
    title,
    description,
    tags,
    createdAt: new Date().toISOString(),
    used: false,
  };
}
