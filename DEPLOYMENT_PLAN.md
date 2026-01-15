# 🚀 Complete Deployment Plan - Banda E-Commerce

## 📋 Project Overview

Your application consists of:
1. **Backend** - FastAPI (Python) on port 8000
2. **Frontend** - Next.js (React) on port 3000
3. **Mobile App** - React Native (Expo)
4. **Database** - PostgreSQL
5. **Cache** - Redis
6. **Storage** - Cloudinary (images)

---

## 🎯 Deployment Strategy Options

### **Option 1: Railway (Recommended - Easiest) ⭐⭐⭐**

**Best for:** Quick deployment, everything in one place  
**Cost:** $5-10/month (free tier available)  
**Difficulty:** ⭐ Easy

#### Why Railway?
- ✅ One platform for all services
- ✅ Auto-deploys from GitHub
- ✅ Built-in PostgreSQL & Redis
- ✅ Automatic HTTPS/SSL
- ✅ Easy environment variable management
- ✅ Free tier for testing

#### Steps:

1. **Setup Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Get $5 free credit

2. **Deploy PostgreSQL Database**
   ```
   - Click "New Project" → "New Database" → "PostgreSQL"
   - Copy connection string (will be used in backend)
   ```

3. **Deploy Redis**
   ```
   - Click "New" → "Database" → "Redis"
   - Copy connection string
   ```

4. **Deploy Backend (FastAPI)**
   ```
   - Click "New" → "GitHub Repo"
   - Select your repository
   - Set root directory: backend/
   - Railway auto-detects Python
   - Add environment variables (see below)
   - Deploy!
   ```

5. **Deploy Frontend (Next.js)**
   ```
   - Click "New" → "GitHub Repo"
   - Select your repository
   - Set root directory: frontend/
   - Railway auto-detects Next.js
   - Add environment variable:
     NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
   - Deploy!
   ```

---

### **Option 2: Vercel + Railway (Best Value) ⭐⭐**

**Best for:** Free frontend, cheap backend  
**Cost:** FREE (frontend) + $5-10/month (backend)  
**Difficulty:** ⭐⭐ Medium

