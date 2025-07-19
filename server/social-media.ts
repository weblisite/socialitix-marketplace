import { db } from './storage';
import { socialMediaAccounts, actionAssignments, type InsertSocialMediaAccount } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// Social Media API Configuration
interface SocialMediaConfig {
  platform: string;
  apiEndpoint?: string;
  authRequired: boolean;
  verificationMethods: string[];
}

const PLATFORM_CONFIGS: Record<string, SocialMediaConfig> = {
  instagram: {
    platform: 'instagram',
    apiEndpoint: 'https://graph.instagram.com',
    authRequired: true,
    verificationMethods: ['api', 'screenshot']
  },
  youtube: {
    platform: 'youtube',
    apiEndpoint: 'https://www.googleapis.com/youtube/v3',
    authRequired: true,
    verificationMethods: ['api', 'screenshot']
  },
  twitter: {
    platform: 'twitter',
    apiEndpoint: 'https://api.twitter.com/2',
    authRequired: true,
    verificationMethods: ['api', 'screenshot']
  },
  tiktok: {
    platform: 'tiktok',
    authRequired: false,
    verificationMethods: ['screenshot', 'manual']
  }
};

interface VerificationResult {
  success: boolean;
  method: 'api' | 'screenshot' | 'manual';
  data?: any;
  error?: string;
  needsManualReview?: boolean;
}

