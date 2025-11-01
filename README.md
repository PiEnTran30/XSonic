# X-Sonic - AI Audio/Video Studio SaaS Platform

Professional AI-powered audio and video processing platform built with Next.js 14, Supabase, and serverless architecture.

## 🎯 Features

### AI Audio Tools
- **Stem Splitter** - Separate vocals, drums, bass, and other instruments
- **Audio Enhance** - One-click denoise, de-reverb, and EQ/clarity enhancement
- **De-Reverb** - Remove reverb from audio recordings
- **Auto Subtitle** - Automatic speech recognition with SRT/VTT/JSON export
- **Text-to-Speech** - High-quality voice synthesis

### Basic Audio Tools
- **Cut/Join** - Trim and concatenate audio files
- **Pitch/Tempo** - Adjust pitch and tempo independently
- **Volume/Normalize** - Normalize audio levels and adjust volume
- **Online Recorder** - Record audio directly in browser

### Video Tools
- **Universal Video Downloader** - Download from YouTube, TikTok, Facebook, Instagram (with allowlist)
- **Video Converter** - Convert between formats
- **Basic Video Editor** - Cut, add BGM, overlay text

## 🏗️ Architecture

### Monorepo Structure
```
xsonic/
├── apps/
│   ├── web/              # Next.js 14 frontend + API routes
│   ├── worker-cpu/       # Railway CPU worker
│   └── worker-gpu/       # Runpod GPU worker (auto-scaling)
├── packages/
│   └── core/             # Shared types, adapters, utilities
├── supabase/
│   ├── migrations/       # Database schema
│   └── seed.sql          # Default plans and feature flags
└── .env.example          # Environment variables template
```

### Tech Stack
- **Frontend**: Next.js 14 App Router, TypeScript, TailwindCSS, shadcn/ui, Framer Motion
- **Auth/DB**: Supabase (PostgreSQL + Auth + Storage)
- **Queue**: Upstash Redis + Inngest
- **Workers**: Railway (CPU), Runpod (GPU auto-scaling)
- **Observability**: Pino logger, Sentry
- **Billing**: Internal credit system (no Stripe Products/Prices)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Supabase account
- Upstash Redis account
- (Optional) Railway account for CPU worker
- (Optional) Runpod account for GPU worker

### Local Development

1. **Clone and install dependencies**
```bash
git clone <your-repo>
cd xsonic
npm install
```

2. **Setup Supabase**
- Create a new Supabase project
- Copy `.env.example` to `apps/web/.env.local`
- Fill in Supabase credentials
- Run migrations:
```bash
cd apps/web
npx supabase db push
npx supabase db seed
```

3. **Setup Upstash Redis**
- Create a Redis database at upstash.com
- Add credentials to `.env.local`

4. **Start development server**
```bash
npm run dev
```

The web app will be available at `http://localhost:3000`

### Environment Variables

See `.env.example` for all required variables. Key configurations:

- `GPU_ENABLED=false` - GPU worker disabled by default
- `ALLOW_CPU_FALLBACK=true` - Use CPU if GPU unavailable
- `HARD_LIMIT_ENABLED=true` - Block jobs when credits insufficient
- `STORAGE_TTL_DAYS=7` - Auto-delete files after 7 days

## 📊 Database Schema

### Core Tables
- `users` - User profiles (extends Supabase auth)
- `plans` - Subscription plans with features and limits
- `wallets` - User credit balances
- `subscriptions_internal` - User subscriptions
- `transactions` - Credit transaction history
- `vouchers` - Discount codes
- `jobs` - Processing jobs queue
- `feature_flags` - Runtime configuration
- `usage_metrics` - Usage tracking

### Row Level Security (RLS)
All tables have RLS policies:
- Users can only access their own data
- Admins can access all data
- Public plans are visible to everyone

## 💳 Billing System

### Internal Credit System
- All pricing/limits stored in database (not Stripe)
- Credits deducted based on:
  - File size (MB)
  - Processing duration (seconds)
  - CPU vs GPU usage
  - Tool complexity

### Admin Controls
- Top-up/adjust user credits
- Change user plans
- Pause/cancel subscriptions
- Set custom renews_at dates
- Upload receipts to Storage
- Export transaction history

### Hard Limits
When `HARD_LIMIT_ENABLED=true`:
- Jobs blocked if insufficient credits
- Credits reserved before job starts
- Released if job fails
- Deducted when job completes

## 🎮 GPU Auto-Scaling

### How It Works
1. **Default State**: GPU worker is OFF (`GPU_ENABLED=false`)
2. **Job Arrives**: When GPU job enters queue, controller detects it
3. **Auto-Start**: Controller calls Runpod API to start pod
4. **Healthcheck**: Waits for `/healthz` endpoint (max 5 min)
5. **Processing**: GPU worker processes jobs
6. **Auto-Stop**: After `GPU_AUTOSTOP_IDLE_MIN` minutes idle, pod stops

### CPU Fallback
If `ALLOW_CPU_FALLBACK=true` and GPU fails to start:
- GPU jobs moved to CPU queue
- Processed slower but still complete
- If `false`, jobs stay in `pending-gpu` status

### Configuration
```env
GPU_ENABLED=false                    # Start with GPU disabled
ALLOW_CPU_FALLBACK=true              # Allow CPU fallback
GPU_AUTOSTART_COOLDOWN_MIN=5         # Wait 5min before retry
GPU_AUTOSTOP_IDLE_MIN=10             # Stop after 10min idle
RUNPOD_API_KEY=your-key              # Runpod API credentials
RUNPOD_ENDPOINT=https://...          # Runpod endpoint
```

## 🔧 Deployment

### Deploy Web App (Vercel)
```bash
cd apps/web
vercel
```

Set environment variables in Vercel dashboard.

