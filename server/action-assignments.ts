import { supabase } from './supabase';
import { type InsertActionAssignment } from '@shared/schema';
import { sendEmail } from './email';
import { getActionInstructions } from './social-media';

// Create action assignments for a transaction
export async function createActionAssignments(transactionId: number): Promise<void> {
  try {
    // Get transaction details
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .limit(1);

    if (transactionError || !transactions || transactions.length === 0) {
      throw new Error('Transaction not found');
    }

    const trans = transactions[0];

    // Get service and provider details
    const { data: serviceDetails, error: serviceError } = await supabase
      .from('services')
      .select(`
        type,
        platform,
        users!inner(name, email)
      `)
      .eq('id', trans.service_id)
      .limit(1);

    if (serviceError || !serviceDetails || serviceDetails.length === 0) {
      throw new Error('Service details not found');
    }

    const service = serviceDetails[0];

    // Create action assignments (one per quantity unit)
    const assignments: InsertActionAssignment[] = [];
    for (let i = 0; i < trans.quantity; i++) {
      assignments.push({
        transaction_id: trans.id,
        provider_id: trans.provider_id,
        action_type: service.type,
        platform: service.platform,
        target_url: trans.target_url || '',
        comment_text: trans.comment_text,
        status: 'assigned'
      });
    }

    // Insert all assignments
    const { error: insertError } = await supabase
      .from('action_assignments')
      .insert(assignments);

    if (insertError) {
      throw new Error(`Failed to create assignments: ${insertError.message}`);
    }

    // Send notification email to provider
    const instructions = getActionInstructions(
      service.type,
      service.platform,
      trans.target_url || '',
      trans.comment_text || undefined
    );

    await sendEmail({
      to: service.users?.[0]?.email || '',
      templateName: 'action_assignment',
      variables: {
        providerName: service.users?.[0]?.name || 'Provider',
        actionType: service.type,
        platform: service.platform,
        targetUrl: trans.target_url || '',
        commentText: trans.comment_text || '',
        earnings: (parseFloat(trans.provider_earnings || '0')).toFixed(2),
        quantity: trans.quantity,
        instructions,
        dashboardUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/provider`
      },
      metadata: { transactionId, assignmentType: 'new_action' }
    });

  } catch (error) {
    console.error('Error creating action assignments:', error);
    throw error;
  }
}

// Get assignments for a provider
export async function getProviderAssignments(providerId: number, status?: string) {
  let query = supabase
    .from('action_assignments')
    .select(`
      *,
      transactions!inner(provider_earnings, buyer_id),
      users!inner(name)
    `)
    .eq('provider_id', providerId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('assigned_at', { ascending: false });
  
  if (error) {
    console.error('Error getting provider assignments:', error);
    return [];
  }

  return data || [];
}

// Mark assignment as in progress
export async function startAssignment(assignmentId: number, providerId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('action_assignments')
      .update({ status: 'in_progress' })
      .eq('id', assignmentId)
      .eq('provider_id', providerId)
      .eq('status', 'assigned')
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: 'Assignment not found or already started' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Submit proof of completion
export async function submitAssignmentProof(
  assignmentId: number,
  providerId: number,
  proofUrl: string,
  proofType: 'screenshot' | 'manual' = 'screenshot'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('action_assignments')
      .update({
        status: 'completed',
        proof_url: proofUrl,
        proof_type: proofType,
        completed_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .eq('provider_id', providerId)
      .eq('status', 'in_progress')
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: 'Assignment not found or not in progress' };
    }

    // Get assignment details for notification
    const { data: assignmentDetails, error: detailsError } = await supabase
      .from('action_assignments')
      .select(`
        action_type,
        platform,
        target_url,
        transaction_id,
        transactions!inner(buyer_id),
        users!inner(name, email)
      `)
      .eq('id', assignmentId)
      .limit(1);

    if (assignmentDetails && assignmentDetails.length > 0) {
      const details = assignmentDetails[0];
      
      // Notify buyer of completion
      await sendEmail({
        to: details.users?.[0]?.email || '',
        templateName: 'action_completed',
        variables: {
          buyerName: details.users?.[0]?.name || 'Buyer',
          actionType: details.action_type,
          platform: details.platform,
          targetUrl: details.target_url || '',
          completedAt: new Date().toLocaleString(),
          dashboardUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/buyer`
        },
        metadata: { 
          assignmentId, 
          transactionId: details.transaction_id,
          completionType: 'action_completed' 
        }
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Verify assignment completion (admin function)
export async function verifyAssignmentCompletion(
  assignmentId: number,
  adminId: number,
  approved: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      verified_by: adminId,
      verified_at: new Date().toISOString(),
      verification_reason: reason
    };

    if (approved) {
      updateData.status = 'verified';
    } else {
      updateData.status = 'rejected';
    }

    const { data, error } = await supabase
      .from('action_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .eq('status', 'completed')
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: 'Assignment not found or not completed' };
    }

    // If approved, update provider earnings and transaction fulfillment
    if (approved) {
      // Get transaction details
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', data.transaction_id)
        .single();

      if (!transactionError && transaction) {
        // Update provider earnings
        const { error: earningsError } = await supabase
          .from('users')
          .update({
            balance: (parseFloat(transaction.provider_earnings || '0') + parseFloat(transaction.provider_earnings || '0')).toString()
          })
          .eq('id', data.provider_id);

        if (earningsError) {
          console.error('Error updating provider earnings:', earningsError);
        }

        // Check if all assignments for this transaction are completed
        const { data: allAssignments, error: assignmentsError } = await supabase
          .from('action_assignments')
          .select('status')
          .eq('transaction_id', data.transaction_id);

        if (!assignmentsError && allAssignments) {
          const completedCount = allAssignments.filter(a => a.status === 'verified').length;
          const totalCount = allAssignments.length;

          if (completedCount >= totalCount) {
            // Mark transaction as completed
            await supabase
              .from('transactions')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString()
              })
              .eq('id', data.transaction_id);
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get assignment statistics
export async function getAssignmentStats() {
  try {
    const { data: assignments, error } = await supabase
      .from('action_assignments')
      .select('status');

    if (error) {
      console.error('Error getting assignment stats:', error);
      return {
        total: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        verified: 0,
        rejected: 0
      };
    }

    const stats = {
      total: assignments?.length || 0,
      assigned: assignments?.filter(a => a.status === 'assigned').length || 0,
      inProgress: assignments?.filter(a => a.status === 'in_progress').length || 0,
      completed: assignments?.filter(a => a.status === 'completed').length || 0,
      verified: assignments?.filter(a => a.status === 'verified').length || 0,
      rejected: assignments?.filter(a => a.status === 'rejected').length || 0
    };

    return stats;
  } catch (error) {
    console.error('Error getting assignment stats:', error);
    return {
      total: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      verified: 0,
      rejected: 0
    };
  }
} 