/**
 * Cloudinary Configuration and Upload Utilities
 * 
 * Cloudinary is used for free image hosting with:
 * - 25GB storage on free tier
 * - CDN delivery
 * - Image transformations (resize, crop, optimize)
 * 
 * Setup Instructions:
 * 1. Create a free account at https://cloudinary.com
 * 2. Get your cloud name from the dashboard
 * 3. Create an unsigned upload preset:
 *    - Go to Settings > Upload > Upload presets
 *    - Click "Add upload preset"
 *    - Set "Signing Mode" to "Unsigned"
 *    - Set a folder (e.g., "banda_products")
 *    - Save and copy the preset name
 * 4. Add to your .env.local:
 *    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset_name
 */

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * Get Cloudinary configuration
 */
export function getCloudinaryConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    console.warn(
      "Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local"
    );
  }

  return {
    cloudName: cloudName || "",
    uploadPreset: uploadPreset || "",
    uploadUrl: cloudName
      ? `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
      : "",
  };
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  return Boolean(cloudName && uploadPreset);
}

/**
 * Upload a single image to Cloudinary
 */
export async function uploadToCloudinary(
  file: File,
  options?: {
    folder?: string;
    onProgress?: (progress: UploadProgress) => void;
  }
): Promise<CloudinaryUploadResponse> {
  const { cloudName, uploadPreset, uploadUrl } = getCloudinaryConfig();

  console.log("🔧 Cloudinary Config:", { 
    cloudName: cloudName || "❌ NOT SET", 
    uploadPreset: uploadPreset || "❌ NOT SET",
    uploadUrl 
  });

  if (!cloudName || !uploadPreset) {
    const missing = [];
    if (!cloudName) missing.push("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
    if (!uploadPreset) missing.push("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET");
    throw new Error(
      `Cloudinary not configured. Missing: ${missing.join(", ")}. Please check your .env.local file and restart the dev server.`
    );
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: JPG, PNG, WebP, GIF");
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File too large. Maximum size is 10MB");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  if (options?.folder) {
    formData.append("folder", options.folder);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", uploadUrl);

    // Track upload progress
    if (options?.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          options.onProgress!({
            loaded: event.loaded,
            total: event.total,
            percent: Math.round((event.loaded / event.total) * 100),
          });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log("✅ Cloudinary upload successful:", response.secure_url);
          resolve(response);
        } catch (error) {
          console.error("❌ Failed to parse Cloudinary response:", xhr.responseText);
          reject(new Error("Failed to parse Cloudinary response"));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          console.error("❌ Cloudinary upload error:", error);
          
          // Provide helpful error messages
          let errorMessage = error.error?.message || error.message || "Upload failed";
          
          if (errorMessage.includes("Upload preset") || errorMessage.includes("preset")) {
            errorMessage = `Upload preset "${uploadPreset}" not found. Please create it in Cloudinary dashboard:
1. Go to https://console.cloudinary.com/settings/upload
2. Click "Add upload preset"
3. Set name to: ${uploadPreset}
4. Set "Signing Mode" to "Unsigned"
5. Save and restart your dev server`;
          }
          
          reject(new Error(errorMessage));
        } catch {
          console.error("❌ Cloudinary upload failed - Status:", xhr.status, "Response:", xhr.responseText);
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    xhr.send(formData);
  });
}

/**
 * Upload multiple images to Cloudinary
 */
export async function uploadMultipleToCloudinary(
  files: File[],
  options?: {
    folder?: string;
    onProgress?: (index: number, progress: UploadProgress) => void;
    onComplete?: (index: number, result: CloudinaryUploadResponse) => void;
  }
): Promise<CloudinaryUploadResponse[]> {
  const results: CloudinaryUploadResponse[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await uploadToCloudinary(files[i], {
      folder: options?.folder,
      onProgress: (progress) => options?.onProgress?.(i, progress),
    });
    results.push(result);
    options?.onComplete?.(i, result);
  }

  return results;
}

/**
 * Generate Cloudinary transformation URL
 */
export function getTransformedUrl(
  url: string,
  transformations: {
    width?: number;
    height?: number;
    crop?: "fill" | "fit" | "scale" | "thumb";
    quality?: number | "auto";
    format?: "auto" | "webp" | "jpg" | "png";
  }
): string {
  const { cloudName } = getCloudinaryConfig();
  if (!cloudName || !url.includes("cloudinary.com")) {
    return url;
  }

  const parts: string[] = [];

  if (transformations.width) {
    parts.push(`w_${transformations.width}`);
  }
  if (transformations.height) {
    parts.push(`h_${transformations.height}`);
  }
  if (transformations.crop) {
    parts.push(`c_${transformations.crop}`);
  }
  if (transformations.quality) {
    parts.push(`q_${transformations.quality}`);
  }
  if (transformations.format) {
    parts.push(`f_${transformations.format}`);
  }

  if (parts.length === 0) {
    return url;
  }

  const transformation = parts.join(",");

  // Insert transformation into URL
  // From: https://res.cloudinary.com/cloud/image/upload/public_id
  // To: https://res.cloudinary.com/cloud/image/upload/w_300,h_300,c_fill/public_id
  return url.replace("/upload/", `/upload/${transformation}/`);
}

/**
 * Delete an image from Cloudinary (requires server-side implementation)
 * This would need to be called via your backend API
 */
export function getPublicIdFromUrl(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
}

