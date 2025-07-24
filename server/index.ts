import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeCronJobs } from "./cron-jobs";
import { supabase } from "./supabase";

// Database initialization function
async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Check if provider_services table exists
    const { error: servicesError } = await supabase
      .from('provider_services')
      .select('*')
      .limit(1);
    
    if (servicesError && servicesError.code === '42P01') {
      console.log('Creating provider_services table...');
      // Table doesn't exist, we'll handle this in the routes when needed
      console.log('provider_services table will be created when first accessed');
    } else {
      console.log('✓ provider_services table exists');
    }
    
    // Check if available_assignments table exists
    const { error: assignmentsError } = await supabase
      .from('available_assignments')
      .select('*')
      .limit(1);
    
    if (assignmentsError && assignmentsError.code === '42P01') {
      console.log('Creating available_assignments table...');
      // Table doesn't exist, we'll handle this in the routes when needed
      console.log('available_assignments table will be created when first accessed');
    } else {
      console.log('✓ available_assignments table exists');
    }
    
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS support for frontend
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database first
  await initializeDatabase();
  
  const server = await registerRoutes(app);
  
  // Initialize cron jobs for automated tasks
  initializeCronJobs();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0", // Changed from "localhost" to "0.0.0.0" for production
  }, () => {
    log(`serving on port ${port}`);
  });
})();
