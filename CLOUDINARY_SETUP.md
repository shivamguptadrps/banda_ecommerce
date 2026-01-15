# Cloudinary Setup Guide

## Your Cloudinary Credentials

- **Cloud Name**: `dycawfrr8`
- **API Key**: `642372773979262`
- **API Secret**: `53xFmONoHxrtL0fFVwrU3NvJbdo`

## Step-by-Step Setup

### 1. Create an Unsigned Upload Preset

1. Go to https://console.cloudinary.com/settings/upload
2. Scroll down to **"Upload presets"** section
3. Click **"Add upload preset"** button
4. Configure the preset:
   - **Preset name**: `banda_products_unsigned` (or any name you prefer)
   - **Signing Mode**: Select **"Unsigned"** (IMPORTANT!)
   - **Folder**: `banda_products` (optional, but recommended)
   - **Format**: `auto` (for automatic format conversion)
   - **Quality**: `auto` (for automatic optimization)
   - **Eager transformations**: (optional) You can add transformations here
5. Click **"Save"**

### 2. Set Environment Variables

Create or update `.env.local` in the `frontend` folder:

```bash
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dycawfrr8
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=banda_products_unsigned
```

**Important Notes:**
- The preset name must match exactly what you created in Cloudinary
- Use `NEXT_PUBLIC_` prefix so it's available in the browser
- Restart your Next.js dev server after adding/changing these variables

### 3. Verify Setup

1. Restart your Next.js dev server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Open browser console (F12) and check for:
   - ✅ `🔧 Cloudinary Config:` should show your cloud name and preset
   - ❌ If you see "NOT SET", the environment variables aren't loaded

3. Try uploading an image - you should see:
   - ✅ `✅ Cloudinary upload successful:` in console
   - The image URL should be from `res.cloudinary.com`

## Troubleshooting

### Images not uploading?

1. **Check browser console** for error messages
2. **Verify environment variables**:
   ```bash
   # In frontend folder, check if variables are loaded
   echo $NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
   ```
3. **Restart dev server** after changing .env.local
4. **Check Cloudinary dashboard**:
   - Go to Media Library
   - See if images are being uploaded there
5. **Verify preset is unsigned**:
   - Settings > Upload > Upload presets
   - Your preset should show "Unsigned" in signing mode

### Common Errors

- **"Upload preset not found"**: Preset name doesn't match or doesn't exist
- **"Invalid API key"**: You're using signed uploads (should be unsigned)
- **"Network error"**: Check internet connection or CORS settings

## Alternative: Use Signed Uploads (Backend)

If unsigned uploads don't work, we can implement signed uploads on the backend using your API credentials. Let me know if you want to go this route.

