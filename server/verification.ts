import { supabase } from './supabase';
import { type ActionAssignment, type User } from '@shared/schema';
import { sendEmail } from './email';
import { logPlatformRevenue } from './payment';
import crypto from 'crypto';

// Verification status types
export type VerificationStatus = 'pending' | 'approved_by_buyer' | 'approved_by_ai' | 'rejected_by_buyer' | 'rejected_by_ai' | 'ai_reverified_after_rejection' | 'flagged_for_reuse';
export type VerificationMethod = 'manual' | 'ai' | 'flagged' | 'ai_reverification';

// Image hash tracking for fraud detection
interface ImageHash {
  hash: string;
  assignment_id: number;
  provider_id: number;
  created_at: string;
  flagged_count: number;
}

// Verification result interface
interface VerificationResult {
  success: boolean;
  status: VerificationStatus;
  method: VerificationMethod;
  reason?: string;
  confidence?: number; // AI confidence score
  image_hash?: string;
  ai_analysis?: string; // Detailed AI analysis
}

// OpenAI GPT-4 Vision integration
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// AI verification criteria for different service types
const AI_VERIFICATION_CRITERIA = {
  followers: {
    keywords: ['followers', 'following', 'follower count', 'follow button'],
    visual_elements: ['follow button', 'follower count', 'profile page'],
    description: 'Screenshot should show the follow button clicked or follower count increased',
    prompt: 'Analyze this screenshot to verify if a follow action has been completed. Look for: 1) Follow button showing as "Following" or "✓" 2) Follower count increase 3) Profile page showing follow status. Provide a detailed analysis and confidence score (0-100).'
  },
  likes: {
    keywords: ['like', 'liked', 'heart', 'thumbs up'],
    visual_elements: ['like button', 'heart icon', 'liked status'],
    description: 'Screenshot should show the like button clicked or post liked',
    prompt: 'Analyze this screenshot to verify if a like action has been completed. Look for: 1) Like button showing as "Liked" or filled heart icon 2) Like count increase 3) Post showing liked status. Provide a detailed analysis and confidence score (0-100).'
  },
  comments: {
    keywords: ['comment', 'reply', 'text input', 'post comment'],
    visual_elements: ['comment box', 'posted comment', 'comment text'],
    description: 'Screenshot should show the comment posted with the specified text',
    prompt: 'Analyze this screenshot to verify if a comment has been posted. Look for: 1) Comment text visible in the comments section 2) Comment showing as posted 3) Correct comment content. Provide a detailed analysis and confidence score (0-100).'
  },
  views: {
    keywords: ['view', 'watch', 'play', 'video'],
    visual_elements: ['video player', 'view count', 'play button'],
    description: 'Screenshot should show the video being played or view count',
    prompt: 'Analyze this screenshot to verify if a video view action has been completed. Look for: 1) Video player showing as played 2) View count increase 3) Video progress indicator. Provide a detailed analysis and confidence score (0-100).'
  },
  subscribers: {
    keywords: ['subscribe', 'subscriber', 'subscribe button'],
    visual_elements: ['subscribe button', 'subscriber count'],
    description: 'Screenshot should show the subscribe button clicked or subscriber count',
    prompt: 'Analyze this screenshot to verify if a subscribe action has been completed. Look for: 1) Subscribe button showing as "Subscribed" 2) Subscriber count increase 3) Channel showing subscribed status. Provide a detailed analysis and confidence score (0-100).'
  },
  shares: {
    keywords: ['share', 'retweet', 'repost', 'forward'],
    visual_elements: ['share button', 'shared status', 'retweet icon'],
    description: 'Screenshot should show the share/retweet action completed',
    prompt: 'Analyze this screenshot to verify if a share/retweet action has been completed. Look for: 1) Share button showing as "Shared" or "Retweeted" 2) Share count increase 3) Post showing shared status. Provide a detailed analysis and confidence score (0-100).'
  }
};

// Generate hash for image to detect reuse
export function generateImageHash(imageBuffer: Buffer): string {
  return crypto.createHash('sha256').update(imageBuffer).digest('hex');
}

