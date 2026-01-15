"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  DollarSign,
  Layers,
  Settings,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Input, Spinner, ImageUpload, type UploadedImage } from "@/components/ui";
import { ROUTES } from "@/lib/constants";
import { useCreateProductMutation, useAddProductImagesBulkMutation } from "@/store/api/vendorProductApi";
import { useGetCategoryTreeQuery, useGetCategoryAttributesQuery } from "@/store/api/categoryApi";
import { useGetCategorySegmentsQuery } from "@/store/api/adminApi";
import { CategoryTreeNode, CategoryAttribute, AttributeType, AttributeSegmentWithAttributes } from "@/types";

// Stock unit options
const STOCK_UNITS = [
  { value: "piece", label: "Piece" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "liter", label: "Liter" },
  { value: "meter", label: "Meter" },
];

// Sell unit schema
const sellUnitSchema = z.object({
  label: z.string().min(1, "Label is required"),
  unit_value: z.coerce.number().min(0.001, "Must be greater than 0"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  compare_price: z.coerce.number().optional(),
});

// Main form schema
const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  stock_unit: z.string().min(1, "Stock unit is required"),
  initial_stock: z.coerce.number().min(0, "Stock cannot be negative").optional(),
  low_stock_threshold: z.coerce.number().min(0, "Threshold cannot be negative").optional(),
  sell_units: z.array(sellUnitSchema).min(1, "At least one sell unit is required"),
  // Return Policy (Required)
  return_eligible: z.boolean(),
  return_window_days: z.coerce.number().min(1).max(365).optional(),
  return_conditions: z.string().max(500).optional(),
}).refine((data) => {
  // If return_eligible is true, return_window_days is required
  if (data.return_eligible === true) {
    return data.return_window_days !== undefined && data.return_window_days > 0;
  }
  return true;
}, {
  message: "Return window is required when product is returnable",
  path: ["return_window_days"],
});

type ProductFormData = z.infer<typeof productSchema>;

/**
 * Attribute Input Component
 */
function AttributeInput({
  attribute,
  value,
  onChange,
}: {
  attribute: CategoryAttribute;
  value: string | string[];
  onChange: (val: string | string[]) => void;
}) {
  switch (attribute.attribute_type) {
    case "text":
      return (
        <input
          type="text"
          value={value as string || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${attribute.name}`}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      );

    case "number":
      return (
        <div className="flex gap-2">
          <input
            type="number"
            value={value as string || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${attribute.name}`}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {attribute.unit && (
            <span className="flex items-center px-3 bg-gray-100 rounded-lg text-sm text-gray-600">
              {attribute.unit}
            </span>
          )}
        </div>
      );

    case "boolean":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Yes</span>
        </label>
      );

    case "select":
      return (
        <select
          value={value as string || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">Select {attribute.name}</option>
          {attribute.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "multi_select":
      const selectedValues = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {attribute.options?.map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                selectedValues.includes(opt)
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(opt)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selectedValues, opt]);
                  } else {
                    onChange(selectedValues.filter((v) => v !== opt));
                  }
                }}
                className="sr-only"
              />
              <span className="text-sm">{opt}</span>
              {selectedValues.includes(opt) && <Check className="h-3.5 w-3.5" />}
            </label>
          ))}
        </div>
      );

    default:
      return null;
  }
}

/**
 * Category Selector Component with Tree Structure
 */
