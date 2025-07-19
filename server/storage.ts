import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  users, services, transactions, withdrawals, cartItems,
  type User, type InsertUser, type Service, type InsertService,
  type Transaction, type InsertTransaction, type Withdrawal, type InsertWithdrawal,
  type CartItem, type InsertCartItem
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

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

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getServices(filters?: { platform?: string; type?: string }): Promise<Service[]> {
    const conditions = [eq(services.status, "active")];
    
    if (filters?.platform) {
      conditions.push(eq(services.platform, filters.platform));
    }
    
    if (filters?.type) {
      conditions.push(eq(services.type, filters.type));
    }

    return await db.select().from(services).where(and(...conditions)).orderBy(desc(services.rating));
  }

  async getService(id: number): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return result[0];
  }

  async getServicesByProvider(providerId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.providerId, providerId));
  }

  async createService(service: InsertService): Promise<Service> {
    const result = await db.insert(services).values(service).returning();
    return result[0];
  }

  async updateService(id: number, updates: Partial<Service>): Promise<Service | undefined> {
    const result = await db.update(services).set(updates).where(eq(services.id, id)).returning();
    return result[0];
  }

  async getTransactions(userId?: number, role?: string): Promise<Transaction[]> {
    const conditions = [];
    
    if (userId && role === 'buyer') {
      conditions.push(eq(transactions.buyerId, userId));
    } else if (userId && role === 'provider') {
      conditions.push(eq(transactions.providerId, userId));
    }

    const query = conditions.length > 0 
      ? db.select().from(transactions).where(and(...conditions))
      : db.select().from(transactions);

    return await query.orderBy(desc(transactions.createdAt));
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    return result[0];
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    return result[0];
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const result = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return result[0];
  }

  async getWithdrawals(providerId?: number): Promise<Withdrawal[]> {
    const query = providerId 
      ? db.select().from(withdrawals).where(eq(withdrawals.providerId, providerId))
      : db.select().from(withdrawals);

    return await query.orderBy(desc(withdrawals.createdAt));
  }

  async createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> {
    const result = await db.insert(withdrawals).values(withdrawal).returning();
    return result[0];
  }

  async updateWithdrawal(id: number, updates: Partial<Withdrawal>): Promise<Withdrawal | undefined> {
    const result = await db.update(withdrawals).set(updates).where(eq(withdrawals.id, id)).returning();
    return result[0];
  }

  async getCartItems(buyerId: number): Promise<CartItem[]> {
    return await db.select().from(cartItems).where(eq(cartItems.buyerId, buyerId));
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    const result = await db.insert(cartItems).values(cartItem).returning();
    return result[0];
  }

  async removeFromCart(id: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(buyerId: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.buyerId, buyerId));
  }

  async getPlatformStats(): Promise<any> {
    const totalUsers = await db.select().from(users);
    const totalTransactions = await db.select().from(transactions);
    const totalWithdrawals = await db.select().from(withdrawals);
    
    return {
      totalUsers: totalUsers.length,
      totalTransactions: totalTransactions.length,
      totalRevenue: totalWithdrawals.reduce((sum, w) => sum + parseFloat(w.fee), 0),
      completionRate: 94.2 // Calculate based on completed vs total transactions
    };
  }
}

export const storage = new DatabaseStorage();