// Link social media account for a user
export async function linkSocialMediaAccount(
  userId: number,
  platform: string,
  username: string,
  accessToken?: string
): Promise<{ success: boolean; accountId?: number; error?: string }> {
  try {
    const accountData: InsertSocialMediaAccount = {
      userId,
      platform,
      username,
      accessToken,
      isVerified: false
    };

    const result = await db.insert(socialMediaAccounts).values(accountData).returning();
    
    return { success: true, accountId: result[0].id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get linked accounts for a user
export async function getUserSocialAccounts(userId: number) {
  return await db.select({
    id: socialMediaAccounts.id,
    platform: socialMediaAccounts.platform,
    username: socialMediaAccounts.username,
    isVerified: socialMediaAccounts.isVerified,
    lastSync: socialMediaAccounts.lastSync,
  }).from(socialMediaAccounts)
    .where(eq(socialMediaAccounts.userId, userId));
}

// Verify action completion (mock implementation for now)
export async function verifyActionCompletion(
  assignmentId: number,
  actionType: string,
  platform: string,
  targetUrl: string,
  providerId: number,
  proofData?: any
): Promise<VerificationResult> {
  
  // For demonstration, we'll implement basic verification logic
  // In production, this would integrate with actual social media APIs
  
  const config = PLATFORM_CONFIGS[platform];
  if (!config) {
    return { success: false, method: 'manual', error: 'Platform not supported' };
  }

  try {
    // Check if provider has linked account for this platform
    const linkedAccount = await db.select()
      .from(socialMediaAccounts)
      .where(and(
        eq(socialMediaAccounts.userId, providerId),
        eq(socialMediaAccounts.platform, platform)
      ))
      .limit(1);

    if (!linkedAccount.length) {
      return { 
        success: false, 
        method: 'manual', 
        error: 'Provider must link their social media account first',
        needsManualReview: true
      };
    }

    // Mock API verification (in production, this would call actual APIs)
    if (config.authRequired && linkedAccount[0].accessToken) {
      return await mockApiVerification(actionType, platform, targetUrl, linkedAccount[0]);
    }

    // Fallback to manual verification
    return {
      success: true,
      method: 'manual',
      needsManualReview: true,
      data: { requiresManualVerification: true }
    };

  } catch (error) {
    return { 
      success: false, 
      method: 'manual', 
      error: error instanceof Error ? error.message : 'Verification failed' 
    };
  }
}

// Mock API verification for demonstration
async function mockApiVerification(
  actionType: string,
  platform: string,
  targetUrl: string,
  account: any
): Promise<VerificationResult> {
  
  // Simulate API delays
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock verification logic based on action type
  switch (actionType) {
    case 'followers':
      return {
        success: true,
        method: 'api',
        data: { 
          verified: true, 
          followerCount: Math.floor(Math.random() * 1000),
          verifiedAt: new Date().toISOString()
        }
      };
      
    case 'likes':
      return {
        success: true,
        method: 'api',
        data: { 
          verified: true,
          likeConfirmed: true,
          likeId: `like_${Math.random().toString(36).substr(2, 9)}`,
          verifiedAt: new Date().toISOString()
        }
      };
      
    case 'comments':
      return {
        success: true,
        method: 'api',
        data: { 
          verified: true,
          commentId: `comment_${Math.random().toString(36).substr(2, 9)}`,
          commentText: 'Verified comment posted',
          verifiedAt: new Date().toISOString()
        }
      };
      
    case 'views':
      return {
        success: true,
        method: 'api',
        data: { 
          verified: true,
          viewCount: Math.floor(Math.random() * 500),
          verifiedAt: new Date().toISOString()
        }
      };
      
    default:
      return {
        success: false,
        method: 'api',
        error: 'Action type not supported for API verification',
        needsManualReview: true
      };
  }
}

// Extract useful information from URLs for different platforms
export function parseTargetUrl(url: string): { platform: string; type: string; id: string } | null {
  try {
    const urlObj = new URL(url);
    
    // Instagram parsing
    if (urlObj.hostname.includes('instagram.com')) {
      if (urlObj.pathname.includes('/p/')) {
        const postId = urlObj.pathname.split('/p/')[1].split('/')[0];
        return { platform: 'instagram', type: 'post', id: postId };
      }
      if (urlObj.pathname !== '/') {
        const username = urlObj.pathname.split('/')[1];
        return { platform: 'instagram', type: 'profile', id: username };
      }
    }
    
    // YouTube parsing
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      if (urlObj.searchParams.has('v')) {
        const videoId = urlObj.searchParams.get('v')!;
        return { platform: 'youtube', type: 'video', id: videoId };
      }
      if (urlObj.hostname.includes('youtu.be')) {
        const videoId = urlObj.pathname.substring(1);
        return { platform: 'youtube', type: 'video', id: videoId };
      }
    }
    
    // Twitter parsing
    if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.includes('status')) {
        const tweetId = pathParts[pathParts.indexOf('status') + 1];
        return { platform: 'twitter', type: 'tweet', id: tweetId };
      }
      if (pathParts.length >= 2) {
        const username = pathParts[1];
        return { platform: 'twitter', type: 'profile', id: username };
      }
    }
    
    // TikTok parsing
    if (urlObj.hostname.includes('tiktok.com')) {
      if (urlObj.pathname.includes('/video/')) {
        const videoId = urlObj.pathname.split('/video/')[1];
        return { platform: 'tiktok', type: 'video', id: videoId };
      }
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length >= 2 && pathParts[1].startsWith('@')) {
        const username = pathParts[1];
        return { platform: 'tiktok', type: 'profile', id: username };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Get platform-specific instructions for providers
export function getActionInstructions(actionType: string, platform: string, targetUrl: string, commentText?: string): string {
  const parsedUrl = parseTargetUrl(targetUrl);
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
  
  switch (actionType) {
    case 'followers':
      return `Follow the ${platformName} account at: ${targetUrl}. Make sure to use your authentic account and don't unfollow later.`;
      
    case 'likes':
      if (parsedUrl?.type === 'post' || parsedUrl?.type === 'video' || parsedUrl?.type === 'tweet') {
        return `Like the ${parsedUrl.type} at: ${targetUrl}. Use your authentic account to like the content.`;
      }
      return `Like the content at: ${targetUrl}. Use your authentic account.`;
      
    case 'comments':
      const commentInstruction = commentText ? 
        `Post this exact comment: "${commentText}"` : 
        'Post a meaningful, relevant comment';
      return `Comment on the content at: ${targetUrl}. ${commentInstruction}. Be authentic and respectful.`;
      
    case 'views':
      return `View the content at: ${targetUrl}. Watch/view the entire content to ensure it counts.`;
      
    case 'subscribers':
      return `Subscribe to the ${platformName} channel/account at: ${targetUrl}. Use your authentic account.`;
      
    case 'reposts':
    case 'shares':
      return `Share/repost the content at: ${targetUrl} on your ${platformName} account. Add your own authentic caption if desired.`;
      
    default:
      return `Complete the requested ${actionType} action at: ${targetUrl}. Follow platform guidelines and use authentic engagement.`;
  }
}

// Check if a platform supports a specific action type
export function isPlatformActionSupported(platform: string, actionType: string): boolean {
  const supportedActions: Record<string, string[]> = {
    instagram: ['followers', 'likes', 'comments', 'views', 'shares'],
    youtube: ['subscribers', 'likes', 'comments', 'views', 'shares'],
    twitter: ['followers', 'likes', 'comments', 'reposts', 'views'],
    tiktok: ['followers', 'likes', 'comments', 'views', 'shares']
  };
  
  return supportedActions[platform]?.includes(actionType) || false;
}