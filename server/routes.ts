import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertServiceSchema, insertTransactionSchema, insertWithdrawalSchema, insertCartItemSchema,
  type ActionAssignment
} from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail, initializeEmailTemplates } from './email';
import { moderateContent, validateCommentText, approveContent, rejectContent } from './moderation';
import { linkSocialMediaAccount, getUserSocialAccounts } from './social-media';
import { getProviderAssignments, startAssignment, submitAssignmentProof } from './action-assignments';
import { upload } from './file-upload';
import { createUserProfileInSupabase, getUserProfileFromSupabase, supabase } from './supabase';
import { 
  submitProof, 
  verifyManually, 
  performAIVerification, 
  getProviderVerificationStats,
  generateImageHash,
  reVerifyBuyerRejection
} from './verification';
import {
  createPaymentRequest,
  verifyPayment,
  processWithdrawal,
  calculateWithdrawalFee,
  getPublishableKey,
  logPaymentTransaction
} from './payment';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    balance?: number;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify Supabase token
const authenticateToken = async (req: any, res: any, next: any) => {
  console.log('Authentication middleware called');
  const authHeader = req.headers['authorization'];
  console.log('Auth header:', authHeader);
  const token = authHeader && authHeader.split(' ')[1];
  console.log('Token:', token ? 'Present' : 'Missing');

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    console.log('Verifying token with Supabase...');
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    console.log('Supabase auth result:', { user: user ? 'Present' : 'Missing', error });
    
    if (error || !user) {
      console.log('Token verification failed:', error);
      return res.status(403).json({ message: 'Invalid token' });
    }

    console.log('Getting user profile from database...');
    // Get user profile from our database
    const userProfile = await getUserProfileFromSupabase(user.email!);
    console.log('User profile result:', userProfile ? 'Found' : 'Not found');
    
    if (!userProfile) {
      console.log('User profile not found in database');
      return res.status(404).json({ message: 'User profile not found' });
    }

    console.log('Setting user object:', userProfile);
    req.user = userProfile;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

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

  // Create user profile endpoint for Supabase integration
  app.post("/api/auth/create-profile", async (req, res) => {
    try {
      const { email, name, role } = req.body;
      
      // Check if user already exists in Supabase
      const existingUser = await getUserProfileFromSupabase(email);
      if (existingUser) {
        return res.status(400).json({ message: "User profile already exists" });
      }

      // Create user profile in Supabase
      const user = await createUserProfileInSupabase({
        email,
        name,
        role
      });

      res.json({
        user: { ...user, password: undefined },
        message: "User profile created successfully"
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      res.status(400).json({ message: "Failed to create user profile", error });
    }
  });

  // User routes
  app.get("/api/user/profile", authenticateToken, async (req: any, res) => {
    try {
      // Get user profile from Supabase using email
      const user = await getUserProfileFromSupabase(req.user.email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user profile", error });
    }
  });

  // Service routes - Updated to use database services
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getServices();
      
      // Transform database services to match frontend expectations
      const transformedServices = services.map(service => ({
        id: service.id.toString(),
        platform: service.platform,
        type: service.type,
        title: service.title, // Add title field for frontend compatibility
        name: service.title,
        buyerName: service.title,
        providerName: service.title,
        buyerDescription: service.description,
        providerDescription: service.description,
        buyerPrice: 10.00, // Updated to 10 KES per action
        providerPrice: 5.00, // Updated to 5 KES per action (50% of buyer price)
        deliveryTime: `${service.delivery_time} hours`,
        requirements: ['Valid account', 'Public profile'],
        icon: `fab fa-${service.platform}`,
        category: service.type === 'followers' || service.type === 'subscribers' ? 'growth' : 
                 service.type === 'likes' || service.type === 'comments' ? 'engagement' : 'reach',
        // Add dynamic URL placeholder based on platform
        urlPlaceholder: getUrlPlaceholder(service.platform, service.type)
      }));
      
      const { platform, type } = req.query;
      let filteredServices = transformedServices;
      
      if (platform && platform !== 'all') {
        filteredServices = filteredServices.filter(service => service.platform === platform);
      }
      if (type && type !== 'all') {
        filteredServices = filteredServices.filter(service => service.type === type);
      }
      
      res.json(filteredServices);
    } catch (error) {
      res.status(500).json({ message: "Failed to get services", error });
    }
  });

  // Helper function to generate dynamic URL placeholders
  function getUrlPlaceholder(platform: string, type: string): string {
    const placeholders: { [key: string]: { [key: string]: string } } = {
      instagram: {
        followers: 'https://instagram.com/username',
        likes: 'https://instagram.com/p/post_id',
        comments: 'https://instagram.com/p/post_id',
        views: 'https://instagram.com/reel/reel_id'
      },
      youtube: {
        subscribers: 'https://youtube.com/@channel_name',
        views: 'https://youtube.com/watch?v=video_id',
        likes: 'https://youtube.com/watch?v=video_id',
        comments: 'https://youtube.com/watch?v=video_id'
      },
      twitter: {
        followers: 'https://twitter.com/username',
        likes: 'https://twitter.com/username/status/tweet_id',
        retweets: 'https://twitter.com/username/status/tweet_id'
      },
      tiktok: {
        followers: 'https://tiktok.com/@username',
        likes: 'https://tiktok.com/@username/video/video_id',
        views: 'https://tiktok.com/@username/video/video_id'
      },
      facebook: {
        followers: 'https://facebook.com/page_name',
        likes: 'https://facebook.com/page_name',
        'post-likes': 'https://facebook.com/username/posts/post_id',
        shares: 'https://facebook.com/username/posts/post_id',
        comments: 'https://facebook.com/username/posts/post_id'
      }
    };
    
    return placeholders[platform]?.[type] || `https://${platform}.com/your_${type}`;
  }

  // Provider-specific services endpoint
  app.get("/api/services/provider-view", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      // Fetch services from database
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'active')
        .order('platform', { ascending: true })
        .order('type', { ascending: true });

      if (error) {
        throw error;
      }

      // Transform database services to match frontend expectations
      const transformedServices = services.map(service => {
        const serviceId = `${service.platform}-${service.type}`;
        const category = service.type === 'followers' || service.type === 'subscribers' ? 'growth' :
                        service.type === 'likes' || service.type === 'comments' ? 'engagement' : 'reach';
        
        return {
          id: serviceId,
          platform: service.platform,
          type: service.type,
          name: `Perform ${service.title}`,
          buyerName: service.title,
          providerName: `Perform ${service.title}`,
          buyerDescription: service.description,
          providerDescription: `Complete the ${service.title.toLowerCase()} task using your personal account`,
          buyerPrice: parseFloat(service.price),
          providerPrice: parseFloat(service.price) * 0.5, // 50% of buyer price
          deliveryTime: `${service.delivery_time} hours`,
          requirements: ['Valid account', 'Public profile'],
          icon: `fab fa-${service.platform}`,
          category: category,
          urlPlaceholder: getUrlPlaceholder(service.platform, service.type)
        };
      });
      
      const { platform, type } = req.query;
      let filteredServices = transformedServices;
      
      if (platform && platform !== 'all') {
        filteredServices = filteredServices.filter(service => service.platform === platform);
      }
      if (type && type !== 'all') {
        filteredServices = filteredServices.filter(service => service.type === type);
      }
      
      res.json(filteredServices);
    } catch (error) {
      res.status(500).json({ message: "Failed to get services", error });
    }
  });

  // Provider service selection
  app.get("/api/provider/services", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can view their services" });
      }

      // Get provider's selected service IDs
      const { data: providerServices, error } = await supabase
        .from('provider_services')
        .select('service_id, status')
        .eq('provider_id', req.user.id)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Get the selected service IDs
      const selectedServiceIds = providerServices.map(item => item.service_id);
      
      // Get full service details for the selected services
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'active')
        .order('platform', { ascending: true })
        .order('type', { ascending: true });
      
      if (servicesError) throw servicesError;
      
      // Transform services to match expected format
      const transformedServices = allServices.map(service => ({
        id: `${service.platform}-${service.type}`,
        platform: service.platform,
        action_type: service.type,
        name: service.title,
        description: `Complete the ${service.title.toLowerCase()} task using your personal account`,
        buyerPrice: parseFloat(service.price),
        providerEarnings: parseFloat(service.price) * 0.5, // 50% of buyer price
        success_rate: 95 // Default success rate
      }));
      
      // Filter services to only include the ones the provider has selected
      const selectedServices = transformedServices.filter(service => 
        selectedServiceIds.includes(service.id)
      );
      
      // Return the selected services with full details
      res.json(selectedServices);
    } catch (error) {
      console.error('Error getting provider services:', error);
      res.status(500).json({ message: "Failed to get provider services", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/provider/services", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can select services" });
      }

      const { serviceIds } = req.body;
      
      // Validate serviceIds
      if (!serviceIds || !Array.isArray(serviceIds)) {
        return res.status(400).json({ message: "Invalid serviceIds format" });
      }
      
      // Check for null/undefined values
      const invalidIds = serviceIds.filter(id => !id || id === null || id === undefined);
      if (invalidIds.length > 0) {
        return res.status(400).json({ message: "Invalid service IDs found", invalidIds });
      }
      
      // Clear existing service selections
      let { error: deleteError } = await supabase
        .from('provider_services')
        .delete()
        .eq('provider_id', req.user.id);
      
      // If table doesn't exist, create it
      if (deleteError && deleteError.code === '42P01') {
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
          return res.status(500).json({ message: "Failed to create services table" });
        }
        
        // Try delete again (should be empty now)
        const { error: retryDeleteError } = await supabase
          .from('provider_services')
          .delete()
          .eq('provider_id', req.user.id);
        
        deleteError = retryDeleteError;
      }
      
      if (deleteError) {
        console.error('Error deleting existing services:', deleteError);
        return res.status(500).json({ message: "Failed to update services" });
      }
      
      // Insert new service selections
      if (serviceIds && serviceIds.length > 0) {
        const serviceRecords = serviceIds.map((serviceId: string) => ({
          provider_id: req.user.id,
          service_id: serviceId,
          status: 'active'
        }));
        
        const { error: insertError } = await supabase
          .from('provider_services')
          .insert(serviceRecords);
        
        if (insertError) {
          console.error('Error inserting services:', insertError);
          return res.status(500).json({ message: "Failed to update services" });
        }
      }
      
      res.json({ message: "Provider services updated successfully" });
    } catch (error) {
      console.error('Error updating provider services:', error);
      res.status(500).json({ message: "Failed to update services", error: error instanceof Error ? error.message : 'Unknown error' });
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

  // Action assignments endpoint for providers
  app.get("/api/action-assignments", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can view action assignments" });
      }

      const assignments = await storage.getActionAssignments(req.user.id);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get action assignments", error });
    }
  });

  // Provider service management
  app.get("/api/provider-services", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can view provider services" });
      }

      const services = await storage.getProviderServices(req.user.id);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to get provider services", error });
    }
  });

  app.post("/api/provider-services", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can create provider services" });
      }

      const serviceData = {
        ...req.body,
        providerId: req.user.id
      };

      const service = await storage.createProviderService(serviceData);
      res.json(service);
    } catch (error) {
      res.status(400).json({ message: "Invalid provider service data", error });
    }
  });

  app.patch("/api/provider-services/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can update provider services" });
      }

      const { id } = req.params;
      const service = await storage.getProviderService(parseInt(id));
      if (!service || service.provider_id !== req.user.id) {
        return res.status(403).json({ message: "You can only update your own services" });
      }

      const updatedService = await storage.updateProviderService(parseInt(id), req.body);
      res.json(updatedService);
    } catch (error) {
      res.status(500).json({ message: "Failed to update provider service", error });
    }
  });

  app.delete("/api/provider-services/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can delete provider services" });
      }

      const { id } = req.params;
      const service = await storage.getProviderService(parseInt(id));
      if (!service || service.provider_id !== req.user.id) {
        return res.status(403).json({ message: "You can only delete your own services" });
      }

      await storage.deleteProviderService(parseInt(id));
      res.json({ message: "Provider service deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete provider service", error });
    }
  });

  // Update action assignment status
  app.patch("/api/action-assignments/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can update action assignments" });
      }

      const { id } = req.params;
      const { status, proofUrl } = req.body;

      const assignment = await storage.getActionAssignment(parseInt(id));
      if (!assignment || assignment.provider_id !== req.user.id) {
        return res.status(403).json({ message: "You can only update your own assignments" });
      }

      const updateData: Partial<ActionAssignment> = {
        proof_url: proofUrl,
        status: 'completed',
        completed_at: new Date().toISOString()
      };

      if (status === 'completed' && assignment.assigned_at) {
        const completionTime = Math.floor((new Date().getTime() - new Date(assignment.assigned_at).getTime()) / (1000 * 60));
        updateData.completion_time = completionTime;
      }

      const result = await storage.updateActionAssignment(parseInt(id), updateData);

      // Update transaction fulfillment
      await storage.updateTransactionFulfillment(assignment.transaction_id);

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to update action assignment", error });
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
      
      // Create available assignments for providers
      try {
        const { createAvailableAssignments } = await import('./available-assignments');
        await createAvailableAssignments(transaction.id);
      } catch (assignmentError) {
        console.error('Error creating available assignments:', assignmentError);
        // Don't fail the transaction if assignment creation fails
      }
      
      // Update transaction status to in_progress
      await storage.updateTransaction(transaction.id, { status: 'in_progress' });
      
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

      let query = supabase
        .from('withdrawals')
        .select(`
          *,
          users!withdrawals_provider_id_fkey(
            id,
            email,
            full_name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      // If provider, only show their withdrawals
      if (req.user.role === 'provider') {
        query = query.eq('provider_id', req.user.id);
      }

      const { data: withdrawals, error } = await query;

      if (error) {
        console.error('Error fetching withdrawals:', error);
        return res.status(500).json({ message: "Failed to get withdrawals" });
      }

      res.json(withdrawals || []);
    } catch (error) {
      console.error('Withdrawals error:', error);
      res.status(500).json({ message: "Failed to get withdrawals", error: (error as Error).message });
    }
  });

  app.post("/api/withdrawals", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can request withdrawals" });
      }

      const { amount, payment_method, payment_details } = req.body;
      
                              // Validate minimum withdrawal amount
            if (parseFloat(amount) < 100) {
              return res.status(400).json({ message: "Minimum withdrawal amount is KES 100" });
            }

            // Calculate fee: 3% transaction fee
            const fee = parseFloat(amount) * 0.03;
            const netAmount = parseFloat(amount) - fee;

      if (netAmount <= 0) {
        return res.status(400).json({ message: "Amount too small after fees" });
      }

      // Check if user has sufficient balance
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', req.user.id)
        .single();

      if (userError || parseFloat(user?.balance || '0') < parseFloat(amount)) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const withdrawalData = insertWithdrawalSchema.parse({
        provider_id: req.user.id,
        amount: amount.toString(),
        fee: fee.toString(),
        net_amount: netAmount.toString(),
        status: "pending",
        payment_method,
        payment_details
      });

      // Create withdrawal record
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert([withdrawalData])
        .select()
        .single();

      if (withdrawalError) {
        console.error('Error creating withdrawal:', withdrawalError);
        return res.status(500).json({ message: "Failed to create withdrawal request" });
      }

      // Deduct amount from user balance
      const newBalance = parseFloat(user?.balance || '0') - parseFloat(amount);
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: newBalance.toFixed(2) })
        .eq('id', req.user.id);

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        return res.status(500).json({ message: "Failed to update balance" });
      }

      res.json({
        success: true,
        withdrawal,
        new_balance: newBalance.toFixed(2)
      });
    } catch (error) {
      console.error('Withdrawal error:', error);
      res.status(400).json({ message: "Invalid withdrawal data", error: (error as Error).message });
    }
  });

  // Admin withdrawal management routes
  app.put("/api/admin/withdrawals/:id/status", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { status, admin_notes, external_payment_id } = req.body;

      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updateData: any = {
        status,
        processed_by: req.user.id,
        processed_at: new Date().toISOString()
      };

      if (admin_notes) updateData.admin_notes = admin_notes;
      if (external_payment_id) updateData.external_payment_id = external_payment_id;

      const { data: withdrawal, error } = await supabase
        .from('withdrawals')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          users!withdrawals_provider_id_fkey(
            id,
            email,
            full_name,
            username
          )
        `)
        .single();

      if (error) {
        console.error('Error updating withdrawal:', error);
        return res.status(500).json({ message: "Failed to update withdrawal" });
      }

      res.json({ success: true, withdrawal });
    } catch (error) {
      console.error('Update withdrawal error:', error);
      res.status(500).json({ message: "Failed to update withdrawal", error: (error as Error).message });
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
        targetUrl: req.body.targetUrl,
        status: "pending"
      });

      const transaction = await storage.createTransaction(transactionData);
      
      // Create available assignments for providers
      try {
        const { createAvailableAssignments } = await import('./available-assignments');
        await createAvailableAssignments(transaction.id);
      } catch (assignmentError) {
        console.error('Error creating available assignments:', assignmentError);
        // Don't fail the transaction if assignment creation fails
      }
      
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
        payment_id: reference
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
            payment_id: data.reference
          });
        }
      }

      res.status(200).json({ message: 'Webhook processed' });
    } catch (error) {
      res.status(500).json({ message: "Webhook processing failed", error });
    }
  });

  // Email and notification routes
  app.post("/api/email/send", authenticateToken, async (req: any, res) => {
    try {
      const { to, templateName, variables } = req.body;
      const result = await sendEmail({ to, templateName, variables });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to send email", error: (error as Error).message });
    }
  });

  // Social media account management
  app.get("/api/social-accounts", authenticateToken, async (req: any, res) => {
    try {
      const accounts = await getUserSocialAccounts(req.user.id);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get social accounts", error: (error as Error).message });
    }
  });

  app.post("/api/social-accounts", authenticateToken, async (req: any, res) => {
    try {
      const { platform, username, accessToken } = req.body;
      const result = await linkSocialMediaAccount(req.user.id, platform, username, accessToken);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to link account", error: (error as Error).message });
    }
  });

  // Provider assignments
  app.get("/api/assignments", authenticateToken, async (req: any, res) => {
    try {
      const { status } = req.query;
      const assignments = await getProviderAssignments(req.user.id, status as string);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assignments", error: (error as Error).message });
    }
  });

  app.post("/api/assignments/:id/start", authenticateToken, async (req: any, res) => {
    try {
      const result = await startAssignment(parseInt(req.params.id), req.user.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to start assignment", error: (error as Error).message });
    }
  });

  app.post("/api/assignments/:id/submit-proof", authenticateToken, async (req: any, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const { screenshot_url, submission_notes } = req.body;

      if (!screenshot_url) {
        return res.status(400).json({ message: "Screenshot URL is required" });
      }

      const result = await submitAssignmentProof(assignmentId, req.user.id, screenshot_url);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit proof", error: (error as Error).message });
    }
  });

  // Content moderation
  app.post("/api/moderate-content", authenticateToken, async (req: any, res) => {
    try {
      const { content, type } = req.body;
      const result = moderateContent(content, type);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to moderate content", error: (error as Error).message });
    }
  });

  app.post("/api/validate-comment", async (req, res) => {
    try {
      const { comment } = req.body;
      const result = validateCommentText(comment);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to validate comment", error: (error as Error).message });
    }
  });

  // Admin moderation queue
  app.get("/api/admin/moderation-queue", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { data: queue, error } = await supabase
        .from('moderation_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      res.json(queue || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to get moderation queue", error: (error as Error).message });
    }
  });

  app.post("/api/admin/moderate/:id/approve", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { reason } = req.body;
      await approveContent(parseInt(req.params.id), req.user.id, reason);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve content", error: (error as Error).message });
    }
  });

  app.post("/api/admin/moderate/:id/reject", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { reason } = req.body;
      await rejectContent(parseInt(req.params.id), req.user.id, reason);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to reject content", error: (error as Error).message });
    }
  });

  // Admin user management
  app.get("/api/admin/users", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      res.json(allUsers || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users", error: (error as Error).message });
    }
  });

  app.post("/api/admin/users/:id/suspend", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // In a real implementation, you'd add a 'suspended' field to users table
      res.json({ success: true, message: "User suspension functionality would be implemented here" });
    } catch (error) {
      res.status(500).json({ message: "Failed to suspend user", error: (error as Error).message });
    }
  });

  // Reports system
  app.post("/api/reports", authenticateToken, async (req: any, res) => {
    try {
      const reportData = {
        reporter_id: req.user.id,
        ...req.body
      };
      
      const { data: report, error } = await supabase
        .from('reports')
        .insert([reportData])
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to create report", error: (error as Error).message });
    }
  });

  app.get("/api/admin/reports", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { data: allReports, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      res.json(allReports || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to get reports", error: (error as Error).message });
    }
  });

  // Platform analytics and stats
  app.get("/api/admin/stats", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get counts from Supabase
      const [
        { count: totalUsers },
        { count: activeProviders },
        { count: activeBuyers },
        { count: pendingModerations },
        { count: openReports }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'provider'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'buyer'),
        supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      // Calculate total revenue from completed transactions
      const { data: revenueData, error: revenueError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, transaction) => 
        sum + parseFloat(transaction.amount || '0'), 0) || 0;

      const stats = {
        totalUsers: totalUsers || 0,
        totalRevenue: totalRevenue,
        activeProviders: activeProviders || 0,
        activeBuyers: activeBuyers || 0,
        pendingModerations: pendingModerations || 0,
        openReports: openReports || 0
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats", error: (error as Error).message });
    }
  });

  // Provider submit proof for verification
  app.post("/api/provider/submit-proof", authenticateToken, upload.single('proof_image'), async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      const { assignment_id } = req.body;
      const proofImage = req.file;

      if (!assignment_id || !proofImage) {
        return res.status(400).json({ message: "Assignment ID and proof image are required" });
      }

      // Validate assignment belongs to this provider
      const { data: assignment, error: assignmentError } = await supabase
        .from('action_assignments')
        .select('*')
        .eq('id', assignment_id)
        .eq('provider_id', req.user.id)
        .single();

      if (assignmentError || !assignment) {
        return res.status(404).json({ message: "Assignment not found or access denied" });
      }

      if (assignment.status !== 'in_progress') {
        return res.status(400).json({ message: "Assignment is not in progress" });
      }

      // Submit proof for verification
      const verificationResult = await submitProof(
        parseInt(assignment_id),
        req.user.id,
        proofImage.buffer,
        '' // URL will be set by the verification system
      );

      if (!verificationResult.success) {
        return res.status(400).json({ 
          message: verificationResult.reason,
          status: verificationResult.status 
        });
      }

      res.json({
        message: "Proof submitted successfully",
        status: verificationResult.status,
        reason: verificationResult.reason
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to submit proof", error: (error as Error).message });
    }
  });

  // Buyer verify proof manually
  app.post("/api/buyer/verify-proof", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Buyer access required" });
      }

      const { assignment_id, approved, reason } = req.body;

      if (!assignment_id || typeof approved !== 'boolean') {
        return res.status(400).json({ message: "Assignment ID and approval status are required" });
      }

      const verificationResult = await verifyManually(
        parseInt(assignment_id),
        req.user.id,
        approved,
        reason
      );

      if (!verificationResult.success) {
        return res.status(400).json({ 
          message: verificationResult.reason,
          status: verificationResult.status 
        });
      }

      res.json({
        message: "Verification completed",
        status: verificationResult.status,
        reason: verificationResult.reason
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to verify proof", error: (error as Error).message });
    }
  });

  // ===== AVAILABLE ASSIGNMENTS SYSTEM =====

  // Get available assignments for providers (filtered by their selected services)
  app.get("/api/provider/available-assignments", authenticateToken, async (req: any, res) => {
    try {
      console.log('Provider available assignments requested for user:', req.user.id);
      
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      // Convert string service IDs to platform/type mapping
      // Fetch services from database to create dynamic mapping
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('platform, type')
        .eq('status', 'active');

      if (servicesError) {
        console.error('Error fetching services for mapping:', servicesError);
        throw servicesError;
      }

      // Create dynamic service mapping
      const serviceMapping: { [key: string]: { platform: string; type: string } } = {};
      services.forEach(service => {
        const serviceId = `${service.platform}-${service.type}`;
        serviceMapping[serviceId] = { platform: service.platform, type: service.type };
      });

      // Get provider's selected services
      const { data: providerServices, error: servicesError } = await supabase
        .from('provider_services')
        .select('service_id')
        .eq('provider_id', req.user.id)
        .eq('status', 'active');

      if (servicesError) throw servicesError;

      console.log('Provider services found:', providerServices);

      if (!providerServices || providerServices.length === 0) {
        console.log('No provider services found, returning empty array');
        return res.json([]);
      }

      // Get the platform/type combinations for the provider's selected services
      const providerPlatformTypes = providerServices
        .map(ps => serviceMapping[ps.service_id])
        .filter(Boolean);

      console.log('Provider platform types:', providerPlatformTypes);

      if (providerPlatformTypes.length === 0) {
        console.log('No platform types found, returning empty array');
        return res.json([]);
      }

      // Get available assignments that match the provider's platform/type combinations
      let availableAssignments: any[] = [];
      
      for (const platformType of providerPlatformTypes) {
        console.log('Searching for assignments with platform:', platformType.platform, 'type:', platformType.type);
        
        const { data: assignments, error: assignmentsError } = await supabase
          .from('available_assignments')
          .select(`
            *,
            transactions!inner(
              id,
              service_id,
              quantity,
              target_url,
              comment_text,
              buyer_id,
              status
            ),
            services!inner(
              id,
              name,
              platform,
              action_type
            )
          `)
          .eq('status', 'available')
          .eq('platform', platformType.platform)
          .eq('action_type', platformType.type)
          .order('created_at', { ascending: false });

        if (assignmentsError) {
          console.error('Error fetching assignments:', assignmentsError);
          throw assignmentsError;
        }
        
        console.log('Found assignments for', platformType.platform, platformType.type, ':', assignments?.length || 0);
        
        if (assignments) {
          availableAssignments = [...availableAssignments, ...assignments];
        }
      }

      console.log('Total available assignments found:', availableAssignments.length);
      res.json(availableAssignments);
    } catch (error) {
      console.error('Error in provider available assignments:', error);
      res.status(500).json({ message: "Failed to fetch available assignments", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Claim an available assignment
  app.post("/api/provider/claim-assignment/:assignmentId", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      const assignmentId = parseInt(req.params.assignmentId);

      // Check if assignment is still available
      const { data: assignment, error: assignmentError } = await supabase
        .from('available_assignments')
        .select('*')
        .eq('id', assignmentId)
        .eq('status', 'available')
        .single();

      if (assignmentError || !assignment) {
        return res.status(404).json({ message: "Assignment not available or not found" });
      }

      // Update assignment status to claimed
      const { error: updateError } = await supabase
        .from('available_assignments')
        .update({ 
          status: 'claimed',
          claimed_by: req.user.id,
          claimed_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      // Create action assignment for the provider
      const { error: actionError } = await supabase
        .from('action_assignments')
        .insert({
          transaction_id: assignment.transaction_id,
          provider_id: req.user.id,
          platform: assignment.platform,
          action_type: assignment.action_type,
          target_url: assignment.target_url,
          comment_text: assignment.comment_text,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          provider_earnings: assignment.provider_earnings
        });

      if (actionError) throw actionError;

      res.json({ message: "Assignment claimed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to claim assignment", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Upload proof screenshot
  app.post("/api/upload-proof", authenticateToken, upload.single('file'), async (req: any, res) => {
    try {
      const { uploadProofScreenshot } = await import('./file-upload');
      await uploadProofScreenshot(req, res);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file", error });
    }
  });

  // Re-verify buyer rejection
  app.post("/api/buyer/re-verify-rejection", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Buyer access required" });
      }

      const { assignment_id } = req.body;

      if (!assignment_id) {
        return res.status(400).json({ message: "Assignment ID is required" });
      }

             const reVerificationResult = await reVerifyBuyerRejection(parseInt(assignment_id));

      if (!reVerificationResult.success) {
        return res.status(400).json({ 
          message: reVerificationResult.reason,
          status: reVerificationResult.status 
        });
      }

      res.json({
        message: "Re-verification completed",
        status: reVerificationResult.status,
        reason: reVerificationResult.reason
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to re-verify buyer rejection", error: (error as Error).message });
    }
  });

  // Provider request AI re-verification of buyer rejection
  app.post("/api/provider/request-ai-reverification", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      const { assignment_id } = req.body;

      if (!assignment_id) {
        return res.status(400).json({ message: "Assignment ID is required" });
      }

      // Verify assignment belongs to this provider and was rejected by buyer
      const { data: assignment, error: assignmentError } = await supabase
        .from('action_assignments')
        .select('*')
        .eq('id', assignment_id)
        .eq('provider_id', req.user.id)
        .eq('status', 'rejected_by_buyer')
        .single();

      if (assignmentError || !assignment) {
        return res.status(404).json({ message: "Assignment not found or not eligible for re-verification" });
      }

      // Check if 24 hours have passed since rejection
      const rejectionTime = new Date(assignment.verified_at).getTime();
      const now = Date.now();
      const hoursSince = Math.floor((now - rejectionTime) / (1000 * 60 * 60));

      if (hoursSince < 24) {
        return res.status(400).json({ 
          message: `AI will automatically re-verify this assignment in ${24 - hoursSince} hours. Manual requests are only available after 24 hours.` 
        });
      }

      // Perform AI re-verification
      const reVerificationResult = await reVerifyBuyerRejection(parseInt(assignment_id));

      res.json({
        message: "AI re-verification completed",
        status: reVerificationResult.status,
        reason: reVerificationResult.reason,
        confidence: reVerificationResult.confidence
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to request AI re-verification", error: (error as Error).message });
    }
  });

  // Get verification status for an assignment
  app.get("/api/verification/status/:assignmentId", authenticateToken, async (req: any, res) => {
    try {
      const { assignmentId } = req.params;

      const { data: assignment, error } = await supabase
        .from('action_assignments')
        .select(`
          *,
          transactions!inner(buyer_id, provider_id)
        `)
        .eq('id', assignmentId)
        .single();

      if (error || !assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Check if user has access to this assignment
      const isBuyer = req.user.id === assignment.transactions.buyer_id;
      const isProvider = req.user.id === assignment.transactions.provider_id;
      const isAdmin = req.user.role === 'admin';

      if (!isBuyer && !isProvider && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Calculate time remaining for manual verification (48 hours from submission)
      let timeRemaining = null;
      if (assignment.submitted_at && assignment.status === 'pending_verification') {
        const submissionTime = new Date(assignment.submitted_at).getTime();
        const deadline = submissionTime + (48 * 60 * 60 * 1000); // 48 hours
        const now = Date.now();
        timeRemaining = Math.max(0, deadline - now);
      }

      res.json({
        assignment: {
          id: assignment.id,
          status: assignment.status,
          proof_url: assignment.proof_url,
          verification_method: assignment.verification_method,
          verification_reason: assignment.verification_reason,
          ai_confidence: assignment.ai_confidence,
          submitted_at: assignment.submitted_at,
          verified_at: assignment.verified_at,
          time_remaining_for_manual: timeRemaining
        },
        can_verify: isBuyer && assignment.status === 'pending_verification',
        can_submit_proof: isProvider && assignment.status === 'in_progress'
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to get verification status", error: (error as Error).message });
    }
  });

  // Get pending verifications for buyer
  app.get("/api/buyer/pending-verifications", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Buyer access required" });
      }

      const { data: assignments, error } = await supabase
        .from('action_assignments')
        .select(`
          *,
          transactions!inner(buyer_id, provider_id, target_url, comment_text),
          users!action_assignments_provider_id_fkey(name, email)
        `)
        .eq('transactions.buyer_id', req.user.id)
        .eq('status', 'pending_verification')
        .order('submitted_at', { ascending: false });

      if (error) {
        throw error;
      }

      const verifications = assignments?.map(assignment => ({
        id: assignment.id,
        action_type: assignment.action_type,
        platform: assignment.platform,
        target_url: assignment.target_url,
        comment_text: assignment.comment_text,
        proof_url: assignment.proof_url,
        submitted_at: assignment.submitted_at,
        provider_name: assignment.users?.name,
        time_remaining: assignment.submitted_at ? 
          Math.max(0, new Date(assignment.submitted_at).getTime() + (48 * 60 * 60 * 1000) - Date.now()) : 
          null
      })) || [];

      res.json(verifications);

    } catch (error) {
      res.status(500).json({ message: "Failed to get pending verifications", error: (error as Error).message });
    }
  });

  // Get all assignments for buyer
  app.get("/api/buyer/assignments", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Buyer access required" });
      }

      // Get buyer assignments through transactions
      console.log('Getting buyer assignments for user:', req.user.id);
      
      // First get all transactions for this buyer
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id')
        .eq('buyer_id', req.user.id);

      console.log('Buyer transactions:', transactions);

      if (transactionsError) {
        throw transactionsError;
      }

      if (!transactions || transactions.length === 0) {
        return res.json([]);
      }

      const transactionIds = transactions.map(t => t.id);

      // Then get available assignments for these transactions with user info
      const { data: assignments, error } = await supabase
        .from('available_assignments')
        .select(`
          *,
          users!claimed_by(full_name, email)
        `)
        .in('transaction_id', transactionIds)
        .order('created_at', { ascending: false });

      console.log('Buyer assignments query result:', { assignments, error });

      if (error) {
        throw error;
      }

      const buyerAssignments = assignments?.map(assignment => ({
        id: assignment.id,
        platform: assignment.platform,
        actionType: assignment.action_type,
        status: assignment.status,
        targetUrl: assignment.target_url,
        commentText: assignment.comment_text,
        proofUrl: null, // available_assignments don't have proof_url
        createdAt: assignment.created_at,
        assignedAt: assignment.claimed_at || assignment.created_at, // Use claimed_at if available, otherwise created_at
        completedAt: assignment.claimed_at, // Use claimed_at as completion time
        providerId: assignment.claimed_by || null, // Use claimed_by as provider_id, null if not claimed
        providerName: assignment.claimed_by ? (assignment.users?.full_name || 'Provider') : null,
        providerEmail: assignment.claimed_by ? (assignment.users?.email || null) : null,
        verificationScreenshots: [] // available_assignments don't have verification screenshots yet
      })) || [];

      res.json(buyerAssignments);

    } catch (error) {
      res.status(500).json({ message: "Failed to get buyer assignments", error: (error as Error).message });
    }
  });

  // Get provider verification statistics
  app.get("/api/provider/verification-stats", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      const stats = await getProviderVerificationStats(req.user.id);
      res.json(stats);

    } catch (error) {
      res.status(500).json({ message: "Failed to get verification stats", error: (error as Error).message });
    }
  });

  // Get provider wallet details and credit history
  app.get("/api/provider/wallet", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      // Get current balance
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', req.user.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Get credit history
      const { data: creditHistory, error: historyError } = await supabase
        .from('credit_transactions')
        .select(`
          *,
          action_assignments!inner(action_type, platform, target_url)
        `)
        .eq('provider_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (historyError) {
        throw historyError;
      }

      // Calculate total earnings
      const totalEarnings = creditHistory?.reduce((sum, transaction) => 
        sum + parseFloat(transaction.amount), 0) || 0;

      res.json({
        current_balance: parseFloat(user?.balance || '0'),
        total_earnings: totalEarnings,
        credit_history: creditHistory || []
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to get wallet details", error: (error as Error).message });
    }
  });

  // Payment routes
  app.post("/api/payment/create", authenticateToken, async (req: any, res) => {
    try {
      console.log('Payment creation started');
      console.log('Request body:', req.body);
      console.log('User object:', req.user);
      
      // Validate user object
      if (!req.user) {
        console.error('User object is null or undefined');
        return res.status(500).json({ message: "User authentication failed", error: "User object is null" });
      }

      if (!req.user.email) {
        console.error('User email is missing');
        return res.status(500).json({ message: "User email is required", error: "User email is missing" });
      }

      const { amount, service_id, quantity, target_url, comment_text } = req.body;

      if (!amount || !service_id) {
        return res.status(400).json({ message: "Amount and service_id are required" });
      }

      // Validate minimum quantity
      const quantityNum = parseInt(quantity);
      if (quantityNum < 1) {
        return res.status(400).json({ message: "Minimum quantity required is 1" });
      }

      // Create payment request
      console.log('User data:', req.user);
      const userName = req.user?.full_name || req.user?.email?.split('@')[0] || 'User';
      console.log('User name:', userName);
      const nameParts = userName.split(' ');
      const firstName = nameParts[0] || userName;
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const paymentResponse = await createPaymentRequest({
        amount: parseFloat(amount),
        currency: 'KES',
        email: req.user.email,
        first_name: firstName,
        last_name: lastName,
        reference: `Order-${service_id}-${Date.now()}`,
        callback_url: `${process.env.BASE_URL || 'http://localhost:5000'}/api/payment/callback`
      });

      if (!paymentResponse.success) {
        return res.status(400).json({ message: paymentResponse.error });
      }

      // Log the payment transaction
      try {
        await logPaymentTransaction(
          req.user.id,
          parseFloat(amount),
          paymentResponse.payment_id!,
          'pending',
          paymentResponse.payment_id!,
          service_id,
          parseInt(quantity),
          target_url,
          comment_text
        );
        console.log('Payment transaction logged successfully');
      } catch (transactionError) {
        console.error('Error logging payment transaction:', transactionError);
        return res.status(500).json({ 
          message: "Failed to create transaction record", 
          error: (transactionError as Error).message 
        });
      }

      res.json({
        success: true,
        payment_url: paymentResponse.payment_url,
        payment_id: paymentResponse.payment_id
      });

    } catch (error) {
      console.error('Payment creation error:', error);
      res.status(500).json({ message: "Failed to create payment", error: (error as Error).message });
    }
  });

  app.post("/api/payment/verify", authenticateToken, async (req: any, res) => {
    try {
      const { payment_id } = req.body;

      if (!payment_id) {
        return res.status(400).json({ message: "Payment ID is required" });
      }

      const verification = await verifyPayment(payment_id);

      if (!verification.success) {
        return res.status(400).json({ message: verification.error });
      }

      res.json({
        success: true,
        status: verification.status,
        amount: verification.amount,
        currency: verification.currency
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to verify payment", error: (error as Error).message });
    }
  });

  app.post("/api/payment/callback", async (req: any, res) => {
    try {
      console.log('Payment callback received:', req.body);
      const { payment_id, state, reference } = req.body;

      if (state === 'COMPLETED') {
        console.log('Payment completed, updating transaction...');
        // Update transaction status to completed (payment received)
        const { data: transaction, error } = await supabase
          .from('transactions')
          .update({ status: 'completed' })
          .eq('payment_id', payment_id)
          .select()
          .single();

        if (error) {
          console.error('Error updating transaction:', error);
        } else if (transaction) {
          console.log(`Payment completed for transaction ${transaction.id}, creating available assignments...`);
          
          // Create available assignments for providers
          try {
            const { createAvailableAssignments } = await import('./available-assignments');
            await createAvailableAssignments(transaction.id);
            console.log(`Successfully created available assignments for transaction ${transaction.id}`);
          } catch (assignmentError) {
            console.error('Error creating available assignments:', assignmentError);
            // Don't fail the callback if assignment creation fails
          }
        }
        
        // Note: Platform revenue is logged when services are verified, not when payment is collected
        // This ensures we only count revenue from actually delivered services
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Payment callback error:', error);
      res.status(500).json({ message: "Callback processing failed" });
    }
  });

  app.post("/api/withdrawal/request", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      const { amount, bank_details } = req.body;

      if (!amount || !bank_details) {
        return res.status(400).json({ message: "Amount and bank details are required" });
      }

      // Calculate withdrawal fee
      const { fee, netAmount } = calculateWithdrawalFee(parseFloat(amount));

      if (netAmount <= 0) {
        return res.status(400).json({ message: "Amount is too small after fees" });
      }

      // Check if user has sufficient balance
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', req.user.id)
        .single();

      if (userError || parseFloat(user?.balance || '0') < parseFloat(amount)) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Process withdrawal
      const withdrawalResult = await processWithdrawal(
        req.user.id,
        netAmount,
        bank_details
      );

      if (!withdrawalResult.success) {
        return res.status(400).json({ message: withdrawalResult.error });
      }

      // Deduct amount from user balance
      const newBalance = parseFloat(user?.balance || '0') - parseFloat(amount);
      await supabase
        .from('users')
        .update({ balance: newBalance.toFixed(2) })
        .eq('id', req.user.id);

      // Create withdrawal record
      await supabase
        .from('withdrawals')
        .insert([{
          provider_id: req.user.id,
          amount: amount.toString(),
          fee: fee.toString(),
          net_amount: netAmount.toString(),
          status: 'processing',
          payment_details: bank_details,
          payment_id: withdrawalResult.withdrawal_id
        }]);

      res.json({
        success: true,
        withdrawal_id: withdrawalResult.withdrawal_id,
        fee,
        net_amount: netAmount
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to process withdrawal", error: (error as Error).message });
    }
  });

  app.get("/api/payment/config", (req, res) => {
    const publishableKey = getPublishableKey();
    res.json({
      publishable_key: publishableKey,
      currency: 'KES',
      supported_methods: ['mpesa', 'card', 'bank']
    });
  });

  // Test endpoint to manually trigger assignment creation
  app.post("/api/test/create-assignments", async (req, res) => {
    try {
      const { transaction_id } = req.body;
      
      if (!transaction_id) {
        return res.status(400).json({ message: "Transaction ID is required" });
      }

      console.log(`Manually creating assignments for transaction ${transaction_id}`);
      
      const { createAvailableAssignments } = await import('./available-assignments');
      await createAvailableAssignments(transaction_id);
      
      res.json({ 
        success: true, 
        message: `Successfully created assignments for transaction ${transaction_id}` 
      });
    } catch (error) {
      console.error('Error in test assignment creation:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create assignments", 
        error: (error as Error).message 
      });
    }
  });

  // Test endpoint to check transaction status
  app.get("/api/test/transaction/:transactionId", async (req, res) => {
    try {
      const { transactionId } = req.params;
      
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) {
        return res.status(404).json({ message: "Transaction not found", error: error.message });
      }

      res.json({ 
        success: true, 
        transaction 
      });
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch transaction", 
        error: (error as Error).message 
      });
    }
  });

  // Simple in-memory queue for webhook processing (as recommended by IntaSend)
  const webhookQueue: Array<{ data: any; timestamp: number }> = [];
  let isProcessingQueue = false;

  const processWebhookQueue = async () => {
    if (isProcessingQueue || webhookQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    while (webhookQueue.length > 0) {
      const webhookData = webhookQueue.shift();
      if (webhookData) {
        try {
          await processWebhookData(webhookData.data);
        } catch (error) {
          console.error('Error processing queued webhook:', error);
        }
      }
    }
    
    isProcessingQueue = false;
  };

  const processWebhookData = async (webhookData: any) => {
    console.log('Processing webhook data:', JSON.stringify(webhookData, null, 2));
    
    // Extract webhook data according to IntaSend documentation
    const { 
      event_type, 
      state, 
      payment_id, 
      reference, 
      amount, 
      currency,
      metadata,
      created_at,
      updated_at
    } = webhookData;

    console.log('IntaSend webhook event details:', {
      event_type,
      state,
      payment_id,
      reference,
      amount,
      currency,
      created_at,
      updated_at
    });

    // Handle collection events based on IntaSend documentation
    if (event_type === 'collection') {
      console.log(`Collection event received: ${payment_id} with state: ${state}`);
      
      // Process different collection states
      switch (state) {
        case 'COMPLETED':
          console.log(`Payment completed via webhook: ${payment_id}`);
          
          // Update transaction status to completed
          const { data: transaction, error } = await supabase
            .from('transactions')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', payment_id)
            .select()
            .single();

          if (error) {
            console.error('Error updating transaction:', error);
            throw new Error('Failed to update transaction');
          }

          if (transaction) {
            console.log(`Payment completed for transaction ${transaction.id}, creating available assignments...`);
            
            // Create available assignments for providers
            try {
              const { createAvailableAssignments } = await import('./available-assignments');
              await createAvailableAssignments(transaction.id);
              console.log(`Successfully created available assignments for transaction ${transaction.id}`);
            } catch (assignmentError) {
              console.error('Error creating available assignments:', assignmentError);
              throw new Error('Failed to create assignments');
            }
          } else {
            console.log(`No transaction found for payment_id: ${payment_id}`);
          }
          break;

        case 'PENDING':
          console.log(`Payment pending: ${payment_id}`);
          // Update transaction status to pending
          await supabase
            .from('transactions')
            .update({ 
              status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', payment_id);
          break;

        case 'FAILED':
          console.log(`Payment failed: ${payment_id}`);
          // Update transaction status to failed
          await supabase
            .from('transactions')
            .update({ 
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', payment_id);
          break;

        default:
          console.log(`Unhandled collection state: ${state} for payment: ${payment_id}`);
      }
    } else {
      console.log(`Webhook received but not processing: event_type=${event_type}, state=${state}`);
    }
  };

  // IntaSend Webhook endpoint
  app.post("/api/payment/webhook", async (req: any, res) => {
    try {
      console.log('IntaSend webhook received:', JSON.stringify(req.body, null, 2));
      
      // Verify webhook signature/challenge
      const webhookSecret = process.env.INTASEND_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('INTASEND_WEBHOOK_SECRET environment variable is not set');
        return res.status(500).json({ message: "Webhook secret not configured" });
      }
      const challenge = req.headers['x-intasend-challenge'] || req.body.challenge;
      
      if (challenge !== webhookSecret) {
        console.error('Invalid webhook challenge');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      // Add webhook to queue for processing (as recommended by IntaSend)
      webhookQueue.push({
        data: req.body,
        timestamp: Date.now()
      });

      // Process queue asynchronously
      processWebhookQueue();

      // Always return success immediately to acknowledge receipt (prevents retries)
      res.json({ 
        success: true, 
        message: 'Webhook queued for processing',
        event_type: req.body.event_type,
        state: req.body.state,
        payment_id: req.body.payment_id
      });

    } catch (error) {
      console.error('Webhook processing error:', error);
      // Return 500 to trigger IntaSend retry mechanism
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Manual payment verification endpoint (keeping for backup)
  app.post("/api/payment/manual-verify", authenticateToken, async (req: any, res) => {
    try {
      const { payment_id } = req.body;

      if (!payment_id) {
        return res.status(400).json({ message: "Payment ID is required" });
      }

      console.log(`Manually verifying payment: ${payment_id}`);

      // Verify payment with IntaSend
      const verification = await verifyPayment(payment_id);

      if (!verification.success) {
        return res.status(400).json({ message: verification.error });
      }

      if (verification.status === 'completed') {
        // Update transaction status to completed
        const { data: transaction, error } = await supabase
          .from('transactions')
          .update({ status: 'completed' })
          .eq('payment_id', payment_id)
          .select()
          .single();

        if (error) {
          console.error('Error updating transaction:', error);
          return res.status(500).json({ message: "Failed to update transaction" });
        }

        if (transaction) {
          console.log(`Payment completed for transaction ${transaction.id}, creating available assignments...`);
          
          // Create available assignments for providers
          try {
            const { createAvailableAssignments } = await import('./available-assignments');
            await createAvailableAssignments(transaction.id);
            console.log(`Successfully created available assignments for transaction ${transaction.id}`);
          } catch (assignmentError) {
            console.error('Error creating available assignments:', assignmentError);
            return res.status(500).json({ message: "Failed to create assignments" });
          }
        }

        res.json({
          success: true,
          status: verification.status,
          message: "Payment verified and assignments created successfully"
        });
      } else {
        res.json({
          success: true,
          status: verification.status,
          message: "Payment not yet completed"
        });
      }

    } catch (error) {
      console.error('Manual payment verification error:', error);
      res.status(500).json({ message: "Failed to verify payment", error: (error as Error).message });
    }
  });

  // Payment success page
  app.get("/payment/success", (req, res) => {
    // Add cache control headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    const { tracking_id, signature, checkout_id } = req.query;
    
    // Send HTML response for payment success
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Successful - Social Marketplace</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .success-container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 90%;
          }
          .success-icon {
            width: 80px;
            height: 80px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 40px;
            color: white;
          }
          h1 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 28px;
          }
          p {
            color: #6b7280;
            margin-bottom: 30px;
            line-height: 1.6;
          }
          .btn {
            background: #10b981;
            color: white;
            padding: 12px 30px;
            border-radius: 10px;
            text-decoration: none;
            display: inline-block;
            font-weight: 600;
            transition: all 0.3s ease;
          }
          .btn:hover {
            background: #059669;
            transform: translateY(-2px);
          }
          .details {
            background: #f9fafb;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
          }
          .details h3 {
            margin: 0 0 10px 0;
            color: #374151;
            font-size: 16px;
          }
          .details p {
            margin: 5px 0;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success-icon">✓</div>
          <h1>Payment Successful!</h1>
          <p>Your order has been placed successfully and will be processed shortly. You will receive an email confirmation shortly.</p>
          
          <div class="details">
            <h3>Order Details:</h3>
            <p><strong>Tracking ID:</strong> ${tracking_id || 'N/A'}</p>
            <p><strong>Checkout ID:</strong> ${checkout_id || 'N/A'}</p>
            <p><strong>Status:</strong> Payment Completed</p>
          </div>
          
          <a href="/buyer" class="btn">Go to Dashboard</a>
        </div>
        
        <script>
          // Auto-redirect to dashboard after 5 seconds
          setTimeout(() => {
            window.location.href = '/buyer';
          }, 5000);
          
          // Force reload to ensure we have the latest version
          if (window.performance && window.performance.navigation.type === window.performance.navigation.TYPE_BACK_FORWARD) {
            window.location.reload();
          }


        </script>
      </body>
      </html>
    `);
  });

  // Admin routes
  app.get("/api/admin/stats", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get total revenue
      const { data: revenueData, error: revenueError } = await supabase
        .from('platform_revenue')
        .select('amount');

      if (revenueError) throw revenueError;

      const totalRevenue = revenueData?.reduce((sum, item) => 
        sum + parseFloat(item.amount), 0) || 0;

      // Get user counts
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('role');

      if (usersError) throw usersError;

      const totalUsers = users?.length || 0;
      const totalProviders = users?.filter(u => u.role === 'provider').length || 0;
      const totalBuyers = users?.filter(u => u.role === 'buyer').length || 0;

      // Get transaction counts
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('status');

      if (transactionsError) throw transactionsError;

      const totalTransactions = transactions?.length || 0;
      const completedServices = transactions?.filter(t => t.status === 'completed').length || 0;

      // Get pending verifications
      const { data: pendingVerifications, error: verificationsError } = await supabase
        .from('action_assignments')
        .select('status')
        .eq('status', 'pending');

      if (verificationsError) throw verificationsError;

      // Calculate time-based revenue
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getFullYear(), now.getMonth() - 1, now.getDate());

      const { data: recentRevenue, error: recentRevenueError } = await supabase
        .from('platform_revenue')
        .select('amount, created_at');

      if (recentRevenueError) throw recentRevenueError;

      const revenueToday = recentRevenue?.filter(r => 
        new Date(r.created_at) >= today
      ).reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;

      const revenueThisWeek = recentRevenue?.filter(r => 
        new Date(r.created_at) >= weekAgo
      ).reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;

      const revenueThisMonth = recentRevenue?.filter(r => 
        new Date(r.created_at) >= monthAgo
      ).reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;

      res.json({
        total_revenue: totalRevenue,
        total_transactions: totalTransactions,
        total_users: totalUsers,
        total_providers: totalProviders,
        total_buyers: totalBuyers,
        pending_verifications: pendingVerifications?.length || 0,
        completed_services: completedServices,
        revenue_today: revenueToday,
        revenue_this_week: revenueThisWeek,
        revenue_this_month: revenueThisMonth
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to get admin stats", error: (error as Error).message });
    }
  });

  app.get("/api/admin/revenue", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { timeFilter = 'all', revenueFilter = 'all' } = req.query;

      let query = supabase
        .from('platform_revenue')
        .select(`
          *,
          transactions!inner(
            buyer_id,
            total_cost,
            status,
            users!inner(name, email)
          )
        `)
        .order('created_at', { ascending: false });

      // Apply time filter
      if (timeFilter !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (timeFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            break;
          default:
            startDate = new Date(0);
        }

        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply revenue type filter
      if (revenueFilter !== 'all') {
        query = query.eq('revenue_type', revenueFilter);
      }

      const { data: revenueData, error } = await query;

      if (error) throw error;

      res.json(revenueData || []);

    } catch (error) {
      res.status(500).json({ message: "Failed to get revenue data", error: (error as Error).message });
    }
  });

  app.get("/api/admin/users", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get additional stats for each user
      const usersWithStats = await Promise.all(
        (users || []).map(async (user) => {
          // Get total earnings for providers
          let totalEarnings = 0;
          let totalServices = 0;

          if (user.role === 'provider') {
            const { data: creditTransactions } = await supabase
              .from('credit_transactions')
              .select('amount')
              .eq('provider_id', user.id);

            totalEarnings = creditTransactions?.reduce((sum, t) => 
              sum + parseFloat(t.amount), 0) || 0;

            const { data: assignments } = await supabase
              .from('action_assignments')
              .select('id')
              .eq('provider_id', user.id);

            totalServices = assignments?.length || 0;
          }

          return {
            ...user,
            total_earnings: totalEarnings,
            total_services: totalServices
          };
        })
      );

      res.json(usersWithStats);

    } catch (error) {
      res.status(500).json({ message: "Failed to get users", error: (error as Error).message });
    }
  });

  app.get("/api/admin/transactions", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          users!inner(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      res.json(transactions || []);

    } catch (error) {
      res.status(500).json({ message: "Failed to get transactions", error: (error as Error).message });
    }
  });

  // Get rejected assignments for provider (for AI re-verification)
  app.get("/api/provider/rejected-assignments", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      const { data: assignments, error } = await supabase
        .from('action_assignments')
        .select(`
          *,
          transactions!inner(buyer_id, provider_id, target_url, comment_text),
          users!action_assignments_buyer_id_fkey(name, email)
        `)
        .eq('provider_id', req.user.id)
        .eq('status', 'rejected_by_buyer')
        .order('verified_at', { ascending: false });

      if (error) {
        throw error;
      }

      const rejectedAssignments = assignments?.map(assignment => ({
        id: assignment.id,
        action_type: assignment.action_type,
        platform: assignment.platform,
        target_url: assignment.target_url,
        comment_text: assignment.comment_text,
        proof_url: assignment.proof_url,
        submitted_at: assignment.submitted_at,
        verified_at: assignment.verified_at,
        verification_reason: assignment.verification_reason,
        buyer_name: assignment.users?.name || 'Unknown Buyer'
      })) || [];

      res.json(rejectedAssignments);

    } catch (error) {
      res.status(500).json({ message: "Failed to get rejected assignments", error: (error as Error).message });
    }
  });

  // Admin: Force AI verification (for testing or manual override)
  app.post("/api/admin/force-ai-verification/:assignmentId", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { assignmentId } = req.params;
      const verificationResult = await performAIVerification(parseInt(assignmentId));

      res.json({
        message: "AI verification completed",
        result: verificationResult
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to perform AI verification", error: (error as Error).message });
    }
  });

  // Admin: Get verification logs
  app.get("/api/admin/verification-logs", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { page = 1, limit = 50, status, method } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let query = supabase
        .from('verification_logs')
        .select(`
          *,
          action_assignments!inner(action_type, platform, target_url),
          users!verification_logs_verifier_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit as string) - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (method) {
        query = query.eq('verification_method', method);
      }

      const { data: logs, error } = await query;

      if (error) {
        throw error;
      }

      res.json(logs || []);

    } catch (error) {
      res.status(500).json({ message: "Failed to get verification logs", error: (error as Error).message });
    }
  });

  // Admin: Get flagged images report
  app.get("/api/admin/flagged-images", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { data: flaggedImages, error } = await supabase
        .from('image_hashes')
        .select(`
          *,
          action_assignments!inner(action_type, platform, target_url, status),
          users!image_hashes_provider_id_fkey(name, email, status)
        `)
        .gt('flagged_count', 0)
        .order('flagged_count', { ascending: false });

      if (error) {
        throw error;
      }

      res.json(flaggedImages || []);

    } catch (error) {
      res.status(500).json({ message: "Failed to get flagged images", error: (error as Error).message });
    }
  });

  // Initialize email templates on server start
  initializeEmailTemplates().catch(console.error);

  // Update user role
  app.patch("/api/user/role", authenticateToken, async (req: any, res) => {
    try {
      const { role } = req.body;
      
      if (!role || !['buyer', 'provider', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'buyer', 'provider', or 'admin'" });
      }

      // Update user role in database
      const { error } = await supabase
        .from('users')
        .update({ role: role })
        .eq('id', req.user.id);

      if (error) throw error;

      res.json({ message: 'Role updated successfully', role });
    } catch (error) {
      res.status(500).json({ message: "Failed to update role", error });
    }
  });



  // Claim an available assignment
  app.post("/api/provider/claim-assignment/:assignmentId", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      const assignmentId = parseInt(req.params.assignmentId);

      // Check if assignment is still available
      const { data: assignment, error: assignmentError } = await supabase
        .from('available_assignments')
        .select('*')
        .eq('id', assignmentId)
        .eq('status', 'available')
        .single();

      if (assignmentError || !assignment) {
        return res.status(404).json({ message: "Assignment not available or not found" });
      }

      // Update assignment status to claimed
      const { error: updateError } = await supabase
        .from('available_assignments')
        .update({ 
          status: 'claimed',
          claimed_by: req.user.id,
          claimed_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      // Create action assignment for the provider
      const { error: actionError } = await supabase
        .from('action_assignments')
        .insert({
          transaction_id: assignment.transaction_id,
          provider_id: req.user.id,
          platform: assignment.platform,
          action_type: assignment.action_type,
          target_url: assignment.target_url,
          comment_text: assignment.comment_text,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          provider_earnings: assignment.provider_earnings
        });

      if (actionError) throw actionError;

      res.json({ message: "Assignment claimed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to claim assignment", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Upload proof screenshot
  app.post("/api/upload-proof", authenticateToken, upload.single('file'), async (req: any, res) => {
    try {
      const { uploadProofScreenshot } = await import('./file-upload');
      await uploadProofScreenshot(req, res);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file", error });
    }
  });

  // Submit proof for an assignment
  app.post("/api/provider/submit-proof/:assignmentId", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      const { assignmentId } = req.params;
      const { screenshot_url, submission_notes } = req.body;

      if (!screenshot_url) {
        return res.status(400).json({ message: "Screenshot URL is required" });
      }

      // Get the action assignment
      const { data: actionAssignment, error: fetchError } = await supabase
        .from('action_assignments')
        .select(`
          *,
          transactions!inner(buyer_id)
        `)
        .eq('id', assignmentId)
        .eq('provider_id', req.user.id)
        .eq('status', 'assigned')
        .single();

      if (fetchError || !actionAssignment) {
        return res.status(404).json({ message: "Assignment not found or not assigned to you" });
      }

      // Create submission record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours for buyer verification

      const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .insert({
          assignment_id: parseInt(assignmentId),
          provider_id: req.user.id,
          buyer_id: actionAssignment.transactions.buyer_id,
          screenshot_url,
          submission_notes,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Update action assignment status
      const { error: updateError } = await supabase
        .from('action_assignments')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          proof_url: screenshot_url
        })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      res.json({ 
        message: "Proof submitted successfully", 
        submission,
        expiresAt: expiresAt.toISOString()
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to submit proof", error: (error as Error).message });
    }
  });

  // Buyer: Review submission
  app.post("/api/buyer/review-submission/:submissionId", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Buyer access required" });
      }

      const { submissionId } = req.params;
      const { status, review_notes } = req.body;

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }

      // Get submission and verify it belongs to this buyer
      const { data: submission, error: fetchError } = await supabase
        .from('submissions')
        .select(`
          *,
          action_assignments!inner(transaction_id, service_id, platform, action_type)
        `)
        .eq('id', submissionId)
        .eq('buyer_id', req.user.id)
        .eq('status', 'pending')
        .single();

      if (fetchError || !submission) {
        return res.status(404).json({ message: "Submission not found or already reviewed" });
      }

      // Update submission
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('submissions')
        .update({
          status: status,
          buyer_reviewed_at: new Date().toISOString(),
          buyer_review_notes: review_notes
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update action assignment status
      const { error: actionUpdateError } = await supabase
        .from('action_assignments')
        .update({
          status: status === 'approved' ? 'completed' : 'rejected',
          verification_method: 'manual',
          verification_reason: review_notes,
          verified_at: new Date().toISOString()
        })
        .eq('id', submission.assignment_id);

      if (actionUpdateError) throw actionUpdateError;

      // If approved, credit the provider
      if (status === 'approved') {
        // Get service details to calculate earnings
        const { data: service } = await supabase
          .from('services')
          .select('price')
          .eq('id', submission.action_assignments.service_id)
          .single();

        if (service) {
          const earnings = parseFloat(service.price) * 0.5; // Provider gets 50% (5 KES out of 10 KES)

          // Get current balance first
          const { data: currentUser } = await supabase
            .from('users')
            .select('balance')
            .eq('id', submission.provider_id)
            .single();

          const currentBalance = currentUser?.balance || 0;
          const newBalance = currentBalance + earnings;

          // Update provider balance
          const { error: balanceError } = await supabase
            .from('users')
            .update({ 
              balance: newBalance
            })
            .eq('id', submission.provider_id);

          if (balanceError) throw balanceError;

          // Log credit transaction
          await supabase
            .from('credit_transactions')
            .insert({
              provider_id: submission.provider_id,
              assignment_id: submission.assignment_id,
              amount: earnings,
              balance_before: currentBalance,
              balance_after: newBalance,
              reason: "Buyer approved proof"
            });
        }
      }

      res.json({ 
        message: `Submission ${status} successfully`, 
        submission: updatedSubmission 
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to review submission", error: (error as Error).message });
    }
  });

  // Get provider's submissions
  app.get("/api/provider/submissions", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Provider access required" });
      }

      const { data: submissions, error } = await supabase
        .from('submissions')
        .select(`
          *,
          action_assignments!inner(
            action_type,
            platform,
            target_url,
            comment_text,
            transactions!inner(
              users!transactions_buyer_id_fkey(name, email)
            )
          )
        `)
        .eq('provider_id', req.user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      res.json(submissions || []);

    } catch (error) {
      res.status(500).json({ message: "Failed to get submissions", error: (error as Error).message });
    }
  });

  // Get buyer's pending submissions to review
  app.get("/api/buyer/pending-submissions", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Buyer access required" });
      }

      const { data: submissions, error } = await supabase
        .from('submissions')
        .select(`
          *,
          action_assignments!inner(
            action_type,
            platform,
            target_url,
            comment_text,
            service_id
          ),
          users!submissions_provider_id_fkey(name, email)
        `)
        .eq('buyer_id', req.user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      res.json(submissions || []);

    } catch (error) {
      res.status(500).json({ message: "Failed to get pending submissions", error: (error as Error).message });
    }
  });

  // ===== END AVAILABLE ASSIGNMENTS SYSTEM =====

  // Test endpoint to manually trigger webhook processing
  app.post("/api/test/webhook", async (req, res) => {
    try {
      const { payment_id, state, event_type } = req.body;
      
      if (!payment_id || !state) {
        return res.status(400).json({ message: "Payment ID and state are required" });
      }

      console.log(`Manually triggering webhook for payment: ${payment_id} with state: ${state}`);
      
      const webhookData = {
        event_type: event_type || 'collection',
        state: state,
        payment_id: payment_id,
        reference: `test-${payment_id}`,
        amount: 1000,
        currency: 'KES',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await processWebhookData(webhookData);
      
      res.json({ 
        success: true, 
        message: `Successfully processed webhook for payment ${payment_id}` 
      });
    } catch (error) {
      console.error('Error in test webhook processing:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process webhook", 
        error: (error as Error).message 
      });
    }
  });

  // Get completed submissions for buyer verification
  app.get("/api/buyer/submissions", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'buyer') {
        return res.status(403).json({ message: "Buyer access required" });
      }

      console.log('Getting buyer submissions for user:', req.user.id);
      
      // First get all transactions for this buyer
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id')
        .eq('buyer_id', req.user.id);

      console.log('Buyer transactions:', transactions);

      if (transactionsError) {
        throw transactionsError;
      }

      if (!transactions || transactions.length === 0) {
        return res.json([]);
      }

      const transactionIds = transactions.map(t => t.id);

      // Get action assignments that have been completed by providers
      const { data: submissions, error } = await supabase
        .from('action_assignments')
        .select(`
          *,
          users!action_assignments_provider_id_fkey(name, email)
        `)
        .in('transaction_id', transactionIds)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      console.log('Buyer submissions query result:', { submissions, error });

      if (error) {
        throw error;
      }

      const buyerSubmissions = submissions?.map(assignment => ({
        id: assignment.id,
        platform: assignment.platform,
        actionType: assignment.action_type,
        status: assignment.status,
        targetUrl: assignment.target_url,
        commentText: assignment.comment_text,
        proofUrl: assignment.proof_url,
        createdAt: assignment.created_at,
        completedAt: assignment.completed_at,
        providerId: assignment.provider_id,
        providerName: assignment.users?.name || 'Provider',
        providerEmail: assignment.users?.email || null,
        verificationScreenshots: [] // available_assignments don't have verification screenshots yet
      })) || [];

      res.json(buyerSubmissions);

    } catch (error) {
      res.status(500).json({ message: "Failed to get buyer submissions", error: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
