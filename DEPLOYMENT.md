# 🚀 Deployment Guide - Social Media Engagement Marketplace

## Overview
This is a **full-stack monorepo** application with:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Payment**: IntaSend
- **Authentication**: Supabase Auth

## 🎯 Recommended Deployment: Railway

### Why Railway?
- ✅ Perfect for monorepo deployments
- ✅ Built-in environment variable management
- ✅ Auto-deploys from GitHub
- ✅ Free tier available
- ✅ Handles both frontend and backend in one service

### Step 1: Prepare Your Repository
1. **Push your code to GitHub** (if not already done)
2. **Ensure all environment variables are documented** (see `.env.example`)

### Step 2: Deploy to Railway
1. **Visit [Railway.app](https://railway.app)**
2. **Sign up/Login with GitHub**
3. **Click "New Project" → "Deploy from GitHub repo"**
4. **Select your repository**
5. **Railway will automatically detect the build configuration**

### Step 3: Configure Environment Variables
In Railway dashboard, add these environment variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://xevnhgizberlburnxuzh.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# IntaSend Payment Configuration
INTASEND_API_PUBLISHABLE_KEY=your_intasend_publishable_key
INTASEND_API_SECRET_KEY=your_intasend_secret_key

# Application Configuration
NODE_ENV=production
BASE_URL=https://your-railway-app.railway.app

# Optional: Frontend URL for CORS
FRONTEND_URL=https://your-railway-app.railway.app
```

### Step 4: Deploy
1. **Railway will automatically build and deploy**
2. **Monitor the build logs** for any issues
3. **Your app will be available at the provided URL**

---

## 🔄 Alternative Deployment Options

### Option 2: Render
1. **Visit [Render.com](https://render.com)**
2. **Create new Web Service**
3. **Connect GitHub repository**
4. **Build Command**: `npm run build`
5. **Start Command**: `npm start`
6. **Add environment variables**

### Option 3: Heroku
1. **Install Heroku CLI**
2. **Run**: `heroku create your-app-name`
3. **Run**: `git push heroku main`
4. **Add environment variables**: `heroku config:set KEY=value`

### Option 4: Vercel (Frontend) + Railway (Backend)
**For separate deployment:**

#### Frontend (Vercel):
1. **Create `vercel.json`**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "framework": "vite"
}
```

2. **Deploy to Vercel**
3. **Update API base URL** to point to your backend

#### Backend (Railway):
1. **Deploy backend separately**
2. **Update CORS** to allow Vercel domain

---

## 🔧 Environment Variables Reference

### Required Variables:
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# IntaSend
INTASEND_API_PUBLISHABLE_KEY=your_publishable_key
INTASEND_API_SECRET_KEY=your_secret_key

# App Configuration
NODE_ENV=production
BASE_URL=https://your-domain.com
```

### Optional Variables:
```bash
# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.com

# Email (if using Resend)
RESEND_API_KEY=your_resend_key

# Additional Security
SESSION_SECRET=your_session_secret
```

---

## 🐛 Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check Node.js version compatibility
   - Ensure all dependencies are in `package.json`
   - Verify TypeScript compilation

2. **Environment Variables Missing**
   - Double-check all required variables are set
   - Ensure no typos in variable names
   - Restart deployment after adding variables

3. **CORS Errors**
   - Verify `FRONTEND_URL` is set correctly
   - Check that the domain is in allowed origins
   - Ensure HTTPS is used in production

4. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check if Supabase project is active
   - Ensure RLS policies are configured

5. **Payment Integration Issues**
   - Verify IntaSend API keys
   - Check webhook URLs are correct
   - Ensure production API keys are used

### Debug Commands:
```bash
# Check build locally
npm run build

# Test production build locally
npm start

# Check environment variables
echo $NODE_ENV
echo $SUPABASE_URL
```

---

## 📊 Monitoring & Maintenance

### Health Checks:
- **Endpoint**: `/` (should return 200)
- **API Health**: `/api/health` (if implemented)

### Logs:
- **Railway**: View logs in dashboard
- **Heroku**: `heroku logs --tail`
- **Render**: View logs in dashboard

### Performance:
- Monitor response times
- Check database query performance
- Monitor payment success rates

---

## 🔒 Security Checklist

- [ ] Environment variables are set (not in code)
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented
- [ ] Input validation is in place
- [ ] Authentication is working
- [ ] Database RLS policies are set
- [ ] Payment webhooks are secure

---

## 🚀 Post-Deployment

1. **Test all features**:
   - User registration/login
   - Service browsing
   - Payment processing
   - Assignment creation
   - Provider dashboard

2. **Set up monitoring**:
   - Error tracking (Sentry)
   - Performance monitoring
   - Uptime monitoring

3. **Configure custom domain** (optional):
   - Add domain in Railway/Render/Heroku
   - Update DNS records
   - Update environment variables

4. **Set up CI/CD** (optional):
   - Automatic deployments on push
   - Automated testing
   - Staging environment

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review deployment logs
3. Verify environment variables
4. Test locally with production config
5. Check platform-specific documentation

**Happy Deploying! 🎉** 