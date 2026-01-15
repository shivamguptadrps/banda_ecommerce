# 🔧 Fix "Upload preset not found" Error

## Current Configuration
- **Cloud Name**: `dycawfrr8` ✅
- **Upload Preset**: `banda_products_unsigned` ❌ (Not found)

## Quick Fix Steps

### Step 1: Check Existing Presets
1. Go to: https://console.cloudinary.com/settings/upload
2. Scroll to **"Upload presets"** section
3. Check what presets you have:
   - Look for any preset with "unsigned" in the name
   - Or check if you have a default preset

### Step 2: Create the Preset (if it doesn't exist)

**Option A: Create with exact name `banda_products_unsigned`**
1. Click **"Add upload preset"**
2. **Preset name**: `banda_products_unsigned` (must match exactly)
3. **Signing Mode**: Select **"Unsigned"** ⚠️ (IMPORTANT!)
4. **Folder**: `banda_products` (optional)
5. **Format**: `auto`
6. **Quality**: `auto`
7. Click **"Save"**

**Option B: Use an existing preset**
If you already have an unsigned preset, update `.env.local`:
```bash
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_existing_preset_name
```

### Step 3: Restart Dev Server
After creating/updating the preset:
```bash
# Stop your dev server (Ctrl+C)
cd frontend
npm run dev
```

### Step 4: Verify
1. Open browser console (F12)
2. Try uploading an image
3. Check console for:
   - ✅ `🔧 Cloudinary Config:` should show both values
   - ✅ `✅ Cloudinary upload successful:` when upload works
   - ❌ If still error, check the exact preset name

## Common Issues

### Issue: "Upload preset not found"
**Solution**: 
- Preset name must match EXACTLY (case-sensitive)
- Preset must be set to **"Unsigned"** mode
- Restart dev server after changing `.env.local`

### Issue: "Invalid API key"
**Solution**: 
- You're using signed uploads (wrong!)
- Change preset to **"Unsigned"** mode

### Issue: Preset exists but still error
**Solution**:
1. Check preset name spelling (case-sensitive)
2. Verify preset is "Unsigned"
3. Clear browser cache
4. Restart dev server

## Alternative: Use Default Preset

If you want to use Cloudinary's default unsigned preset, you can try:
```bash
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ml_default
```

But it's better to create your own preset for better control.

## Still Not Working?

1. **Check Cloudinary Dashboard**:
   - Go to Media Library
   - See if images are being uploaded there (even with error)

2. **Check Browser Console**:
   - Look for the exact error message
   - Check the `🔧 Cloudinary Config:` log

3. **Verify Preset Settings**:
   - Must be "Unsigned"
   - Must not have restrictions that block uploads