function CategorySelector({
  categories,
  selectedId,
  onSelect,
}: {
  categories: CategoryTreeNode[];
  selectedId?: string;
  onSelect: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const renderCategory = (node: CategoryTreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? "bg-primary/10 text-primary"
              : "hover:bg-gray-50 text-gray-700"
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <button
            type="button"
            onClick={() => onSelect(node.id, node.name)}
            className="flex-1 text-left text-sm"
          >
            {node.name}
          </button>
          {isSelected && <Check className="h-4 w-4 text-primary" />}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
      {categories.map((cat) => renderCategory(cat))}
    </div>
  );
}

/**
 * Add Product Page
 */
export default function AddProductPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [attributeValues, setAttributeValues] = useState<Record<string, string | string[]>>({});
  const [productImages, setProductImages] = useState<UploadedImage[]>([]);

  // API hooks
  const { data: categoryTree, isLoading: loadingCategories } = useGetCategoryTreeQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [addProductImages, { isLoading: isAddingImages }] = useAddProductImagesBulkMutation();

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category_id: "",
      stock_unit: "piece",
      initial_stock: 0,
      low_stock_threshold: 10,
      sell_units: [{ label: "", unit_value: 1, price: 0 }],
      return_eligible: false,
      return_window_days: undefined,
      return_conditions: "",
    },
  });

  const { fields: sellUnitFields, append: addSellUnit, remove: removeSellUnit } = useFieldArray({
    control,
    name: "sell_units",
  });

  const selectedCategoryId = watch("category_id");
  const stockUnit = watch("stock_unit");

  // Fetch attributes for selected category (public endpoint)
  const { data: attributesData, isLoading: loadingAttributes } = useGetCategoryAttributesQuery(
    selectedCategoryId!,
    { skip: !selectedCategoryId }
  );

  // Fetch segments for selected category
  const { data: segmentsData, isLoading: loadingSegments } = useGetCategorySegmentsQuery(
    { categoryId: selectedCategoryId!, withAttributes: true },
    { skip: !selectedCategoryId }
  );

  const categoryAttributes = attributesData?.items ?? [];
  const segments = segmentsData?.items ?? [];
  
  // Group attributes by segment
  const groupedAttributes = useMemo(() => {
    const grouped: Record<string, { segment: any | null; attributes: CategoryAttribute[] }> = {};
    
    // First, add attributes that belong to segments
    segments.forEach((segment: any) => {
      if (segment.attributes && segment.attributes.length > 0) {
        grouped[segment.id] = {
          segment: segment,
          attributes: segment.attributes || [],
        };
      }
    });
    
    // Then, add attributes without segments to a "General" group
    const attributesWithoutSegment = categoryAttributes.filter(
      (attr) => !attr.segment_id || !grouped[attr.segment_id]
    );
    
    if (attributesWithoutSegment.length > 0) {
      grouped["no-segment"] = {
        segment: null,
        attributes: attributesWithoutSegment,
      };
    }
    
    return grouped;
  }, [segments, categoryAttributes]);

  // Handle category selection
  const handleCategorySelect = (id: string, name: string) => {
    setValue("category_id", id);
    setSelectedCategoryName(name);
    setShowCategoryPicker(false);
    // Reset attribute values when category changes
    setAttributeValues({});
  };

  // Handle attribute value change
  const handleAttributeChange = (attributeId: string, value: string | string[]) => {
    setAttributeValues((prev) => ({
      ...prev,
      [attributeId]: value,
    }));
  };

  // Validate images
  const validateImages = (): boolean => {
    // Check for images that are still uploading
    const uploadingImages = productImages.filter(img => img.isUploading);
    if (uploadingImages.length > 0) {
      toast.error("Please wait for all images to finish uploading");
      return false;
    }
    
    // Check for images with errors
    const errorImages = productImages.filter(img => img.error);
    if (errorImages.length > 0) {
      toast.error("Some images failed to upload. Please remove them or retry.");
      return false;
    }
    
    // Check for valid uploaded images (not blob URLs)
    const validImages = productImages.filter(
      img => !img.error && !img.isUploading && !img.url.startsWith("blob:")
    );
    
    if (validImages.length === 0) {
      toast.error("Please add at least 1 product image and ensure it's uploaded to Cloudinary");
      return false;
    }
    
    // Check if any images are still blob URLs (Cloudinary not configured or upload failed)
    const blobImages = productImages.filter(img => img.url.startsWith("blob:"));
    if (blobImages.length > 0) {
      toast.error("Some images are not uploaded. Please ensure Cloudinary is configured and images are uploaded.");
      return false;
    }
    
    return true;
  };

  // Submit handler
  const onSubmit = async (data: ProductFormData) => {
    // Validate images first
    if (!validateImages()) {
      setStep(1); // Go back to images step
      return;
    }

    try {
      // Build the product data
      const productData = {
        name: data.name,
        description: data.description,
        category_id: data.category_id || undefined,
        stock_unit: data.stock_unit,
        initial_stock: data.initial_stock || 0,
        low_stock_threshold: data.low_stock_threshold || 10,
        sell_units: data.sell_units.map((su) => ({
          label: su.label,
          unit_value: su.unit_value,
          price: su.price,
          compare_price: su.compare_price || undefined,
        })),
        // Return Policy (Required)
        return_eligible: data.return_eligible,
        return_window_days: data.return_eligible ? (data.return_window_days || undefined) : undefined,
        return_conditions: data.return_conditions || undefined,
      };

      const result = await createProduct(productData).unwrap();

      // Upload images to product
      // Filter out blob URLs and uploading/error images - only send successfully uploaded images
      const validImages = productImages.filter(
        img => !img.error && !img.isUploading && !img.url.startsWith("blob:") && img.url
      );
      
      if (validImages.length === 0) {
        toast.error("Please add at least 1 product image and ensure it's uploaded successfully.");
        setStep(1); // Go back to images step
        return;
      }
      
      if (validImages.length > 0 && result.id) {
        try {
          await addProductImages({
            productId: result.id,
            images: validImages.map((img, index) => ({
              image_url: img.url, // This should now be a Cloudinary URL, not a blob URL
              display_order: index,
              is_primary: img.isPrimary,
            })),
          }).unwrap();
        } catch (imgErr: any) {
          console.error("Error adding images:", imgErr);
          toast.error(imgErr?.data?.detail || "Product created but failed to save some images");
        }
      }

      // TODO: If there are attribute values, save them
      if (Object.keys(attributeValues).length > 0 && result.id) {
        console.log("Attribute values to save:", attributeValues);
      }

      toast.success("Product created successfully!");
      router.push(ROUTES.VENDOR_PRODUCTS);
    } catch (err: any) {
      console.error("Error creating product:", err);
      toast.error(err?.data?.detail || "Failed to create product");
    }
  };

  // Check if any images are still uploading
  const hasUploadingImages = productImages.some(img => img.isUploading);

  // Steps configuration
  const steps = [
    { number: 1, title: "Images", icon: ImageIcon },
    { number: 2, title: "Basic Info", icon: Package },
    { number: 3, title: "Pricing", icon: DollarSign },
    { number: 4, title: "Attributes", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Add New Product"
        subtitle="Create a new product listing"
        action={
          <Button
            variant="outline"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.back()}
          >
            Back
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto pb-2">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center">
              <button
                type="button"
                onClick={() => setStep(s.number)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  step === s.number
                    ? "bg-primary text-white"
                    : step > s.number
                    ? "bg-success/10 text-success"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {step > s.number ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <s.icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline text-sm font-medium">{s.title}</span>
              </button>
              {idx < steps.length - 1 && (
                <div
                  className={`w-6 sm:w-12 h-0.5 mx-1 ${
                    step > s.number ? "bg-success" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {/* Step 1: Images */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Product Images</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Add 1-5 images of your product. The first image will be the main display image.
                    <br />
                    <span className="text-primary">Tip:</span> Include at least one portrait-style image for better mobile display.
                  </p>

                  <ImageUpload
                    images={productImages}
                    onChange={setProductImages}
                    maxImages={5}
                    minImages={1}
                    folder="banda_products"
                    aspectRatio="square"
                  />

                  <div className="flex justify-end mt-8">
                    <Button 
                      type="button" 
                      onClick={() => {
                        if (productImages.length === 0) {
                          toast.error("Please add at least 1 product image");
                          return;
                        }
                        if (hasUploadingImages) {
                          toast.error("Please wait for images to finish uploading");
                          return;
                        }
                        setStep(2);
                      }}
                      disabled={hasUploadingImages}
                    >
                      Next: Basic Info
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Basic Info */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>

                  <div className="space-y-6">
                    {/* Product Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name <span className="text-error">*</span>
                      </label>
                      <input
                        {...register("name")}
                        type="text"
                        placeholder="e.g., Fresh Organic Tomatoes"
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      {errors.name && (
                        <p className="text-error text-sm mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        {...register("description")}
                        rows={4}
                        placeholder="Describe your product in detail..."
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                          className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                        >
                          <span className={selectedCategoryName ? "text-gray-900" : "text-gray-400"}>
                            {selectedCategoryName || "Select a category"}
                          </span>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>

                        {showCategoryPicker && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowCategoryPicker(false)}
                            />
                            <div className="absolute z-20 w-full mt-2 bg-white shadow-lg rounded-lg">
                              {loadingCategories ? (
                                <div className="p-4 text-center">
                                  <Spinner size="sm" />
                                </div>
                              ) : categoryTree && categoryTree.length > 0 ? (
                                <CategorySelector
                                  categories={categoryTree}
                                  selectedId={selectedCategoryId}
                                  onSelect={handleCategorySelect}
                                />
                              ) : (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                  No categories available
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      {selectedCategoryId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Selected: {selectedCategoryName}
                        </p>
                      )}
                    </div>

                    {/* Stock Unit */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock Unit <span className="text-error">*</span>
                      </label>
                      <select
                        {...register("stock_unit")}
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        {STOCK_UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        This determines how you track inventory (e.g., by kg, pieces, liters)
                      </p>
                    </div>

                    {/* Initial Stock */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Initial Stock
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            {...register("initial_stock")}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                          <span className="px-3 py-2.5 bg-gray-100 rounded-lg text-sm text-gray-600">
                            {stockUnit}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Low Stock Alert
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            {...register("low_stock_threshold")}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="10"
                            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                          <span className="px-3 py-2.5 bg-gray-100 rounded-lg text-sm text-gray-600">
                            {stockUnit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Return Policy Section */}
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Return Policy</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Set whether customers can return this product and under what conditions.
                      </p>

                      {/* Return Eligible */}
                      <div className="mb-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            {...register("return_eligible")}
                            type="checkbox"
                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                            onChange={(e) => {
                              register("return_eligible").onChange(e);
                              if (!e.target.checked) {
                                setValue("return_window_days", undefined);
                              }
                            }}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            This product is returnable <span className="text-error">*</span>
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-8">
                          Check this box if customers can return this product
                        </p>
                      </div>

                      {/* Return Window Days - Only show if return_eligible is true */}
                      {watch("return_eligible") && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Return Window (Days) <span className="text-error">*</span>
                          </label>
                          <input
                            {...register("return_window_days")}
                            type="number"
                            min="1"
                            max="365"
                            placeholder="e.g., 7, 14, 30"
                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                          {errors.return_window_days && (
                            <p className="text-error text-sm mt-1">{errors.return_window_days.message}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Number of days after delivery that customers can return this product (1-365 days)
                          </p>
                        </div>
                      )}

                      {/* Return Conditions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Return Conditions (Optional)
                        </label>
                        <textarea
                          {...register("return_conditions")}
                          rows={3}
                          placeholder="e.g., Product must be unused, in original packaging, with tags attached..."
                          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                          maxLength={500}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Optional: Specify any special conditions for returns (max 500 characters)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-8">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button type="button" onClick={() => setStep(3)}>
                      Next: Pricing & Units
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Pricing & Sell Units */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Pricing & Sell Units</h2>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() =>
                        addSellUnit({ label: "", unit_value: 1, price: 0 })
                      }
                    >
                      Add Unit
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                    <div className="flex gap-2">
                      <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-800 font-medium">Sell Units Explained</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Sell units define how customers can buy your product. For example, if your
                          stock unit is &quot;kg&quot;, you can create sell units like &quot;500g&quot; (unit_value: 0.5)
                          or &quot;1 kg pack&quot; (unit_value: 1) at different prices.
                        </p>
                      </div>
                    </div>
                  </div>

                  {errors.sell_units && (
                    <div className="bg-error/10 text-error text-sm p-3 rounded-lg mb-4">
                      {errors.sell_units.message || "Please add at least one sell unit"}
                    </div>
                  )}

                  <div className="space-y-4">
                    {sellUnitFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            Sell Unit #{index + 1}
                          </span>
                          {sellUnitFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSellUnit(index)}
                              className="p-1 text-error hover:bg-error/10 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Label */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Label <span className="text-error">*</span>
                            </label>
                            <input
                              {...register(`sell_units.${index}.label`)}
                              type="text"
                              placeholder="e.g., 500g, 1 pack"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                            />
                            {errors.sell_units?.[index]?.label && (
                              <p className="text-error text-xs mt-1">
                                {errors.sell_units[index]?.label?.message}
                              </p>
                            )}
                          </div>

                          {/* Unit Value */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Unit Value ({stockUnit}) <span className="text-error">*</span>
                            </label>
                            <input
                              {...register(`sell_units.${index}.unit_value`)}
                              type="number"
                              step="0.001"
                              min="0.001"
                              placeholder="1"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                            />
                            {errors.sell_units?.[index]?.unit_value && (
                              <p className="text-error text-xs mt-1">
                                {errors.sell_units[index]?.unit_value?.message}
                              </p>
                            )}
                          </div>

                          {/* Price */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Selling Price (₹) <span className="text-error">*</span>
                            </label>
                            <input
                              {...register(`sell_units.${index}.price`)}
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="0.00"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                            />
                            {errors.sell_units?.[index]?.price && (
                              <p className="text-error text-xs mt-1">
                                {errors.sell_units[index]?.price?.message}
                              </p>
                            )}
                          </div>

                          {/* Compare Price (MRP) */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              MRP (₹) - Optional
                            </label>
                            <input
                              {...register(`sell_units.${index}.compare_price`)}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between mt-8">
                    <Button type="button" variant="outline" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(4)}
                    >
                      {categoryAttributes.length > 0 ? "Next: Attributes" : "Review & Create"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Step 4: Attributes */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Product Attributes</h2>

                  {!selectedCategoryId ? (
                    <div className="text-center py-8">
                      <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        No category selected. Attributes are based on the product category.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4"
                        onClick={() => setStep(2)}
                      >
                        Go Back to Select Category
                      </Button>
                    </div>
                  ) : loadingAttributes || loadingSegments ? (
                    <div className="flex items-center justify-center py-12">
                      <Spinner size="lg" />
                    </div>
                  ) : categoryAttributes.length === 0 ? (
                    <div className="text-center py-8">
                      <Check className="h-12 w-12 text-success mx-auto mb-4" />
                      <p className="text-gray-700 font-medium">No attributes required</p>
                      <p className="text-gray-500 text-sm mt-1">
                        This category doesn&apos;t have any specific attributes defined.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {Object.entries(groupedAttributes).map(([segmentKey, group]) => (
                        <div key={segmentKey} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                          {group.segment && (
                            <div className="mb-4 pb-3 border-b border-gray-200">
                              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                {group.segment.icon && (
                                  <span className="text-lg">{group.segment.icon}</span>
                                )}
                                {group.segment.name}
                              </h3>
                              {group.segment.description && (
                                <p className="text-xs text-gray-500 mt-1">{group.segment.description}</p>
                              )}
                            </div>
                          )}
                          {!group.segment && (
                            <div className="mb-4 pb-3 border-b border-gray-200">
                              <h3 className="text-base font-semibold text-gray-900">General Specifications</h3>
                            </div>
                          )}
                          <div className="space-y-6">
                            {group.attributes.map((attr) => (
                              <div key={attr.id}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {attr.name}
                                  {attr.is_required && <span className="text-error ml-1">*</span>}
                                  {!attr.is_own && (
                                    <span className="text-xs text-gray-400 ml-2">(from {attr.category_name})</span>
                                  )}
                                </label>
                                {attr.description && (
                                  <p className="text-xs text-gray-500 mb-2">{attr.description}</p>
                                )}
                                <AttributeInput
                                  attribute={attr}
                                  value={attributeValues[attr.id] || ""}
                                  onChange={(val) => handleAttributeChange(attr.id, val)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary Preview */}
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Summary</h3>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {productImages.slice(0, 3).map((img, idx) => (
                        <div key={img.id} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {productImages.length > 3 && (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500 flex-shrink-0">
                          +{productImages.length - 3}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>{watch("name") || "Untitled Product"}</strong> • {selectedCategoryName || "No Category"}
                    </p>
                  </div>

                  <div className="flex justify-between mt-8">
                    <Button type="button" variant="outline" onClick={() => setStep(3)}>
                      Back
                    </Button>
                    <Button type="submit" isLoading={isCreating || isAddingImages}>
                      Create Product
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
