# Social Media Engagement Marketplace - Build Documentation

## 🎯 **Platform Overview**

**SocialMarketplace** is a comprehensive social media engagement marketplace that connects buyers (businesses/individuals seeking social media engagement) with providers (content creators/social media users who can deliver engagement services).

### **Core Value Proposition**
- **For Buyers**: Purchase authentic social media engagement (likes, comments, shares, follows) for their content
- **For Providers**: Earn money by completing social media tasks and providing engagement services
- **For Platform**: Facilitate transactions with secure payment processing and quality assurance

---

## 🏗️ **Architecture & Technology Stack**

### **Frontend**
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom UI components
- **State Management**: React Query for server state
- **Build Tool**: Vite for fast development and building
- **UI Components**: Custom component library with shadcn/ui patterns

### **Backend**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with middleware architecture
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with JWT tokens
- **Payment Processing**: IntaSend payment gateway
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime subscriptions

### **Infrastructure**
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Deployment**: Railway/Render ready with Docker support
- **Environment**: Development, staging, and production configurations

---

## 📊 **Database Schema**

### **Core Tables**

#### **users**
```sql
- id (UUID, Primary Key)
- email (VARCHAR, Unique)
- role (ENUM: 'buyer', 'provider', 'admin')
- username (VARCHAR, Unique)
- full_name (VARCHAR)
- avatar_url (VARCHAR)
- bio (TEXT)
- phone (VARCHAR)
- country (VARCHAR)
- city (VARCHAR)
- is_verified (BOOLEAN)
- is_suspended (BOOLEAN)
- balance (DECIMAL)
- status (ENUM: 'active', 'suspended', 'banned')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **services**
```sql
- id (VARCHAR, Primary Key)
- platform (ENUM: 'facebook', 'instagram', 'twitter', 'tiktok', 'youtube')
- type (ENUM: 'likes', 'comments', 'shares', 'follows', 'views')
- title (VARCHAR)
- description (TEXT)
- price (DECIMAL)
- min_quantity (INTEGER)
- max_quantity (INTEGER)
- delivery_time (INTEGER)
- status (ENUM: 'active', 'inactive')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **transactions**
```sql
- id (INTEGER, Primary Key, Auto-increment)
- buyer_id (INTEGER, Foreign Key)
- provider_id (INTEGER, Foreign Key)
- service_id (VARCHAR, Foreign Key)
- amount (DECIMAL, NOT NULL)
- currency (VARCHAR)
- status (ENUM: 'pending', 'completed', 'failed', 'cancelled')
- payment_method (VARCHAR)
- payment_reference (VARCHAR)
- quantity (INTEGER)
- total_cost (DECIMAL)
- comment_text (TEXT)
- target_url (VARCHAR)
- fulfilled_quantity (INTEGER)
- payment_id (VARCHAR)
- completed_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **available_assignments**
```sql
- id (INTEGER, Primary Key, Auto-increment)
- transaction_id (INTEGER, Foreign Key)
- service_id (VARCHAR, Foreign Key)
- platform (VARCHAR)
- action_type (VARCHAR)
- quantity (INTEGER)
- status (ENUM: 'open', 'claimed', 'completed', 'cancelled')
- claimed_by (INTEGER, Foreign Key)
- claimed_at (TIMESTAMP)
- completed_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **action_assignments**
```sql
- id (INTEGER, Primary Key, Auto-increment)
- available_assignment_id (INTEGER, Foreign Key)
- provider_id (INTEGER, Foreign Key)
- status (ENUM: 'pending', 'in_progress', 'completed', 'rejected')
- proof_data (JSONB)
- submitted_at (TIMESTAMP)
- completed_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **provider_services**
```sql
- id (INTEGER, Primary Key, Auto-increment)
- provider_id (INTEGER, Foreign Key)
- service_id (VARCHAR, Foreign Key)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **social_media_accounts**
```sql
- id (INTEGER, Primary Key, Auto-increment)
- user_id (INTEGER, Foreign Key)
- platform (VARCHAR)
- username (VARCHAR)
- account_url (VARCHAR)
- is_verified (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **verifications**
```sql
- id (INTEGER, Primary Key, Auto-increment)
- assignment_id (INTEGER, Foreign Key)
- verifier_id (INTEGER, Foreign Key)
- status (ENUM: 'pending', 'approved', 'rejected')
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **withdrawals**
```sql
- id (INTEGER, Primary Key, Auto-increment)
- user_id (INTEGER, Foreign Key)
- amount (DECIMAL)
- method (VARCHAR)
- status (ENUM: 'pending', 'completed', 'failed')
- reference (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **credit_transactions**
```sql
- id (INTEGER, Primary Key, Auto-increment)
- user_id (INTEGER, Foreign Key)
- type (ENUM: 'credit', 'debit')
- amount (DECIMAL)
- description (TEXT)
- reference (VARCHAR)
- created_at (TIMESTAMP)
```

#### **platform_revenue**
```sql
- id (INTEGER, Primary Key, Auto-increment)
- transaction_id (INTEGER, Foreign Key)
- amount (DECIMAL)
- percentage (DECIMAL)
- created_at (TIMESTAMP)
```

---

## 🔄 **Core Workflows**

### **1. Buyer Workflow**
1. **Registration & Profile Setup**
   - Sign up with email/password
   - Complete profile with business information
   - Verify email address

2. **Service Selection & Payment**
   - Browse available services by platform and type
   - Select service, quantity, and provide target URL
   - Complete payment via IntaSend gateway
   - Transaction recorded in database

3. **Assignment Creation**
   - System automatically creates available assignments
   - Assignments visible to providers offering that service
   - Buyers can track assignment status

4. **Verification & Completion**
   - Review completed submissions from providers
   - Approve or reject submissions
   - System marks assignments as completed

### **2. Provider Workflow**
1. **Registration & Service Selection**
   - Sign up with email/password
   - Select services they can provide
   - Link social media accounts for verification

2. **Assignment Discovery**
   - View available assignments matching their services
   - Filter by platform, type, and other criteria
   - Claim assignments they can complete

3. **Task Completion**
   - Complete social media tasks (likes, comments, follows)
   - Submit proof of completion
   - Wait for buyer verification

4. **Payment & Earnings**
   - Receive payment upon verification
   - Track earnings and withdrawal history
   - Request withdrawals

### **3. Admin Workflow**
1. **Platform Management**
   - Monitor transactions and revenue
   - Manage user accounts and disputes
   - Oversee verification process

2. **Service Management**
   - Add/edit/remove services
   - Set pricing and delivery times
   - Monitor service performance

3. **Moderation & Support**
   - Handle user reports and disputes
   - Review flagged content
   - Provide customer support

---

## 🛠️ **Key Features Implemented**

### **✅ Authentication & User Management**
- **Supabase Auth Integration**: JWT-based authentication
- **Role-based Access Control**: Buyer, Provider, Admin roles
- **Profile Management**: Complete user profiles with verification
- **Social Media Account Linking**: Providers can link their accounts

### **✅ Payment Processing**
- **IntaSend Integration**: Secure payment gateway
- **Webhook Processing**: Real-time payment status updates
- **Transaction Management**: Complete payment flow tracking
- **Revenue Tracking**: Platform fee calculation and recording

### **✅ Service Management**
- **Dynamic Service Database**: All services stored in database
- **Service Mapping**: Dynamic mapping between string IDs and platform/type
- **Provider Service Selection**: Providers can select which services to offer
- **Service Filtering**: Advanced filtering by platform, type, and status

### **✅ Assignment System**
- **Available Assignments**: Automatic creation after successful payments
- **Assignment Claiming**: Providers can claim available tasks
- **Status Tracking**: Complete assignment lifecycle management
- **Proof Submission**: Secure proof upload and verification

### **✅ Verification System**
- **Manual Verification**: Buyers can verify provider submissions
- **AI Verification**: Framework for automated verification (ready for implementation)
- **Verification Tracking**: Complete audit trail of verifications
- **Dispute Resolution**: System for handling verification disputes

### **✅ Dashboard & Analytics**
- **Buyer Dashboard**: Track orders, view submissions, manage payments
- **Provider Dashboard**: View available assignments, track earnings
- **Admin Dashboard**: Platform analytics, user management, revenue tracking
- **Real-time Updates**: Live status updates across all dashboards

### **✅ Email Notifications**
- **Real-time Notifications**: Database-driven notification system
- **Email Templates**: Structured email notifications
- **User Preferences**: Configurable notification settings

### **✅ Withdrawal System**
- **Earnings Tracking**: Complete earnings calculation
- **Withdrawal Requests**: Secure withdrawal processing
- **Payment Methods**: Multiple withdrawal options
- **Transaction History**: Complete financial audit trail

---

## 🔧 **Recent Improvements & Fixes**

### **✅ Mock Data & Placeholder Cleanup (COMPLETE)**
- **Provider Email Placeholders**: Replaced hardcoded `'provider@example.com'` with actual user data lookup
- **Admin Dashboard Stats**: Replaced hardcoded `totalRevenue` with database calculation
- **Email Notifications**: Replaced mock notifications with API-driven data
- **Service Definitions**: Replaced hardcoded services with database queries
- **Service Mapping**: Made dynamic based on database services
- **Social Media Verification**: Removed mock API functions, focused on manual/AI verification
- **Webhook Secrets**: Removed hardcoded fallbacks, made environment variables required
- **Target URLs**: Removed hardcoded `example.com` fallbacks

### **✅ Payment Processing Fixes**
- **Transaction Amount Validation**: Fixed null amount constraint violations
- **Payment Flow**: Complete end-to-end payment processing
- **Webhook Integration**: Real-time payment status updates
- **Error Handling**: Robust error handling and logging

### **✅ Service Standardization**
- **Facebook Likes**: Standardized "Facebook Page Likes" to "Facebook Likes" across platform
- **Service Consistency**: Ensured consistent naming across database and frontend
- **Service Mapping**: Dynamic service mapping based on database

### **✅ Provider Assignment Visibility**
- **Service ID Mapping**: Fixed service ID mismatch between tables
- **Assignment Filtering**: Proper filtering based on provider service selection
- **Duplicate Endpoint Removal**: Removed duplicate API endpoints

### **✅ Database Schema Improvements**
- **Column Consistency**: Fixed column naming and data types
- **Foreign Key Relationships**: Proper relationships between tables
- **Indexing**: Optimized database performance
- **Data Validation**: Enhanced data integrity constraints

---

## 🚀 **Deployment & Infrastructure**

### **Development Setup**
```bash
# Clone repository
git clone <repository-url>
cd SocialMarketplace

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Configure Supabase and IntaSend credentials