#### Frontend on Vercel (FREE):
1. Sign up at [vercel.com](https://vercel.com)
2. Connect GitHub repository
3. Set root directory: `frontend`
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
   ```
5. Deploy automatically on every push

#### Backend on Railway:
- Follow Option 1 steps for backend

---

### **Option 3: VPS with Docker (Cheapest Long-term) ⭐⭐⭐**

**Best for:** Full control, cheapest long-term  
**Cost:** $5-10/month (VPS)  
**Difficulty:** ⭐⭐⭐ Hard

#### Recommended VPS Providers:
- **DigitalOcean** - $6/month (1GB RAM)
- **Linode** - $5/month
- **Hetzner** - €4/month
- **AWS Lightsail** - $5/month

#### Steps:
1. Get VPS and SSH into it
2. Install Docker & Docker Compose
3. Clone repository
4. Setup production docker-compose.yml
5. Configure Nginx as reverse proxy
6. Setup SSL with Let's Encrypt
7. Deploy frontend separately (Vercel or static build)

---

## 🔐 Environment Variables Setup

### Backend Environment Variables (Railway/Production)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/banda_ecommerce

# Redis
REDIS_URL=redis://host:6379/0

# Security (IMPORTANT: Generate strong random strings)
SECRET_KEY=<generate-random-32-char-string>
JWT_SECRET_KEY=<generate-random-32-char-string>

# JWT Settings
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS - Add your frontend URL
CORS_ORIGINS=["https://your-frontend.vercel.app","https://your-frontend.railway.app"]

# Production Settings
DEBUG=False
APP_NAME=Banda E-Commerce
APP_VERSION=1.0.0

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Razorpay (Payment Gateway)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret

# AWS S3 (Optional - if using instead of Cloudinary)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET_NAME=
```

### Frontend Environment Variables

```bash
# API URL (pointing to your deployed backend)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1

# Optional: Analytics, etc.
NEXT_PUBLIC_GA_ID=
```

### Mobile App Environment Variables

```bash
# API URL for mobile app
EXPO_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
```

---

## 📱 Mobile App Deployment

### Option A: Expo Application Services (EAS) - Recommended

**Best for:** Easy app store deployment  
**Cost:** FREE (with limits) or $29/month

#### Steps:

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Configure EAS**
   ```bash
   cd mobile
   eas build:configure
   ```

4. **Update app.json**
   ```json
   {
     "expo": {
       "extra": {
         "apiUrl": "https://your-backend.railway.app/api/v1"
       }
     }
   }
   ```

5. **Build for Android**
   ```bash
   eas build --platform android
   ```

6. **Build for iOS** (requires Apple Developer account)
   ```bash
   eas build --platform ios
   ```

7. **Submit to App Stores**
   ```bash
   eas submit --platform android
   eas submit --platform ios
   ```

### Option B: Manual Build (Advanced)

1. Build APK/IPA locally
2. Upload to Google Play Console / App Store Connect
3. Submit for review

---

## 🗄️ Database Migration on Production

### After deploying backend:

```bash
# Option 1: Using Railway CLI
railway run alembic upgrade head

# Option 2: SSH into server (VPS)
cd backend
alembic upgrade head

# Option 3: Docker
docker-compose exec api alembic upgrade head
```

---

## 🔒 Security Checklist

### Before Going Live:

- [ ] Change all default passwords
- [ ] Generate strong SECRET_KEY and JWT_SECRET_KEY
- [ ] Set DEBUG=False in production
- [ ] Update CORS_ORIGINS with your frontend URL
- [ ] Enable HTTPS (automatic on Railway/Vercel)
- [ ] Setup database backups
- [ ] Review and restrict API rate limits
- [ ] Setup monitoring/logging
- [ ] Test all payment flows
- [ ] Verify image uploads work
- [ ] Test mobile app API connectivity

---

## 📊 Recommended Deployment Flow

### Phase 1: Backend Setup (Day 1)
1. ✅ Deploy PostgreSQL on Railway
2. ✅ Deploy Redis on Railway
3. ✅ Deploy Backend API on Railway
4. ✅ Run database migrations
5. ✅ Test API endpoints
6. ✅ Setup environment variables

### Phase 2: Frontend Setup (Day 1-2)
1. ✅ Deploy Frontend on Vercel
2. ✅ Configure API URL
3. ✅ Test all frontend features
4. ✅ Verify authentication flow

### Phase 3: Mobile App (Day 2-3)
1. ✅ Update API URL in mobile app
2. ✅ Build APK for testing
3. ✅ Test on physical devices
4. ✅ Submit to app stores

### Phase 4: Production Hardening (Day 3-4)
1. ✅ Setup monitoring (Sentry, LogRocket)
2. ✅ Configure backups
3. ✅ Setup CDN for images
4. ✅ Performance optimization
5. ✅ Load testing

---

## 🛠️ Production Docker Compose

Create `backend/docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: banda_ecommerce
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always
    networks:
      - app-network

  api:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/banda_ecommerce
      - REDIS_URL=redis://redis:6379/0
      - DEBUG=False
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    restart: always
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

---

## 📈 Monitoring & Maintenance

### Recommended Tools:

1. **Error Tracking:** Sentry (FREE tier available)
2. **Analytics:** Google Analytics / Mixpanel
3. **Uptime Monitoring:** UptimeRobot (FREE)
4. **Logs:** Railway built-in logs / CloudWatch
5. **Performance:** Lighthouse CI

### Setup Sentry:

```bash
# Backend
pip install sentry-sdk[fastapi]

# Frontend
npm install @sentry/nextjs
```

---

## 💰 Cost Breakdown

| Service | Platform | Monthly Cost |
|---------|----------|--------------|
| **Frontend** | Vercel | FREE |
| **Backend** | Railway | $5-10 |
| **PostgreSQL** | Railway | Included |
| **Redis** | Railway | Included |
| **Mobile Builds** | EAS | FREE (limited) or $29 |
| **Domain** | Namecheap/GoDaddy | $10-15/year |
| **SSL** | Let's Encrypt | FREE |
| **Total** | | **$5-10/month** |

---

## 🚨 Common Issues & Solutions

### Issue 1: CORS Errors
**Solution:** Update `CORS_ORIGINS` in backend with your frontend URL

### Issue 2: Database Connection Failed
**Solution:** Check `DATABASE_URL` format and network access

### Issue 3: Images Not Loading
**Solution:** Verify Cloudinary credentials and CORS settings

### Issue 4: Mobile App Can't Connect
**Solution:** Update `EXPO_PUBLIC_API_URL` and rebuild app

### Issue 5: Migration Errors
**Solution:** Run `alembic upgrade head` after database is ready

---

## 📝 Pre-Deployment Checklist

### Backend:
- [ ] All environment variables set
- [ ] Database migrations ready
- [ ] CORS configured
- [ ] DEBUG=False
- [ ] Strong secrets generated
- [ ] Cloudinary credentials set
- [ ] Razorpay credentials set

### Frontend:
- [ ] API URL configured
- [ ] Build succeeds locally
- [ ] All environment variables set
- [ ] Images optimized

### Mobile:
- [ ] API URL updated
- [ ] App builds successfully
- [ ] Tested on devices
- [ ] App icons and splash screens ready

---

## 🎯 Quick Start (Recommended: Railway)

1. **Sign up:** [railway.app](https://railway.app)
2. **Deploy Database:** New → PostgreSQL
3. **Deploy Redis:** New → Redis
4. **Deploy Backend:** New → GitHub Repo → Select backend/
5. **Deploy Frontend:** Vercel → Connect Repo → Select frontend/
6. **Update Mobile:** Change API URL → Build → Deploy

**Total Time:** 2-3 hours  
**Total Cost:** $5-10/month

---

## 📞 Next Steps

1. **Choose your deployment platform** (Railway recommended)
2. **Setup accounts** (Railway, Vercel, Expo)
3. **Deploy backend first** (test API endpoints)
4. **Deploy frontend** (connect to backend)
5. **Update mobile app** (rebuild with new API URL)
6. **Test everything** (all features, payments, uploads)
7. **Go live!** 🚀

---

**Need help?** Let me know which option you want to proceed with, and I'll guide you through each step!

