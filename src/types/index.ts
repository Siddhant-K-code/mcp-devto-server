export interface DevToArticle {
  id: number;
  title: string;
  description: string;
  body_markdown: string;
  tags: string[];
  url: string;
  reading_time_minutes: number;
  published_at: string;
  edited_at: string | null;
  comments_count: number;
  public_reactions_count: number;
  user: DevToUser;
}

export interface DevToUser {
  name: string;
  username: string;
  summary: string;
  website_url: string | null;
  joined_at: string;
}

export interface DevToComment {
  [x: string]: any;
  id: number;
  parent_id: number | null;
  body_html: string;
  created_at: string;
  children: DevToComment[];
}


// Context Types
export interface TechnicalContext {
  depth: 'beginner' | 'intermediate' | 'advanced';
  codeBlockCount: number;
  technicalTerms: {
    beginner: string[];
    intermediate: string[];
    advanced: string[];
  };
  prerequisites: string[];
}

export interface ContentContext {
  type: 'tutorial' | 'conceptual' | 'opinion' | 'discussion' | 'general';
  structure: {
    hasIntroduction: boolean;
    hasConclusion: boolean;
    sections: string[];
  };
  topics: string[];
}

export interface AuthorContext {
  name: string;
  expertise: string[];
  credibility: {
    joinDate: string;
    articleCount: number;
    averageReactions: number;
  };
}

export interface DiscussionContext {
  quality: 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  expertContributions: {
    count: number;
    authors: string[];
  };
}
