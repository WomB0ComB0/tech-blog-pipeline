import { GoogleGenerativeAI } from "@google/generative-ai";
import { cosineSimilarity, generateIdeaEmbedding } from "@lib/embeddings";
import type { BlogIdeaType, PublishRequestType } from "@lib/schemas";
import { getAllIdeas, markIdeaAsUsed } from "@lib/vector-db";
import type { NextApiRequest, NextApiResponse } from "next";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// Validate cron secret (for Vercel Cron Jobs)
const validateCronSecret = (req: NextApiRequest): boolean => {
	const authHeader = req.headers["authorization"];
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret) {
		// If no CRON_SECRET is set, allow password-based auth
		const providedPassword = req.headers["x-publish-password"];
		const expectedPassword = process.env.PUBLISH_PASSWORD;
		return providedPassword === expectedPassword;
	}

	return authHeader === `Bearer ${cronSecret}`;
};

/**
 * Select a unique idea that hasn't been used and is different from recently used ideas
 */
async function selectUniqueIdea(): Promise<BlogIdeaType> {
	const allIdeas = await getAllIdeas();

	// Filter unused ideas
	const unusedIdeas = allIdeas.filter((idea) => !idea.used);

	if (unusedIdeas.length === 0) {
		throw new Error("No unused ideas available");
	}

	// Get recently used ideas (last 5)
	const usedIdeas = allIdeas
		.filter(
			(idea): idea is BlogIdeaType & { usedAt: string } =>
				idea.used && idea.usedAt !== undefined,
		)
		.sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
		.slice(0, 5);

	if (usedIdeas.length === 0) {
		// No used ideas yet, return a random unused idea
		return unusedIdeas[Math.floor(Math.random() * unusedIdeas.length)]!;
	}

	// Generate embeddings for recently used ideas
	const recentEmbeddings = await Promise.all(
		usedIdeas.map((idea) =>
			generateIdeaEmbedding(idea.title, idea.description),
		),
	);

	// Find the most dissimilar unused idea
	let selectedIdea = unusedIdeas[0]!;
	let minMaxSimilarity = 1;

	for (const idea of unusedIdeas) {
		const ideaEmbedding = await generateIdeaEmbedding(
			idea.title,
			idea.description,
		);

		// Calculate max similarity to any recent idea
		const maxSimilarity = Math.max(
			...recentEmbeddings.map((embedding) =>
				cosineSimilarity(ideaEmbedding, embedding),
			),
		);

		if (maxSimilarity < minMaxSimilarity) {
			minMaxSimilarity = maxSimilarity;
			selectedIdea = idea;
		}
	}

	return selectedIdea;
}

/**
 * Generate article content from an idea using Google Gemini
 */
async function generateArticleContent(
	title: string,
	description: string,
	tags: readonly string[],
): Promise<string> {
	const prompt = `You are an expert technical writer who creates engaging, informative blog posts on software development topics.

Write a technical blog post about the following topic:

Title: ${title}

Description: ${description}

Tags: ${tags.join(", ")}

Please write a comprehensive, engaging blog post in Markdown format. Include:
1. An introduction that hooks the reader
2. Main sections with detailed explanations
3. Code examples where relevant
4. Best practices and tips
5. A conclusion

Make it informative, well-structured, and suitable for a technical audience.`;

	const result = await model.generateContent(prompt);
	const response = await result.response;
	return response.text();
}

/**
 * Publish article to specified platforms
 */
async function publishArticle(
	title: string,
	content: string,
	tags: readonly string[],
	platforms: readonly ("devto" | "hashnode")[],
): Promise<unknown> {
	const requestBody: PublishRequestType = {
		title,
		content,
		tags: [...tags],
		is_draft: false,
		platforms: [...platforms],
	};

	const response = await fetch(
		`${process.env.VERCEL_URL || "http://localhost:3000"}/api/publish-multi`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-publish-password": process.env.PUBLISH_PASSWORD || "",
			},
			body: JSON.stringify(requestBody),
		},
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(`Failed to publish: ${JSON.stringify(error)}`);
	}

	return await response.json();
}

export default async function cronPublish(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	// Validate cron authentication
	if (!validateCronSecret(req)) {
		return res.status(401).json({ error: { message: "Unauthorized" } });
	}

	try {
		// Select a unique idea
		const idea = await selectUniqueIdea();
		console.log("Selected idea:", idea.title);

		// Generate article content
		const content = await generateArticleContent(
			idea.title,
			idea.description,
			idea.tags,
		);
		console.log("Generated content");

		// Publish to platforms (default to both devto and hashnode)
		const requestedPlatforms = req.body?.platforms;
		const platforms: readonly ("devto" | "hashnode")[] =
			Array.isArray(requestedPlatforms) &&
			requestedPlatforms.every(
				(p): p is "devto" | "hashnode" => p === "devto" || p === "hashnode",
			)
				? requestedPlatforms
				: ["devto", "hashnode"];

		const publishResult = await publishArticle(
			idea.title,
			content,
			idea.tags,
			platforms,
		);
		console.log("Published to platforms:", platforms);

		// Mark idea as used
		await markIdeaAsUsed(idea.id);
		console.log("Marked idea as used");

		return res.status(200).json({
			success: true,
			idea: {
				id: idea.id,
				title: idea.title,
			},
			publishResult,
		});
	} catch (err) {
		console.error("Error in cron publish:", err);
		return res.status(500).json({
			error: {
				message: err instanceof Error ? err.message : "Internal server error",
			},
		});
	}
}
