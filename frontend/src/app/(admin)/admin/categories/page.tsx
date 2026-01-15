"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderTree,
  GripVertical,
  RefreshCw,
  X,
  Link as LinkIcon,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Input, Modal, ModalFooter } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import {
  useGetAdminCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from "@/store/api/adminApi";
import { useUploadProductImagesMutation } from "@/store/api/uploadApi";
import { Category } from "@/types";

/**
 * Category Tree Item Component
 */
function CategoryTreeItem({
  category,
  allCategories,
  level = 0,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  category: Category;
  allCategories: Category[];
  level?: number;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(level === 0);
  
  // Find children
  const children = allCategories.filter(c => c.parent_id === category.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group",
          level > 0 && "ml-6"
        )}
      >
        {/* Drag Handle */}
        <GripVertical className="h-4 w-4 text-gray-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Category Info */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span
            className={cn(
              "font-medium truncate",
              category.is_active ? "text-gray-900" : "text-gray-400"
            )}
          >
            {category.name}
          </span>
          {!category.is_active && (
            <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full flex-shrink-0">
              Disabled
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleActive(category.id, !category.is_active)}
            className={cn(
              "p-1.5 rounded hover:bg-gray-200 transition-colors text-sm",
              category.is_active ? "text-warning" : "text-success"
            )}
            title={category.is_active ? "Disable" : "Enable"}
          >
            {category.is_active ? "Disable" : "Enable"}
          </button>
          <button
            onClick={() => onEdit(category)}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          >
            <Edit className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={() => onDelete(category.id)}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          >
            <Trash2 className="h-4 w-4 text-error" />
          </button>
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <CategoryTreeItem
                key={child.id}
                category={child}
                allCategories={allCategories}
                level={level + 1}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Add/Edit Category Modal
 */
function CategoryModal({
  category,
  categories,
  onClose,
  onSave,
  isLoading,
}: {
  category?: Category | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: { name: string; parent_id?: string; description?: string; image_url?: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(category?.name || "");
  const [parentId, setParentId] = useState(category?.parent_id || "");
  const [description, setDescription] = useState(category?.description || "");
  const [imageUrl, setImageUrl] = useState(category?.image_url || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(category?.image_url || null);
  const [uploadMode, setUploadMode] = useState<"url" | "upload">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!category;
  
  const [uploadProductImages, { isLoading: isUploading }] = useUploadProductImagesMutation();

  // Filter out the current category and its children from parent options
  const parentOptions = categories.filter(c => {
    if (!category) return true;
    if (c.id === category.id) return false;
    // Also exclude children of current category
    let parent = c;
    while (parent.parent_id) {
      if (parent.parent_id === category.id) return false;
      parent = categories.find(p => p.id === parent.parent_id) || parent;
      if (parent.parent_id === parent.id) break; // Prevent infinite loop
    }
    return true;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    let finalImageUrl = imageUrl;

    // If file is selected (create or edit), upload it first using the same API as product images
    if (imageFile) {
      try {
        const result = await uploadProductImages([imageFile]).unwrap();
        if (result.images && result.images.length > 0) {
          finalImageUrl = result.images[0].url;
          toast.success("Image uploaded successfully");
        } else {
          toast.error("Failed to get uploaded image URL");
          return;
        }
      } catch (error: any) {
        toast.error(error.data?.detail || "Failed to upload image");
        return;
      }
    }

    onSave({ 
      name: name.trim(), 
      parent_id: parentId || undefined,
      description: description.trim() || undefined,
      image_url: finalImageUrl || undefined,
    });
  };

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? "Edit Category" : "Add Category"} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0 pr-2">
          <Input
          label="Category Name"
          placeholder="Enter category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div>
          <label className="form-label">Parent Category (optional)</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">None (Root Category)</option>
            {parentOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Description (optional)</label>
          <textarea
            placeholder="Enter category description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Image Upload Section */}
        <div>
          <label className="form-label">Category Image/Logo (optional)</label>
          
          {/* Upload Mode Toggle - Only show for edit mode */}
          {isEdit && (
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setUploadMode("url")}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                  uploadMode === "url"
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                )}
              >
                <LinkIcon className="h-4 w-4 inline mr-2" />
                Image URL
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("upload")}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                  uploadMode === "upload"
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                )}
              >
                <Upload className="h-4 w-4 inline mr-2" />
                Upload File
              </button>
            </div>
          )}

          {/* Image URL Input - Show for both create and edit */}
          {(!isEdit || uploadMode === "url") && (
            <div className="space-y-3">
              <Input
                placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImagePreview(e.target.value || null);
                }}
              />
              {imagePreview && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={imagePreview}
                    alt="Category preview"
                    fill
                    className="object-cover"
                    onError={() => setImagePreview(null)}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* File Upload - Only for edit mode */}
          {uploadMode === "upload" && isEdit && (
            <div className="space-y-3">
              <label
                htmlFor="category-image-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
                </div>
                <input
                  id="category-image-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </label>
              {imagePreview && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={imagePreview}
                    alt="Category preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-100 bg-white px-6 py-4 -mx-6 -mb-6 mt-auto">
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isUploading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading || isUploading}>
              {isEdit ? "Save Changes" : "Add Category"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Admin Categories Page
 */
export default function AdminCategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Fetch categories from API
  const { data, isLoading, isFetching, refetch } = useGetAdminCategoriesQuery({ include_inactive: true });
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

  const categories = data?.items || [];

  // Filter root categories (no parent)
  const rootCategories = categories.filter(c => !c.parent_id);

  // Filter based on search
  const filteredCategories = searchQuery
    ? categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : rootCategories;

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? This will also disable all subcategories.")) {
      return;
    }

    try {
      await deleteCategory(id).unwrap();
      toast.success("Category deleted");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to delete category");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateCategory({ id, data: { is_active: isActive } }).unwrap();
      toast.success(isActive ? "Category enabled" : "Category disabled");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to update category");
    }
  };

  const handleSave = async (data: { name: string; parent_id?: string; description?: string; image_url?: string }) => {
    try {
      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, data }).unwrap();
        toast.success("Category updated");
      } else {
        await createCategory(data).unwrap();
        toast.success("Category created");
      }
      setShowModal(false);
      setEditingCategory(null);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to save category");
    }
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Categories" subtitle="Manage product categories" />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              leftIcon={<RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Refresh
            </Button>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => { setEditingCategory(null); setShowModal(true); }}
            >
              Add Category
            </Button>
          </div>
        </div>

        {/* Category Tree */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <Card>
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
              <FolderTree className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-gray-900">Category Tree</h2>
              <span className="text-sm text-gray-500 ml-auto">
                {categories.length} categories total
              </span>
            </div>

            {filteredCategories.length > 0 ? (
              <div className="space-y-1">
                {searchQuery ? (
                  // Show flat list when searching
                  filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                    >
                      <span className={cn(
                        "font-medium",
                        category.is_active ? "text-gray-900" : "text-gray-400"
                      )}>
                        {category.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {!category.is_active && (
                          <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                            Disabled
                          </span>
                        )}
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-1 rounded hover:bg-gray-200"
                        >
                          <Edit className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  // Show tree when not searching
                  filteredCategories.map((category) => (
                    <CategoryTreeItem
                      key={category.id}
                      category={category}
                      allCategories={categories}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderTree className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No categories found</p>
                <Button
                  className="mt-4"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => { setEditingCategory(null); setShowModal(true); }}
                >
                  Add First Category
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CategoryModal
          category={editingCategory}
          categories={categories}
          onClose={() => { setShowModal(false); setEditingCategory(null); }}
          onSave={handleSave}
          isLoading={isCreating || isUpdating}
        />
      )}
    </div>
  );
}
