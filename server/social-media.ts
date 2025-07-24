import { supabase } from './supabase';
import { type InsertSocialMediaAccount } from '@shared/schema';

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
    const accountData = {
      user_id: userId,
      platform,
      username,
      access_token: accessToken,
      verification_data: {}
    };

    const { data, error } = await supabase
      .from('social_media_accounts')
      .insert([accountData])
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, accountId: data.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get linked accounts for a user
export async function getUserSocialAccounts(userId: number) {
  const { data, error } = await supabase
    .from('social_media_accounts')
    .select('id, platform, username, is_verified, last_sync')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error getting social accounts:', error);
    return [];
  }
  
  return data || [];
}

// Verify action completion (manual/AI verification implementation)
export async function verifyActionCompletion(
  assignmentId: number,
  actionType: string,
  platform: string,
  targetUrl: string,
  providerId: number,
  proofData?: any
): Promise<VerificationResult> {
  
  // This function now focuses on manual and AI verification
  // Social media API integration is not implemented as per user requirements
  
  const config = PLATFORM_CONFIGS[platform];
  if (!config) {
    return { success: false, method: 'manual', error: 'Platform not supported' };
  }

  try {
    // Check if provider has linked account for this platform
    const { data: linkedAccount, error: accountError } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('user_id', providerId)
      .eq('platform', platform)
      .limit(1);

    if (accountError || !linkedAccount || linkedAccount.length === 0) {
      return { 
        success: false, 
        method: 'manual', 
        error: 'Provider must link their social media account first',
        needsManualReview: true
      };
    }

    // For now, all verifications go through manual/AI review
    // This can be enhanced with AI verification in the future
    return {
      success: true,
      method: 'manual',
      needsManualReview: true,
      data: { 
        requiresManualVerification: true,
        assignmentId,
        platform,
        actionType,
        providerId,
        submittedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    return { 
      success: false, 
      method: 'manual', 
      error: error instanceof Error ? error.message : 'Verification failed' 
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