import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import VendorDashboardScreen from "../screens/vendor/VendorDashboardScreen";
import VendorProductsScreen from "../screens/vendor/VendorProductsScreen";
import VendorOrdersScreen from "../screens/vendor/VendorOrdersScreen";
import VendorSettingsScreen from "../screens/vendor/VendorSettingsScreen";
import { VendorDrawer } from "../components/vendor/VendorDrawer";

const Tab = createBottomTabNavigator();

export function VendorTabNavigator() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#22C55E",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: {
            height: 65,
            paddingBottom: 10,
            paddingTop: 8,
            borderTopWidth: 0,
            backgroundColor: "#FFFFFF",
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: -2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 10,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: -4,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          children={() => (
            <VendorDashboardScreen onMenuPress={() => setDrawerOpen(true)} />
          )}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Products"
          children={() => (
            <VendorProductsScreen onMenuPress={() => setDrawerOpen(true)} />
          )}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Orders"
          children={() => (
            <VendorOrdersScreen onMenuPress={() => setDrawerOpen(true)} />
          )}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          children={() => (
            <VendorSettingsScreen onMenuPress={() => setDrawerOpen(true)} />
          )}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      <VendorDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}
