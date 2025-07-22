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
import { upload, processProofImage, validateProofImage } from './file-upload';
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

      // Return predefined services with provider-specific names
      const predefinedServices = [
        // Instagram Services
        { id: 'instagram-followers', platform: 'instagram', type: 'followers', name: 'Follow Instagram Account', buyerName: 'Instagram Followers', providerName: 'Follow Instagram Account', buyerDescription: 'Get real Instagram followers to boost your social media presence', providerDescription: 'Follow the specified Instagram account using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '24-48 hours', requirements: ['Valid Instagram account', 'Public profile'], icon: 'fab fa-instagram', category: 'growth', urlPlaceholder: 'https://instagram.com/username' },
        { id: 'instagram-likes', platform: 'instagram', type: 'likes', name: 'Like Instagram Post', buyerName: 'Instagram Likes', providerName: 'Like Instagram Post', buyerDescription: 'Increase engagement on your Instagram posts with likes', providerDescription: 'Like the specified Instagram post using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '2-6 hours', requirements: ['Public Instagram post'], icon: 'fab fa-instagram', category: 'engagement', urlPlaceholder: 'https://instagram.com/p/post_id' },
        { id: 'instagram-comments', platform: 'instagram', type: 'comments', name: 'Comment on Instagram Post', buyerName: 'Instagram Comments', providerName: 'Comment on Instagram Post', buyerDescription: 'Add authentic comments to your Instagram posts', providerDescription: 'Write and post a comment on the specified Instagram post', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '4-12 hours', requirements: ['Public Instagram post', 'Comment text provided'], icon: 'fab fa-instagram', category: 'engagement', urlPlaceholder: 'https://instagram.com/p/post_id' },
        { id: 'instagram-views', platform: 'instagram', type: 'views', name: 'Watch Instagram Reel', buyerName: 'Instagram Reels Views', providerName: 'Watch Instagram Reel', buyerDescription: 'Boost your Instagram Reel and video views', providerDescription: 'Watch the specified Instagram Reel or video completely', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '1-3 hours', requirements: ['Public Instagram Reel'], icon: 'fab fa-instagram', category: 'reach', urlPlaceholder: 'https://instagram.com/reel/reel_id' },
        
        // YouTube Services
        { id: 'youtube-subscribers', platform: 'youtube', type: 'subscribers', name: 'Subscribe to YouTube Channel', buyerName: 'YouTube Subscribers', providerName: 'Subscribe to YouTube Channel', buyerDescription: 'Build your YouTube subscriber base', providerDescription: 'Subscribe to the specified YouTube channel using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '48-72 hours', requirements: ['Public YouTube channel'], icon: 'fab fa-youtube', category: 'growth', urlPlaceholder: 'https://youtube.com/@channel_name' },
        { id: 'youtube-views', platform: 'youtube', type: 'views', name: 'Watch YouTube Video', buyerName: 'YouTube Views', providerName: 'Watch YouTube Video', buyerDescription: 'Boost your YouTube video views', providerDescription: 'Watch the specified YouTube video completely (minimum 30 seconds)', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '24-48 hours', requirements: ['Public YouTube video'], icon: 'fab fa-youtube', category: 'reach', urlPlaceholder: 'https://youtube.com/watch?v=video_id' },
        { id: 'youtube-likes', platform: 'youtube', type: 'likes', name: 'Like YouTube Video', buyerName: 'YouTube Likes', providerName: 'Like YouTube Video', buyerDescription: 'Get more likes on your YouTube videos', providerDescription: 'Like the specified YouTube video using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '6-12 hours', requirements: ['Public YouTube video'], icon: 'fab fa-youtube', category: 'engagement', urlPlaceholder: 'https://youtube.com/watch?v=video_id' },
        { id: 'youtube-comments', platform: 'youtube', type: 'comments', name: 'Comment on YouTube Video', buyerName: 'YouTube Comments', providerName: 'Comment on YouTube Video', buyerDescription: 'Add engaging comments to your YouTube videos', providerDescription: 'Write and post a comment on the specified YouTube video', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '12-24 hours', requirements: ['Public YouTube video', 'Comment text provided'], icon: 'fab fa-youtube', category: 'engagement', urlPlaceholder: 'https://youtube.com/watch?v=video_id' },
        
        // Twitter Services
        { id: 'twitter-followers', platform: 'twitter', type: 'followers', name: 'Follow X / Twitter Account', buyerName: 'X / Twitter Followers', providerName: 'Follow X / Twitter Account', buyerDescription: 'Increase your X / Twitter following', providerDescription: 'Follow the specified X / Twitter account using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '24-48 hours', requirements: ['Public X / Twitter account'], icon: 'fab fa-twitter', category: 'growth', urlPlaceholder: 'https://twitter.com/username' },
        { id: 'twitter-likes', platform: 'twitter', type: 'likes', name: 'Like X / Twitter Tweet', buyerName: 'X / Twitter Likes', providerName: 'Like X / Twitter Tweet', buyerDescription: 'Get more likes on your X / Twitter tweets', providerDescription: 'Like the specified X / Twitter tweet using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '2-6 hours', requirements: ['Public X / Twitter post'], icon: 'fab fa-twitter', category: 'engagement', urlPlaceholder: 'https://twitter.com/username/status/tweet_id' },
        { id: 'twitter-retweets', platform: 'twitter', type: 'retweets', name: 'Retweet X / Twitter Post', buyerName: 'X / Twitter Retweets', providerName: 'Retweet X / Twitter Post', buyerDescription: 'Increase retweets on your X / Twitter content', providerDescription: 'Retweet the specified X / Twitter post using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '4-12 hours', requirements: ['Public X / Twitter post'], icon: 'fab fa-twitter', category: 'reach', urlPlaceholder: 'https://twitter.com/username/status/tweet_id' },
        
        // TikTok Services
        { id: 'tiktok-followers', platform: 'tiktok', type: 'followers', name: 'Follow TikTok Account', buyerName: 'TikTok Followers', providerName: 'Follow TikTok Account', buyerDescription: 'Grow your TikTok following with real followers', providerDescription: 'Follow the specified TikTok account using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '24-48 hours', requirements: ['Public TikTok account'], icon: 'fab fa-tiktok', category: 'growth', urlPlaceholder: 'https://tiktok.com/@username' },
        { id: 'tiktok-likes', platform: 'tiktok', type: 'likes', name: 'Like TikTok Video', buyerName: 'TikTok Likes', providerName: 'Like TikTok Video', buyerDescription: 'Get more likes on your TikTok videos', providerDescription: 'Like the specified TikTok video using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '2-6 hours', requirements: ['Public TikTok video'], icon: 'fab fa-tiktok', category: 'engagement', urlPlaceholder: 'https://tiktok.com/@username/video/video_id' },
        { id: 'tiktok-views', platform: 'tiktok', type: 'views', name: 'Watch TikTok Video', buyerName: 'TikTok Views', providerName: 'Watch TikTok Video', buyerDescription: 'Increase views on your TikTok videos', providerDescription: 'Watch the specified TikTok video completely', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '1-3 hours', requirements: ['Public TikTok video'], icon: 'fab fa-tiktok', category: 'reach', urlPlaceholder: 'https://tiktok.com/@username/video/video_id' },

        // Facebook Services
        { id: 'facebook-likes', platform: 'facebook', type: 'likes', name: 'Like Facebook Page', buyerName: 'Facebook Page Likes', providerName: 'Like Facebook Page', buyerDescription: 'Increase likes on your Facebook page', providerDescription: 'Like the specified Facebook page using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '24-48 hours', requirements: ['Public Facebook page'], icon: 'fab fa-facebook', category: 'growth', urlPlaceholder: 'https://facebook.com/page_name' },
        { id: 'facebook-followers', platform: 'facebook', type: 'followers', name: 'Follow Facebook Page', buyerName: 'Facebook Followers', providerName: 'Follow Facebook Page', buyerDescription: 'Get real Facebook followers to boost your page engagement', providerDescription: 'Follow the specified Facebook page using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '24-48 hours', requirements: ['Public Facebook page'], icon: 'fab fa-facebook', category: 'growth', urlPlaceholder: 'https://facebook.com/page_name' },
        { id: 'facebook-shares', platform: 'facebook', type: 'shares', name: 'Share Facebook Post', buyerName: 'Facebook Shares', providerName: 'Share Facebook Post', buyerDescription: 'Increase shares on your Facebook content', providerDescription: 'Share the specified Facebook post using your personal account', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '4-12 hours', requirements: ['Public Facebook post'], icon: 'fab fa-facebook', category: 'reach', urlPlaceholder: 'https://facebook.com/username/posts/post_id' },
        { id: 'facebook-comments', platform: 'facebook', type: 'comments', name: 'Comment on Facebook Post', buyerName: 'Facebook Comments', providerName: 'Comment on Facebook Post', buyerDescription: 'Add engaging comments to your Facebook posts', providerDescription: 'Write and post a comment on the specified Facebook post', buyerPrice: 10.00, providerPrice: 5.00, deliveryTime: '6-12 hours', requirements: ['Public Facebook post', 'Comment text provided'], icon: 'fab fa-facebook', category: 'engagement', urlPlaceholder: 'https://facebook.com/username/posts/post_id' }
      ];
      
      const { platform, type } = req.query;
      let filteredServices = predefinedServices;
      
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
  app.post("/api/provider/services", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can select services" });
      }

      const { serviceIds } = req.body;
      
      // Clear existing service selections
      await supabase
        .from('provider_services')
        .delete()
        .eq('provider_id', req.user.id);
      
      // Add new service selections
      if (serviceIds && serviceIds.length > 0) {
        const serviceSelections = serviceIds.map((serviceId: string) => ({
          provider_id: req.user.id,
          service_id: serviceId,
          status: 'active'
        }));
        
        const { error } = await supabase
          .from('provider_services')
          .insert(serviceSelections);
        
        if (error) throw error;
      }
      
      res.json({ message: 'Services updated successfully' });
    } catch (error) {
      res.status(500).json({ message: "Failed to update provider services", error });
    }
  });

  app.get("/api/services/provider", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can view their services" });
      }

      // Get provider's selected services
      const { data, error } = await supabase
        .from('provider_services')
        .select('service_id')
        .eq('provider_id', req.user.id)
        .eq('status', 'active');
      
      if (error) throw error;
      
      const selectedServiceIds = data.map(item => item.service_id);
      res.json(selectedServiceIds);
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
      
      // Create action assignments for each action needed
      // Each provider will handle 1 action
      await storage.assignActionsToProviders(
        transaction.id,
        transactionData.quantity,
        req.body.platform || 'instagram',
        req.body.actionType || 'followers',
        req.body.targetUrl || '',
        req.body.commentText
      );
      
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

  app.post("/api/assignments/:id/submit-proof", authenticateToken, upload.single('proof'), async (req: any, res) => {
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

      const stats = {
        totalUsers: totalUsers || 0,
        totalRevenue: 25000.00, // Mock data for now
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

      // Validate and process the proof image
      const validationResult = await validateProofImage(proofImage);
      if (!validationResult.valid) {
        return res.status(400).json({ message: validationResult.errors.join(', ') });
      }

      // Process and upload the image
      const uploadResult = await processProofImage(
        proofImage.buffer,
        proofImage.originalname,
        req.user.id,
        parseInt(assignment_id)
      );
      if (!uploadResult.success) {
        return res.status(500).json({ message: "Failed to upload proof image" });
      }

      // Submit proof for verification
      const verificationResult = await submitProof(
        parseInt(assignment_id),
        req.user.id,
        proofImage.buffer,
        uploadResult.url || ''
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

      // Then get action assignments for these transactions
      const { data: assignments, error } = await supabase
        .from('action_assignments')
        .select(`
          *,
          users!action_assignments_provider_id_fkey(name, email)
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
        proofUrl: assignment.proof_url,
        createdAt: assignment.created_at,
        assignedAt: assignment.assigned_at,
        completedAt: assignment.completed_at,
        providerId: assignment.provider_id,
        providerName: assignment.users?.name,
        providerEmail: assignment.users?.email,
        verificationScreenshots: assignment.proof_url ? [
          {
            url: assignment.proof_url,
            description: 'Verification screenshot',
            uploadedAt: assignment.submitted_at
          }
        ] : []
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
      if (quantityNum < 20) {
        return res.status(400).json({ message: "Minimum quantity required is 20" });
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
      await logPaymentTransaction(
        req.user.id,
        parseFloat(amount),
        paymentResponse.payment_id!,
        'pending',
        paymentResponse.payment_id!,
        service_id,
        parseInt(quantity)
      );

      res.json({
        success: true,
        payment_url: paymentResponse.payment_url,
        payment_id: paymentResponse.payment_id
      });

    } catch (error) {
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
      const { payment_id, state, reference } = req.body;

      if (state === 'COMPLETED') {
        // Update transaction status to completed (payment received)
        const { error } = await supabase
          .from('transactions')
          .update({ status: 'completed' })
          .eq('payment_id', payment_id);

        if (error) {
          console.error('Error updating transaction:', error);
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

  const httpServer = createServer(app);
  return httpServer;
}
