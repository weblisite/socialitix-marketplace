# 🚀 Vercel Deployment Guide - Social Media Engagement Marketplace

## Overview
This guide will help you deploy your full-stack Social Media Engagement Marketplace on Vercel.

## 🎯 **Deployment Strategy**

### **Option 1: Full-Stack on Vercel (Recommended)**
- ✅ **Frontend**: React + Vite (static hosting)
- ✅ **Backend**: Express API (serverless functions)
- ✅ **Single deployment**
- ✅ **Global CDN**
- ✅ **Automatic scaling**

### **Option 2: Frontend on Vercel + Backend on Railway/Render**
- ✅ **Frontend**: React + Vite (Vercel)
- ✅ **Backend**: Express API (Railway/Render)
- ✅ **Separate deployments**
- ✅ **More control over backend**

---

## 🚀 **Quick Deploy (Option 1: Full-Stack)**

### **Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

### **Step 2: Login to Vercel**
```bash
vercel login
```

### **Step 3: Deploy**
```bash
vercel
```

### **Step 4: Set Environment Variables**
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add INTASEND_API_PUBLISHABLE_KEY
vercel env add INTASEND_API_SECRET_KEY
vercel env add NODE_ENV
vercel env add BASE_URL
vercel env add FRONTEND_URL
```

### **Step 5: Deploy to Production**
```bash
vercel --prod
```

---

## 🔧 **Manual Setup (Option 2: Frontend Only)**

### **Step 1: Visit Vercel Dashboard**
1. Go to https://vercel.com
2. Sign up/Login with GitHub
3. Click "New Project"

### **Step 2: Import Repository**
1. Select `weblisite/socialitix-marketplace`
2. Vercel will auto-detect Vite configuration

### **Step 3: Configure Build Settings**
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist/public`
- **Install Command**: `npm install`

### **Step 4: Set Environment Variables**
In Vercel dashboard, add these variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://xevnhgizberlburnxuzh.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# IntaSend Payment Configuration
INTASEND_API_PUBLISHABLE_KEY=your_intasend_publishable_key
INTASEND_API_SECRET_KEY=your_intasend_secret_key

# Application Configuration
NODE_ENV=production
BASE_URL=https://your-vercel-app.vercel.app
FRONTEND_URL=https://your-vercel-app.vercel.app

# Backend URL (if using separate backend)
API_URL=https://your-backend-url.railway.app
```

### **Step 5: Deploy**
Click "Deploy" and wait for the build to complete.

---

## 🔄 **API Configuration**

### **For Full-Stack Deployment:**
Your API routes are automatically converted to Vercel serverless functions:

- `/api/*` → `api/*.ts` files
- Express routes → Vercel functions
- Automatic scaling

### **For Frontend-Only Deployment:**
Update your API calls to point to your backend:

```typescript
// In client/src/lib/queryClient.ts
const API_BASE_URL = process.env.API_URL || 'https://your-backend-url.railway.app';

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  // ... rest of the code
};
```

---

## 🛠 **Configuration Files**

### **vercel.json** (Full-Stack)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "framework": "vite",
  "functions": {
    "server/routes.ts": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

### **vercel.json** (Frontend Only)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-backend-url.railway.app/api/$1"
    }
  ]
}
```

---

## 🌍 **Custom Domain Setup**

### **Step 1: Add Domain in Vercel**
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain

### **Step 2: Update DNS Records**
Follow Vercel's DNS configuration instructions

### **Step 3: Update Environment Variables**
```bash
BASE_URL=https://your-custom-domain.com
FRONTEND_URL=https://your-custom-domain.com
```

---

## 📊 **Monitoring & Analytics**

### **Vercel Analytics**
- Built-in performance monitoring
- Real-time analytics
- Error tracking

### **Logs**
```bash
# View function logs
vercel logs

# View deployment logs
vercel logs --follow
```

---

## 🔒 **Security**

### **Environment Variables**
- ✅ Never commit secrets to Git
- ✅ Use Vercel's environment variable system
- ✅ Different variables for preview/production

### **CORS Configuration**
- ✅ Configured for your domains
- ✅ Secure headers
- ✅ HTTPS enforcement

---

## 🚀 **Performance Optimization**

### **Vercel Optimizations**
- ✅ Global CDN
- ✅ Automatic image optimization
- ✅ Edge functions
- ✅ Automatic caching

### **Build Optimizations**
- ✅ Tree shaking
- ✅ Code splitting
- ✅ Minification
- ✅ Compression

---

## 🐛 **Troubleshooting**

### **Common Issues:**

1. **Build Fails**
   ```bash
   # Check build locally
   npm run build
   
   # Check Vercel build logs
   vercel logs
   ```

2. **API Routes Not Working**
   - Check function logs: `vercel logs`
   - Verify API routes are in `/api` directory
   - Check CORS configuration

3. **Environment Variables Missing**
   - Verify variables are set in Vercel dashboard
   - Check variable names match code
   - Redeploy after adding variables

4. **CORS Errors**
   - Update CORS configuration
   - Check allowed origins
   - Verify HTTPS usage

### **Debug Commands:**
```bash
# Local development
vercel dev

# Check deployment status
vercel ls

# View project info
vercel inspect

# Pull environment variables
vercel env pull .env.local
```

---

## 📈 **Scaling**

### **Automatic Scaling**
- ✅ Vercel handles scaling automatically
- ✅ Serverless functions scale to zero
- ✅ Global edge network

### **Performance Monitoring**
- ✅ Real-time metrics
- ✅ Function execution times
- ✅ Error rates

---

## 🎉 **Post-Deployment**

### **Testing Checklist:**
- [ ] Frontend loads correctly
- [ ] User registration/login works
- [ ] Payment flow functions
- [ ] API endpoints respond
- [ ] Database connections work
- [ ] File uploads work
- [ ] Real-time features work

### **Monitoring:**
- [ ] Set up Vercel Analytics
- [ ] Monitor function logs
- [ ] Check performance metrics
- [ ] Set up error alerts

---

## 🚀 **Your Vercel URL**
After deployment, your app will be available at:
`https://your-app-name.vercel.app`

**Happy Deploying! 🎉** 