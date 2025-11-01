# 🚀 XSonic Setup Guide

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Upstash Redis account (optional)
- Google Cloud account (for Google Drive integration - optional)

## 🔧 Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd XSonic
npm install
```

### 2. Environment Setup

Copy `.env.example` to `apps/web/.env.local`:

```bash
cd apps/web
cp .env.example .env.local
```

Fill in the required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Upstash Redis (optional)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

### 3. Database Setup

Run migrations:

```bash
cd apps/web
npx supabase db push
```

Seed initial data:

```bash
npx supabase db seed
```

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🗄️ Database Migrations

All migrations are in `supabase/migrations/`:

- `20240101000000_initial_schema.sql` - Core tables
- `20240101000001_rls_policies.sql` - Row Level Security
- `20240101000002_payment_system.sql` - Payment tables
- `20240101000003_tool_costs.sql` - Tool pricing
- `20240102000000_system_settings.sql` - System settings
- `20250125000001_create_uploads_bucket.sql` - Storage bucket

## 🔐 Admin Account

Create admin account via SQL:

```sql
-- Update user role to admin
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

## 📦 Optional Scripts

Run these scripts in Supabase SQL Editor if needed:

### Add Jobs Metadata
```bash
scripts/add-jobs-metadata.sql
```

### Initialize Google Settings
```bash
scripts/init-google-settings.sql
```

### Sync Tool Status
```bash
scripts/sync-tool-status.sql
```

## 🎨 Features

- ✅ User authentication (email/password)
- ✅ Credit-based billing system
- ✅ Payment request system with QR codes
- ✅ Admin panel for user/payment management
- ✅ Audio/Video processing tools
- ✅ AI-powered tools (stem splitter, de-reverb, etc.)
- ✅ Dark/Light theme
- ✅ Maintenance mode
- ✅ Responsive design

## 🔧 Configuration

### Enable Maintenance Mode

1. Login as admin
2. Go to Admin Panel → System Settings
3. Toggle "Maintenance Mode"
4. Set custom message (optional)

### Configure Payment Methods

1. Go to Admin Panel → Payment Methods
2. Add bank account details
3. QR codes are auto-generated

### Manage Plans

1. Go to Admin Panel → Plans
2. Create/edit subscription plans
3. Set pricing and credits

## 📱 Testing

### Test Accounts

Create test users via login page or SQL:

```sql
-- Create test user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('test@example.com', crypt('password123', gen_salt('bf')), NOW());
```

### Test Payment Flow

1. Login as user
2. Go to Pricing page
3. Select a plan
4. Upload payment proof
5. Login as admin
6. Approve payment request

## 🐛 Troubleshooting

### Database Connection Issues

Check Supabase credentials in `.env.local`

### Storage Upload Errors

Ensure storage bucket `uploads` exists and RLS policies are set

### Middleware Not Working

Middleware requires proper Supabase setup. Check `apps/web/src/middleware.ts`

## 📚 Documentation

- [README.md](../README.md) - Project overview
- [Supabase Migrations](../supabase/migrations/) - Database schema
- [API Routes](../apps/web/src/app/api/) - Backend endpoints

## 🚀 Deployment

### Vercel

1. Connect GitHub repository
2. Set environment variables
3. Deploy

### Environment Variables for Production

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
```

## 📞 Support

For issues or questions, check:
- GitHub Issues
- Documentation in `/docs`
- Supabase Dashboard logs

