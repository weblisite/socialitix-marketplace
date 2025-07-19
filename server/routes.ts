import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertServiceSchema, insertTransactionSchema, insertWithdrawalSchema, insertCartItemSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

  const httpServer = createServer(app);
  return httpServer;
}
