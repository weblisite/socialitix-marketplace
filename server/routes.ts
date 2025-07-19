import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./storage";
import { 
  insertUserSchema, insertServiceSchema, insertTransactionSchema, insertWithdrawalSchema, insertCartItemSchema,
  users, moderationQueue, reports
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail, initializeEmailTemplates } from './email';
import { moderateContent, validateCommentText, approveContent, rejectContent } from './moderation';
import { linkSocialMediaAccount, getUserSocialAccounts } from './social-media';
import { getProviderAssignments, startAssignment, submitAssignmentProof } from './action-assignments';
import { upload, processProofImage, validateProofImage } from './file-upload';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        user: { ...user, password: undefined },
        token
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        user: { ...user, password: undefined },
        token
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed", error });
    }
  });

  // User routes
  app.get("/api/user/profile", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user profile", error });
    }
  });

  // Service routes
  app.get("/api/services", async (req, res) => {
    try {
      const { platform, type } = req.query;
      const services = await storage.getServices({
        platform: platform as string,
        type: type as string
      });
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to get services", error });
    }
  });

  app.post("/api/services", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can create services" });
      }

      const serviceData = insertServiceSchema.parse({
        ...req.body,
        providerId: req.user.id
      });

      const service = await storage.createService(serviceData);
      res.json(service);
    } catch (error) {
      res.status(400).json({ message: "Invalid service data", error });
    }
  });

  app.get("/api/services/provider", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can view their services" });
      }

      const services = await storage.getServicesByProvider(req.user.id);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to get provider services", error });
    }
  });

  // Cart routes
  app.get("/api/cart", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Only buyers can access cart" });
      }

      const cartItems = await storage.getCartItems(req.user.id);
      res.json(cartItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to get cart items", error });
    }
  });

  app.post("/api/cart", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Only buyers can add to cart" });
      }

      const cartItemData = insertCartItemSchema.parse({
        ...req.body,
        buyerId: req.user.id
      });

      const cartItem = await storage.addToCart(cartItemData);
      res.json(cartItem);
    } catch (error) {
      res.status(400).json({ message: "Invalid cart item data", error });
    }
  });

  app.delete("/api/cart/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Only buyers can remove from cart" });
      }

      await storage.removeFromCart(parseInt(req.params.id));
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove item from cart", error });
    }
  });

  // Transaction routes
  app.get("/api/transactions", authenticateToken, async (req: any, res) => {
    try {
      const transactions = await storage.getTransactions(req.user.id, req.user.role);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get transactions", error });
    }
  });

  app.post("/api/transactions", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Only buyers can create transactions" });
      }

      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        buyerId: req.user.id
      });

      const transaction = await storage.createTransaction(transactionData);
      
      // Clear cart after successful transaction
      await storage.clearCart(req.user.id);
      
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid transaction data", error });
    }
  });

  // Withdrawal routes
  app.get("/api/withdrawals", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Only providers and admins can view withdrawals" });
      }

      const providerId = req.user.role === 'provider' ? req.user.id : undefined;
      const withdrawals = await storage.getWithdrawals(providerId);
      res.json(withdrawals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get withdrawals", error });
    }
  });

  app.post("/api/withdrawals", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can request withdrawals" });
      }

      const { amount } = req.body;
      
      // Calculate fee: 2.9% + 30 shillings
      const fee = (parseFloat(amount) * 0.029) + 30;
      const netAmount = parseFloat(amount) - fee;

      if (netAmount <= 0) {
        return res.status(400).json({ message: "Amount too small after fees" });
      }

      const withdrawalData = insertWithdrawalSchema.parse({
        providerId: req.user.id,
        amount: amount.toString(),
        fee: fee.toString(),
        netAmount: netAmount.toString(),
        status: "pending"
      });

      const withdrawal = await storage.createWithdrawal(withdrawalData);
      res.json(withdrawal);
    } catch (error) {
      res.status(400).json({ message: "Invalid withdrawal data", error });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get platform stats", error });
    }
  });

  // Initialize Paystack payment
  app.post("/api/payments/initialize", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Only buyers can initiate payments" });
      }

      const { cartItems, totalAmount } = req.body;
      
      // Create transaction record
      const transactionData = insertTransactionSchema.parse({
        buyerId: req.user.id,
        providerId: cartItems[0]?.providerId || 1,
        serviceId: cartItems[0]?.serviceId || 1,
        quantity: cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
        totalCost: totalAmount.toString(),
        providerEarnings: (totalAmount * 0.4).toString(), // 40% to provider
        targetUrl: req.body.targetUrl || "https://example.com",
        status: "pending"
      });

      const transaction = await storage.createTransaction(transactionData);
      
      res.json({
        reference: `TXN_${transaction.id}_${Date.now()}`,
        transactionId: transaction.id,
        amount: totalAmount * 100, // Convert to kobo for Paystack
        email: req.user.email
      });
    } catch (error) {
      res.status(400).json({ message: "Payment initialization failed", error });
    }
  });

  // Verify Paystack payment
  app.post("/api/payments/verify", authenticateToken, async (req: any, res) => {
    try {
      const { reference, transactionId } = req.body;
      
      // In production, verify with Paystack API
      // For now, simulate successful verification
      await storage.updateTransaction(parseInt(transactionId), {
        status: 'completed',
        paymentId: reference
      });
      
      // Clear buyer's cart
      await storage.clearCart(req.user.id);
      
      res.json({ message: "Payment verified successfully" });
    } catch (error) {
      res.status(500).json({ message: "Payment verification failed", error });
    }
  });

  // Payment webhook (Paystack)
  app.post("/api/webhooks/paystack", async (req, res) => {
    try {
      const { event, data } = req.body;
      
      if (event === 'charge.success') {
        // Update transaction status
        const transactionId = data.metadata?.transactionId;
        if (transactionId) {
          await storage.updateTransaction(parseInt(transactionId), {
            status: 'completed',
            paymentId: data.reference
          });
        }
      }

      res.status(200).json({ message: 'Webhook processed' });
    } catch (error) {
      res.status(500).json({ message: "Webhook processing failed", error });
    }
  });

  // Email and notification routes
  app.post("/api/email/send", authenticateToken, async (req, res) => {
    try {
      const { to, templateName, variables } = req.body;
      const result = await sendEmail({ to, templateName, variables });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to send email", error: error.message });
    }
  });

  // Social media account management
  app.get("/api/social-accounts", authenticateToken, async (req, res) => {
    try {
      const accounts = await getUserSocialAccounts(req.user.id);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get social accounts", error: error.message });
    }
  });

  app.post("/api/social-accounts", authenticateToken, async (req, res) => {
    try {
      const { platform, username, accessToken } = req.body;
      const result = await linkSocialMediaAccount(req.user.id, platform, username, accessToken);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to link account", error: error.message });
    }
  });

  // Provider assignments
  app.get("/api/assignments", authenticateToken, async (req, res) => {
    try {
      const { status } = req.query;
      const assignments = await getProviderAssignments(req.user.id, status as string);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assignments", error: error.message });
    }
  });

  app.post("/api/assignments/:id/start", authenticateToken, async (req, res) => {
    try {
      const result = await startAssignment(parseInt(req.params.id), req.user.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to start assignment", error: error.message });
    }
  });

  app.post("/api/assignments/:id/submit-proof", authenticateToken, upload.single('proof'), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      let proofUrl = '';

      if (req.file) {
        const validation = validateProofImage(req.file);
        if (!validation.valid) {
          return res.status(400).json({ message: "Invalid image", errors: validation.errors });
        }

        const processResult = await processProofImage(req.file.buffer, req.file.originalname, req.user.id, assignmentId);
        if (!processResult.success) {
          return res.status(500).json({ message: "Failed to process image", error: processResult.error });
        }
        proofUrl = processResult.url!;
      }

      const result = await submitAssignmentProof(assignmentId, req.user.id, proofUrl);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit proof", error: error.message });
    }
  });

  // Content moderation
  app.post("/api/moderate-content", authenticateToken, async (req, res) => {
    try {
      const { content, type } = req.body;
      const result = moderateContent(content, type);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to moderate content", error: error.message });
    }
  });

  app.post("/api/validate-comment", async (req, res) => {
    try {
      const { comment } = req.body;
      const result = validateCommentText(comment);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to validate comment", error: error.message });
    }
  });

  // Admin moderation queue
  app.get("/api/admin/moderation-queue", authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const queue = await db.select().from(moderationQueue)
        .where(eq(moderationQueue.status, 'pending'))
        .orderBy(desc(moderationQueue.createdAt));
      
      res.json(queue);
    } catch (error) {
      res.status(500).json({ message: "Failed to get moderation queue", error: error.message });
    }
  });

  app.post("/api/admin/moderate/:id/approve", authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { reason } = req.body;
      await approveContent(parseInt(req.params.id), req.user.id, reason);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve content", error: error.message });
    }
  });

  app.post("/api/admin/moderate/:id/reject", authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { reason } = req.body;
      await rejectContent(parseInt(req.params.id), req.user.id, reason);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to reject content", error: error.message });
    }
  });

  // Admin user management
  app.get("/api/admin/users", authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        balance: users.balance,
        createdAt: users.createdAt
      }).from(users)
        .orderBy(desc(users.createdAt));
      
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users", error: error.message });
    }
  });

  app.post("/api/admin/users/:id/suspend", authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // In a real implementation, you'd add a 'suspended' field to users table
      res.json({ success: true, message: "User suspension functionality would be implemented here" });
    } catch (error) {
      res.status(500).json({ message: "Failed to suspend user", error: error.message });
    }
  });

  // Reports system
  app.post("/api/reports", authenticateToken, async (req, res) => {
    try {
      const reportData = {
        reporterId: req.user.id,
        ...req.body
      };
      
      const report = await db.insert(reports).values(reportData).returning();
      res.json(report[0]);
    } catch (error) {
      res.status(500).json({ message: "Failed to create report", error: error.message });
    }
  });

  app.get("/api/admin/reports", authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allReports = await db.select().from(reports)
        .orderBy(desc(reports.createdAt));
      
      res.json(allReports);
    } catch (error) {
      res.status(500).json({ message: "Failed to get reports", error: error.message });
    }
  });

  // Initialize email templates on server start
  initializeEmailTemplates().catch(console.error);

  const httpServer = createServer(app);
  return httpServer;
}
