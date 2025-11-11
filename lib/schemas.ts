/**
 * Effect Schema definitions for type-safe runtime validation
 */

import { Schema } from "effect";

/**
 * Blog Idea Schema
 */
export class BlogIdea extends Schema.Class<BlogIdea>("BlogIdea")({
	id: Schema.String,
	title: Schema.String,
	description: Schema.String,
	tags: Schema.Array(Schema.String),
	createdAt: Schema.String,
	used: Schema.Boolean,
	usedAt: Schema.optional(Schema.String),
}) {}

/**
 * Idea Metadata Schema (for Pinecone storage)
 */
export class IdeaMetadata extends Schema.Class<IdeaMetadata>("IdeaMetadata")({
	title: Schema.String,
	description: Schema.String,
	tags: Schema.String, // Stored as JSON string in Pinecone
	createdAt: Schema.String,
	used: Schema.String, // Stored as string "true"/"false"
	usedAt: Schema.String, // Empty string if not used
}) {}

/**
 * Publish Request Schema
 */
export class PublishRequest extends Schema.Class<PublishRequest>(
	"PublishRequest",
)({
	title: Schema.String.pipe(
		Schema.minLength(1, { message: () => "Title is required" }),
		Schema.maxLength(200, {
			message: () => "Title must be less than 200 characters",
		}),
	),
	content: Schema.String.pipe(
		Schema.minLength(100, {
			message: () => "Content must be at least 100 characters",
		}),
	),
	tags: Schema.Array(Schema.String).pipe(
		Schema.minItems(1, { message: () => "At least one tag is required" }),
		Schema.maxItems(5, { message: () => "Maximum 5 tags allowed" }),
	),
	is_draft: Schema.optional(Schema.Boolean),
	platforms: Schema.optional(
		Schema.Array(Schema.Literal("devto", "hashnode")).pipe(
			Schema.minItems(1, {
				message: () => "At least one platform is required",
			}),
		),
	),
}) {}

/**
 * Publish Result Schema
 */
export class PublishResult extends Schema.Class<PublishResult>("PublishResult")(
	{
		platform: Schema.String,
		success: Schema.Boolean,
		article: Schema.optional(Schema.Unknown),
		error: Schema.optional(Schema.String),
	},
) {}

/**
 * API Response Schema
 */
export class ApiResponse extends Schema.Class<ApiResponse>("ApiResponse")({
	success: Schema.Boolean,
	data: Schema.optional(Schema.Unknown),
	error: Schema.optional(
		Schema.Struct({
			message: Schema.String,
		}),
	),
}) {}

/**
 * Create Idea Request Schema
 */
export class CreateIdeaRequest extends Schema.Class<CreateIdeaRequest>(
	"CreateIdeaRequest",
)({
	title: Schema.String.pipe(
		Schema.minLength(5, {
			message: () => "Title must be at least 5 characters",
		}),
		Schema.maxLength(200, {
			message: () => "Title must be less than 200 characters",
		}),
	),
	description: Schema.String.pipe(
		Schema.minLength(20, {
			message: () => "Description must be at least 20 characters",
		}),
		Schema.maxLength(1000, {
			message: () => "Description must be less than 1000 characters",
		}),
	),
	tags: Schema.Array(Schema.String).pipe(
		Schema.minItems(1, { message: () => "At least one tag is required" }),
		Schema.maxItems(5, { message: () => "Maximum 5 tags allowed" }),
	),
}) {}

/**
 * Publish Multi Response Schema
 */
export class PublishMultiResponse extends Schema.Class<PublishMultiResponse>(
	"PublishMultiResponse",
)({
	results: Schema.Array(
		Schema.Struct({
			platform: Schema.String,
			success: Schema.Boolean,
			article: Schema.optional(Schema.Unknown),
			error: Schema.optional(Schema.String),
		}),
	),
}) {}

/**
 * Cron Publish Response Schema
 */
export class CronPublishResponse extends Schema.Class<CronPublishResponse>(
	"CronPublishResponse",
)({
	success: Schema.Boolean,
	idea: Schema.optional(
		Schema.Struct({
			id: Schema.String,
			title: Schema.String,
		}),
	),
	publishResult: Schema.optional(Schema.Unknown),
	error: Schema.optional(
		Schema.Struct({
			message: Schema.String,
		}),
	),
}) {}

// Export type inference helpers
export type BlogIdeaType = typeof BlogIdea.Type;
export type IdeaMetadataType = typeof IdeaMetadata.Type;
export type PublishRequestType = typeof PublishRequest.Type;
export type PublishResultType = typeof PublishResult.Type;
export type CreateIdeaRequestType = typeof CreateIdeaRequest.Type;
export type PublishMultiResponseType = typeof PublishMultiResponse.Type;
export type CronPublishResponseType = typeof CronPublishResponse.Type;
