import { db } from './storage';
import { moderationQueue, type InsertModerationQueue } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Simple profanity filter implementation
const badWords = [
  'spam', 'scam', 'fake', 'bot', 'follow4follow', 'f4f', 'l4l', 'like4like',
  'sub4sub', 'subscribe4subscribe', 'buy followers', 'free followers',
  'hate', 'violence', 'discrimination', 'harassment', 'bullying',
  'fuck', 'shit', 'damn', 'bitch', 'asshole'
];

const isProfane = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return badWords.some(word => lowerText.includes(word));
};

const cleanText = (text: string): string => {
  let cleanedText = text;
  badWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    cleanedText = cleanedText.replace(regex, '*'.repeat(word.length));
  });
  return cleanedText;
};



interface ModerationResult {
  isClean: boolean;
  filteredContent?: string;
  issues: string[];
  severity: 'low' | 'medium' | 'high';
}

export function moderateContent(content: string, type: 'comment' | 'service' | 'general' = 'general'): ModerationResult {
  const issues: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';

  // Check for profanity
  if (isProfane(content)) {
    issues.push('Contains inappropriate language');
    severity = 'high';
  }

  // Check for excessive caps (spam indicator)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.6 && content.length > 10) {
    issues.push('Excessive use of capital letters');
    severity = severity === 'high' ? 'high' : 'medium';
  }

  // Check for excessive punctuation
  const punctuationRatio = (content.match(/[!?.,;:]/g) || []).length / content.length;
  if (punctuationRatio > 0.3) {
    issues.push('Excessive punctuation usage');
    severity = severity === 'high' ? 'high' : 'medium';
  }

  // Check for repetitive characters (like "aaaaa" or "!!!!")
  if (/(.)\1{4,}/.test(content)) {
    issues.push('Repetitive characters detected');
    severity = severity === 'high' ? 'high' : 'medium';
  }

  // Check for URLs in comments (potential spam)
  if (type === 'comment' && /(https?:\/\/|www\.|\.com|\.org|\.net)/i.test(content)) {
    issues.push('Contains URLs or web addresses');
    severity = severity === 'high' ? 'high' : 'medium';
  }

  // Check comment length for type-specific rules
  if (type === 'comment') {
    if (content.length > 280) {
      issues.push('Comment exceeds maximum length (280 characters)');
      severity = severity === 'high' ? 'high' : 'medium';
    }
    if (content.length < 3) {
      issues.push('Comment too short (minimum 3 characters)');
      severity = severity === 'high' ? 'high' : 'medium';
    }
  }

  // Check for promotional content
  const promoKeywords = ['buy', 'sale', 'discount', 'promo', 'offer', 'deal', 'cheap', 'free', 'win', 'contest'];
  const hasPromoContent = promoKeywords.some(keyword => 
    content.toLowerCase().includes(keyword)
  );
  if (hasPromoContent && type === 'comment') {
    issues.push('Appears to contain promotional content');
    severity = severity === 'high' ? 'high' : 'medium';
  }

  const isClean = issues.length === 0;
  const filteredContent = isClean ? content : cleanText(content);

  return {
    isClean,
    filteredContent,
    issues,
    severity
  };
}

export async function queueForModeration(
  contentType: 'comment' | 'service' | 'user_report',
  contentId: number,
  content: string
): Promise<number> {
  const moderationData: InsertModerationQueue = {
    contentType,
    contentId,
    content,
    status: 'pending'
  };

  const result = await db.insert(moderationQueue).values(moderationData).returning();
  return result[0].id;
}

export async function approveContent(moderationId: number, moderatorId: number, reason?: string): Promise<void> {
  await db.update(moderationQueue)
    .set({
      status: 'approved',
      moderatorId,
      reason,
      moderatedAt: new Date()
    })
    .where(eq(moderationQueue.id, moderationId));
}

export async function rejectContent(moderationId: number, moderatorId: number, reason: string): Promise<void> {
  await db.update(moderationQueue)
    .set({
      status: 'rejected',
      moderatorId,
      reason,
      moderatedAt: new Date()
    })
    .where(eq(moderationQueue.id, moderationId));
}

// Auto-moderate content based on severity
export async function autoModerate(
  contentType: 'comment' | 'service' | 'user_report',
  contentId: number,
  content: string
): Promise<{ approved: boolean; needsReview: boolean; moderationId?: number }> {
  const moderation = moderateContent(content, contentType);

  if (moderation.isClean) {
    return { approved: true, needsReview: false };
  }

  // Auto-reject high severity content
  if (moderation.severity === 'high') {
    return { approved: false, needsReview: false };
  }

  // Queue medium/low severity for manual review
  const moderationId = await queueForModeration(contentType, contentId, content);
  return { approved: false, needsReview: true, moderationId };
}

export function validateCommentText(comment: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!comment || comment.trim().length === 0) {
    errors.push('Comment cannot be empty');
  }

  if (comment.length > 280) {
    errors.push('Comment exceeds maximum length of 280 characters');
  }

  if (comment.length < 3) {
    errors.push('Comment must be at least 3 characters long');
  }

  const moderation = moderateContent(comment, 'comment');
  if (!moderation.isClean) {
    errors.push(...moderation.issues);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}