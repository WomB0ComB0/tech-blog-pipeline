import type { NextApiRequest, NextApiResponse } from 'next';

interface PublishRequest {
  title: string;
  content: string;
  tags: string[];
  is_draft?: boolean;
  platforms: ('devto' | 'hashnode')[];
}

interface PublishResult {
  platform: string;
  success: boolean;
  article?: any;
  error?: string;
}

interface PublishResponse {
  results: PublishResult[];
}

// Validate password middleware
const validatePassword = (req: NextApiRequest): boolean => {
  const providedPassword = req.headers['x-publish-password'];
  const expectedPassword = process.env.PUBLISH_PASSWORD;
  return providedPassword === expectedPassword;
}

async function publishToDevTo(data: PublishRequest): Promise<any> {
  const apiKey = process.env.DEV_TO_API_KEY;
  if (!apiKey) {
    throw new Error('DEV_TO_API_KEY not configured');
  }

  const response = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      article: {
        title: data.title,
        body_markdown: data.content,
        tags: data.tags,
        published: !data.is_draft,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }

  return await response.json();
}

async function publishToHashnode(data: PublishRequest): Promise<any> {
  const apiKey = process.env.HASHNODE_API_KEY;
  if (!apiKey) {
    throw new Error('HASHNODE_API_KEY not configured');
  }

  // Hashnode uses GraphQL API
  const mutation = `
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post {
          id
          title
          url
          slug
        }
      }
    }
  `;

  const variables = {
    input: {
      title: data.title,
      contentMarkdown: data.content,
      tags: data.tags.map(tag => ({ name: tag, slug: tag.toLowerCase().replace(/\s+/g, '-') })),
      publicationId: process.env.HASHNODE_PUBLICATION_ID,
      ...(data.is_draft ? {} : { publishedAt: new Date().toISOString() })
    }
  };

  const response = await fetch('https://gql.hashnode.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({
      query: mutation,
      variables,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(JSON.stringify(result.errors));
  }

  return result.data.publishPost.post;
}

export default async function publishMulti(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  // Validate password
  if (!validatePassword(req)) {
    return res.status(401).json({ error: { message: 'Invalid password' } })
  }

  try {
    // Validate request body
    const { title, content, tags, is_draft, platforms } = req.body as PublishRequest;

    if (!title || !content || !Array.isArray(tags)) {
      return res.status(400).json({
        error: { message: 'Missing required fields: title, content, or tags' }
      });
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        error: { message: 'At least one platform must be specified' }
      });
    }

    const publishData: PublishRequest = { title, content, tags, is_draft, platforms };
    const results: PublishResult[] = [];

    // Publish to each platform in parallel
    const promises = platforms.map(async (platform) => {
      try {
        let article;
        if (platform === 'devto') {
          article = await publishToDevTo(publishData);
        } else if (platform === 'hashnode') {
          article = await publishToHashnode(publishData);
        } else {
          throw new Error(`Unsupported platform: ${platform}`);
        }

        return {
          platform,
          success: true,
          article,
        };
      } catch (err) {
        return {
          platform,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    });

    const publishResults = await Promise.all(promises);

    return res.status(200).json({
      results: publishResults,
    });

  } catch (err) {
    console.error('Error publishing:', err);
    return res.status(500).json({
      error: {
        message: err instanceof Error ? err.message : 'An internal server error occurred'
      },
    });
  }
}
