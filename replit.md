# Social Media Engagement Marketplace

## Overview

This is a full-stack web application that connects social media users seeking engagement (buyers) with providers willing to offer authentic engagement services. The platform operates as a marketplace where buyers can purchase followers, likes, views, comments, and other social media interactions across platforms like Instagram, YouTube, Twitter, and TikTok.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and build processes
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: Supabase Auth with JWT tokens
- **Database Provider**: Supabase (managed PostgreSQL)

### Data Storage Solutions
- **Primary Database**: Supabase PostgreSQL
- **Client Library**: Supabase JavaScript client for type-safe database operations
- **Schema Management**: Supabase dashboard and migrations
- **Session Storage**: Supabase Auth session management
- **Real-time Features**: Supabase real-time subscriptions

## Key Components

### Authentication System
- Supabase Auth with role-based access control
- Three user roles: buyer, provider, admin
- Secure password handling via Supabase Auth
- Role-specific dashboard routing

### User Management
- User registration with role selection
- Profile management with social media account linking
- Balance tracking for financial transactions

### Service Marketplace
- Service listing and browsing with platform/type filtering
- Fixed pricing model (5 shillings per action for buyers, 2 shillings earnings for providers)
- Service types: followers, likes, views, comments, subscribers, reposts, shares
- Platform support: Instagram, YouTube, Twitter, TikTok

### Transaction System
- Shopping cart functionality for service orders
- Transaction tracking with status management
- Purchase history and earnings tracking
- Comment moderation for comment-based services

### Payment Integration
- Paystack integration for payment processing
- Withdrawal system with configurable fees (2.9% + 30 shillings)
- Currency support for shillings (KES)
- Real-time payment status updates via webhooks

### Dashboard System
- **Buyer Dashboard**: Service browsing, cart management, purchase history
- **Provider Dashboard**: Service listing, earnings tracking, withdrawal requests
- **Admin Dashboard**: Platform analytics, user management, transaction oversight

## Data Flow

1. **User Registration**: Users create accounts with email/password and select role (buyer/provider)
2. **Service Discovery**: Buyers browse available services with filtering options
3. **Order Placement**: Buyers add services to cart and proceed to checkout
4. **Payment Processing**: Paystack handles payment with webhook confirmation
5. **Service Fulfillment**: Providers receive notifications to complete ordered actions
6. **Action Verification**: Providers confirm completion via API or manual proof
7. **Earnings Distribution**: Provider earnings are credited to their balance
8. **Withdrawal Process**: Providers request withdrawals with fee calculation

## External Dependencies

### Core Dependencies
- **Database**: Supabase (PostgreSQL hosting with real-time features)
- **Payment Processing**: Paystack for African market payments
- **Authentication**: Supabase Auth for session management
- **UI Components**: Radix UI primitives via shadcn/ui

### Development Tools
- **TypeScript**: Type safety across the stack
- **Vite**: Fast development and build tooling
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Production bundling for server code

### Third-Party Services
- **Email Notifications**: Planned integration for transaction updates
- **Social Media APIs**: Future integration for action verification
- **Analytics**: Built-in dashboard analytics

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Database**: Supabase handles schema management and migrations

### Environment Configuration
- **Development**: `NODE_ENV=development` with hot reloading via Vite
- **Production**: `NODE_ENV=production` serving static files and API
- **Database**: Supabase environment variables for client configuration

### Deployment Architecture
- **Monorepo Structure**: Single repository with client/server/shared code
- **Static Asset Serving**: Express serves built frontend assets in production
- **API Routes**: Express handles `/api/*` routes for backend functionality
- **Database Management**: Supabase dashboard and client library

### Development Features
- **Hot Module Replacement**: Vite HMR for rapid development
- **Runtime Error Overlay**: Development error handling with Replit integration
- **TypeScript Checking**: Compile-time type safety across the stack
- **Path Aliases**: Simplified imports with `@/` and `@shared/` aliases

## Recent Changes: Latest modifications with dates

### July 19, 2025
- **MAJOR IMPLEMENTATION PHASE: Comprehensive PRD Feature Addition**
- Conducted full PRD gap analysis identifying 60-70% missing critical requirements
- Installed essential packages: resend, multer, sharp, node-cron, rate-limiter-flexible, bad-words, @sendgrid/mail
- Created 8 core infrastructure modules: email service, content moderation, social media integration, file uploads, action assignments
- **DATABASE MIGRATION: Replaced Drizzle ORM with Supabase Client**
- Removed all Drizzle ORM dependencies and configuration
- Updated all database operations to use Supabase client
- Replaced schema definitions with TypeScript interfaces
- Updated authentication to use Supabase Auth
- Migrated all CRUD operations to Supabase client calls
- Removed direct PostgreSQL connections and Drizzle migrations
- Updated package.json to remove Drizzle-related dependencies
- **COMPLETED MIGRATION**: All database operations now use Supabase exclusively