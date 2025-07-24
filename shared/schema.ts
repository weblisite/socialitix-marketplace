import { z } from "zod";

// TypeScript interfaces for Supabase database tables
export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string; // 'buyer', 'provider', 'admin'
  balance: string;
  social_media_accounts: any;
  status: string; // 'active', 'suspended', 'banned'
  banned_reason?: string;
  banned_at?: string;
  created_at: string;
}

export interface Service {
  id: number;
  provider_id?: number;
  title: string;
  description?: string;
  platform: string; // 'instagram', 'youtube', 'twitter', 'tiktok'
  type: string; // 'followers', 'likes', 'views', 'comments', 'subscribers', 'reposts', 'shares'
  price: string;
  currency?: string;
  delivery_time: number;
  min_order?: number;
  max_order?: number;
  rating?: string;
  total_orders?: number;
  status?: string; // 'active', 'inactive', 'pending'
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: number;
  buyer_id: number;
  service_id: number;
  quantity: number;
  total_cost: string;
  comment_text?: string;
  target_url?: string;
  status: string; // 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
  fulfilled_quantity: number;
  payment_id?: string;
  created_at: string;
  completed_at?: string;
}

export interface Withdrawal {
  id: number;
  provider_id: number;
  amount: string;
  fee: string;
  net_amount: string;
  status: string; // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  payment_method: string; // 'mpesa', 'airtel_money', 'bank_transfer', 'paypal'
  payment_details: any; // JSON object with payment method specific details
  admin_notes?: string;
  processed_by?: number;
  processed_at?: string;
  external_payment_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: number;
  buyer_id: number;
  service_id: number;
  quantity: number;
  comment_text?: string;
  target_url?: string;
  created_at: string;
}

export interface ActionAssignment {
  id: number;
  transaction_id: number;
  provider_id: number;
  action_type: string;
  platform: string;
  target_url: string;
  comment_text?: string;
  status: string; // 'assigned', 'in_progress', 'pending_verification', 'approved_by_buyer', 'approved_by_ai', 'rejected_by_buyer', 'rejected_by_ai', 'ai_reverified_after_rejection', 'flagged_for_reuse'
  proof_url?: string;
  proof_type?: string; // 'api', 'screenshot', 'manual'
  verification_data?: any;
  verification_method?: string; // 'manual', 'ai', 'flagged', 'ai_reverification'
  verification_reason?: string;
  ai_confidence?: number;
  ai_analysis?: string; // Detailed AI analysis from OpenAI
  assigned_at: string;
  submitted_at?: string;
  completed_at?: string;
  verified_at?: string;
  completion_time?: number; // in minutes
}

export interface ModerationQueue {
  id: number;
  content_type: string; // 'comment', 'service', 'user_report'
  content_id: number;
  content: string;
  status: string; // 'pending', 'approved', 'rejected'
  moderator_id?: number;
  reason?: string;
  moderated_at?: string;
  created_at: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: any;
  type: string; // 'transactional', 'marketing'
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: number;
  recipient: string;
  template_id?: number;
  subject: string;
  status: string; // 'sent', 'failed', 'bounced', 'opened', 'clicked'
  error_message?: string;
  external_id?: string;
  metadata?: any;
  sent_at: string;
}

export interface SocialMediaAccount {
  id: number;
  user_id: number;
  platform: string;
  username: string;
  account_id?: string;
  access_token?: string;
  refresh_token?: string;
  is_verified: boolean;
  verification_data?: any;
  last_sync?: string;
  created_at: string;
}

export interface ProviderService {
  id: number;
  provider_id: number;
  platform: string;
  action_type: string; // 'followers', 'likes', 'comments', etc.
  is_active: boolean;
  average_completion_time?: number; // in minutes
  total_actions_completed: number;
  success_rate: string; // percentage
  last_active_at: string;
  created_at: string;
}

export interface Report {
  id: number;
  reporter_id: number;
  reported_user_id?: number;
  reported_content_id?: number;
  content_type?: string; // 'user', 'service', 'transaction', 'comment'
  reason: string;
  description?: string;
  status: string; // 'pending', 'investigating', 'resolved', 'dismissed'
  admin_id?: number;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
}

// New interfaces for verification system
export interface ImageHash {
  id: number;
  hash: string;
  assignment_id: number;
  provider_id: number;
  created_at: string;
  flagged_count: number;
}

export interface VerificationLog {
  id: number;
  assignment_id: number;
  verifier_id?: number; // null for AI verification
  verification_method: string; // 'manual', 'ai', 'flagged'
  status: string; // 'approved', 'rejected', 'flagged'
  reason?: string;
  confidence?: number; // AI confidence score
  created_at: string;
}

export interface CreditTransaction {
  id: number;
  provider_id: number;
  assignment_id: number;
  amount: string;
  balance_before: string;
  balance_after: string;
  reason: string;
  created_at: string;
}