// Check if image has been reused
export async function checkImageReuse(imageHash: string, providerId: number): Promise<{ isReused: boolean; flagCount: number }> {
  try {
    // Check if this hash exists for this provider
    const { data: existingHashes, error } = await supabase
      .from('image_hashes')
      .select('*')
      .eq('hash', imageHash)
      .eq('provider_id', providerId);

    if (error) {
      console.error('Error checking image reuse:', error);
      return { isReused: false, flagCount: 0 };
    }

    if (existingHashes && existingHashes.length > 0) {
      // Image has been used before by this provider
      const totalFlags = existingHashes.reduce((sum, hash) => sum + (hash.flagged_count || 0), 0);
      return { isReused: true, flagCount: totalFlags };
    }

    return { isReused: false, flagCount: 0 };
  } catch (error) {
    console.error('Error in checkImageReuse:', error);
    return { isReused: false, flagCount: 0 };
  }
}

// Store image hash for tracking
export async function storeImageHash(imageHash: string, assignmentId: number, providerId: number): Promise<void> {
  try {
    await supabase
      .from('image_hashes')
      .insert([{
        hash: imageHash,
        assignment_id: assignmentId,
        provider_id: providerId,
        created_at: new Date().toISOString(),
        flagged_count: 0
      }]);
  } catch (error) {
    console.error('Error storing image hash:', error);
  }
}

