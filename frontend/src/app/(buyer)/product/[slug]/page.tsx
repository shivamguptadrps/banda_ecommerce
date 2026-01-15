"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Home,
  Minus,
  Plus,
  Heart,
  Share2,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  ChevronLeft,
  MapPin,
  Clock,
  CheckCircle,
  Package,
  AlertCircle,
  ZoomIn,
  X,
  Info,
  Store,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { Button, Card, Badge, Spinner, EmptyState } from "@/components/ui";
import { ProductCard } from "@/components/product";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addItem,
  updateItemQuantity,
  selectCartItemByProduct,
  openCart,
} from "@/store/slices/cartSlice";
import {
  useGetProductBySlugQuery,
  useGetProductsByCategoryQuery,
} from "@/store/api/productApi";
import { useGetCategorySegmentsQuery } from "@/store/api/adminApi";
import { Product, SellUnit } from "@/types/product";
import { AttributeSegmentWithAttributes, ProductAttributeValue } from "@/types";
import { formatPrice, formatRating, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

/**
 * Image Zoom Modal Component
 */
function ImageZoomModal({
  imageUrl,
  isOpen,
  onClose,
}: {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="relative max-w-7xl max-h-[90vh] w-full h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img
            src={imageUrl}
            alt="Product zoom"
            className="w-full h-full object-contain"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Product Detail Page
 */
export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [slug, setSlug] = useState<string>("");

  // Handle params (can be Promise in Next.js 15 or object in Next.js 14)
  useEffect(() => {
    const resolveParams = async () => {
      if (params instanceof Promise) {
        const resolved = await params;
        setSlug(resolved.slug);
      } else {
        setSlug(params.slug);
      }
    };
    resolveParams();
  }, [params]);

  // Fetch product data
  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useGetProductBySlugQuery(slug, { skip: !slug });

  // Get related products from same category
  const { data: relatedProductsData } = useGetProductsByCategoryQuery(
    {
      categoryId: product?.category_id || "",
      page: 1,
      size: 8,
    },
    { skip: !product?.category_id }
  );

  // Fetch segments for product category
  const { data: segmentsData } = useGetCategorySegmentsQuery(
    { categoryId: product?.category_id || "", withAttributes: true },
    { skip: !product?.category_id }
  );

  // Filter out current product from related products
  const relatedProducts = useMemo(() => {
    if (!relatedProductsData?.items) return [];
    return relatedProductsData.items.filter((p) => p.id !== product?.id).slice(0, 6);
  }, [relatedProductsData, product?.id]);

  // Group product attribute values by segments
  const groupedAttributes = useMemo(() => {
    if (!product?.attribute_values || !product.attribute_values.length) return {};
    
    const segments = segmentsData?.items ?? [];
    const grouped: Record<string, { segment: any | null; attributes: any[] }> = {};
    
    // First, group by segments
    segments.forEach((segment: any) => {
      const segmentAttrs = product.attribute_values!.filter(
        (attr: any) => attr.segment_id === segment.id
      );
      if (segmentAttrs.length > 0) {
        grouped[segment.id] = {
          segment: segment,
          attributes: segmentAttrs,
        };
      }
    });
    
    // Then, add attributes without segments
    const attrsWithoutSegment = product.attribute_values.filter(
      (attr: any) => !attr.segment_id || !grouped[attr.segment_id]
    );
    
    if (attrsWithoutSegment.length > 0) {
      grouped["no-segment"] = {
        segment: null,
        attributes: attrsWithoutSegment,
      };
    }
    
    return grouped;
  }, [product?.attribute_values, segmentsData]);

  const [selectedUnit, setSelectedUnit] = useState<SellUnit | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showZoom, setShowZoom] = useState(false);

  // Set default sell unit when product loads
  useEffect(() => {
    if (product?.sell_units?.length && !selectedUnit) {
      const defaultUnit =
        product.sell_units.find((u) => u.is_default) ||
        product.sell_units.find((u) => u.is_active) ||
        product.sell_units[0];
      setSelectedUnit(defaultUnit);
    }
  }, [product, selectedUnit]);

  // Get cart item
  const cartItem = useAppSelector((state) =>
    selectCartItemByProduct(state, product?.id || "", selectedUnit?.id || "")
  );
  const quantity = cartItem?.quantity || 0;

  // Check if product is out of stock
  // Use is_in_stock from backend (which checks inventory.available_quantity > 0)
  // Also check if product exists and is active
  const isOutOfStock = !product || product.is_in_stock === false || product.is_in_stock === undefined;

  const discount = useMemo(() => {
    if (!selectedUnit) return 0;
    const comparePrice = selectedUnit.compare_price || selectedUnit.mrp;
    if (!comparePrice) return 0;
    
    const price = typeof selectedUnit.price === "string" 
      ? parseFloat(selectedUnit.price) 
      : selectedUnit.price;
    const mrp = typeof comparePrice === "string" 
      ? parseFloat(comparePrice) 
      : comparePrice;
    
    if (mrp > price) {
      return Math.round(((mrp - price) / mrp) * 100);
    }
    return 0;
  }, [selectedUnit]);

  // Get product images
  const productImages = useMemo(() => {
    if (!product?.images?.length) return [];
    return product.images.map((img) => ({
      ...img,
      url: img.image_url || img.url || "",
    }));
  }, [product?.images]);

  // Safety check: ensure selectedImageIndex is valid
  const safeImageIndex = useMemo(() => {
    if (productImages.length === 0) return 0;
    return Math.max(0, Math.min(selectedImageIndex, productImages.length - 1));
  }, [productImages.length, selectedImageIndex]);

  const currentImage = productImages[safeImageIndex] || productImages[0] || null;

  // Reset selectedImageIndex if it's out of bounds (MUST be before early returns)
  useEffect(() => {
    if (productImages.length > 0) {
      if (selectedImageIndex >= productImages.length || selectedImageIndex < 0) {
        setSelectedImageIndex(0);
      }
    } else {
      setSelectedImageIndex(0);
    }
  }, [productImages.length, selectedImageIndex]);

  const handleAddToCart = () => {
    if (!selectedUnit || isOutOfStock || !product) return;

    dispatch(
      addItem({
        productId: product.id,
        sellUnitId: selectedUnit.id,
        quantity: 1,
        product,
        sellUnit: selectedUnit,
      })
    );
    toast.success(`${product.name} added to cart`);
    dispatch(openCart());
  };

  const handleUpdateQuantity = (newQuantity: number) => {
    if (!selectedUnit || !product) return;

    dispatch(
      updateItemQuantity({
        productId: product.id,
        sellUnitId: selectedUnit.id,
        quantity: newQuantity,
      })
    );
  };

  const handleShare = async () => {
    if (!product) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description || "",
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  // Loading state
  if (!slug || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (isError || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          icon={<AlertCircle className="h-12 w-12 text-error" />}
          title="Product not found"
          description={(error as any)?.data?.detail || "The product you're looking for doesn't exist."}
          action={{
            label: "Go to Products",
            onClick: () => router.push(ROUTES.PRODUCTS),
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="container-app">
          <nav className="flex items-center gap-2 text-sm py-3 overflow-x-auto no-scrollbar">
            <Link href={ROUTES.HOME} className="text-gray-500 hover:text-primary flex-shrink-0">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
            <Link
              href={ROUTES.PRODUCTS}
              className="text-gray-500 hover:text-primary flex-shrink-0"
            >
              Products
            </Link>
            {product.category_name && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                <Link
                  href={`${ROUTES.PRODUCTS}?category=${product.category_id}`}
                  className="text-gray-500 hover:text-primary flex-shrink-0"
                >
                  {product.category_name}
                </Link>
              </>
            )}
            <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
            <span className="text-gray-900 font-medium truncate">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Content */}
      <div className="container-app py-6 lg:py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100 group">
              {currentImage?.url ? (
                <>
                  <img
                    src={currentImage.url}
                    alt={currentImage.alt_text || product.name}
                    className="w-full h-full object-contain p-4 cursor-zoom-in"
                    onClick={() => setShowZoom(true)}
                  />
                  {/* Zoom Button */}
                  <button
                    onClick={() => setShowZoom(true)}
                    className="absolute bottom-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ZoomIn className="h-5 w-5 text-gray-700" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Package className="h-16 w-16 text-gray-300" />
                </div>
              )}

              {/* Navigation arrows */}
              {productImages.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setSelectedImageIndex((i) =>
                        i === 0 ? productImages.length - 1 : i - 1
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() =>
                      setSelectedImageIndex((i) =>
                        i === productImages.length - 1 ? 0 : i + 1
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  </button>
                </>
              )}

              {/* Discount Badge */}
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-[#0c831f] text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg">
                  {discount}% OFF
                </div>
              )}

              {/* Wishlist & Share */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg transition-all"
                >
                  <Heart
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isWishlisted ? "fill-red-500 text-red-500" : "text-gray-400"
                    )}
                  />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg transition-all"
                >
                  <Share2 className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {productImages.map((image, index) => (
                  <button
                    key={image.id || index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      "flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all",
                      selectedImageIndex === index
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <img
                      src={image.url}
                      alt={image.alt_text || ""}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title & Rating */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {product.vendor_name && (
                  <Link
                    href={`${ROUTES.PRODUCTS}?vendor=${product.vendor_id}`}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {product.vendor_name}
                  </Link>
                )}
                {product.is_featured && (
                  <Badge variant="info" className="text-xs">Featured</Badge>
                )}
                {product.vendor_rating && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{formatRating(product.vendor_rating)}</span>
                  </div>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">
                {product.name}
              </h1>

              {/* Rating & Reviews */}
              {product.rating && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-[#0c831f] text-white px-3 py-1.5 rounded-lg">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-bold">{formatRating(product.rating)}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    ({product.review_count || 0} {product.review_count === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl lg:text-4xl font-bold text-gray-900">
                {formatPrice(selectedUnit?.price || product.min_price || 0)}
              </span>
              {(selectedUnit?.compare_price || selectedUnit?.mrp) &&
                (selectedUnit.compare_price || selectedUnit.mrp || 0) >
                  selectedUnit.price && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      {formatPrice(selectedUnit.compare_price || selectedUnit.mrp || 0)}
                    </span>
                    <Badge variant="success" className="text-sm">
                      {discount}% off
                    </Badge>
                  </>
                )}
            </div>

            {/* Stock Status */}
            {isOutOfStock ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Out of Stock</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  This product is currently unavailable
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">In Stock</span>
                </div>
                {product.inventory && (
                  <p className="text-sm text-green-600 mt-1">
                    {product.inventory.available_quantity} {product.stock_unit} available
                  </p>
                )}
              </div>
            )}

            {/* Unit Selector */}
            {product.sell_units && product.sell_units.length > 1 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Select Size/Quantity</p>
                <div className="flex flex-wrap gap-2">
                  {product.sell_units
                    .filter((u) => u.is_active !== false)
                    .map((unit) => {
                      const unitMrp = unit.compare_price || unit.mrp;
                      const unitDiscount =
                        unitMrp && unitMrp > unit.price
                          ? Math.round(((unitMrp - unit.price) / unitMrp) * 100)
                          : 0;

                      return (
                        <button
                          key={unit.id}
                          onClick={() => setSelectedUnit(unit)}
                          className={cn(
                            "px-4 py-3 rounded-xl border-2 font-medium transition-all text-left",
                            selectedUnit?.id === unit.id
                              ? "border-primary bg-primary/10 text-primary shadow-md"
                              : "border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <span className="block font-semibold">{unit.label}</span>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-sm font-bold">
                                  {formatPrice(unit.price)}
                                </span>
                                {unitDiscount > 0 && (
                                  <span className="text-xs text-gray-400 line-through">
                                    {formatPrice(unitMrp || 0)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {unitDiscount > 0 && (
                              <Badge variant="success" className="text-xs">
                                {unitDiscount}% off
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Add to Cart (Desktop) */}
            <div className="hidden lg:block space-y-4">
              {isOutOfStock ? (
                <div className="text-center py-4 bg-gray-100 rounded-xl">
                  <p className="text-gray-500 font-medium">Out of Stock</p>
                  <Button variant="outline" className="mt-3" disabled>
                    Notify Me When Available
                  </Button>
                </div>
              ) : quantity === 0 ? (
                <Button size="lg" fullWidth onClick={handleAddToCart} className="h-14 text-lg">
                  Add to Cart
                </Button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center border-2 border-primary rounded-xl overflow-hidden">
                    <button
                      onClick={() => handleUpdateQuantity(quantity - 1)}
                      className="h-14 w-14 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="h-5 w-5 text-gray-600" />
                    </button>
                    <span className="w-14 text-center font-semibold text-xl">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(quantity + 1)}
                      className="h-14 w-14 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                  <Button
                    size="lg"
                    className="flex-1 h-14 text-lg"
                    onClick={() => dispatch(openCart())}
                  >
                    Go to Cart
                  </Button>
                </div>
              )}
            </div>

            {/* Delivery & Features */}
            <Card className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Fast Delivery</p>
                  <p className="text-sm text-gray-600">Delivered in 10 minutes</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Quality Assured</p>
                  <p className="text-sm text-gray-600">Fresh products guaranteed</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Easy Returns</p>
                  <p className="text-sm text-gray-600">7-day return policy</p>
                </div>
              </div>
            </Card>

            {/* Vendor Info */}
            {product.vendor_name && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Sold by</p>
                    <Link
                      href={ROUTES.VENDOR_STORE(product.vendor_id)}
                      className="font-semibold text-gray-900 hover:text-primary"
                    >
                      {product.vendor_name}
                    </Link>
                    {product.vendor_rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm text-gray-600">
                          {formatRating(product.vendor_rating)} rating
                        </span>
                      </div>
                    )}
                  </div>
                  {product.vendor_id && (
                    <Link href={ROUTES.VENDOR_STORE(product.vendor_id)}>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        View Store
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Product Description & Details */}
        <div className="mt-12 grid lg:grid-cols-3 gap-8">
          {/* Description */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Product Description</h2>
              {product.description ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {product.description}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">No description available.</p>
              )}
            </Card>
          </div>

          {/* Quick Info & Specifications */}
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Product Information</h3>
              <div className="space-y-3 text-sm">
                {product.category_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category</span>
                    <span className="font-medium text-gray-900">{product.category_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Stock Unit</span>
                  <span className="font-medium text-gray-900">{product.stock_unit}</span>
                </div>
                {product.inventory && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Available</span>
                    <span className="font-medium text-gray-900">
                      {product.inventory.available_quantity} {product.stock_unit}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Specifications grouped by segments */}
            {product.attribute_values && product.attribute_values.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Specifications</h3>
                <div className="space-y-6">
                  {Object.entries(groupedAttributes).map(([segmentKey, group]) => (
                    <div key={segmentKey} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      {group.segment && (
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          {group.segment.icon && <span>{group.segment.icon}</span>}
                          {group.segment.name}
                        </h4>
                      )}
                      {!group.segment && (
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">General</h4>
                      )}
                      <div className="space-y-2">
                        {group.attributes.map((attr: any) => (
                          <div key={attr.id} className="flex justify-between text-sm">
                            <span className="text-gray-500">{attr.attribute_name}</span>
                            <span className="font-medium text-gray-900">
                              {attr.value_display || attr.value}
                              {attr.unit && ` ${attr.unit}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">You May Also Like</h2>
              {product.category_id && (
                <Link
                  href={`${ROUTES.PRODUCTS}?category=${product.category_id}`}
                  className="text-primary hover:underline text-sm font-medium flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {relatedProducts.map((relatedProduct, index) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Add to Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden safe-bottom z-30 shadow-lg">
        <div className="flex items-center gap-4">
          {/* Price */}
          <div>
            <span className="text-xl font-bold text-gray-900 block">
              {formatPrice(selectedUnit?.price || product.min_price || 0)}
            </span>
            {(selectedUnit?.compare_price || selectedUnit?.mrp) &&
              (selectedUnit.compare_price || selectedUnit.mrp || 0) >
                selectedUnit.price && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(selectedUnit.compare_price || selectedUnit.mrp || 0)}
                </span>
              )}
          </div>

          {/* Add/Quantity */}
          <div className="flex-1">
            {isOutOfStock ? (
              <Button variant="outline" fullWidth disabled>
                Out of Stock
              </Button>
            ) : quantity === 0 ? (
              <Button fullWidth onClick={handleAddToCart} className="h-12">
                Add to Cart
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-1 bg-primary rounded-lg">
                <button
                  onClick={() => handleUpdateQuantity(quantity - 1)}
                  className="h-12 w-12 flex items-center justify-center text-white"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="text-white font-semibold w-10 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => handleUpdateQuantity(quantity + 1)}
                  className="h-12 w-12 flex items-center justify-center text-white"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {currentImage?.url && (
        <ImageZoomModal
          imageUrl={currentImage.url}
          isOpen={showZoom}
          onClose={() => setShowZoom(false)}
        />
      )}
    </div>
  );
}
