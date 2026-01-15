import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useGetCartQuery } from "@/store/api/cartApi";
import { useAppSelector } from "@/store/hooks";
import { CustomTabBar } from "@/components/navigation/CustomTabBar";
import HomeScreen from "../screens/HomeScreen";
import CategoriesScreen from "../screens/CategoriesScreen";
import CartScreen from "../screens/CartScreen";
import OrdersScreen from "../screens/OrdersScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  
  // CRITICAL: Block delivery partners from accessing buyer tabs
  // They should use DeliveryPartnerTabNavigator instead
  const isDeliveryPartner = user?.role === "delivery_partner";
  
  // Only fetch cart for buyers, skip for delivery partners and other roles
  const isBuyer = user?.role === "buyer" || (!user?.role && isAuthenticated);
  const { data: cart } = useGetCartQuery(undefined, {
    skip: !isBuyer || isDeliveryPartner, // Skip cart query for delivery partners
  });
  
  // Calculate cart count in useMemo to avoid setState during render
  const cartItemCount = useMemo(() => {
    return cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
  }, [cart?.items]);

  // If delivery partner somehow accesses this, return null
  // This should never happen if App.tsx routing is correct
  if (isDeliveryPartner) {
    return null;
  }

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          tabBarLabel: "Categories",
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: "Cart",
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: "Orders",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