# Start development servers
npm run dev:server  # Backend on port 5000
npm run dev:client  # Frontend on port 3000
```

### **Environment Variables**
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# IntaSend Payment Gateway
INTASEND_PUBLISHABLE_KEY=your_intasend_publishable_key
INTASEND_SECRET_KEY=your_intasend_secret_key
INTASEND_WEBHOOK_SECRET=your_webhook_secret

# Application Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### **Production Deployment**
- **Railway**: Ready for Railway deployment with `railway.json`
- **Render**: Ready for Render deployment with `render.yaml`
- **Docker**: Containerized with `Dockerfile`
- **Environment**: Production environment configuration

---

## 📈 **Performance & Security**

### **Security Measures**
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Proper cross-origin resource sharing
- **Environment Variables**: Secure credential management

### **Performance Optimizations**
- **Database Indexing**: Optimized query performance
- **Caching**: React Query for efficient data fetching
- **Lazy Loading**: Component and route lazy loading
- **Image Optimization**: Optimized image handling
- **Bundle Optimization**: Vite for fast builds

---

## 🔮 **Future Enhancements**

### **Planned Features**
- **AI Verification**: Automated content verification using AI
- **Real-time Chat**: Provider-buyer communication
- **Advanced Analytics**: Detailed performance metrics
- **Mobile App**: React Native mobile application
- **API Documentation**: Comprehensive API documentation
- **Multi-language Support**: Internationalization
- **Advanced Payment Methods**: Additional payment gateways

### **Technical Improvements**
- **Microservices Architecture**: Service decomposition
- **Event-driven Architecture**: Event sourcing and CQRS
- **Advanced Caching**: Redis integration
- **Monitoring & Logging**: Comprehensive observability
- **Automated Testing**: Unit, integration, and E2E tests

---

## 📝 **API Documentation**

### **Authentication Endpoints**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### **Payment Endpoints**
- `POST /api/payment/create` - Create payment
- `POST /api/payment/callback` - Payment webhook
- `GET /api/transactions` - Get user transactions

### **Service Endpoints**
- `GET /api/services` - Get all services
- `GET /api/provider/services` - Get provider services
- `POST /api/provider/services` - Update provider services

### **Assignment Endpoints**
- `GET /api/provider/available-assignments` - Get available assignments
- `POST /api/assignments/claim` - Claim assignment
- `POST /api/assignments/submit` - Submit assignment proof
- `GET /api/buyer/assignments` - Get buyer assignments

### **Verification Endpoints**
- `POST /api/verification/review` - Review submission
- `GET /api/verification/pending` - Get pending verifications

### **Withdrawal Endpoints**
- `POST /api/withdrawals/request` - Request withdrawal
- `GET /api/withdrawals` - Get withdrawal history

---

## 🐛 **Known Issues & Limitations**

### **Current Limitations**
- **Social Media API Integration**: Manual verification only (AI verification framework ready)
- **Payment Methods**: Limited to IntaSend supported methods
- **Real-time Features**: Basic real-time updates (can be enhanced with WebSockets)
- **Mobile Responsiveness**: Desktop-optimized (mobile improvements planned)

### **Technical Debt**
- **Test Coverage**: Limited automated testing
- **Documentation**: API documentation needs expansion
- **Error Handling**: Some edge cases need better handling
- **Performance**: Database queries can be optimized further

---

## 📞 **Support & Maintenance**

### **Development Team**
- **Backend Development**: Node.js/TypeScript/Express.js
- **Frontend Development**: React/TypeScript/Tailwind CSS
- **Database Management**: PostgreSQL/Supabase
- **DevOps**: Railway/Render deployment

### **Maintenance Schedule**
- **Daily**: Database backups and monitoring
- **Weekly**: Security updates and performance reviews
- **Monthly**: Feature updates and bug fixes
- **Quarterly**: Major version updates and architecture reviews

---

*Last Updated: July 24, 2025*
*Version: 2.0.0* 