### Deploy CPU Worker (Railway)
```bash
cd apps/worker-cpu
# Connect to Railway via CLI or GitHub
railway up
```

Set environment variables:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FFMPEG_PATH=/usr/bin/ffmpeg`
- `MAX_CONCURRENT_JOBS=5`

### Deploy GPU Worker (Runpod)
1. Create Runpod template with:
   - CUDA-enabled image
   - Python 3.10+
   - Install dependencies (demucs, whisper, etc.)
2. Set environment variables
3. Configure healthcheck endpoint `/healthz`
4. Set callback URL to `https://your-app.vercel.app/api/webhooks/worker`

**Note**: GPU worker should be configured for auto-scaling but NOT auto-deployed. The web app's GPU controller will start/stop it on demand.

## 📁 File Upload & Storage

### Resumable Uploads
- Uses tus protocol via @uppy/tus
- Supports large files (up to 2GB)
- Resume interrupted uploads
- Progress tracking

### Auto-Cleanup
- Files auto-deleted after `STORAGE_TTL_DAYS`
- Option to delete immediately after job completes
- Admin can manually trigger cleanup

### Storage Structure
```
supabase-storage/
└── xsonic-files/
    └── {user_id}/
        ├── {timestamp}-input.mp3
        └── {timestamp}-output.mp3
```

## 🛡️ Security & Compliance

### Video Downloader Allowlist
Only downloads from approved hosts:
```env
ALLOWED_DOWNLOAD_HOSTS=youtube.com,youtu.be,tiktok.com,facebook.com,instagram.com
```

### DRM Protection
- No DRM bypass functionality
- Respects platform terms of service
- Logs all download attempts

### Data Privacy
- PII redacted from logs
- User data export available
- GDPR-compliant deletion
- Files encrypted at rest

### Rate Limiting
- Per-plan limits enforced
- Credits prevent abuse
- Concurrent job limits
- Daily job quotas

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

Tests cover:
- Credit calculation
- RLS policies
- Allowlist validation
- Idempotency keys

### E2E Smoke Test
```bash
npm run test:e2e
```

Tests:
1. Upload small audio file
2. Run "Audio Enhance" tool
3. Download output
4. Verify credits deducted

## 📈 Monitoring & Observability

### Logging
- Pino structured logging
- PII automatically redacted
- Log levels: debug, info, warn, error

### Error Tracking
- Sentry integration (optional)
- Error grouping and alerts
- Performance monitoring

### Progress Updates
- Server-Sent Events (SSE) for real-time progress
- Job status polling
- Webhook callbacks from workers

## 🎨 UI/UX Features

### Responsive Design
- Mobile-first approach
- Works on phone, tablet, desktop
- Touch-friendly controls

### Accessibility
- Keyboard navigation
- ARIA labels
- Screen reader support
- High contrast mode

### Dark Theme
- Primary: #0F172A (dark blue)
- Accent: #3B82F6 (blue)
- Studio-style interface

## 🔑 Default Plans

| Plan | Price/mo | Credits | Features |
|------|----------|---------|----------|
| Free | $0 | 100 | Basic audio tools, 50MB files, 1GB storage |
| Starter | $9.99 | 1,000 | All AI tools, 200MB files, 10GB storage |
| Pro | $29.99 | 5,000 | Priority queue, GPU access, API, 500MB files |
| Enterprise | $99.99 | 20,000 | Dedicated support, 2GB files, 500GB storage |

All plans and limits can be customized in Admin panel.

## 🎯 Completion Criteria

### ✅ Core Functionality
- [x] Monorepo structure with Turbo
- [x] Supabase schema with RLS
- [x] Internal billing system
- [x] Queue system with Redis + Inngest
- [x] GPU auto-start/stop controller
- [x] Resumable file uploads
- [x] Next.js 14 App Router
- [x] shadcn/ui components
- [x] API routes structure

### 🚧 To Complete
- [ ] Implement all tool processors (stem-split, enhance, etc.)
- [ ] Build Dashboard UI (Upload Manager, Job History, Usage)
- [ ] Build Admin Panel (Plans, Users, Transactions, Vouchers)
- [ ] Implement SSE progress updates
- [ ] Add Inngest job orchestration
- [ ] Integrate AI providers (OpenAI, ElevenLabs)
- [ ] Add video downloader with yt-dlp
- [ ] Implement basic video editor
- [ ] Add online audio recorder
- [ ] Write comprehensive tests
- [ ] Add Sentry error tracking
- [ ] Create deployment scripts

## 📝 Next Steps

1. **Install dependencies**: `npm install` in root
2. **Setup Supabase**: Create project, run migrations
3. **Setup Redis**: Create Upstash database
4. **Configure ENV**: Copy `.env.example` to `apps/web/.env.local`
5. **Start dev server**: `npm run dev`
6. **Test upload flow**: Upload file → create job → check status
7. **Implement tool processors**: Start with simple tools (cut/join)
8. **Build Dashboard**: Upload Manager, Job History
9. **Build Admin Panel**: Plans CRUD, User management
10. **Deploy**: Vercel (web) + Railway (CPU worker)

## 🤝 Contributing

This is a complete codebase foundation. To extend:

1. Add new tools in `packages/core/src/types/tools.ts`
2. Implement processors in `apps/worker-cpu/src/processor.ts`
3. Create API routes in `apps/web/src/app/api/tools/`
4. Add UI components in `apps/web/src/components/`
5. Update cost models in billing adapter

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For issues or questions:
1. Check this README
2. Review `.env.example` for configuration
3. Check Supabase logs for database errors
4. Check Railway/Runpod logs for worker errors
5. Enable debug logging: `LOG_LEVEL=debug`

---

**Built with ❤️ for professional audio/video creators**

#   X S o n i c  
 