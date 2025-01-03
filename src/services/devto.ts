import axios from 'axios';
import type { DevToArticle, DevToComment, DevToUser } from '../types/index.js';

export class DevToAPI {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://dev.to/api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers() {
    return {
      'api-key': this.apiKey
    };
  }

  async getArticleByUrl(url: string): Promise<DevToArticle> {
    // Extract article ID from URL
    const urlParts = url.split('/');
    const articleId = urlParts[urlParts.length - 1];

    const response = await axios.get(`${this.baseUrl}/articles/${articleId}`, {
      headers: this.headers
    });

    return response.data;
  }

  async getArticleComments(articleId: number): Promise<DevToComment[]> {
    const response = await axios.get(`${this.baseUrl}/comments`, {
      headers: this.headers,
      params: {
        a_id: articleId
      }
    });

    return this.buildCommentTree(response.data);
  }

  async getUserArticles(username: string, page = 1): Promise<DevToArticle[]> {
    const response = await axios.get(`${this.baseUrl}/articles`, {
      headers: this.headers,
      params: {
        username,
        page,
        per_page: 30
      }
    });

    return response.data;
  }

  async getUserInfo(username: string): Promise<DevToUser> {
    const response = await axios.get(`${this.baseUrl}/users/by_username`, {
      headers: this.headers,
      params: {
        url: username
      }
    });

    return response.data;
  }

  async getArticleTags(articleId: number): Promise<string[]> {
    const response = await axios.get(`${this.baseUrl}/articles/${articleId}`, {
      headers: this.headers
    });

    return response.data.tags;
  }

  async searchArticles(query: string, page = 1): Promise<DevToArticle[]> {
    const response = await axios.get(`${this.baseUrl}/articles`, {
      headers: this.headers,
      params: {
        q: query,
        page,
        per_page: 30
      }
    });

    return response.data;
  }

  // Helper function to build a tree structure of comments
  private buildCommentTree(comments: DevToComment[]): DevToComment[] {
    const commentMap = new Map<number, DevToComment>();
    const rootComments: DevToComment[] = [];

    // First pass: create map of all comments
    comments.forEach(comment => {
      comment.children = [];
      commentMap.set(comment.id, comment);
    });

    // Second pass: build the tree structure
    comments.forEach(comment => {
      if ('parent_id' in comment && comment['parent_id']) {
        const parentComment = commentMap.get(comment['parent_id']);
        if (parentComment) {
          parentComment.children.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  }

  // Helper method to handle API errors
  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`Dev.to API Error: ${error.response.status} - ${error.response.data.message || 'Unknown error'}`);
      } else if (error.request) {
        throw new Error('Network Error: Unable to reach Dev.to API');
      }
    }
    throw error;
  }

  // Rate limiting helper
  private async rateLimitedRequest(requestFn: () => Promise<any>) {
    try {
      return await requestFn();
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        // Handle rate limiting
        const retryAfter = parseInt(error.response.headers['retry-after'] || '30');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return await requestFn();
      }
      throw this.handleError(error);
    }
  }

  // Cache management
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private async getCached<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }

    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }
}