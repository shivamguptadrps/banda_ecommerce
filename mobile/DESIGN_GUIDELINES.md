# Design Guidelines - Blinkit/Zepto Inspired

## Design Philosophy

Quick Commerce (Q-Commerce) apps like Blinkit and Zepto focus on:
- **Speed**: Fast delivery messaging, quick navigation
- **Simplicity**: Clean, uncluttered UI
- **Clarity**: Large images, clear CTAs, easy scanning
- **Trust**: Delivery time, stock availability, ratings

## Color Palette

```typescript
// Primary Brand Colors
primary: "#7B2D8E"        // Purple - Main brand
primaryDark: "#5A1F68"
primaryLight: "#9B4DAE"

// Accent Colors
accent: "#FF6B35"        // Orange - CTAs, highlights
accentDark: "#E55520"

// Status Colors
success: "#22C55E"       // Green - In stock, success
warning: "#F59E0B"       // Amber - Low stock
error: "#EF4444"         // Red - Out of stock, errors
info: "#3B82F6"          // Blue - Information

// Neutrals
white: "#FFFFFF"
gray50: "#F9FAFB"
gray100: "#F3F4F6"
gray200: "#E5E7EB"
gray300: "#D1D5DB"
gray400: "#9CA3AF"
gray500: "#6B7280"
gray600: "#4B5563"
gray900: "#111827"
```

## Typography

```typescript
// Headings
h1: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 }
h2: { fontSize: 24, fontWeight: "700", letterSpacing: -0.3 }
h3: { fontSize: 20, fontWeight: "700" }
h4: { fontSize: 18, fontWeight: "600" }

// Body
body: { fontSize: 16, fontWeight: "400" }
bodySmall: { fontSize: 14, fontWeight: "400" }
caption: { fontSize: 12, fontWeight: "400" }

// Special
price: { fontSize: 18, fontWeight: "700", color: "#111827" }
discount: { fontSize: 14, fontWeight: "600", color: "#22C55E" }
```

## Spacing System

```typescript
// Base: 4px
spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
}
```

## Component Patterns

### Buttons
- **Primary**: Full width, rounded (12px), height 52px
- **Secondary**: Outlined, same dimensions
- **Quick Action**: Circular, 56x56px
- **Text**: Minimal, underline on press

### Cards
- **Product Card**: 
  - Image: 140x140px, rounded 12px
  - Padding: 12px
  - Shadow: subtle, elevation 2
  - Border radius: 12px

- **Category Card**:
  - Image: 100x100px, rounded 12px
  - 3 columns on mobile
  - Minimal text

### Inputs
- **Search Bar**: 
  - Rounded 12px
  - Light gray background (#F9FAFB)
  - Border: 1px #E5E7EB
  - Height: 48px

- **Form Inputs**:
  - Rounded 12px
  - White background
  - Border: 1px #E5E7EB
  - Height: 52px
  - Padding: 16px

## Layout Patterns

### Home Screen
1. **Header**: Location picker (sticky)
2. **Delivery Badge**: Quick delivery time
3. **Search**: Prominent, full width
4. **Banner**: Auto-scroll carousel
5. **Categories**: 3-column grid
6. **Quick Access**: 4 icons in a row

### Product Listing
1. **Filters**: Top bar (category, sort)
2. **Grid**: 2 columns
3. **Product Card**: Image, name, price, add button
4. **Infinite Scroll**: Load more on scroll

### Product Detail
1. **Image Gallery**: Swipeable, full width
2. **Info Section**: Name, price, unit selector
3. **Add to Cart**: Sticky bottom button
4. **Description**: Collapsible
5. **Related**: Horizontal scroll

## Animation Principles

- **Fast**: 200ms transitions
- **Smooth**: Ease-in-out curves
- **Purposeful**: Only animate what matters
- **Touch Feedback**: 0.8 opacity on press

## Quick Commerce Features

1. **Delivery Time**: Always visible, prominent
2. **Stock Status**: Clear indicators (In Stock, Low Stock, Out of Stock)
3. **Quick Add**: One-tap add to cart
4. **Express Delivery**: Badge for fast delivery items
5. **Offers**: Prominent discount badges
6. **Ratings**: Star ratings visible
7. **Vendor Info**: Quick vendor details

## Best Practices

1. **Minimize Clicks**: Reduce steps to purchase
2. **Large Touch Targets**: Minimum 44x44px
3. **Clear Hierarchy**: Important info stands out
4. **Fast Loading**: Skeleton screens, progressive images
5. **Offline Support**: Cache categories, products
6. **Error States**: Friendly, actionable messages
7. **Empty States**: Helpful, with CTAs

