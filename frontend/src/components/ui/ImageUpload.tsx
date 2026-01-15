"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Star, ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "./Button";
import { cn } from "@/lib/utils";
import { useUploadProductImagesMutation } from "@/store/api/uploadApi";

export interface UploadedImage {
  id: string;
  url: string;
  publicId?: string;
  isPrimary: boolean;
  isUploading?: boolean;
  progress?: number;
  error?: string;
  file?: File;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])) => void;
  maxImages?: number;
  minImages?: number;
  folder?: string;
  showPrimaryBadge?: boolean;
  aspectRatio?: "square" | "portrait" | "landscape" | "auto";
  className?: string;
  disabled?: boolean;
}

/**
 * ImageUpload Component
 * 
 * Multi-image upload with drag-drop, preview, reordering, and primary selection.
 * Uses Cloudinary for cloud storage.
 */
export function ImageUpload({
  images,
  onChange,
  maxImages = 5,
  minImages = 1,
  folder = "banda_products",
  showPrimaryBadge = true,
  aspectRatio = "square",
  className,
  disabled = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const [uploadProductImages, { isLoading: isUploading }] = useUploadProductImagesMutation();

  const aspectRatioClasses = {
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    landscape: "aspect-[4/3]",
    auto: "",
  };

  // Generate unique ID for new images
  const generateId = () => `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle file selection
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled || isUploading) return;

      const fileArray = Array.from(files);
      const remainingSlots = maxImages - images.length;
      const filesToUpload = fileArray.slice(0, remainingSlots);

      if (filesToUpload.length === 0) return;

      // Create uploading state images with local preview
      const uploadingImages: UploadedImage[] = filesToUpload.map((file, index) => {
        const imgId = generateId();
        return {
          id: imgId,
          url: URL.createObjectURL(file), // Local preview
          isPrimary: images.length === 0 && index === 0,
          isUploading: true,
          progress: 10,
          file,
        };
      });

      const newImages = [...images, ...uploadingImages];
      onChange(newImages);

      // Upload all files at once using backend API
      try {
        const result = await uploadProductImages(filesToUpload).unwrap();

        // Update each image with the uploaded URL
        const updatedImages = newImages.map((item) => {
          const uploadingImg = uploadingImages.find((img) => img.id === item.id);
          if (uploadingImg) {
            const index = uploadingImages.indexOf(uploadingImg);
            const uploadedImage = result.images[index];
            if (uploadedImage) {
              // Clean up local preview URL
              if (item.url.startsWith("blob:")) {
                URL.revokeObjectURL(item.url);
              }
              return {
                ...item,
                url: uploadedImage.url,
                publicId: uploadedImage.public_id,
                isUploading: false,
                progress: 100,
                error: undefined,
              };
            } else {
              // Upload failed for this image
              return {
                ...item,
                isUploading: false,
                error: "Upload failed",
              };
            }
          }
          return item;
        });
        
        onChange(updatedImages);
      } catch (error: any) {
        // Handle upload errors
        const errorImages = newImages.map((item) => {
          const uploadingImg = uploadingImages.find((img) => img.id === item.id);
          if (uploadingImg) {
            // Clean up local preview URL
            if (item.url.startsWith("blob:")) {
              URL.revokeObjectURL(item.url);
            }
            return {
              ...item,
              isUploading: false,
              error: error?.message || "Upload failed",
            };
          }
          return item;
        });
        onChange(errorImages);
      }
  }, [images, uploadProductImages, onChange]);

  // Cancel upload
  const cancelUpload = useCallback((imageId: string) => {
    const updated = images.map((item) => {
      if (item.id === imageId && item.isUploading) {
        // Clean up local preview URL
        if (item.url.startsWith("blob:")) {
          URL.revokeObjectURL(item.url);
        }
        return {
          ...item,
          isUploading: false,
          error: "Upload cancelled",
        };
      }
      return item;
    });
    // Remove the cancelled image
    const filtered = updated.filter((item) => item.id !== imageId || (!item.isUploading && !item.error));
    onChange(filtered);
  }, [images, onChange]);

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files?.length) {
      handleFiles(files);
    }
  };

  // Remove image
  const removeImage = (id: string) => {
    if (disabled) return;

    const imageToRemove = images.find((img) => img.id === id);
    const newImages = images.filter((img) => img.id !== id);

    // If removed image was primary, make first image primary
    if (imageToRemove?.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    // Revoke object URL if it's a local preview
    if (imageToRemove?.url.startsWith("blob:")) {
      URL.revokeObjectURL(imageToRemove.url);
    }

    onChange(newImages);
  };

  // Set primary image
  const setPrimary = (id: string) => {
    if (disabled) return;

    onChange(
      images.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      }))
    );
  };

  // Retry failed upload
  const retryUpload = async (id: string) => {
    const image = images.find((img) => img.id === id);
    if (!image?.file) return;

    onChange(
      images.map((img) =>
        img.id === id
          ? { ...img, isUploading: true, error: undefined, progress: 10 }
          : img
      )
    );

    try {
      const result = await uploadProductImages([image.file]).unwrap();
      const uploadedImage = result.images[0];

      if (uploadedImage) {
        const updated = images.map((item) => {
          if (item.id === id) {
            // Clean up local preview URL
            if (item.url.startsWith("blob:")) {
              URL.revokeObjectURL(item.url);
            }
            return {
              ...item,
              url: uploadedImage.url,
              publicId: uploadedImage.public_id,
              isUploading: false,
              progress: 100,
              error: undefined,
            };
          }
          return item;
        });
        onChange(updated);
      } else {
        throw new Error("No response from server");
      }
    } catch (error: any) {
      const errorImages = images.map((item) =>
        item.id === id
          ? {
              ...item,
              isUploading: false,
              error: error?.data?.detail || error?.message || "Upload failed",
            }
          : item
      );
      onChange(errorImages);
    }
  };

  const canAddMore = images.length < maxImages;
  const hasMinImages = images.length >= minImages;

  return (
    <div className={cn("space-y-4", className)}>

      {/* Upload Zone */}
      {canAddMore && (
        <label
          htmlFor="image-upload-input"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors block",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-gray-300 bg-gray-50",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <input
            id="image-upload-input"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files);
                // Reset input to allow selecting the same file again
                e.target.value = "";
              }
            }}
            className="hidden"
            disabled={disabled}
          />

          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-gray-700">
                Drop images here or click to upload
              </p>
              <p className="text-sm text-gray-500 mt-1">
                JPG, PNG, WebP, GIF • Max 10MB each
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>
                {images.length} / {maxImages} images
              </span>
              {minImages > 0 && (
                <>
                  <span>•</span>
                  <span>Min {minImages} required</span>
                </>
              )}
            </div>
          </div>
        </label>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={cn(
                  "relative group rounded-xl overflow-hidden bg-gray-100 border-2",
                  image.isPrimary ? "border-primary" : "border-transparent",
                  image.error && "border-error",
                  aspectRatioClasses[aspectRatio]
                )}
              >
                {/* Image */}
                <img
                  src={image.url}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Upload Progress Overlay */}
                {image.isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                    <span className="text-white text-sm mt-2">
                      Uploading...
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => cancelUpload(image.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Error Overlay */}
                {image.error && (
                  <div className="absolute inset-0 bg-error/80 flex flex-col items-center justify-center p-4">
                    <AlertCircle className="h-8 w-8 text-white" />
                    <p className="text-white text-xs mt-2 text-center">
                      {image.error}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => retryUpload(image.id)}
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {/* Hover Overlay with Actions */}
                {!image.isUploading && !image.error && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {/* Set Primary Button */}
                    {!image.isPrimary && showPrimaryBadge && (
                      <button
                        type="button"
                        onClick={() => setPrimary(image.id)}
                        className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                        title="Set as primary"
                        disabled={disabled}
                      >
                        <Star className="h-4 w-4 text-gray-700" />
                      </button>
                    )}

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                      title="Remove image"
                      disabled={disabled}
                    >
                      <X className="h-4 w-4 text-error" />
                    </button>
                  </div>
                )}

                {/* Primary Badge */}
                {image.isPrimary && showPrimaryBadge && (
                  <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Primary
                  </div>
                )}

                {/* Order Badge */}
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
                  {index + 1}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Helper Text */}
      {images.length > 0 && (
        <p className="text-xs text-gray-500">
          {showPrimaryBadge && (
            <>
              Click <Star className="h-3 w-3 inline" /> to set primary image.{" "}
            </>
          )}
          First image will be shown as thumbnail.
        </p>
      )}

      {/* Validation */}
      {!hasMinImages && images.length > 0 && (
        <p className="text-sm text-error">
          Please add at least {minImages} image{minImages > 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
}

