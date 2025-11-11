# Multi-Platform 2. **Similarity Check**: System uses local Xenova embeddings to check if idea is unique
3. **Automated Selection**: Cron job finds the most unique unused idea
4. **Content Generation**: Gemini 1.5 Pro generates a complete blog post from the ideah Blog Pipeline

An automated blogging system that publishes articles to Dev.to and Hashnode with AI-powered content generation and intelligent idea management using vector similarity.

## 🚀 Features

- **Multi-Platform Publishing**: Publish to Dev.to and Hashnode simultaneously
- **AI-Powered Content Generation**: Uses Google Gemini 1.5 Pro to generate blog posts from ideas
- **Intelligent Idea Management**: Vector database for storing and managing blog ideas
- **Cosine Similarity**: Ensures unique content selection using vector embeddings
- **Automated Workflow**: Vercel cron jobs for scheduled content publishing
- **Web Interface**: Easy-to-use UI for manual publishing and idea management
- **API Access**: RESTful API for programmatic publishing

## 🎯 How It Works

1. **Add Ideas**: Submit blog post ideas to the vector database
2. **Similarity Check**: System uses local Xenova embeddings to check if idea is unique
3. **Automated Selection**: Cron job selects the most unique unused idea
4. **Content Generation**: Gemini 1.5 Pro generates a complete blog post from the idea
5. **Multi-Platform Publishing**: Article is published to all configured platforms
6. **Idea Tracking**: Used ideas are marked to avoid republishing

## Quick Start

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set the required variables:

```bash
# Required: Your admin password for publishing
PUBLISH_PASSWORD="your-secure-password"

# Required: Get from https://dev.to/settings/extensions
DEV_TO_API_KEY="your-devto-api-key"

# Required: Get from https://hashnode.com/settings/developer
HASHNODE_API_KEY="your-hashnode-api-key"
HASHNODE_PUBLICATION_ID="your-hashnode-publication-id"

# Required: Pinecone Vector Database (https://pinecone.io)
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_INDEX_NAME="blog-ideas"

# Required: Google Gemini API key (for content generation)
GEMINI_API_KEY="your-gemini-api-key"

# Required: Cron job secret for automated publishing
CRON_SECRET="your-random-secret"
```

