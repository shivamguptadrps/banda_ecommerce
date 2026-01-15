# Category Image Fetcher Script

This script fetches images from Unsplash and uploads them to Cloudinary for all categories in `tem.json`.

## Setup

### 1. Cloudinary Credentials

You need 3 values from your Cloudinary dashboard (https://console.cloudinary.com/settings/api):
- **Cloud Name**: Your cloud name (e.g., `dycawfrr8`)
- **API Key**: Your API key
- **API Secret**: Your API secret

**Note**: The "application ID" you provided (856736) might not be the cloud name. Please check your Cloudinary dashboard for the correct values.

### 2. Unsplash API Key (Optional)

- Get a free API key from: https://unsplash.com/developers
- Free tier: 50 requests/hour
- If not provided, the script will use direct Unsplash image URLs (no API needed, but lower quality)

### 3. Set Environment Variables

```bash
export CLOUDINARY_CLOUD_NAME="your_cloud_name"
export CLOUDINARY_API_KEY="your_api_key"
export CLOUDINARY_API_SECRET="your_api_secret"
export UNSPLASH_ACCESS_KEY="your_unsplash_key"  # Optional
```

Or the script will prompt you for missing values.

## Usage

```bash
cd backend
python scripts/fetch_category_images.py
```

## What It Does

1. **Reads** `tem.json` from project root
2. **Iterates** through all 3 levels of categories
3. **Fetches** 3-4 images from Unsplash for each category
4. **Uploads** the best image to Cloudinary
5. **Updates** JSON with `image_url` field
6. **Saves** updated JSON to `tem_with_images.json`

## Output

- **Input**: `tem.json` (original file, not modified)
- **Output**: `tem_with_images.json` (new file with image URLs)

## Rate Limiting

- Unsplash: 0.5 seconds between requests
- Cloudinary: 0.2 seconds between uploads
- Respects API limits to avoid errors

## Example Output

```json
{
  "categories": [
    {
      "name": "Fresh Fruits & Vegetables",
      "slug": "fresh-fruits-vegetables",
      "image_url": "https://res.cloudinary.com/856736/image/upload/v1234567890/banda_categories/level1/fresh_fruits_vegetables.jpg",
      "children": [
        {
          "name": "Fresh Fruits",
          "image_url": "https://res.cloudinary.com/856736/image/upload/v1234567890/banda_categories/level2/fresh_fruits.jpg",
          ...
        }
      ]
    }
  ]
}
```

## Troubleshooting

### "Cloudinary API Secret not found"
- Set `CLOUDINARY_API_SECRET` environment variable
- Or provide it when prompted by the script

### "Failed to configure Cloudinary"
- Verify your credentials in Cloudinary dashboard
- Make sure Cloud Name, API Key, and API Secret are correct

### "Failed to fetch images"
- Check internet connection
- If using Unsplash API, verify your API key
- Script will fallback to direct Unsplash URLs if API fails

### Images not uploading
- Check Cloudinary dashboard for upload errors
- Verify API credentials are correct
- Check Cloudinary account limits

## Notes

- Images are optimized: 400x400px, auto quality, auto format
- Images are stored in Cloudinary folder: `banda_categories/`
- Each category gets a unique public_id based on name and level
- Script skips categories that already have `image_url`

