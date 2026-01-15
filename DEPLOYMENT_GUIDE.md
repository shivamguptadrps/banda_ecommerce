# 🚀 Deployment Guide - Easy & Cheap Solutions

## Quick Summary

| Service | Recommended Platform | Cost | Difficulty |
|---------|---------------------|------|------------|
| **Next.js Frontend** | Vercel | FREE | ⭐ Easy |
| **FastAPI Backend** | Railway / Render | $5-10/mo | ⭐⭐ Medium |
| **PostgreSQL** | Railway / Supabase | FREE-$5/mo | ⭐ Easy |
| **Redis** | Upstash / Railway | FREE-$5/mo | ⭐ Easy |

---

## 🎯 Option 1: Railway (EASIEST - All-in-One) ⭐⭐⭐

**Best for:** Quick deployment, everything in one place  
**Cost:** ~$5-10/month (free tier available)

### Steps:

1. **Sign up at [railway.app](https://railway.app)** (free tier available)

2. **Deploy PostgreSQL:**
   - Click "New Project" → "New Database" → "PostgreSQL"
   - Copy connection string

3. **Deploy Redis:**
   - Click "New" → "Database" → "Redis"
   - Copy connection string

4. **Deploy Backend (FastAPI):**
   ```bash
   # In Railway dashboard:
   - Click "New" → "GitHub Repo"
   - Select your repo
   - Set root directory: backend/
   - Add environment variables:
     DATABASE_URL=<from postgres>
     REDIS_URL=<from redis>
     SECRET_KEY=<generate random>
     JWT_SECRET_KEY=<generate random>
   - Railway auto-detects Python and deploys
   ```

5. **Deploy Frontend (Next.js):**
   ```bash
   # In Railway dashboard:
   - Click "New" → "GitHub Repo"
   - Select your repo
   - Set root directory: frontend/
   - Add environment variable:
     NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
   - Railway auto-detects Next.js and deploys
   ```

**Total Cost:** ~$5-10/month (or FREE on free tier with limits)

---

## 🎯 Option 2: Vercel + Railway/Render (BEST VALUE) ⭐⭐⭐

**Best for:** Free frontend, cheap backend  
**Cost:** FREE (frontend) + $5-10/month (backend)

### Frontend on Vercel (FREE):

1. **Sign up at [vercel.com](https://vercel.com)**

2. **Deploy:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # In frontend directory
   cd frontend
   vercel
   
   # Or connect GitHub repo in Vercel dashboard
   ```

3. **Add Environment Variable:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com/api/v1
   ```

### Backend on Railway/Render:

**Railway:** Follow Option 1 steps above  
**OR Render:** [render.com](https://render.com) - similar process

**Total Cost:** FREE (frontend) + $5-10/month (backend + DB)

---

## 🎯 Option 3: Docker Compose on VPS (CHEAPEST) ⭐⭐

**Best for:** Full control, cheapest long-term  
**Cost:** $5-10/month (VPS)

### Steps:

1. **Get a VPS:**
   - [DigitalOcean](https://digitalocean.com) - $6/month
   - [Linode](https://linode.com) - $5/month
   - [Hetzner](https://hetzner.com) - €4/month

2. **SSH into server:**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

4. **Clone your repo:**
   ```bash
   git clone https://github.com/yourusername/banda_ecommerce.git
   cd banda_ecommerce/backend
   ```

5. **Create production docker-compose.yml:**
   ```yaml
   version: '3.8'
   
   services:
     db:
       image: postgres:15-alpine
       environment:
         POSTGRES_USER: myuser
         POSTGRES_PASSWORD: ${DB_PASSWORD}
         POSTGRES_DB: banda_ecommerce
       volumes:
         - postgres_data:/var/lib/postgresql/data
       restart: always
     
     redis:
       image: redis:7-alpine
       volumes:
         - redis_data:/data
       restart: always
     
     api:
       build: .
       environment:
         - DATABASE_URL=postgresql://myuser:${DB_PASSWORD}@db:5432/banda_ecommerce
         - REDIS_URL=redis://redis:6379/0
         - DEBUG=False
       ports:
         - "8000:8000"
       depends_on:
         - db
         - redis
       restart: always
   
   volumes:
     postgres_data:
     redis_data:
   ```

6. **Deploy:**
   ```bash
   # Create .env file
   echo "DB_PASSWORD=your-secure-password" > .env
   
   # Build and start
   docker-compose up -d
   
   # Run migrations
   docker-compose exec api alembic upgrade head
   ```

7. **Setup Nginx (reverse proxy):**
   ```bash
   sudo apt install nginx
   
   # Create /etc/nginx/sites-available/banda
   # Add reverse proxy config
   sudo ln -s /etc/nginx/sites-available/banda /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

8. **Deploy Frontend separately:**
   - Use Vercel (FREE) or build static and serve with Nginx

**Total Cost:** $5-10/month (VPS only)

---

## 🎯 Option 4: Render (FREE TIER AVAILABLE) ⭐⭐

**Best for:** Free tier testing  
**Cost:** FREE (with limits) or $7/month

### Steps:

1. **Sign up at [render.com](https://render.com)**

2. **Deploy PostgreSQL:**
   - New → PostgreSQL
   - Free tier: 90 days, then $7/month

3. **Deploy Redis:**
   - New → Redis
   - Free tier: 25MB

4. **Deploy Backend:**
   - New → Web Service
   - Connect GitHub repo
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. **Deploy Frontend:**
   - New → Static Site
   - Connect GitHub repo
   - Root directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `.next`

**Total Cost:** FREE (90 days) or $7/month

---

## 📋 Pre-Deployment Checklist

### Backend Environment Variables:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_URL=redis://host:6379/0

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here

# CORS (add your frontend URL)
CORS_ORIGINS=["https://your-frontend.vercel.app"]

# Optional
DEBUG=False
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### Frontend Environment Variables:
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api/v1
```

---

## 🔧 Database Migration on Production

```bash
# SSH into server or use Railway/Render console
cd backend
alembic upgrade head

# Or with Docker:
docker-compose exec api alembic upgrade head
```

---

## 🎯 Recommended: Railway (Easiest)

**Why Railway?**
- ✅ One platform for everything
- ✅ Auto-deploys from GitHub
- ✅ Free tier available
- ✅ Easy environment variables
- ✅ Built-in PostgreSQL & Redis
- ✅ Automatic HTTPS

**Quick Start:**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub"
4. Select your repo
5. Add services (PostgreSQL, Redis, Backend, Frontend)
6. Done! 🎉

---

## 💰 Cost Comparison

| Solution | Monthly Cost | Difficulty | Best For |
|----------|-------------|------------|----------|
| **Railway (All-in-One)** | $5-10 | ⭐ Easy | Quick deployment |
| **Vercel + Railway** | $5-10 | ⭐⭐ Medium | Best value |
| **VPS + Docker** | $5-10 | ⭐⭐⭐ Hard | Full control |
| **Render Free Tier** | FREE | ⭐⭐ Medium | Testing |

---

## 🚨 Important Notes

1. **Never commit `.env` files** - Use platform environment variables
2. **Run migrations** after deploying database
3. **Update CORS** to allow your frontend domain
4. **Use HTTPS** - Most platforms provide it automatically
5. **Set DEBUG=False** in production
6. **Backup database** regularly

---

## 📞 Need Help?

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs

---

**Recommended:** Start with **Railway** for easiest deployment! 🚀



