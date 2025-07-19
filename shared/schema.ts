import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'buyer', 'provider', 'admin'
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  socialMediaAccounts: jsonb("social_media_accounts").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'followers', 'likes', 'views', 'comments', 'subscribers', 'reposts', 'shares'
  platform: text("platform").notNull(), // 'instagram', 'youtube', 'twitter', 'tiktok'
  price: decimal("price", { precision: 10, scale: 2 }).default("5.00"),
  providerEarnings: decimal("provider_earnings", { precision: 10, scale: 2 }).default("2.00"),
  status: text("status").default("active"), // 'active', 'inactive', 'pending'
  description: text("description"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalOrders: integer("total_orders").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").references(() => users.id).notNull(),
  providerId: integer("provider_id").references(() => users.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  quantity: integer("quantity").notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  providerEarnings: decimal("provider_earnings", { precision: 10, scale: 2 }).notNull(),
  commentText: text("comment_text"),
  targetUrl: text("target_url"),
  status: text("status").default("pending"), // 'pending', 'completed', 'failed', 'cancelled'
  paymentId: text("payment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // 'pending', 'processing', 'completed', 'failed'
  bankDetails: jsonb("bank_details"),
  paymentId: text("payment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").references(() => users.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  quantity: integer("quantity").notNull(),
  commentText: text("comment_text"),
  targetUrl: text("target_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const actionAssignments = pgTable("action_assignments", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id).notNull(),
  providerId: integer("provider_id").references(() => users.id).notNull(),
  actionType: text("action_type").notNull(),
  platform: text("platform").notNull(),
  targetUrl: text("target_url").notNull(),
  commentText: text("comment_text"),
  status: text("status").default("assigned"), // 'assigned', 'in_progress', 'completed', 'verified', 'failed'
  proofUrl: text("proof_url"),
  proofType: text("proof_type"), // 'api', 'screenshot', 'manual'
  verificationData: jsonb("verification_data"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  verifiedAt: timestamp("verified_at"),
});

export const moderationQueue = pgTable("moderation_queue", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(), // 'comment', 'service', 'user_report'
  contentId: integer("content_id").notNull(),
  content: text("content").notNull(),
  status: text("status").default("pending"), // 'pending', 'approved', 'rejected'
  moderatorId: integer("moderator_id").references(() => users.id),
  reason: text("reason"),
  moderatedAt: timestamp("moderated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  variables: jsonb("variables").default([]),
  type: text("type").notNull(), // 'transactional', 'marketing'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  recipient: text("recipient").notNull(),
  templateId: integer("template_id").references(() => emailTemplates.id),
  subject: text("subject").notNull(),
  status: text("status").notNull(), // 'sent', 'failed', 'bounced', 'opened', 'clicked'
  errorMessage: text("error_message"),
  externalId: text("external_id"),
  metadata: jsonb("metadata"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const socialMediaAccounts = pgTable("social_media_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  platform: text("platform").notNull(),
  username: text("username").notNull(),
  accountId: text("account_id"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  isVerified: boolean("is_verified").default(false),
  verificationData: jsonb("verification_data"),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => users.id).notNull(),
  reportedUserId: integer("reported_user_id").references(() => users.id),
  reportedContentId: integer("reported_content_id"),
  contentType: text("content_type"), // 'user', 'service', 'transaction', 'comment'
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").default("pending"), // 'pending', 'investigating', 'resolved', 'dismissed'
  adminId: integer("admin_id").references(() => users.id),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true, rating: true, totalOrders: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({ id: true, createdAt: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true, createdAt: true });
export const insertActionAssignmentSchema = createInsertSchema(actionAssignments).omit({ id: true, assignedAt: true, completedAt: true, verifiedAt: true });
export const insertModerationQueueSchema = createInsertSchema(moderationQueue).omit({ id: true, createdAt: true, moderatedAt: true });
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, sentAt: true });
export const insertSocialMediaAccountSchema = createInsertSchema(socialMediaAccounts).omit({ id: true, createdAt: true, lastSync: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true, resolvedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type ActionAssignment = typeof actionAssignments.$inferSelect;
export type ModerationQueue = typeof moderationQueue.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
export type SocialMediaAccount = typeof socialMediaAccounts.$inferSelect;
export type Report = typeof reports.$inferSelect;

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
export type InsertReport = z.infer<typeof insertReportSchema>;
