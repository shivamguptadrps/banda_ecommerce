# 🚀 Quick Cloudinary Setup

## Your Credentials
- **Cloud Name**: `dycawfrr8` ✅ (Already set in .env.local)
- **Upload Preset**: `banda_products_unsigned` (You need to create this!)

## ⚡ Quick Steps (5 minutes)

### Step 1: Create Upload Preset

1. **Go to Cloudinary Dashboard**: https://console.cloudinary.com/settings/upload
2. **Scroll to "Upload presets"** section
3. **Click "Add upload preset"** button
4. **Fill in these settings**:
   ```
   Preset name: banda_products_unsigned
   Signing Mode: Unsigned ⚠️ (IMPORTANT!)
   Folder: banda_products
   Format: auto
   Quality: auto
   ```
5. **Click "Save"**

### Step 2: Verify .env.local

Your `.env.local` should have:
```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dycawfrr8
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=banda_products_unsigned
```

### Step 3: Restart Dev Server

```bash
# Stop your current server (Ctrl+C)
# Then restart:
cd frontend
npm run dev
```

### Step 4: Test Upload

1. Go to: http://localhost:3000/vendor/products/new
2. Open browser console (F12)
3. Try uploading an image
4. Check console for:
   - ✅ `🔧 Cloudinary Config:` should show both values
   - ✅ `✅ Cloudinary upload successful:` when upload completes
   - ❌ If you see errors, check the error message

## 🔍 Troubleshooting

### Error: "Upload preset not found"
- The preset name doesn't match
- Make sure preset is set to **"Unsigned"** mode
- Check spelling: `banda_products_unsigned`

### Error: "Cloudinary not configured"
- Restart your dev server after changing .env.local
- Check that variables start with `NEXT_PUBLIC_`
- Verify .env.local is in the `frontend` folder

### Images not showing in Cloudinary Media Library?
- Check the "Folder" setting in your preset
- Look in: Media Library → banda_products folder

## ✅ Success Indicators

When it's working, you'll see:
1. No "Demo Mode" warning on upload page
2. Console shows: `✅ Cloudinary upload successful: https://res.cloudinary.com/dycawfrr8/...`
3. Images appear in Cloudinary Media Library
4. Product images have URLs like: `https://res.cloudinary.com/dycawfrr8/image/upload/...`

## 🆘 Still Not Working?

Check browser console for specific error messages. Common issues:
- Preset name mismatch
- Preset is "Signed" instead of "Unsigned"
- Environment variables not loaded (restart server!)