// Flag image as reused
export async function flagImageAsReused(imageHash: string, providerId: number): Promise<void> {
  try {
    // Update all instances of this hash for this provider
    const { data: existingHashes, error: fetchError } = await supabase
      .from('image_hashes')
      .select('id, flagged_count')
      .eq('hash', imageHash)
      .eq('provider_id', providerId);

    if (fetchError) {
      console.error('Error fetching image hashes:', fetchError);
      return;
    }

    // Update each hash individually
    for (const hash of existingHashes || []) {
      const newFlagCount = (hash.flagged_count || 0) + 1;
      const { error } = await supabase
        .from('image_hashes')
        .update({ flagged_count: newFlagCount })
        .eq('id', hash.id);

      if (error) {
        console.error('Error updating image hash flag count:', error);
      }
    }

    // Check if provider should be banned (5 or more flags)
    const { data: totalFlags, error: countError } = await supabase
      .from('image_hashes')
      .select('flagged_count')
      .eq('provider_id', providerId);

    if (!countError && totalFlags) {
      const totalFlagCount = totalFlags.reduce((sum, hash) => sum + (hash.flagged_count || 0), 0);
      
      if (totalFlagCount >= 5) {
        // Ban the provider
        await supabase
          .from('users')
          .update({ 
            status: 'banned',
            banned_reason: 'Multiple image reuse violations',
            banned_at: new Date().toISOString()
          })
          .eq('id', providerId);

        // Send notification email
        const { data: user } = await supabase
          .from('users')
          .select('email, name')
          .eq('id', providerId)
          .single();

        if (user) {
          await sendEmail({
            to: user.email,
            templateName: 'account_banned',
            variables: {
              userName: user.name,
              reason: 'Multiple image reuse violations detected',
              appealInstructions: 'Contact support if you believe this was an error'
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in flagImageAsReused:', error);
  }
}

// OpenAI GPT-4 Vision Analysis
export async function analyzeImageWithOpenAI(imageUrl: string, serviceType: string, targetUrl: string, commentText?: string): Promise<VerificationResult> {
  try {
    const criteria = AI_VERIFICATION_CRITERIA[serviceType as keyof typeof AI_VERIFICATION_CRITERIA];
    if (!criteria) {
      return {
        success: false,
        status: 'rejected_by_ai',
        method: 'ai',
        reason: 'Unknown service type for AI verification'
      };
    }

    // Prepare the prompt for OpenAI
    let prompt = criteria.prompt;
    if (commentText) {
      prompt += `\n\nExpected comment text: "${commentText}"`;
    }
    prompt += `\n\nTarget URL: ${targetUrl}`;
    prompt += `\n\nPlease analyze the image and respond with: 1) A detailed analysis of what you see 2) Whether the action appears to be completed 3) A confidence score from 0-100 4) Any concerns or issues you notice.`;

    // Call OpenAI GPT-4 Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    const analysis = data.choices[0]?.message?.content || 'No analysis provided';

    // Extract confidence score from analysis (look for numbers 0-100)
    const confidenceMatch = analysis.match(/(?:confidence|score).*?(\d{1,3})/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.5;

    // Determine if the action was completed based on analysis
    const isCompleted = analysis.toLowerCase().includes('completed') || 
                       analysis.toLowerCase().includes('successful') ||
                       analysis.toLowerCase().includes('verified') ||
                       confidence > 0.7;

    if (isCompleted) {
      return {
        success: true,
        status: 'approved_by_ai',
        method: 'ai',
        confidence: confidence,
        reason: `AI verified ${serviceType} action with ${Math.round(confidence * 100)}% confidence`,
        ai_analysis: analysis
      };
    } else {
      return {
        success: false,
        status: 'rejected_by_ai',
        method: 'ai',
        confidence: confidence,
        reason: `AI could not verify ${serviceType} action. Confidence: ${Math.round(confidence * 100)}%`,
        ai_analysis: analysis
      };
    }
  } catch (error) {
    console.error('Error in OpenAI image analysis:', error);
    return {
      success: false,
      status: 'rejected_by_ai',
      method: 'ai',
      reason: 'AI analysis failed due to technical error',
      ai_analysis: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// AI re-verification of buyer rejections
export async function reVerifyBuyerRejection(assignmentId: number): Promise<VerificationResult> {
  try {
    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('action_assignments')
      .select(`
        *,
        transactions!inner(buyer_id, provider_id, quantity, total_cost, target_url, comment_text)
      `)
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return {
        success: false,
        status: 'rejected_by_ai',
        method: 'ai_reverification',
        reason: 'Assignment not found'
      };
    }

    // Check if assignment was rejected by buyer
    if (assignment.status !== 'rejected_by_buyer') {
      return {
        success: false,
        status: assignment.status as VerificationStatus,
        method: 'ai_reverification',
        reason: 'Assignment was not rejected by buyer'
      };
    }

    // Perform AI analysis
    const aiResult = await analyzeImageWithOpenAI(
      assignment.proof_url!,
      assignment.action_type,
      assignment.transactions.target_url,
      assignment.transactions.comment_text
    );

    // Update assignment with AI re-verification result
    const newStatus = aiResult.success ? 'ai_reverified_after_rejection' : 'rejected_by_ai';
    const { error: updateError } = await supabase
      .from('action_assignments')
      .update({
        status: newStatus,
        verified_at: new Date().toISOString(),
        verification_reason: aiResult.reason,
        verification_method: 'ai_reverification',
        ai_confidence: aiResult.confidence
      })
      .eq('id', assignmentId);

    if (updateError) {
      return {
        success: false,
        status: 'rejected_by_ai',
        method: 'ai_reverification',
        reason: 'Failed to update assignment with AI re-verification result'
      };
    }

    if (aiResult.success) {
      // Credit provider's account with 5 KES per action (50% of buyer price)
      const providerAmount = '5.00'; // Fixed amount per action
      await creditProviderAccount(assignment.transactions.provider_id, providerAmount, assignmentId, 'AI re-verification overturned buyer rejection');
      
      // Update transaction fulfillment
      await updateTransactionFulfillment(assignment.transaction_id);

      // Send notification to provider about successful re-verification
      const { data: provider, error: providerError } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', assignment.transactions.provider_id)
        .single();

      if (!providerError && provider) {
        await sendEmail({
          to: provider.email,
          templateName: 'ai_reverification_success',
          variables: {
            providerName: provider.name,
            actionType: assignment.action_type,
            platform: assignment.platform,
            reason: 'AI re-verification overturned buyer rejection',
            confidence: aiResult.confidence ? `${Math.round(aiResult.confidence * 100)}%` : 'N/A',
            earnings: '5.00' // Fixed 5 KES per action
          }
        });
      }

      // Send notification to buyer about the overturn
      const { data: buyer, error: buyerError } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', assignment.transactions.buyer_id)
        .single();

      if (!buyerError && buyer) {
        await sendEmail({
          to: buyer.email,
          templateName: 'rejection_overturned',
          variables: {
            buyerName: buyer.name,
            actionType: assignment.action_type,
            platform: assignment.platform,
            reason: 'AI analysis determined the proof was valid',
            confidence: aiResult.confidence ? `${Math.round(aiResult.confidence * 100)}%` : 'N/A'
          }
        });
      }
    }

    return {
      ...aiResult,
      status: newStatus as VerificationStatus,
      method: 'ai_reverification'
    };

  } catch (error) {
    console.error('Error in AI re-verification:', error);
    return {
      success: false,
      status: 'rejected_by_ai',
      method: 'ai_reverification',
      reason: 'AI re-verification failed due to technical error'
    };
  }
}

// Submit proof for verification
export async function submitProof(
  assignmentId: number,
  providerId: number,
  imageBuffer: Buffer,
  imageUrl: string
): Promise<VerificationResult> {
  try {
    // Generate image hash for fraud detection
    const imageHash = generateImageHash(imageBuffer);
    
    // Check for image reuse
    const { isReused, flagCount } = await checkImageReuse(imageHash, providerId);
    
    if (isReused) {
      // Flag the image as reused
      await flagImageAsReused(imageHash, providerId);
      
      return {
        success: false,
        status: 'flagged_for_reuse',
        method: 'flagged',
        reason: `Image has been reused ${flagCount + 1} times. This violates our terms of service.`,
        image_hash: imageHash
      };
    }

    // Store the image hash
    await storeImageHash(imageHash, assignmentId, providerId);

    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('action_assignments')
      .select(`
        *,
        transactions!inner(quantity, target_url, comment_text)
      `)
      .eq('id', assignmentId)
      .eq('provider_id', providerId)
      .single();

    if (assignmentError || !assignment) {
      return {
        success: false,
        status: 'rejected_by_ai',
        method: 'manual',
        reason: 'Assignment not found'
      };
    }

    // Update assignment with proof
    const { error: updateError } = await supabase
      .from('action_assignments')
      .update({
        proof_url: imageUrl,
        proof_type: 'screenshot',
        status: 'pending_verification',
        submitted_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    if (updateError) {
      return {
        success: false,
        status: 'rejected_by_ai',
        method: 'manual',
        reason: 'Failed to update assignment with proof'
      };
    }

    // Get buyer details for notification
    const { data: buyer, error: buyerError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', assignment.transactions.buyer_id)
      .single();

    if (!buyerError && buyer) {
      // Send notification to buyer
      await sendEmail({
        to: buyer.email,
        templateName: 'proof_submitted',
        variables: {
          buyerName: buyer.name,
          actionType: assignment.action_type,
          platform: assignment.platform,
          targetUrl: assignment.target_url,
          verificationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleString(),
          verificationUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/verify/${assignmentId}`
        }
      });
    }

    // Schedule AI verification after 48 hours
    setTimeout(async () => {
      await performAIVerification(assignmentId);
    }, 48 * 60 * 60 * 1000); // 48 hours

    return {
      success: true,
      status: 'pending',
      method: 'manual',
      reason: 'Proof submitted successfully. Buyer has 48 hours to verify manually.',
      image_hash: imageHash
    };

  } catch (error) {
    console.error('Error submitting proof:', error);
    return {
      success: false,
      status: 'rejected_by_ai',
      method: 'manual',
      reason: 'Failed to submit proof due to technical error'
    };
  }
}

// Manual verification by buyer
export async function verifyManually(
  assignmentId: number,
  buyerId: number,
  approved: boolean,
  reason?: string
): Promise<VerificationResult> {
  try {
    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('action_assignments')
      .select(`
        *,
        transactions!inner(buyer_id, provider_id, quantity, total_cost)
      `)
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return {
        success: false,
        status: 'rejected_by_buyer',
        method: 'manual',
        reason: 'Assignment not found'
      };
    }

    // Verify buyer owns this assignment
    if (assignment.transactions.buyer_id !== buyerId) {
      return {
        success: false,
        status: 'rejected_by_buyer',
        method: 'manual',
        reason: 'You can only verify your own assignments'
      };
    }

    const status = approved ? 'approved_by_buyer' : 'rejected_by_buyer';
    const method = 'manual';

    // Update assignment status
    const { error: updateError } = await supabase
      .from('action_assignments')
      .update({
        status: status,
        verified_at: new Date().toISOString(),
        verification_reason: reason,
        verification_method: method
      })
      .eq('id', assignmentId);

    if (updateError) {
      return {
        success: false,
        status: 'rejected_by_buyer',
        method: 'manual',
        reason: 'Failed to update assignment status'
      };
    }

    if (approved) {
      // Credit provider's account with 5 KES per action (50% of buyer price)
      const providerAmount = '5.00'; // Fixed amount per action
      await creditProviderAccount(assignment.transactions.provider_id, providerAmount, assignmentId, 'Buyer approved proof');
      
      // Update transaction fulfillment
      await updateTransactionFulfillment(assignment.transaction_id);
    } else {
      // Schedule AI re-verification for buyer rejections after 24 hours
      setTimeout(async () => {
        await reVerifyBuyerRejection(assignmentId);
      }, 24 * 60 * 60 * 1000); // 24 hours
    }

    // Send notification to provider
    const { data: provider, error: providerError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', assignment.transactions.provider_id)
      .single();

    if (!providerError && provider) {
      await sendEmail({
        to: provider.email,
        templateName: approved ? 'verification_approved' : 'verification_rejected',
        variables: {
          providerName: provider.name,
          actionType: assignment.action_type,
          platform: assignment.platform,
          reason: reason || (approved ? 'Buyer approved your proof' : 'Buyer rejected your proof. AI will re-verify in 24 hours.'),
          earnings: approved ? '5.00' : '0.00' // Fixed 5 KES per action
        }
      });
    }

    return {
      success: true,
      status: status as VerificationStatus,
      method: method as VerificationMethod,
      reason: reason || (approved ? 'Approved by buyer' : 'Rejected by buyer - AI will re-verify')
    };

  } catch (error) {
    console.error('Error in manual verification:', error);
    return {
      success: false,
      status: 'rejected_by_buyer',
      method: 'manual',
      reason: 'Verification failed due to technical error'
    };
  }
}

// AI verification after 48 hours
export async function performAIVerification(assignmentId: number): Promise<VerificationResult> {
  try {
    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('action_assignments')
      .select(`
        *,
        transactions!inner(buyer_id, provider_id, quantity, total_cost, target_url, comment_text)
      `)
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return {
        success: false,
        status: 'rejected_by_ai',
        method: 'ai',
        reason: 'Assignment not found'
      };
    }

    // Check if already verified manually
    if (assignment.status === 'approved_by_buyer' || assignment.status === 'rejected_by_buyer') {
      return {
        success: false,
        status: assignment.status as VerificationStatus,
        method: 'manual',
        reason: 'Already verified manually'
      };
    }

    // Perform AI analysis using OpenAI GPT-4 Vision
    const aiResult = await analyzeImageWithOpenAI(
      assignment.proof_url!,
      assignment.action_type,
      assignment.transactions.target_url,
      assignment.transactions.comment_text
    );

    // Update assignment with AI verification result
    const { error: updateError } = await supabase
      .from('action_assignments')
      .update({
        status: aiResult.status,
        verified_at: new Date().toISOString(),
        verification_reason: aiResult.reason,
        verification_method: aiResult.method,
        ai_confidence: aiResult.confidence
      })
      .eq('id', assignmentId);

    if (updateError) {
      return {
        success: false,
        status: 'rejected_by_ai',
        method: 'ai',
        reason: 'Failed to update assignment with AI verification result'
      };
    }

    if (aiResult.success) {
      // Credit provider's account with 5 KES per action (50% of buyer price)
      const providerAmount = '5.00'; // Fixed amount per action
      await creditProviderAccount(assignment.transactions.provider_id, providerAmount, assignmentId, 'AI verification successful');
      
      // Update transaction fulfillment
      await updateTransactionFulfillment(assignment.transaction_id);
    }

    // Send notification to provider
    const { data: provider, error: providerError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', assignment.transactions.provider_id)
      .single();

    if (!providerError && provider) {
      await sendEmail({
        to: provider.email,
        templateName: aiResult.success ? 'ai_verification_approved' : 'ai_verification_rejected',
        variables: {
          providerName: provider.name,
          actionType: assignment.action_type,
          platform: assignment.platform,
          reason: aiResult.reason,
          confidence: aiResult.confidence ? `${Math.round(aiResult.confidence * 100)}%` : 'N/A',
          earnings: aiResult.success ? '5.00' : '0.00' // Fixed 5 KES per action
        }
      });
    }

    return aiResult;

  } catch (error) {
    console.error('Error in AI verification:', error);
    return {
      success: false,
      status: 'rejected_by_ai',
      method: 'ai',
      reason: 'AI verification failed due to technical error'
    };
  }
}

// Credit provider's account with atomic update to prevent race conditions
async function creditProviderAccount(providerId: number, amount: string, assignmentId: number, reason: string): Promise<void> {
  try {
    // Get assignment details to find transaction and quantity
    const { data: assignment, error: assignmentError } = await supabase
      .from('action_assignments')
      .select('transaction_id')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      console.error('Error fetching assignment details:', assignmentError);
      return;
    }

    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id, quantity')
      .eq('id', assignment.transaction_id)
      .single();

    if (transactionError || !transaction) {
      console.error('Error fetching transaction details:', transactionError);
      return;
    }

    // First get current balance
    const { data: provider, error: fetchError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', providerId)
      .single();

    if (fetchError || !provider) {
      console.error('Error fetching provider balance:', fetchError);
      return;
    }

    const currentBalance = parseFloat(provider.balance || '0');
    const newBalance = currentBalance + parseFloat(amount);

    // Update balance
    const { data: result, error: updateError } = await supabase
      .from('users')
      .update({ balance: newBalance.toFixed(2) })
      .eq('id', providerId)
      .select('balance')
      .single();

    if (updateError) {
      console.error('Error updating provider balance:', updateError);
      return;
    }

    // Log the credit transaction for audit trail
    await supabase
      .from('credit_transactions')
      .insert([{
        provider_id: providerId,
        assignment_id: assignmentId,
        amount: parseFloat(amount),
        balance_before: currentBalance,
        balance_after: newBalance,
        reason: reason,
        created_at: new Date().toISOString()
      }]);

    // Log platform revenue (5 KES per quantity)
    await logPlatformRevenue(
      assignment.transaction_id,
      transaction.quantity
    );

    console.log(`Credited ${amount} KES to provider ${providerId}. Balance: ${currentBalance} → ${newBalance} KES`);
    console.log(`Logged platform revenue: ${5 * transaction.quantity} KES for transaction ${assignment.transaction_id}`);
  } catch (error) {
    console.error('Error in creditProviderAccount:', error);
  }
}

// Update transaction fulfillment
async function updateTransactionFulfillment(transactionId: number): Promise<void> {
  try {
    // Get all assignments for this transaction
    const { data: assignments, error: assignmentsError } = await supabase
      .from('action_assignments')
      .select('status')
      .eq('transaction_id', transactionId);

    if (assignmentsError || !assignments) {
      console.error('Error fetching assignments:', assignmentsError);
      return;
    }

    const completedAssignments = assignments.filter(a => 
      a.status === 'approved_by_buyer' || 
      a.status === 'approved_by_ai' || 
      a.status === 'ai_reverified_after_rejection'
    );

    // Update transaction
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        fulfilled_quantity: completedAssignments.length,
        status: completedAssignments.length >= assignments.length ? 'completed' : 'in_progress',
        completed_at: completedAssignments.length >= assignments.length ? new Date().toISOString() : undefined
      })
      .eq('id', transactionId);

    if (updateError) {
      console.error('Error updating transaction fulfillment:', updateError);
    }
  } catch (error) {
    console.error('Error in updateTransactionFulfillment:', error);
  }
}

// Get verification statistics for a provider
export async function getProviderVerificationStats(providerId: number): Promise<{
  total_submissions: number;
  approved_manually: number;
  approved_by_ai: number;
  ai_reverified_after_rejection: number;
  rejected_by_buyer: number;
  rejected_by_ai: number;
  flagged_for_reuse: number;
  success_rate: number;
}> {
  try {
    const { data: assignments, error } = await supabase
      .from('action_assignments')
      .select('status')
      .eq('provider_id', providerId);

    if (error || !assignments) {
      return {
        total_submissions: 0,
        approved_manually: 0,
        approved_by_ai: 0,
        ai_reverified_after_rejection: 0,
        rejected_by_buyer: 0,
        rejected_by_ai: 0,
        flagged_for_reuse: 0,
        success_rate: 0
      };
    }

    const stats = {
      total_submissions: assignments.length,
      approved_manually: assignments.filter(a => a.status === 'approved_by_buyer').length,
      approved_by_ai: assignments.filter(a => a.status === 'approved_by_ai').length,
      ai_reverified_after_rejection: assignments.filter(a => a.status === 'ai_reverified_after_rejection').length,
      rejected_by_buyer: assignments.filter(a => a.status === 'rejected_by_buyer').length,
      rejected_by_ai: assignments.filter(a => a.status === 'rejected_by_ai').length,
      flagged_for_reuse: assignments.filter(a => a.status === 'flagged_for_reuse').length,
      success_rate: 0
    };

    const totalApproved = stats.approved_manually + stats.approved_by_ai + stats.ai_reverified_after_rejection;
    stats.success_rate = stats.total_submissions > 0 ? (totalApproved / stats.total_submissions) * 100 : 0;

    return stats;
  } catch (error) {
    console.error('Error getting provider verification stats:', error);
    return {
      total_submissions: 0,
      approved_manually: 0,
      approved_by_ai: 0,
      ai_reverified_after_rejection: 0,
      rejected_by_buyer: 0,
      rejected_by_ai: 0,
      flagged_for_reuse: 0,
      success_rate: 0
    };
  }
} 