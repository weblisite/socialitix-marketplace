import { supabase } from './supabase';
import { 
  type User, type InsertUser, type Service, type InsertService,
  type Transaction, type InsertTransaction, type Withdrawal, type InsertWithdrawal,
  type CartItem, type InsertCartItem, type ActionAssignment, type InsertActionAssignment,
  type ProviderService, type InsertProviderService
} from "@shared/schema";

console.log("Using Supabase client for database operations");

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Service methods
  getServices(filters?: { platform?: string; type?: string }): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByProvider(providerId: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, updates: Partial<Service>): Promise<Service | undefined>;

  // Transaction methods
  getTransactions(userId?: number, role?: string): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined>;

  // Provider Service methods
  getProviderServices(providerId?: number): Promise<ProviderService[]>;
  getProviderService(id: number): Promise<ProviderService | undefined>;
  createProviderService(service: InsertProviderService): Promise<ProviderService>;
  updateProviderService(id: number, updates: Partial<ProviderService>): Promise<ProviderService | undefined>;
  deleteProviderService(id: number): Promise<void>;

  // Action Assignment methods
  getActionAssignments(providerId?: number): Promise<ActionAssignment[]>;
  getActionAssignment(id: number): Promise<ActionAssignment | undefined>;
  createActionAssignment(assignment: InsertActionAssignment): Promise<ActionAssignment>;
  updateActionAssignment(id: number, updates: Partial<ActionAssignment>): Promise<ActionAssignment | undefined>;
  assignActionsToProviders(transactionId: number, quantity: number, platform: string, actionType: string, targetUrl: string, commentText?: string): Promise<void>;
  updateTransactionFulfillment(transactionId: number): Promise<void>;

  // Withdrawal methods
  getWithdrawals(providerId?: number): Promise<Withdrawal[]>;
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  updateWithdrawal(id: number, updates: Partial<Withdrawal>): Promise<Withdrawal | undefined>;

  // Cart methods
  getCartItems(buyerId: number): Promise<CartItem[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  removeFromCart(id: number): Promise<void>;
  clearCart(buyerId: number): Promise<void>;

  // Analytics
  getPlatformStats(): Promise<any>;
}

