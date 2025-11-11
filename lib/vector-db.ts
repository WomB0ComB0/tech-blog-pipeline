/**
 * Pinecone Vector Database utilities for idea management
 */

import type { RecordMetadata } from "@pinecone-database/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { Schema } from "effect";
import { v4 as uuidv4 } from "uuid";
import type { BlogIdeaType } from "./schemas";
import { BlogIdea, IdeaMetadata } from "./schemas";

let pineconeClient: Pinecone | null = null;

/**
 * Get or initialize Pinecone client
 */
function getPineconeClient(): Pinecone {
	if (!pineconeClient) {
		const apiKey = process.env.PINECONE_API_KEY;
		if (!apiKey) {
			throw new Error("PINECONE_API_KEY not configured");
		}
		pineconeClient = new Pinecone({ apiKey });
	}
	return pineconeClient;
}

/**
 * Get Pinecone index
 */
function getIndex() {
	const indexName = process.env.PINECONE_INDEX_NAME || "blog-ideas";
	return getPineconeClient().index(indexName);
}

/**
 * Convert BlogIdea to Pinecone metadata
 */
function ideaToMetadata(
	idea: BlogIdeaType,
): Record<string, string | number | boolean> {
	return {
		title: idea.title,
		description: idea.description,
		tags: JSON.stringify(idea.tags),
		createdAt: idea.createdAt,
		used: idea.used ? "true" : "false",
		usedAt: idea.usedAt || "",
	};
}

/**
 * Convert Pinecone metadata to BlogIdea
 */
function metadataToIdea(id: string, metadata: RecordMetadata): BlogIdeaType {
	const parsed = Schema.decodeUnknownSync(IdeaMetadata)(metadata);

	return new BlogIdea({
		id,
		title: parsed.title,
		description: parsed.description,
		tags: JSON.parse(parsed.tags),
		createdAt: parsed.createdAt,
		used: parsed.used === "true",
		usedAt: parsed.usedAt || undefined,
	});
}

/**
 * Upsert an idea with its embedding to Pinecone
 */
export async function upsertIdea(
	idea: BlogIdeaType,
	embedding: number[],
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
	includeValues: boolean = false,
): Promise<Array<{ id: string; score: number; metadata: BlogIdeaType }>> {
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
		metadata: metadataToIdea(
			match.id,
			match.metadata as unknown as RecordMetadata,
		),
	}));
}

/**
 * Get all ideas from Pinecone
 */
export async function getAllIdeas(): Promise<BlogIdeaType[]> {
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
		metadataToIdea(match.id, match.metadata as unknown as RecordMetadata),
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
		throw new Error("Idea not found");
	}

	// Update the metadata
	const existingIdea = metadataToIdea(
		id,
		existingRecord.metadata as unknown as RecordMetadata,
	);
	const updatedIdea = new BlogIdea({
		...existingIdea,
		used: true,
		usedAt: new Date().toISOString(),
	});

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
	tags: string[],
): BlogIdeaType {
	return new BlogIdea({
		id: uuidv4(),
		title,
		description,
		tags,
		createdAt: new Date().toISOString(),
		used: false,
	});
}
