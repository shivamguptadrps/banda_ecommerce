import React, { useRef, useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = 180;

interface Banner {
  id: string;
  image_url?: string;
  title?: string;
  subtitle?: string;
  offer?: string;
  link?: string;
  gradient?: string[];
}

interface BannerCarouselProps {
  banners?: Banner[];
  onBannerPress?: (banner: Banner) => void;
}

const DEFAULT_BANNERS: Banner[] = [
  {
    id: "1",
    title: "Free Delivery",
    subtitle: "On orders above ₹199",
    offer: "Use code: FREEDEL",
    gradient: ["#7B2D8E", "#9B4DAE"],
  },
  {
    id: "2",
    title: "Upto 50% OFF",
    subtitle: "On Fresh Vegetables",
    offer: "Shop Now",
    gradient: ["#FF6B35", "#FF8C5A"],
  },
  {
    id: "3",
    title: "New User Offer",
    subtitle: "Get ₹100 off",
    offer: "On first order",
    gradient: ["#22C55E", "#4ADE80"],
  },
];

export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  banners = DEFAULT_BANNERS,
  onBannerPress,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setActiveIndex((prev) => {
          const next = (prev + 1) % banners.length;
          scrollViewRef.current?.scrollTo({
            x: next * BANNER_WIDTH,
            animated: true,
          });
          return next;
        });
      }, 5000); // Auto-scroll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / BANNER_WIDTH);
    setActiveIndex(index);
  };

  const renderBanner = (banner: Banner, index: number) => {
    const hasImage = !!banner.image_url;
    const gradient = banner.gradient || ["#7B2D8E", "#9B4DAE"];

    return (
      <TouchableOpacity
        key={banner.id}
        style={styles.bannerWrapper}
        onPress={() => onBannerPress?.(banner)}
        activeOpacity={0.9}
      >
        {hasImage ? (
          <Image
            source={{ uri: banner.image_url }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.bannerGradient,
              {
                backgroundColor: gradient[0],
              },
            ]}
          >
            <View style={styles.bannerContent}>
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                {banner.subtitle && (
                  <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                )}
                {banner.offer && (
                  <View style={styles.offerBadge}>
                    <Text style={styles.offerText}>{banner.offer}</Text>
                  </View>
                )}
              </View>
              <View style={styles.bannerIcon}>
                <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
              </View>
            </View>
            {/* Decorative circles */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (banners.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={BANNER_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {banners.map((banner, index) => renderBanner(banner, index))}
      </ScrollView>
      {banners.length > 1 && (
        <View style={styles.pagination}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginTop: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  bannerWrapper: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 14,
    overflow: "hidden",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  bannerGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    position: "relative",
    overflow: "hidden",
  },
  bannerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    zIndex: 2,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  bannerSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    opacity: 0.95,
    marginBottom: 12,
  },
  offerBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  offerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  decorativeCircle1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: -40,
    right: -40,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    bottom: -20,
    right: 20,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  activeDot: {
    backgroundColor: "#7B2D8E",
    width: 24,
    height: 6,
    borderRadius: 3,
  },
});
