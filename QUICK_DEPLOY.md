# 🚀 Quick Deployment Guide

## ✅ YES - Commit Everything in One Repo!

This is a **monorepo** - all code (frontend, mobile, backend) should be committed together.

---

## 🎯 Recommended: Vercel + Railway (FREE + $5-10/month)

### Step 1: Commit Everything
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy Backend (Railway)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. New Project → Deploy from GitHub
4. Select your repo
5. Set root directory: `backend`
6. Add PostgreSQL service
7. Add Redis service
8. Add environment variables:
   ```
   DATABASE_URL=<from postgres>
   REDIS_URL=<from redis>
   SECRET_KEY=<random string>
   JWT_SECRET_KEY=<random string>
   CORS_ORIGINS=["https://your-frontend.vercel.app"]
   DEBUG=False
   ```
9. Copy backend URL (e.g., `https://your-app.railway.app`)

### Step 3: Deploy Frontend (Vercel)
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. New Project → Import Git Repository
4. Select your repo
5. Set root directory: `frontend`
6. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
   ```
7. Deploy!

### Step 4: Run Migrations
In Railway backend console:
```bash
cd backend
alembic upgrade head
```

### Step 5: Update CORS
In Railway backend env vars, update:
```
CORS_ORIGINS=["https://your-frontend.vercel.app"]
```

---

## 📱 Mobile App Deployment

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
```

---

## ✅ Pre-Deployment Checklist

- [ ] All code committed
- [ ] `.env` files in `.gitignore` (✅ already done)
- [ ] Backend builds locally
- [ ] Frontend builds locally
- [ ] Database migrations ready
- [ ] Environment variables documented

---

## 💰 Cost: $5-10/month

- Frontend: **FREE** (Vercel)
- Backend + DB: **$5-10/month** (Railway)

---

**That's it! Your app will be live in ~15 minutes!** 🎉
