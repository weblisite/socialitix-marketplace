import { db } from './storage';
import { actionAssignments, transactions, users, services, type InsertActionAssignment } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sendEmail } from './email';
import { getActionInstructions } from './social-media';

// Create action assignments for a transaction
export async function createActionAssignments(transactionId: number): Promise<void> {
  try {
    // Get transaction details
    const transaction = await db.select({
      id: transactions.id,
      buyerId: transactions.buyerId,
      providerId: transactions.providerId,
      serviceId: transactions.serviceId,
      quantity: transactions.quantity,
      commentText: transactions.commentText,
      targetUrl: transactions.targetUrl,
      totalCost: transactions.totalCost,
      providerEarnings: transactions.providerEarnings
    })
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

    if (!transaction.length) {
      throw new Error('Transaction not found');
    }

    const trans = transaction[0];

    // Get service and provider details
    const serviceDetails = await db.select({
      type: services.type,
      platform: services.platform,
      providerName: users.name,
      providerEmail: users.email
    })
    .from(services)
    .leftJoin(users, eq(services.providerId, users.id))
    .where(eq(services.id, trans.serviceId))
    .limit(1);

    if (!serviceDetails.length) {
      throw new Error('Service details not found');
    }

    const service = serviceDetails[0];

    // Create action assignments (one per quantity unit)
    const assignments: InsertActionAssignment[] = [];
    for (let i = 0; i < trans.quantity; i++) {
      assignments.push({
        transactionId: trans.id,
        providerId: trans.providerId,
        actionType: service.type,
        platform: service.platform,
        targetUrl: trans.targetUrl || '',
        commentText: trans.commentText,
        status: 'assigned'
      });
    }

    // Insert all assignments
    await db.insert(actionAssignments).values(assignments);

    // Send notification email to provider
    const instructions = getActionInstructions(
      service.type,
      service.platform,
      trans.targetUrl || '',
      trans.commentText || undefined
    );

    await sendEmail({
      to: service.providerEmail || '',
      templateName: 'action_assignment',
      variables: {
        providerName: service.providerName || 'Provider',
        actionType: service.type,
        platform: service.platform,
        targetUrl: trans.targetUrl || '',
        commentText: trans.commentText || '',
        earnings: (parseFloat(trans.providerEarnings || '0')).toFixed(2),
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
  let query = db.select({
    id: actionAssignments.id,
    transactionId: actionAssignments.transactionId,
    actionType: actionAssignments.actionType,
    platform: actionAssignments.platform,
    targetUrl: actionAssignments.targetUrl,
    commentText: actionAssignments.commentText,
    status: actionAssignments.status,
    proofUrl: actionAssignments.proofUrl,
    assignedAt: actionAssignments.assignedAt,
    completedAt: actionAssignments.completedAt,
    earnings: transactions.providerEarnings,
    buyerName: users.name
  })
  .from(actionAssignments)
  .leftJoin(transactions, eq(actionAssignments.transactionId, transactions.id))
  .leftJoin(users, eq(transactions.buyerId, users.id))
  .where(eq(actionAssignments.providerId, providerId));

  if (status) {
    query = query.where(and(
      eq(actionAssignments.providerId, providerId),
      eq(actionAssignments.status, status)
    ));
  }

  return await query.orderBy(desc(actionAssignments.assignedAt));
}

// Mark assignment as in progress
export async function startAssignment(assignmentId: number, providerId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db.update(actionAssignments)
      .set({ status: 'in_progress' })
      .where(and(
        eq(actionAssignments.id, assignmentId),
        eq(actionAssignments.providerId, providerId),
        eq(actionAssignments.status, 'assigned')
      ))
      .returning();

    if (!result.length) {
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
    const result = await db.update(actionAssignments)
      .set({
        status: 'completed',
        proofUrl,
        proofType,
        completedAt: new Date()
      })
      .where(and(
        eq(actionAssignments.id, assignmentId),
        eq(actionAssignments.providerId, providerId),
        eq(actionAssignments.status, 'in_progress')
      ))
      .returning();

    if (!result.length) {
      return { success: false, error: 'Assignment not found or not in progress' };
    }

    // Get assignment details for notification
    const assignment = await db.select({
      actionType: actionAssignments.actionType,
      platform: actionAssignments.platform,
      targetUrl: actionAssignments.targetUrl,
      buyerName: users.name,
      buyerEmail: users.email,
      providerName: users.name,
      transactionId: actionAssignments.transactionId
    })
    .from(actionAssignments)
    .leftJoin(transactions, eq(actionAssignments.transactionId, transactions.id))
    .leftJoin(users, eq(transactions.buyerId, users.id))
    .where(eq(actionAssignments.id, assignmentId))
    .limit(1);

    if (assignment.length) {
      const details = assignment[0];
      
      // Notify buyer of completion
      await sendEmail({
        to: details.buyerEmail || '',
        templateName: 'action_completed',
        variables: {
          buyerName: details.buyerName || 'Customer',
          actionType: details.actionType,
          platform: details.platform,
          targetUrl: details.targetUrl,
          providerName: details.providerName || 'Provider',
          completedAt: new Date().toLocaleDateString(),
          dashboardUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/buyer`
        },
        metadata: { assignmentId, transactionId: details.transactionId, type: 'completion_notification' }
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Verify assignment completion
export async function verifyAssignmentCompletion(
  assignmentId: number,
  adminId: number,
  approved: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const newStatus = approved ? 'verified' : 'failed';
    const verificationData = {
      adminId,
      approved,
      reason,
      verifiedAt: new Date().toISOString()
    };

    const result = await db.update(actionAssignments)
      .set({
        status: newStatus,
        verificationData,
        verifiedAt: new Date()
      })
      .where(and(
        eq(actionAssignments.id, assignmentId),
        eq(actionAssignments.status, 'completed')
      ))
      .returning();

    if (!result.length) {
      return { success: false, error: 'Assignment not found or not ready for verification' };
    }

    if (approved) {
      // Update provider balance when action is verified
      const assignment = result[0];
      const transactionDetails = await db.select({
        providerId: transactions.providerId,
        providerEarnings: transactions.providerEarnings
      })
      .from(transactions)
      .where(eq(transactions.id, assignment.transactionId))
      .limit(1);

      if (transactionDetails.length) {
        const earnings = parseFloat(transactionDetails[0].providerEarnings || '0');
        await db.execute(sql`
          UPDATE users 
          SET balance = balance + ${earnings} 
          WHERE id = ${transactionDetails[0].providerId}
        `);
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get assignment statistics for admin dashboard
export async function getAssignmentStats() {
  const statsQuery = await db.execute(sql`
    SELECT status, COUNT(*) as count 
    FROM action_assignments 
    GROUP BY status
  `);

  const result = {
    total: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    verified: 0,
    failed: 0
  };

  statsQuery.rows.forEach((row: any) => {
    const count = parseInt(row.count);
    result.total += count;
    if (result.hasOwnProperty(row.status)) {
      result[row.status as keyof typeof result] = count;
    }
  });

  return result;
}