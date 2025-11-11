import { generateIdeaEmbedding } from "@lib/embeddings";
import { BlogIdea, CreateIdeaRequest } from "@lib/schemas";
import {
	deleteIdea,
	getAllIdeas,
	querySimilarIdeas,
	upsertIdea,
} from "@lib/vector-db";
import { Schema } from "effect";
import { nanoid } from "nanoid";
import type { NextApiRequest, NextApiResponse } from "next";

// Validate password middleware
const validatePassword = (req: NextApiRequest): boolean => {
	const providedPassword = req.headers["x-publish-password"];
	const expectedPassword = process.env.PUBLISH_PASSWORD;
	return providedPassword === expectedPassword;
};

export default async function ideas(req: NextApiRequest, res: NextApiResponse) {
	// Validate password for all operations
	if (!validatePassword(req)) {
		return res.status(401).json({ error: { message: "Invalid password" } });
	}

	try {
		switch (req.method) {
			case "POST": {
				// Validate request body with Effect Schema
				const parseResult = Schema.decodeUnknownEither(CreateIdeaRequest)(
					req.body,
				);

				if (parseResult._tag === "Left") {
					return res.status(400).json({
						error: {
							message: "Validation failed",
							details: parseResult.left.message,
						},
					});
				}

				const { title, description, tags } = parseResult.right;

				// Generate embedding for the new idea
				const embedding = await generateIdeaEmbedding(title, description);

				// Check for similar ideas
				const similarIdeas = await querySimilarIdeas(embedding, 5);

				// Check if any similar idea has high similarity (>0.85)
				const tooSimilar = similarIdeas.some((idea) => idea.score > 0.85);

				if (tooSimilar) {
					return res.status(400).json({
						error: {
							message: "Similar idea already exists",
							similarIdeas: similarIdeas.slice(0, 3).map((i) => ({
								title: i.metadata.title,
								similarity: i.score,
							})),
						},
					});
				}

				const idea = new BlogIdea({
					id: nanoid(),
					title,
					description,
					tags,
					createdAt: new Date().toISOString(),
					used: false,
				});

				// Store in vector database
				await upsertIdea(idea, embedding);

				return res.status(201).json({ idea });
			}

			case "GET": {
				// Get all ideas
				const ideas = await getAllIdeas();
				return res.status(200).json({ ideas });
			}

			case "DELETE": {
				// Delete an idea
				const { id } = req.query;

				if (!id || typeof id !== "string") {
					return res.status(400).json({
						error: { message: "Idea ID is required" },
					});
				}

				await deleteIdea(id);
				return res.status(200).json({ message: "Idea deleted successfully" });
			}

			default:
				return res.status(405).json({
					error: { message: "Method not allowed" },
				});
		}
	} catch (err) {
		console.error("Error in ideas API:", err);
		return res.status(500).json({
			error: {
				message: err instanceof Error ? err.message : "Internal server error",
			},
		});
	}
}
