# 🚀 Deployment Strategy for Banda Ecommerce

## ✅ Yes, Commit Everything in One Repo!

This is a **monorepo** structure, which means:
- ✅ **Frontend** (Next.js) - `frontend/`
- ✅ **Mobile** (React Native/Expo) - `mobile/`
- ✅ **Backend** (FastAPI) - `backend/`
- ✅ All configuration files
- ✅ Documentation files

**Everything should be committed together** - this is the standard approach for monorepos.

---

## 📋 Pre-Deployment Checklist

### 1. **Git Setup** ✅

```bash
# Make sure you have a .gitignore at root
# Check what's being ignored:
git status

# Common files to ignore:
# - node_modules/
# - .env files (but commit .env.example)
# - .next/
# - build/ dist/
# - *.log
# - .DS_Store
```

### 2. **Environment Variables** 🔐

**Never commit `.env` files!** Create `.env.example` files instead:

#### Backend `.env.example`:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/banda_ecommerce
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
CORS_ORIGINS=["http://localhost:3000"]
DEBUG=True
```

#### Frontend `.env.example`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

#### Mobile `.env.example`:
```bash
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 3. **Build & Test Locally** 🧪

```bash
# Test backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Test frontend
cd frontend
npm install
npm run build
npm start

# Test mobile
cd mobile
npm install
npm start
```

---

## 🎯 Deployment Options

### **Option 1: Vercel (Frontend) + Railway (Backend) - RECOMMENDED** ⭐⭐⭐

**Best for:** Production-ready, free frontend hosting

#### Frontend on Vercel (FREE):
1. Sign up at [vercel.com](https://vercel.com)
2. Connect GitHub repo
3. Set root directory: `frontend`
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
   ```
5. Deploy! (Auto-deploys on every push)

#### Backend on Railway:
1. Sign up at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select repo, set root directory: `backend`
4. Add PostgreSQL service
5. Add Redis service
6. Add environment variables (from Railway dashboard)
7. Deploy!

**Cost:** FREE (frontend) + $5-10/month (backend + DB)

---

### **Option 2: Railway (All-in-One)** ⭐⭐

**Best for:** Everything in one place

1. Sign up at [railway.app](https://railway.app)
2. Create new project
3. Add services:
   - PostgreSQL database
   - Redis cache
   - Backend (from GitHub, root: `backend/`)
   - Frontend (from GitHub, root: `frontend/`)
4. Configure environment variables
5. Deploy!

**Cost:** $5-10/month

---

### **Option 3: Mobile App Deployment** 📱

#### For React Native/Expo:

**Option A: Expo Application Services (EAS) - RECOMMENDED**
```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android  # or ios
eas submit --platform android
```

**Option B: Build Locally**
```bash
cd mobile
# Android
npm run android
# iOS (Mac only)
npm run ios
```

**Option C: Expo Go (Development)**
```bash
cd mobile
npm start
# Scan QR code with Expo Go app
```

---

## 📝 Deployment Steps

### Step 1: Prepare Repository

```bash
# Make sure everything is committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy Backend First

1. **Railway:**
   - Connect GitHub repo
   - Set root directory: `backend`
   - Add PostgreSQL service
   - Add Redis service
   - Add environment variables
   - Deploy

2. **Get Backend URL:**
   - Copy the Railway URL (e.g., `https://your-app.railway.app`)

### Step 3: Deploy Frontend

1. **Vercel:**
   - Connect GitHub repo
   - Set root directory: `frontend`
   - Add environment variable:
     ```
     NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
     ```
   - Deploy

### Step 4: Update CORS in Backend

In Railway backend environment variables, add:
```
CORS_ORIGINS=["https://your-frontend.vercel.app"]
```

### Step 5: Run Database Migrations

```bash
# In Railway backend console or SSH:
cd backend
alembic upgrade head
```

### Step 6: Deploy Mobile App

```bash
cd mobile
# Update API URL in config
# Build with EAS
eas build --platform android
```

---

## 🔧 Environment Variables Reference

### Backend (Railway/Render):
```bash
DATABASE_URL=<from postgres service>
REDIS_URL=<from redis service>
SECRET_KEY=<generate random string>
JWT_SECRET_KEY=<generate random string>
CORS_ORIGINS=["https://your-frontend.vercel.app"]
DEBUG=False
```

### Frontend (Vercel):
```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
```

### Mobile (EAS Build):
```bash
EXPO_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
```

---

## 🚨 Important Notes

1. ✅ **Commit everything** - It's a monorepo, all code should be together
2. ❌ **Never commit** `.env` files - Use platform environment variables
3. ✅ **Commit** `.env.example` files for reference
4. ✅ **Update CORS** to allow your frontend domain
5. ✅ **Run migrations** after deploying database
6. ✅ **Use HTTPS** - All platforms provide it automatically
7. ✅ **Set DEBUG=False** in production

---

## 📊 Recommended Architecture

```
┌─────────────────┐
│   Vercel (FREE) │  ← Frontend (Next.js)
└────────┬────────┘
         │ API Calls
         ↓
┌─────────────────┐
│ Railway ($5-10) │  ← Backend (FastAPI)
└────────┬────────┘
         │
    ┌────┴────┐
    ↓        ↓
┌────────┐ ┌────────┐
│Postgres│ │ Redis  │
└────────┘ └────────┘
```

---

## 🎯 Quick Start Commands

```bash
# 1. Commit everything
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Deploy backend on Railway
# - Go to railway.app
# - Connect GitHub repo
# - Set root: backend/
# - Add services: PostgreSQL, Redis
# - Add env vars
# - Deploy

# 3. Deploy frontend on Vercel
# - Go to vercel.com
# - Connect GitHub repo
# - Set root: frontend/
# - Add NEXT_PUBLIC_API_URL
# - Deploy

# 4. Build mobile app
cd mobile
eas build --platform android
```

---

## 💰 Cost Summary

| Service | Platform | Cost |
|---------|----------|------|
| Frontend | Vercel | **FREE** |
| Backend | Railway | $5-10/month |
| Database | Railway | Included |
| Redis | Railway | Included |
| Mobile Build | EAS | FREE (limited) or $29/month |
| **Total** | | **$5-10/month** |

---

## ✅ Final Checklist Before Deploying

- [ ] All code committed to Git
- [ ] `.env` files are in `.gitignore`
- [ ] `.env.example` files created
- [ ] Backend builds successfully locally
- [ ] Frontend builds successfully locally
- [ ] Database migrations ready
- [ ] CORS configured for frontend domain
- [ ] Environment variables documented
- [ ] API URLs updated in frontend/mobile configs

---

**Ready to deploy? Start with Railway for backend, then Vercel for frontend!** 🚀
