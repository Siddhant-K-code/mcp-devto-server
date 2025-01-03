import {
  TechnicalContext,
  ContentContext,
  AuthorContext,
  DiscussionContext
} from '../types/index.js';

// Technical term dictionaries
const technicalTerms = {
  beginner: ['function', 'variable', 'loop', 'if statement', 'array'],
  intermediate: ['recursion', 'middleware', 'authentication', 'API', 'database'],
  advanced: ['distributed systems', 'microservices', 'kubernetes', 'machine learning', 'blockchain']
};

export function analyzeTechnicalDepth(content: string): TechnicalContext {
  const codeBlockCount = (content.match(/```[\s\S]*?```/g) || []).length;

  const foundTerms = {
    beginner: technicalTerms.beginner.filter(term => content.toLowerCase().includes(term.toLowerCase())),
    intermediate: technicalTerms.intermediate.filter(term => content.toLowerCase().includes(term.toLowerCase())),
    advanced: technicalTerms.advanced.filter(term => content.toLowerCase().includes(term.toLowerCase()))
  };

  let depth: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  if (foundTerms.advanced.length > 2 || codeBlockCount > 5) {
    depth = 'advanced';
  } else if (foundTerms.intermediate.length > 3 || codeBlockCount > 2) {
    depth = 'intermediate';
  }

  return {
    depth,
    codeBlockCount,
    technicalTerms: foundTerms,
    prerequisites: extractPrerequisites(content)
  };
}

export function analyzeContent(title: string, content: string): ContentContext {
  return {
    type: determineContentType(title, content),
    structure: {
      hasIntroduction: hasIntroduction(content),
      hasConclusion: hasConclusion(content),
      sections: extractSections(content)
    },
    topics: extractTopics(content)
  };
}

export function analyzeAuthor(author: any, articles: any[]): AuthorContext {
  return {
    name: author.name,
    expertise: determineExpertise(articles),
    credibility: {
      joinDate: author.joined_at,
      articleCount: articles.length,
      averageReactions: calculateAverageReactions(articles)
    }
  };
}

export function analyzeDiscussion(comments: any[]): DiscussionContext {
  return {
    quality: determineDiscussionQuality(comments),
    sentiment: analyzeCommentSentiment(comments),
    topics: extractDiscussionTopics(comments),
    expertContributions: {
      count: comments.filter(c => c.body_markdown.length > 300).length,
      authors: Array.from(new Set(comments.filter(c => c.body_markdown.length > 300)
        .map(c => c.user.username)))
    }
  };
}

// Helper functions
function extractPrerequisites(content: string): string[] {
  const prerequisites: string[] = [];
  const prerequisiteSection = content.match(/prerequisites?:?([\s\S]*?)(?=##|$)/i);

  if (prerequisiteSection) {
    const items = prerequisiteSection[1].match(/[-*]\s*(.*)/g);
    if (items) {
      prerequisites.push(...items.map(item => item.replace(/[-*]\s*/, '').trim()));
    }
  }

  return prerequisites;
}

function determineContentType(title: string, content: string): ContentContext['type'] {
  const patterns = {
    tutorial: /how[ -]to|guide|tutorial|step[ -]by[ -]step/i,
    conceptual: /understanding|explained|introduction|fundamentals/i,
    opinion: /opinion|thoughts|perspective|why (i|we)|my take/i,
    discussion: /discuss|thoughts on|what do you think/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(title) || pattern.test(content.slice(0, 500))) {
      return type as ContentContext['type'];
    }
  }

  return 'general';
}

function hasIntroduction(content: string): boolean {
  const firstSection = content.split('##')[0].toLowerCase();
  return firstSection.includes('introduction') || firstSection.length > 200;
}

function hasConclusion(content: string): boolean {
  const lastSection = content.split('##').pop()?.toLowerCase() || '';
  return lastSection.includes('conclusion') ||
         lastSection.includes('summary') ||
         lastSection.includes('final thoughts');
}

function extractSections(content: string): string[] {
  const sections = content.match(/##\s*(.*)/g) || [];
  return sections.map(section => section.replace('##', '').trim());
}

function extractTopics(content: string): string[] {
  const topics = new Set<string>();

  const headings = content.match(/##\s*(.*)/g) || [];
  headings.forEach(heading => topics.add(heading.replace('##', '').trim()));

  const emphasized = content.match(/\*\*(.*?)\*\*/g) || [];
  emphasized.forEach(text => topics.add(text.replace(/\*\*/g, '').trim()));

  return Array.from(topics);
}

function determineExpertise(articles: any[]): string[] {
  const tagCounts = new Map<string, number>();

  articles.forEach(article => {
    article.tags.forEach((tag: string) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
}

function calculateAverageReactions(articles: any[]): number {
  if (articles.length === 0) return 0;

  const total = articles.reduce((sum, article) => sum + article.public_reactions_count, 0);
  return Math.round(total / articles.length);
}

function determineDiscussionQuality(comments: any[]): DiscussionContext['quality'] {
  if (!comments.length) return 'low';

  const avgLength = comments.reduce((sum, comment) =>
    sum + comment.body_markdown.length, 0) / comments.length;

  const hasCodeBlocks = comments.some(comment =>
    comment.body_markdown.includes('```'));

  const hasLinks = comments.some(comment =>
    comment.body_markdown.includes('http'));

  if (avgLength > 200 && (hasCodeBlocks || hasLinks)) {
    return 'high';
  } else if (avgLength > 100) {
    return 'medium';
  }
  return 'low';
}

function analyzeCommentSentiment(comments: any[]): DiscussionContext['sentiment'] {
  const positivePatterns = /great|awesome|thanks|helpful|good|excellent/i;
  const negativePatterns = /bad|wrong|incorrect|disagree|issue|problem/i;

  let positiveCount = 0;
  let negativeCount = 0;

  comments.forEach(comment => {
    if (positivePatterns.test(comment.body_markdown)) positiveCount++;
    if (negativePatterns.test(comment.body_markdown)) negativeCount++;
  });

  if (positiveCount > negativeCount * 2) return 'positive';
  if (negativeCount > positiveCount * 2) return 'negative';
  return 'neutral';
}

function extractDiscussionTopics(comments: any[]): string[] {
  const topics = new Set<string>();

  comments.forEach(comment => {
    const words = comment.body_markdown.split(/\W+/);
    words.forEach((word: string) => {
      if (word.length > 4) topics.add(word.toLowerCase());
    });
  });

  return Array.from(topics).slice(0, 10);
}