export interface PlatformRevenue {
  id: number;
  transaction_id: number;
  amount: string;
  revenue_type: string;
  description?: string;
  created_at: string;
}

// Zod validation schemas for API validation
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['buyer', 'provider', 'admin']),
  balance: z.string().optional(),
  social_media_accounts: z.any().optional(),
  status: z.string().optional()
});

export const insertServiceSchema = z.object({
  provider_id: z.number(),
  type: z.string(),
  platform: z.string(),
  price: z.string().optional(),
  provider_earnings: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional()
});

export const insertTransactionSchema = z.object({
  buyer_id: z.number(),
  service_id: z.number(),
  quantity: z.number().positive(),
  total_cost: z.string(),
  comment_text: z.string().optional(),
  target_url: z.string().optional(),
  status: z.string().optional(),
  fulfilled_quantity: z.number().optional(),
  payment_id: z.string().optional()
});

export const insertWithdrawalSchema = z.object({
  provider_id: z.number(),
  amount: z.string(),
  fee: z.string().optional(),
  net_amount: z.string(),
  status: z.string().optional(),
  payment_method: z.string(),
  payment_details: z.any(),
  admin_notes: z.string().optional(),
  processed_by: z.number().optional(),
  processed_at: z.string().optional(),
  external_payment_id: z.string().optional()
});

export const insertCartItemSchema = z.object({
  buyer_id: z.number(),
  service_id: z.number(),
  quantity: z.number().positive(),
  comment_text: z.string().optional(),
  target_url: z.string().optional()
});

export const insertActionAssignmentSchema = z.object({
  transaction_id: z.number(),
  provider_id: z.number(),
  action_type: z.string(),
  platform: z.string(),
  target_url: z.string(),
  comment_text: z.string().optional(),
  status: z.string().optional(),
  proof_url: z.string().optional(),
  proof_type: z.string().optional(),
  verification_data: z.any().optional(),
  completion_time: z.number().optional()
});

export const insertModerationQueueSchema = z.object({
  content_type: z.string(),
  content_id: z.number(),
  content: z.string(),
  status: z.string().optional(),
  moderator_id: z.number().optional(),
  reason: z.string().optional()
});

export const insertEmailTemplateSchema = z.object({
  name: z.string(),
  subject: z.string(),
  html_content: z.string(),
  text_content: z.string().optional(),
  variables: z.any().optional(),
  type: z.string(),
  is_active: z.boolean().optional()
});

export const insertEmailLogSchema = z.object({
  recipient: z.string().email(),
  template_id: z.number().optional(),
  subject: z.string(),
  status: z.string(),
  error_message: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.any().optional()
});

export const insertSocialMediaAccountSchema = z.object({
  user_id: z.number(),
  platform: z.string(),
  username: z.string(),
  account_id: z.string().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  is_verified: z.boolean().optional(),
  verification_data: z.any().optional()
});

export const insertProviderServiceSchema = z.object({
  provider_id: z.number(),
  platform: z.string(),
  action_type: z.string(),
  is_active: z.boolean().optional(),
  average_completion_time: z.number().optional(),
  total_actions_completed: z.number().optional(),
  success_rate: z.string().optional()
});

export const insertReportSchema = z.object({
  reporter_id: z.number(),
  reported_user_id: z.number().optional(),
  reported_content_id: z.number().optional(),
  content_type: z.string().optional(),
  reason: z.string(),
  description: z.string().optional(),
  status: z.string().optional(),
  admin_id: z.number().optional(),
  resolution: z.string().optional()
});

// New schemas for verification system
export const insertImageHashSchema = z.object({
  hash: z.string(),
  assignment_id: z.number(),
  provider_id: z.number(),
  flagged_count: z.number().optional()
});

export const insertVerificationLogSchema = z.object({
  assignment_id: z.number(),
  verifier_id: z.number().optional(),
  verification_method: z.string(),
  status: z.string(),
  reason: z.string().optional(),
  confidence: z.number().optional()
});

export const insertCreditTransactionSchema = z.object({
  provider_id: z.number(),
  assignment_id: z.number(),
  amount: z.string(),
  balance_before: z.string(),
  balance_after: z.string(),
  reason: z.string()
});

export const insertPlatformRevenueSchema = z.object({
  transaction_id: z.number(),
  amount: z.string(),
  revenue_type: z.string(),
  description: z.string().optional()
});

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type InsertActionAssignment = z.infer<typeof insertActionAssignmentSchema>;
export type InsertModerationQueue = z.infer<typeof insertModerationQueueSchema>;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type InsertSocialMediaAccount = z.infer<typeof insertSocialMediaAccountSchema>;
export type InsertProviderService = z.infer<typeof insertProviderServiceSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type InsertImageHash = z.infer<typeof insertImageHashSchema>;
export type InsertVerificationLog = z.infer<typeof insertVerificationLogSchema>;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type InsertPlatformRevenue = z.infer<typeof insertPlatformRevenueSchema>;