**Where to get API keys:**
- **Dev.to**: Go to [dev.to/settings/extensions](https://dev.to/settings/extensions) and generate an API key
- **Hashnode**: 
  - Go to [hashnode.com/settings/developer](https://hashnode.com/settings/developer) to get your API key
  - Get your Publication ID from your blog's settings
- **Upstash Vector**: Create a free Pinecone index at [pinecone.io](https://pinecone.io) - the free tier is perfect for this use case!
- **Gemini**: Get your API key from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### 3. Run the Development Server

```bash
npm run dev
# or
pnpm dev
```

### 4. Use the Application

Open [http://localhost:3000](http://localhost:3000) in your browser and:

1. Enter your `PUBLISH_PASSWORD` in the password field
2. Fill in your article details:
   - **Title**: Your article title
   - **Content**: Your article in Markdown format
   - **Tags**: Comma-separated tags (e.g., `javascript, webdev, tutorial`)
   - **Publish as draft**: Check to publish as draft (recommended for testing)
   - **Platforms**: Select which platforms to publish to
3. Click "Publish Article"
4. View results for each platform

## Usage

### 📝 Managing Ideas

#### Add a New Idea

```bash
curl -X POST 'http://localhost:3000/api/ideas' \
  -H 'Content-Type: application/json' \
  -H 'x-publish-password: YOUR_PASSWORD' \
  -d '{
    "title": "Introduction to React Hooks",
    "description": "A comprehensive guide to using React Hooks including useState, useEffect, and custom hooks",
    "tags": ["react", "javascript", "tutorial"]
  }'
```

The system will:
- Generate an embedding for your idea
- Check if similar ideas already exist (>85% similarity)
- Reject duplicates or store the idea in the vector database

#### Get All Ideas

```bash
curl -X GET 'http://localhost:3000/api/ideas' \
  -H 'x-publish-password: YOUR_PASSWORD'
```

#### Delete an Idea

```bash
curl -X DELETE 'http://localhost:3000/api/ideas?id=IDEA_ID' \
  -H 'x-publish-password: YOUR_PASSWORD'
```

### 🤖 Automated Publishing (Cron Job)

The system automatically publishes daily at 9 AM UTC. To manually trigger:

```bash
curl -X POST 'http://localhost:3000/api/cron/publish' \
  -H 'Authorization: Bearer YOUR_CRON_SECRET'
```

The cron job will:
1. Select the most unique unused idea (using cosine similarity)
2. Generate a complete blog post using Gemini 1.5 Pro
3. Publish to all platforms (Dev.to and Hashnode)
4. Mark the idea as used

### 📤 Manual Publishing

#### Web Interface

1. Open the application in your browser
2. Enter your publish password
3. Fill in the article details (title, content in Markdown, tags)
4. Select which platforms to publish to
5. Click "Publish Article"

### API Usage

Publish to multiple platforms simultaneously:

```bash
curl -X POST \
  'http://localhost:3000/api/publish-multi' \
  -H 'Content-Type: application/json' \
  -H 'x-publish-password: YOUR_PASSWORD' \
  -d '{
    "title": "My Article Title",
    "content": "# Hello World\n\nThis is my article.",
    "tags": ["tech", "tutorial"],
    "is_draft": true,
    "platforms": ["devto", "hashnode"]
  }'
```

Response format:
```json
{
  "results": [
    {
      "platform": "devto",
      "success": true,
      "article": { /* platform response */ }
    },
    {
      "platform": "hashnode",
      "success": true,
      "article": { /* platform response */ }
    }
  ]
}
```

## 🏗️ Architecture

### Idea Management Flow

```
New Idea → Generate Embedding → Check Similarity → Store in Vector DB
                                        ↓
                                  (>85% similar)
                                        ↓
                                   Reject Idea
```

### Automated Publishing Flow

```
Cron Trigger → Select Unique Idea → Generate Content → Publish → Mark as Used
                      ↓
            (Cosine Similarity Check)
                      ↓
          Compare with recent 5 posts
```

### Components

- **Vector Database**: Pinecone for storing idea embeddings
- **Embeddings**: Xenova/all-MiniLM-L6-v2 (local, no API calls!)
- **Content Generation**: Google Gemini 1.5 Pro
- **Similarity Threshold**: 0.85 (ideas with >85% similarity are rejected)
- **Publishing**: Parallel publishing to Dev.to and Hashnode

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ideas` | POST | Add a new blog idea |
| `/api/ideas` | GET | Get all ideas |
| `/api/ideas?id={id}` | DELETE | Delete an idea |
| `/api/publish-multi` | POST | Publish to multiple platforms |
| `/api/cron/publish` | POST | Automated content generation & publishing |

## 🔧 Configuration

### Cron Schedule

Edit `vercel.json` to change the publishing schedule:

```json
{
  "crons": [
    {
      "path": "/api/cron/publish",
      "schedule": "0 9 * * *"  // Daily at 9 AM UTC
    }
  ]
}
```

### Similarity Threshold

Adjust in `/lib/embeddings.ts`:

```typescript
export function isIdeaUnique(
  maxSimilarity: number,
  threshold: number = 0.85  // Adjust this value
): boolean {
  return maxSimilarity < threshold;
}
```
    }
  ]
}
```

## ✨ Features

- 📝 **Markdown Support**: Write your content once in Markdown
- 🚀 **Multi-Platform Publishing**: Publish to Dev.to and Hashnode simultaneously
- 🤖 **AI Content Generation**: Automated blog post creation using Gemini 1.5 Pro
- 🧠 **Smart Idea Management**: Vector database with similarity detection
- 📊 **Cosine Similarity**: Ensures unique content selection
- ⏰ **Automated Workflow**: Vercel cron jobs for scheduled publishing
- 🔒 **Password Protected**: Simple password-based authentication
- 🎯 **Draft Mode**: Publish as drafts for review before going live
- 🌐 **Web Interface & API**: Use the web UI or integrate via API
- ⚡ **Parallel Publishing**: Publishes to all platforms concurrently for speed

## 🧪 Testing

### Testing Idea Management

```bash
# Add a test idea
curl -X POST 'http://localhost:3000/api/ideas' \
  -H 'Content-Type: application/json' \
  -H 'x-publish-password: YOUR_PASSWORD' \
  -d '{
    "title": "Understanding TypeScript Generics",
    "description": "A deep dive into TypeScript generics with practical examples",
    "tags": ["typescript", "programming", "tutorial"]
  }'

# Get all ideas
curl -X GET 'http://localhost:3000/api/ideas' \
  -H 'x-publish-password: YOUR_PASSWORD'
```

### Testing Manual Publishing

```bash
curl -X POST 'http://localhost:3000/api/publish-multi' \
  -H 'Content-Type: application/json' \
  -H 'x-publish-password: YOUR_PASSWORD' \
  -d '{
    "title": "Test Article",
    "content": "# Hello World\n\nThis is a test.",
    "tags": ["test"],
    "is_draft": true,
    "platforms": ["devto", "hashnode"]
  }'
```

### Testing Automated Publishing

```bash
# Trigger cron job manually
curl -X POST 'http://localhost:3000/api/cron/publish' \
  -H 'Authorization: Bearer YOUR_CRON_SECRET'
```

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository to Vercel
3. Add the required environment variables in Vercel project settings
4. Deploy

**Required Environment Variables:**
- `PUBLISH_PASSWORD`
- `DEV_TO_API_KEY`
- `HASHNODE_API_KEY`
- `HASHNODE_PUBLICATION_ID`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `GEMINI_API_KEY`
- `CRON_SECRET`

### Setting Up Cron Jobs

Vercel will automatically detect the `vercel.json` configuration and set up the cron job. The default schedule is daily at 9 AM UTC.

To modify the schedule, edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/publish",
      "schedule": "0 9 * * *"  // Cron expression
    }
  ]
}
```

## 📚 Platform-Specific Notes

### Dev.to
- Uses REST API
- Requires API key from settings/extensions
- Supports markdown in `body_markdown` field
- Draft control via `published` boolean

### Hashnode
- Uses GraphQL API
- Requires API key and Publication ID
- Supports markdown in `contentMarkdown` field
- Draft control via `publishedAt` timestamp (omit for draft)

## 🔍 Troubleshooting

### Ideas Not Being Selected

- Check that you have unused ideas in the database
- Verify Gemini API key is configured correctly
- Check cron job logs in Vercel dashboard

### Publishing Failures

- Verify all platform API keys are correct
- Check platform-specific API rate limits
- Ensure PUBLISH_PASSWORD is set correctly

### Similarity Check Issues

- Adjust threshold in `/lib/embeddings.ts` if needed
- Default threshold is 0.85 (85% similarity)
- Lower threshold = more strict uniqueness checking

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

