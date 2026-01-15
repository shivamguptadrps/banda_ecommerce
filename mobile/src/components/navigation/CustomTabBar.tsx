import React, { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetCartQuery } from "@/store/api/cartApi";
import { useAppSelector } from "@/store/hooks";
import { useTabBar } from "@/contexts/TabBarContext";

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

// Screens where tab bar should be hidden
const HIDDEN_ROUTES = [
  "ProductDetail",
  "Checkout",
  "Search",
  "CategoryDetail",
  "ProductListing",
];

export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const isBuyer = user?.role === "buyer" || (!user?.role && isAuthenticated);
  
  const { data: cart } = useGetCartQuery(undefined, {
    skip: !isBuyer,
  });

  const cartItemCount = cart?.items?.reduce((total: number, item: any) => total + item.quantity, 0) || 0;

  // Get current route name - check nested routes
  const routeName = useNavigationState((state) => {
    if (!state) return "";
    
    // Get the active route
    const getActiveRoute = (routeState: any): string => {
      if (!routeState) return "";
      const route = routeState.routes[routeState.index];
      
      // If route has nested state, recurse
      if (route.state) {
        return getActiveRoute(route.state);
      }
      
      return route.name;
    };
    
    return getActiveRoute(state);
  });

  // Check if current route should hide tab bar
  const routeShouldHide = routeName ? HIDDEN_ROUTES.includes(routeName) : false;
  
  // Get scroll-based visibility from context
  const { isVisible: scrollVisible } = useTabBar();
  
  // Hide if route requires it OR scroll says to hide
  const shouldHide = routeShouldHide || !scrollVisible;
  
  // Animation for slide up/down
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: shouldHide ? 100 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [shouldHide, translateY]);

  // Tab configurations - Professional Blinkit style
  const tabs = [
    {
      name: "Home",
      route: "Home",
      icon: (focused: boolean) => (
        <Ionicons 
          name={focused ? "home" : "home-outline"} 
          size={22} 
          color={focused ? "#22C55E" : "#6B7280"} 
        />
      ),
    },
    {
      name: "Categories",
      route: "Categories",
      icon: (focused: boolean) => (
        <Ionicons 
          name={focused ? "grid" : "grid-outline"} 
          size={22} 
          color={focused ? "#22C55E" : "#6B7280"} 
        />
      ),
    },
    {
      name: "Cart",
      route: "Cart",
      icon: (focused: boolean) => (
        <View style={styles.cartIconContainer}>
          <View style={[styles.cartIconWrapper, focused && styles.cartIconWrapperActive]}>
            <Ionicons 
              name={focused ? "bag" : "bag-outline"} 
              size={24} 
              color={focused ? "#FFFFFF" : "#6B7280"} 
            />
          </View>
          {cartItemCount > 0 && (
            <Animated.View 
              style={[
                styles.cartBadge,
                cartItemCount > 9 && styles.cartBadgeLarge,
              ]}
            >
              <Animated.Text style={styles.cartBadgeText}>
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </Animated.Text>
            </Animated.View>
          )}
        </View>
      ),
    },
    {
      name: "Orders",
      route: "Orders",
      icon: (focused: boolean) => (
        <Ionicons 
          name={focused ? "receipt" : "receipt-outline"} 
          size={22} 
          color={focused ? "#22C55E" : "#6B7280"} 
        />
      ),
    },
    {
      name: "Profile",
      route: "Profile",
      icon: (focused: boolean) => (
        <Ionicons 
          name={focused ? "person" : "person-outline"} 
          size={22} 
          color={focused ? "#22C55E" : "#6B7280"} 
        />
      ),
    },
  ];

  return (
    <Animated.View
      style={[
        styles.tabBar,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.tabBarContent}>
        {tabs.map((tab, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: tab.route,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(tab.route);
            }
          };

          return (
            <TouchableOpacity
              key={tab.route}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.6}
            >
              <View style={styles.tabContent}>
                <View style={[styles.tabIconContainer, isFocused && styles.tabIconContainerActive]}>
                  {tab.icon(isFocused)}
                </View>
                <Animated.Text
                  style={[
                    styles.tabLabel,
                    isFocused && styles.tabLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.name}
                </Animated.Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    paddingTop: 6,
  },
  tabBarContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 58,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
    position: "relative",
    width: 40,
    height: 32,
  },
  tabIconContainerActive: {
    // Active state styling
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 1,
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: "#22C55E",
    fontWeight: "700",
  },
  // Cart specific styles - Professional and Aesthetic
  cartIconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 32,
  },
  cartIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  cartIconWrapperActive: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
    transform: [{ scale: 1.05 }],
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#EF4444",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 6,
  },
  cartBadgeLarge: {
    minWidth: 22,
    height: 18,
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.2,
  },
});