export class SupabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
    return data as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
    return data as User;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }
    return data as User;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
    return data as User;
  }

  async getServices(filters?: { platform?: string; type?: string }): Promise<Service[]> {
    let query = supabase
      .from('services')
      .select('*')
      .eq('status', 'active');
    
    if (filters?.platform) {
      query = query.eq('platform', filters.platform);
    }
    
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    const { data, error } = await query.order('rating', { ascending: false });
    
    if (error) {
      console.error('Error getting services:', error);
      return [];
    }
    return data as Service[];
  }

  async getService(id: number): Promise<Service | undefined> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error getting service:', error);
      return undefined;
    }
    return data as Service;
  }

  async getServicesByProvider(providerId: number): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('provider_id', providerId);
    
    if (error) {
      console.error('Error getting services by provider:', error);
      return [];
    }
    return data as Service[];
  }

  async createService(service: InsertService): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .insert([service])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating service:', error);
      throw error;
    }
    return data as Service;
  }

  async updateService(id: number, updates: Partial<Service>): Promise<Service | undefined> {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating service:', error);
      return undefined;
    }
    return data as Service;
  }

  async getTransactions(userId?: number, role?: string): Promise<Transaction[]> {
    let query = supabase.from('transactions').select('*');
    
    if (userId && role === 'buyer') {
      query = query.eq('buyer_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
    return data as Transaction[];
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error getting transaction:', error);
      return undefined;
    }
    return data as Transaction;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
    return data as Transaction;
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating transaction:', error);
      return undefined;
    }
    return data as Transaction;
  }

  async getActionAssignments(providerId?: number): Promise<ActionAssignment[]> {
    let query = supabase.from('action_assignments').select('*');
    
    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data, error } = await query.order('assigned_at', { ascending: false });
    
    if (error) {
      console.error('Error getting action assignments:', error);
      return [];
    }
    return data as ActionAssignment[];
  }

  async getActionAssignment(id: number): Promise<ActionAssignment | undefined> {
    const { data, error } = await supabase
      .from('action_assignments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error getting action assignment:', error);
      return undefined;
    }
    return data as ActionAssignment;
  }

  async createActionAssignment(assignment: InsertActionAssignment): Promise<ActionAssignment> {
    const { data, error } = await supabase
      .from('action_assignments')
      .insert([assignment])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating action assignment:', error);
      throw error;
    }
    return data as ActionAssignment;
  }

  async updateActionAssignment(id: number, updates: Partial<ActionAssignment>): Promise<ActionAssignment | undefined> {
    const { data, error } = await supabase
      .from('action_assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating action assignment:', error);
      return undefined;
    }
    return data as ActionAssignment;
  }

  async getProviderServices(providerId?: number): Promise<ProviderService[]> {
    let query = supabase.from('provider_services').select('*');
    
    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data, error } = await query.order('last_active_at', { ascending: false });
    
    if (error) {
      console.error('Error getting provider services:', error);
      return [];
    }
    return data as ProviderService[];
  }

  async getProviderService(id: number): Promise<ProviderService | undefined> {
    const { data, error } = await supabase
      .from('provider_services')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error getting provider service:', error);
      return undefined;
    }
    return data as ProviderService;
  }

  async createProviderService(service: InsertProviderService): Promise<ProviderService> {
    const { data, error } = await supabase
      .from('provider_services')
      .insert([service])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating provider service:', error);
      throw error;
    }
    return data as ProviderService;
  }

  async updateProviderService(id: number, updates: Partial<ProviderService>): Promise<ProviderService | undefined> {
    const { data, error } = await supabase
      .from('provider_services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating provider service:', error);
      return undefined;
    }
    return data as ProviderService;
  }

  async deleteProviderService(id: number): Promise<void> {
    const { error } = await supabase
      .from('provider_services')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting provider service:', error);
      throw error;
    }
  }

  async assignActionsToProviders(transactionId: number, quantity: number, platform: string, actionType: string, targetUrl: string, commentText?: string): Promise<void> {
    // Get providers who offer this service
    const providerServices = await this.getProviderServices();
    const relevantProviders = providerServices.filter(ps => 
      ps.platform === platform && ps.action_type === actionType && ps.is_active
    );

    // Sort by success rate, completion time, and last active
    relevantProviders.sort((a, b) => {
      // First by success rate (descending)
      if (a.success_rate !== b.success_rate) {
        return (parseFloat(b.success_rate || '0')) - (parseFloat(a.success_rate || '0'));
      }
      
      // Then by average completion time (ascending)
      if (a.average_completion_time !== b.average_completion_time) {
        return (a.average_completion_time || 999999) - (b.average_completion_time || 999999);
      }
      
      // Finally by last active time (descending)
      return new Date(b.last_active_at || 0).getTime() - new Date(a.last_active_at || 0).getTime();
    });

    // Assign actions to providers
    for (let i = 0; i < quantity; i++) {
      const provider = relevantProviders[i % relevantProviders.length];
      if (provider) {
        const assignment: InsertActionAssignment = {
          transaction_id: transactionId,
          provider_id: provider.provider_id,
          action_type: actionType,
          platform,
          target_url: targetUrl,
          comment_text: commentText,
          status: 'assigned'
        };
        await this.createActionAssignment(assignment);
      }
    }
  }

  async updateTransactionFulfillment(transactionId: number): Promise<void> {
    // Get the transaction
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) return;

    // Count completed assignments
    const assignments = await this.getActionAssignments();
    const completedAssignments = assignments.filter(aa => 
      aa.transaction_id === transactionId && aa.status === 'completed'
    );

    // Update transaction fulfillment
    await this.updateTransaction(transactionId, {
      fulfilled_quantity: completedAssignments.length,
      status: completedAssignments.length >= transaction.quantity ? 'completed' : 'in_progress',
      completed_at: completedAssignments.length >= transaction.quantity ? new Date().toISOString() : undefined
    });

    // If transaction is completed, update provider performance metrics
    if (completedAssignments.length > 0) {
      await this.updateTransaction(transactionId, {
        fulfilled_quantity: completedAssignments.length,
        status: completedAssignments.length >= transaction.quantity ? 'completed' : 'in_progress'
      });

      // Update provider service stats
      for (const assignment of completedAssignments) {
        const providerService = await this.getProviderService(assignment.provider_id);
        if (providerService) {
          const completionTime = assignment.completed_at && assignment.assigned_at
            ? new Date(assignment.completed_at).getTime() - new Date(assignment.assigned_at).getTime()
            : 0;

          const totalActions = (providerService.total_actions_completed || 0) + 1;
          const totalTime = (providerService.average_completion_time || 0) + completionTime;
          const averageTime = Math.round(totalTime / totalActions);
          const successRate = (providerService.total_actions_completed || 0) / totalActions;

          await this.updateProviderService(providerService.id, {
            total_actions_completed: totalActions,
            average_completion_time: averageTime,
            success_rate: (successRate * 100).toFixed(2),
            last_active_at: new Date().toISOString()
          });
        }
      }
    }
  }

  async getWithdrawals(providerId?: number): Promise<Withdrawal[]> {
    let query = supabase.from('withdrawals').select('*');
    
    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting withdrawals:', error);
      return [];
    }
    return data as Withdrawal[];
  }

  async createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> {
    const { data, error } = await supabase
      .from('withdrawals')
      .insert([withdrawal])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating withdrawal:', error);
      throw error;
    }
    return data as Withdrawal;
  }

  async updateWithdrawal(id: number, updates: Partial<Withdrawal>): Promise<Withdrawal | undefined> {
    const { data, error } = await supabase
      .from('withdrawals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating withdrawal:', error);
      return undefined;
    }
    return data as Withdrawal;
  }

  async getCartItems(buyerId: number): Promise<CartItem[]> {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        services!inner(
          id,
          platform,
          type,
          price,
          title,
          description
        )
      `)
      .eq('buyer_id', buyerId);
    
    if (error) {
      console.error('Error getting cart items:', error);
      return [];
    }
    return data as CartItem[];
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    const { data, error } = await supabase
      .from('cart_items')
      .insert([cartItem])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
    return data as CartItem;
  }

  async removeFromCart(id: number): Promise<void> {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  async clearCart(buyerId: number): Promise<void> {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('buyer_id', buyerId);
    
    if (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  async getPlatformStats(): Promise<any> {
    const { data: users } = await supabase.from('users').select('*');
    const { data: transactions } = await supabase.from('transactions').select('*');
    const { data: withdrawals } = await supabase.from('withdrawals').select('*');
    
    return {
      totalUsers: users?.length || 0,
      totalTransactions: transactions?.length || 0,
      totalRevenue: withdrawals?.reduce((sum: number, w: any) => sum + parseFloat(w.fee || '0'), 0) || 0,
      completionRate: 94.2 // Calculate based on completed vs total transactions
    };
  }
}

export const storage = new SupabaseStorage(); 