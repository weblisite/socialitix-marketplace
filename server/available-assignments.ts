import { supabase } from './supabase';
import { sendEmail } from './email';

// Create available assignments when a transaction is created
export async function createAvailableAssignments(transactionId: number): Promise<void> {
  try {
    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      throw new Error('Transaction not found');
    }

    // Get service details to determine the service type
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', transaction.service_id)
      .single();

    if (serviceError || !service) {
      throw new Error('Service not found');
    }

    // Use the service ID directly from the services table
    const serviceId = service.id;
    
    // Calculate provider earnings (50% of buyer price)
    const buyerPrice = parseFloat(transaction.total_cost);
    const providerEarnings = buyerPrice * 0.5;

    // Create available assignments (one per quantity)
    const assignments = [];
    for (let i = 0; i < transaction.quantity; i++) {
      assignments.push({
        transaction_id: transactionId,
        service_id: serviceId,
        platform: service.platform,
        action_type: service.type,
        target_url: transaction.target_url,
        comment_text: transaction.comment_text,
        price_per_action: buyerPrice, // Fixed: use price_per_action instead of buyer_price
        total_amount: providerEarnings, // Fixed: use total_amount instead of provider_earnings
        quantity: 1, // Each assignment represents 1 action
        status: 'available',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Insert all assignments
    const { error: insertError } = await supabase
      .from('available_assignments')
      .insert(assignments);

    if (insertError) {
      throw new Error(`Failed to create available assignments: ${insertError.message}`);
    }

    console.log(`Created ${transaction.quantity} available assignments for transaction ${transactionId}`);
    console.log('Assignment details:', {
      transaction_id: transactionId,
      service_id: serviceId,
      platform: service.platform,
      action_type: service.type,
      quantity: transaction.quantity
    });

  } catch (error) {
    console.error('Error creating available assignments:', error);
    throw error;
  }
}

// Get available assignments for a provider (filtered by their selected services)
export async function getAvailableAssignmentsForProvider(providerId: number): Promise<any[]> {
  try {
    // Get provider's selected services
    let { data: providerServices, error: servicesError } = await supabase
      .from('provider_services')
      .select('service_id')
      .eq('provider_id', providerId)
      .eq('status', 'active');

    // If provider_services table doesn't exist, create it
    if (servicesError && servicesError.code === '42P01') {
      console.log('Creating provider_services table...');
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE provider_services (
            id SERIAL PRIMARY KEY,
            provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            service_id VARCHAR(50) NOT NULL,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX idx_provider_services_provider_id ON provider_services(provider_id);
          CREATE INDEX idx_provider_services_service_id ON provider_services(service_id);
          CREATE INDEX idx_provider_services_status ON provider_services(status);
        `
      });
      
      if (createError) {
        console.error('Error creating provider_services table:', createError);
        return [];
      }
      
      // Retry the query
      const { data: retryData, error: retryError } = await supabase
        .from('provider_services')
        .select('service_id')
        .eq('provider_id', providerId)
        .eq('status', 'active');
      
      providerServices = retryData;
      servicesError = retryError;
    }

    if (servicesError) throw servicesError;

    if (!providerServices || providerServices.length === 0) {
      return [];
    }

    const serviceIds = providerServices.map(ps => ps.service_id);

    // Get available assignments for the provider's services
    let { data: assignments, error } = await supabase
      .from('available_assignments')
      .select(`
        *,
        transactions!inner(
          buyer_id,
          comment_text,
          target_url,
          users!transactions_buyer_id_fkey(name, email)
        )
      `)
      .in('service_id', serviceIds)
      .eq('status', 'available')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    // If available_assignments table doesn't exist, create it
    if (error && error.code === '42P01') {
      console.log('Creating available_assignments table...');
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE available_assignments (
            id SERIAL PRIMARY KEY,
            transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
            service_id VARCHAR(50) NOT NULL,
            platform VARCHAR(50) NOT NULL,
            action_type VARCHAR(50) NOT NULL,
            target_url TEXT,
            comment_text TEXT,
            price_per_action DECIMAL(10,2) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'available',
            claimed_by INTEGER REFERENCES users(id),
            claimed_at TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX idx_available_assignments_status ON available_assignments(status);
          CREATE INDEX idx_available_assignments_service_id ON available_assignments(service_id);
          CREATE INDEX idx_available_assignments_expires_at ON available_assignments(expires_at);
        `
      });
      
      if (createError) {
        console.error('Error creating available_assignments table:', createError);
        return [];
      }
      
      // Retry the query
      const { data: retryData, error: retryError } = await supabase
        .from('available_assignments')
        .select(`
          *,
          transactions!inner(
            buyer_id,
            comment_text,
            target_url,
            users!transactions_buyer_id_fkey(name, email)
          )
        `)
        .in('service_id', serviceIds)
        .eq('status', 'available')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      assignments = retryData;
      error = retryError;
    }

    if (error) throw error;

    return assignments || [];

  } catch (error) {
    console.error('Error getting available assignments for provider:', error);
    return [];
  }
}

// Claim an available assignment
export async function claimAssignment(assignmentId: number, providerId: number): Promise<{ success: boolean; error?: string; assignment?: any }> {
  try {
    // Check if assignment exists and is available
    const { data: assignment, error: fetchError } = await supabase
      .from('available_assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('status', 'available')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !assignment) {
      return { success: false, error: 'Assignment not found or no longer available' };
    }

    // Check if provider has this service selected
    const { data: providerService, error: serviceError } = await supabase
      .from('provider_services')
      .select('*')
      .eq('provider_id', providerId)
      .eq('service_id', assignment.service_id)
      .eq('status', 'active')
      .single();

    if (serviceError || !providerService) {
      return { success: false, error: "You don't have this service selected" };
    }

    // Check if provider already has an active assignment from this transaction
    const { data: existingAssignment, error: existingError } = await supabase
      .from('action_assignments')
      .select('id')
      .eq('transaction_id', assignment.transaction_id)
      .eq('provider_id', providerId)
      .in('status', ['assigned', 'in_progress', 'pending_verification', 'approved_by_buyer', 'approved_by_ai'])
      .single();

    if (!existingError && existingAssignment) {
      return { success: false, error: 'You can only claim one assignment per order' };
    }

    // Claim the assignment
    const { data: claimedAssignment, error: claimError } = await supabase
      .from('available_assignments')
      .update({
        status: 'claimed',
        claimed_by: providerId,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .eq('status', 'available')
      .select()
      .single();

    if (claimError) throw claimError;

    // Create action assignment
    const { data: actionAssignment, error: actionError } = await supabase
      .from('action_assignments')
      .insert([{
        transaction_id: assignment.transaction_id,
        provider_id: providerId,
        action_type: assignment.action_type,
        platform: assignment.platform,
        target_url: assignment.target_url,
        comment_text: assignment.comment_text,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (actionError) throw actionError;

    // Send notification to provider
    const { data: provider, error: providerError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', providerId)
      .single();

    if (!providerError && provider) {
      await sendEmail({
        to: provider.email,
        templateName: 'assignment_claimed',
        variables: {
          providerName: provider.name,
          actionType: assignment.action_type,
          platform: assignment.platform,
          targetUrl: assignment.target_url,
          earnings: assignment.total_amount,
          assignmentId: actionAssignment.id
        }
      });
    }

    return { 
      success: true, 
      assignment: {
        ...claimedAssignment,
        action_assignment_id: actionAssignment.id
      }
    };

  } catch (error) {
    console.error('Error claiming assignment:', error);
    return { success: false, error: 'Failed to claim assignment' };
  }
}

// Clean up expired assignments
export async function cleanupExpiredAssignments(): Promise<void> {
  try {
    const { error } = await supabase
      .from('available_assignments')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'available')
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning up expired assignments:', error);
    } else {
      console.log('Cleaned up expired assignments');
    }
  } catch (error) {
    console.error('Error in cleanupExpiredAssignments:', error);
  }
}

// Get assignment statistics for a provider
export async function getProviderAssignmentStats(providerId: number): Promise<{
  total_claimed: number;
  total_completed: number;
  total_earned: number;
  success_rate: number;
}> {
  try {
    // Get claimed assignments
    const { data: claimedAssignments, error: claimedError } = await supabase
      .from('available_assignments')
      .select('total_amount')
      .eq('claimed_by', providerId);

    if (claimedError) throw claimedError;

    // Get completed action assignments
    const { data: completedAssignments, error: completedError } = await supabase
      .from('action_assignments')
      .select('status')
      .eq('provider_id', providerId)
      .in('status', ['approved_by_buyer', 'approved_by_ai', 'ai_reverified_after_rejection']);

    if (completedError) throw completedError;

    const totalClaimed = claimedAssignments?.length || 0;
    const totalCompleted = completedAssignments?.length || 0;
    const totalEarned = claimedAssignments?.reduce((sum, assignment) => sum + parseFloat(assignment.total_amount), 0) || 0;
    const successRate = totalClaimed > 0 ? (totalCompleted / totalClaimed) * 100 : 0;

    return {
      total_claimed: totalClaimed,
      total_completed: totalCompleted,
      total_earned: totalEarned,
      success_rate: successRate
    };

  } catch (error) {
    console.error('Error getting provider assignment stats:', error);
    return {
      total_claimed: 0,
      total_completed: 0,
      total_earned: 0,
      success_rate: 0
    };
  }
} 