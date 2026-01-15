# 🔧 Git Commands for Deployment

## 📋 **Complete Git Workflow**

### **Step 1: Check Current Status**
```bash
cd c:\Users\shiva\OneDrive\Desktop\projects\banda_ecommerce
git status
```

### **Step 2: Initialize Repository (if not already done)**
```bash
git init
```

### **Step 3: Add All Files**
```bash
# Add all files (respects .gitignore)
git add .

# Or add specific directories
git add frontend/
git add backend/
git add mobile/
git add .
```

### **Step 4: Commit Changes**
```bash
git commit -m "Initial commit - Ready for deployment"
```

### **Step 5: Add Remote Repository**
```bash
# If you haven't added remote yet
git remote add origin git@github.com:shivamguptadrps/banda_ecommerce.git

# Or with HTTPS
git remote add origin https://github.com/shivamguptadrps/banda_ecommerce.git

# Check remote
git remote -v
```

### **Step 6: Push to GitHub**
```bash
# First push
git push -u origin main

# Or if your branch is called 'master'
git push -u origin master

# Future pushes
git push
```

---

## 🚀 **Quick One-Liner Commands**

### **Complete Setup (First Time)**
```bash
cd c:\Users\shiva\OneDrive\Desktop\projects\banda_ecommerce
git init
git add .
git commit -m "Initial commit - Ready for deployment"
git branch -M main
git remote add origin git@github.com:shivamguptadrps/banda_ecommerce.git
git push -u origin main
```

### **Daily Workflow (After Changes)**
```bash
cd c:\Users\shiva\OneDrive\Desktop\projects\banda_ecommerce
git add .
git commit -m "Your commit message here"
git push
```

---

## 📝 **Common Git Commands**

### **Check Status**
```bash
git status                    # See what's changed
git log                       # See commit history
git log --oneline            # Compact log view
```

### **Add Files**
```bash
git add .                     # Add all files
git add frontend/            # Add specific folder
git add file.txt             # Add specific file
```

### **Commit**
```bash
git commit -m "Message"       # Commit with message
git commit -am "Message"      # Add and commit in one step
```

### **Push/Pull**
```bash
git push                      # Push to remote
git push origin main          # Push to specific branch
git pull                      # Pull latest changes
```

### **Branch Management**
```bash
git branch                    # List branches
git branch -M main           # Rename current branch to main
git checkout -b new-branch   # Create and switch to new branch
```

### **Remote Management**
```bash
git remote -v                 # Show remotes
git remote add origin <url>  # Add remote
git remote remove origin      # Remove remote
```

---

## 🔍 **Useful Commands**

### **See What Will Be Committed**
```bash
git status                    # Overview
git diff                      # See changes in detail
git diff --staged            # See staged changes
```

### **Undo Changes**
```bash
git restore file.txt         # Discard changes to file
git restore .                # Discard all changes
git reset HEAD file.txt      # Unstage file
git reset --soft HEAD~1      # Undo last commit (keep changes)
```

### **Check Configuration**
```bash
git config --global --list    # See all config
git config user.name          # See username
git config user.email         # See email
```

---

## 🎯 **Deployment Workflow**

### **Before Deployment:**
```bash
# 1. Check status
git status

# 2. Add all changes
git add .

# 3. Commit
git commit -m "Ready for deployment - Vercel config fixed"

# 4. Push
git push
```

### **After Deployment:**
```bash
# If you need to make fixes
git add .
git commit -m "Fix: Updated Vercel configuration"
git push
```

---

## ⚠️ **Important Notes**

1. **Never commit:**
   - `.env` files
   - `node_modules/`
   - `.next/`, `build/`, `dist/`
   - Log files

2. **Always commit:**
   - Source code
   - Configuration files (except .env)
   - Documentation
   - `package.json`, `requirements.txt`

3. **Check before committing:**
   ```bash
   git status
   git diff
   ```

---

## 🚨 **Troubleshooting**

### **If push fails:**
```bash
# Pull latest first
git pull origin main

# Resolve conflicts if any
# Then push again
git push
```

### **If remote already exists:**
```bash
# Check current remote
git remote -v

# Update remote URL
git remote set-url origin git@github.com:shivamguptadrps/banda_ecommerce.git
```

### **If branch name is different:**
```bash
# Check current branch
git branch

# Rename to main
git branch -M main

# Push
git push -u origin main
```

---

## ✅ **Complete Deployment Command Sequence**

```bash
# Navigate to project
cd c:\Users\shiva\OneDrive\Desktop\projects\banda_ecommerce

# Check status
git status

# Add everything
git add .

# Commit
git commit -m "Ready for deployment - All changes committed"

# Push to GitHub
git push origin main

# Verify
git log --oneline -5
```

---

**Ready to deploy!** 🚀
