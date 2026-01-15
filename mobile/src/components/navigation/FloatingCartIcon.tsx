import React, { useRef } from "react";
import { TouchableOpacity, View, Text, StyleSheet, PanResponder, Animated, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetCartQuery } from "@/store/api/cartApi";
import { useAppSelector } from "@/store/hooks";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function FloatingCartIcon() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const isBuyer = user?.role === "buyer" || (!user?.role && isAuthenticated);
  
  const { data: cart } = useGetCartQuery(undefined, {
    skip: !isBuyer,
  });

  const cartItemCount = cart?.items?.reduce((total: number, item: any) => total + item.quantity, 0) || 0;

  // Animation values for position - start at bottom right
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);

  // Set initial position
  React.useEffect(() => {
    pan.setValue({ x: 0, y: 0 }); // Relative to container's initial position
  }, [pan]);

  // PanResponder for drag functionality
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        isDragging.current = Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(evt, gestureState);
      },
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        
        // Get current position relative to initial position
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;
        
        // Calculate absolute position
        const initialX = SCREEN_WIDTH - 72; // right: 16 + icon width 56
        const initialY = SCREEN_HEIGHT - 200; // bottom: 80 + some offset
        const absoluteX = initialX + currentX;
        const absoluteY = initialY + currentY;
        
        // Constrain to screen bounds
        const iconSize = 56;
        const maxX = SCREEN_WIDTH - iconSize - 16;
        const maxY = SCREEN_HEIGHT - iconSize - 100; // Account for tab bar
        const minX = 16;
        const minY = 100; // Account for status bar/header

        let finalAbsoluteX = absoluteX;
        let finalAbsoluteY = absoluteY;

        // Snap to edges
        if (absoluteX < SCREEN_WIDTH / 2) {
          finalAbsoluteX = minX;
        } else {
          finalAbsoluteX = maxX;
        }

        // Keep Y within bounds
        if (absoluteY < minY) finalAbsoluteY = minY;
        if (absoluteY > maxY) finalAbsoluteY = maxY;

        // Convert back to relative position
        const finalRelativeX = finalAbsoluteX - initialX;
        const finalRelativeY = finalAbsoluteY - initialY;

        Animated.spring(pan, {
          toValue: { x: finalRelativeX, y: finalRelativeY },
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }).start();
      },
    })
  ).current;

  if (cartItemCount === 0) {
    return null;
  }

  const handlePress = () => {
    if (!isDragging.current) {
      (navigation as any).navigate("Cart");
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="bag" size={24} color="#FFFFFF" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {cartItemCount > 99 ? "99+" : cartItemCount}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 80, // Above tab bar
    right: 16,
    zIndex: 1000,
  },
  touchable: {
    width: 56,
    height: 56,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22C55E",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
});
