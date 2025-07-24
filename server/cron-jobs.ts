import cron from 'node-cron';
import { supabase } from './supabase';
import { performAIVerification, reVerifyBuyerRejection } from './verification';
import { cleanupExpiredAssignments } from './available-assignments';

// Initialize cron jobs
export function initializeCronJobs() {
  console.log('Initializing cron jobs...');

  // Run every hour to check for expired verifications and trigger AI verification
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly verification check...');
    await checkExpiredVerifications();
  });

  // Run every 6 hours to clean up expired assignments
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running expired assignments cleanup...');
    await cleanupExpiredAssignments();
  });

  // Run daily at 2 AM to check for buyer rejections that need AI re-verification
  cron.schedule('0 2 * * *', async () => {
    console.log('Running daily rejection re-verification check...');
    await checkBuyerRejectionsForReVerification();
  });

  console.log('Cron jobs initialized successfully');
}

// Check for verifications that have expired (48 hours) and trigger AI verification
async function checkExpiredVerifications() {
  try {
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    // Get all pending verifications that are older than 48 hours
    const { data: expiredVerifications, error } = await supabase
      .from('action_assignments')
      .select('id, status, submitted_at, proof_url')
      .eq('status', 'pending_verification')
      .lt('submitted_at', fortyEightHoursAgo.toISOString());

    if (error) {
      console.error('Error fetching expired verifications:', error);
      return;
    }

    if (!expiredVerifications || expiredVerifications.length === 0) {
      console.log('No expired verifications found');
      return;
    }

    console.log(`Found ${expiredVerifications.length} expired verifications, triggering AI verification...`);

    // Trigger AI verification for each expired verification
    for (const verification of expiredVerifications) {
      try {
        console.log(`Triggering AI verification for assignment ${verification.id}`);
        await performAIVerification(verification.id);
      } catch (verificationError) {
        console.error(`Error performing AI verification for assignment ${verification.id}:`, verificationError);
      }
    }

    console.log(`Completed AI verification for ${expiredVerifications.length} assignments`);
  } catch (error) {
    console.error('Error in checkExpiredVerifications:', error);
  }
}

// Check for buyer rejections that need AI re-verification (24 hours after rejection)
async function checkBuyerRejectionsForReVerification() {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Get all buyer rejections that are older than 24 hours
    const { data: expiredRejections, error } = await supabase
      .from('action_assignments')
      .select('id, status, buyer_rejected_at, proof_url')
      .eq('status', 'rejected_by_buyer')
      .lt('buyer_rejected_at', twentyFourHoursAgo.toISOString());

    if (error) {
      console.error('Error fetching expired rejections:', error);
      return;
    }

    if (!expiredRejections || expiredRejections.length === 0) {
      console.log('No expired rejections found');
      return;
    }

    console.log(`Found ${expiredRejections.length} expired rejections, triggering AI re-verification...`);

    // Trigger AI re-verification for each expired rejection
    for (const rejection of expiredRejections) {
      try {
        console.log(`Triggering AI re-verification for assignment ${rejection.id}`);
        await reVerifyBuyerRejection(rejection.id);
      } catch (reVerificationError) {
        console.error(`Error performing AI re-verification for assignment ${rejection.id}:`, reVerificationError);
      }
    }

    console.log(`Completed AI re-verification for ${expiredRejections.length} assignments`);
  } catch (error) {
    console.error('Error in checkBuyerRejectionsForReVerification:', error);
  }
} 