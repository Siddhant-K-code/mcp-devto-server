// src/server.ts
import { createServer, createFunction, MCPRequest } from '@modelcontextprotocol/sdk';
import { DevToAPI } from './services/devto.js';
import {
  analyzeTechnicalDepth,
  analyzeContent,
  analyzeAuthor,
  analyzeDiscussion
} from './utils/analysis.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let devToAPI: DevToAPI;

// Initialize the Dev.to API service
async function initializeServer() {
  try {
    devToAPI = await DevToAPI.initialize();
    startServer();
  } catch (error) {
    console.error('Failed to initialize Dev.to API:', error);
    process.exit(1);
  }
}

function startServer() {
  // Function to analyze Dev.to articles
  const analyzeArticle = createFunction({
    name: 'analyze_article',
    description: 'Analyze a Dev.to article and provide comprehensive context about its content, author, and technical details',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Dev.to article URL' }
      },
      required: ['url']
    },
    handler: async (request: MCPRequest) => {
      try {
        // Get article data
        const article = await devToAPI.getArticleByUrl(request.parameters.url);

        // Get author's articles for expertise analysis
        const authorArticles = await devToAPI.getUserArticles(article.user.username);

        // Get article comments
        const comments = await devToAPI.getArticleComments(article.id);

        // Perform comprehensive analysis
        const technicalContext = analyzeTechnicalDepth(article.body_markdown);
        const contentContext = analyzeContent(article.title, article.body_markdown);
        const authorContext = analyzeAuthor(article.user, authorArticles);
        const discussionContext = analyzeDiscussion(comments);

        return {
          type: 'success',
          data: {
            article: {
              title: article.title,
              description: article.description,
              publishedAt: article.published_at,
              tags: article.tags,
              readingTime: article.reading_time_minutes
            },
            technical: technicalContext,
            content: contentContext,
            author: authorContext,
            discussion: discussionContext,
            metadata: {
              url: article.url,
              reactions: article.public_reactions_count,
                comments: article.comments_count
            }
          }
        };
      } catch (error: any) {
        return {
          type: 'error',
          message: error.message
        };
      }
    }
  });

  // Function to analyze user profiles
  const analyzeUser = createFunction({
    name: 'analyze_user',
    description: 'Analyze a Dev.to user profile and provide context about their expertise and contributions',
    parameters: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Dev.to username' }
      },
      required: ['username']
    },
    handler: async (request: MCPRequest) => {
      try {
        const user = await devToAPI.getUserInfo(request.parameters.username);
        const articles = await devToAPI.getUserArticles(request.parameters.username);

        const authorContext = analyzeAuthor(user, articles);

        return {
          type: 'success',
          data: {
            profile: {
              name: user.name,
              username: user.username,
              bio: user.summary,
              joinedAt: user.joined_at
            },
            expertise: authorContext.expertise,
            contributions: {
              articleCount: articles.length,
              totalReactions: articles.reduce((sum, article) => sum + article.public_reactions_count, 0),
              averageReactions: authorContext.credibility.averageReactions,
              topTags: articles
                .flatMap(article => article.tags)
                .reduce((acc, tag) => {
                  acc[tag] = (acc[tag] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
            }
          }
        };
      } catch (error: any) {
        return {
          type: 'error',
          message: error.message
        };
      }
    }
  });

  // Function to analyze article discussions
  const analyzeArticleDiscussion = createFunction({
    name: 'analyze_discussion',
    description: 'Analyze the discussion/comments section of a Dev.to article',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Dev.to article URL' }
      },
      required: ['url']
    },
    handler: async (request: MCPRequest) => {
      try {
        const article = await devToAPI.getArticleByUrl(request.parameters.url);
        const comments = await devToAPI.getArticleComments(article.id);

        const discussionContext = analyzeDiscussion(comments);

        return {
          type: 'success',
          data: {
            article: {
              title: article.title,
              url: article.url
            },
            discussion: discussionContext,
            metrics: {
              totalComments: comments.length,
              threadCount: comments.filter(comment => !comment['parent_id']).length,
              participantCount: new Set(comments.map(comment => comment.user.username)).size
            }
          }
        };
      } catch (error: any) {
        return {
          type: 'error',
          message: error.message
        };
      }
    }
  });

  // Create and start the MCP server
  const server = createServer({
    name: 'Dev.to Context Provider',
    version: '1.0.0',
    description: 'Provides comprehensive context about Dev.to content, including technical analysis, author expertise, and discussion quality',
    functions: [
      analyzeArticle,
      analyzeUser,
      analyzeArticleDiscussion
    ]
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Dev.to Context Provider running on port ${port}`);
    console.log('API key verified and connection established');
  });
}

// Start the server
initializeServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
