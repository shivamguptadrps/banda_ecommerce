# Creating App Icons for Banda Baazar

## Quick Method (Using Online Tools)

1. Go to https://www.appicon.co/ or https://icon.kitchen/
2. Upload the logo SVG from `assets/logo.svg`
3. Generate icons for Android (512x512 for icon, 1024x1024 for adaptive-icon)
4. Download and place in `mobile/assets/`:
   - `icon.png` (512x512)
   - `adaptive-icon.png` (1024x1024)
   - `splash.png` (1242x2436)

## Manual Method (Using ImageMagick)

If you have ImageMagick installed:

```bash
# Convert SVG to PNG icons
convert -background none -size 512x512 assets/logo.svg assets/icon.png
convert -background none -size 1024x1024 assets/logo.svg assets/adaptive-icon.png

# Create splash screen (logo centered on gradient background)
convert -size 1242x2436 xc:"#7B2D8E" assets/logo.svg -gravity center -composite assets/splash.png
```

## Temporary Placeholder

For now, the app will work without icon files, but you should add them before production release.
