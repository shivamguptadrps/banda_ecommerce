# ✅ Vercel Setup - Fix Build Error

## Problem
Vercel can't detect Next.js even though `frontend/package.json` has Next.js.

## ✅ Solution

### **Step 1: Set Root Directory in Vercel Dashboard**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project: `banda-ecommerce`
3. Go to **Settings** → **General**
4. Find **Root Directory**
5. Click **Edit**
6. Enter: `frontend`
7. Click **Save**

### **Step 2: Update Build Settings**

1. Still in Settings → **Build & Development Settings**
2. Set:
   - **Framework Preset:** `Next.js` (should auto-detect)
   - **Root Directory:** `frontend`
   - **Build Command:** Leave as default (or `npm run build`)
   - **Output Directory:** Leave as default (or `.next`)
   - **Install Command:** Leave as default (or `npm install`)

### **Step 3: Delete vercel.json**

I've removed the root `vercel.json` file. When Root Directory is set in dashboard, you don't need it.

### **Step 4: Redeploy**

1. Go to **Deployments** tab
2. Click **Redeploy** on latest deployment
3. Or push a new commit

---

## ✅ What Changed

- ❌ Removed root `vercel.json` (was causing conflicts)
- ✅ Root Directory must be set to `frontend` in dashboard
- ✅ Build commands should be default (no `cd frontend` needed)

---

## 🎯 Key Point

**When Root Directory = `frontend`:**
- Vercel automatically changes working directory to `frontend/`
- Build commands run from `frontend/` folder
- Don't use `cd frontend` in build commands
- Use default commands: `npm install` and `npm run build`

---

**After setting Root Directory to `frontend` in dashboard, it should work!** 🚀
