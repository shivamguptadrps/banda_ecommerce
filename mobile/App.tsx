import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Provider } from "react-redux";
import { store } from "./src/store";
import { setCredentials } from "./src/store/slices/authSlice";
import { storage } from "./src/lib/storage";
import LoginScreen from "./src/screens/auth/LoginScreen";
import RegisterScreen from "./src/screens/auth/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import { Spinner } from "./src/components/ui/Spinner";
import { AuthNavigator } from "./src/navigation/AuthNavigator";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { DeliveryPartnerTabNavigator } from "./src/navigation/DeliveryPartnerTabNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { TabBarProvider } from "./src/contexts/TabBarContext";

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await storage.getUser();
        const token = await storage.getAccessToken();
        if (user && token) {
          store.dispatch(
            setCredentials({
              user,
              tokens: {
                access_token: token,
                refresh_token: (await storage.getRefreshToken()) || "",
              },
            })
          );
          setIsAuthenticated(true);
          setUserRole(user.role || null);
        }
      } catch (error) {
        console.error("Auth init error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();

    // Subscribe to auth state changes
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      setIsAuthenticated(state.auth.isAuthenticated);
      setUserRole(state.auth.user?.role || null);
    });

    return unsubscribe;
  }, []);

  if (isLoading) {
    return <Spinner />;
  }

  // Check user role and show appropriate navigator
  // Delivery partners should see DeliveryPartnerTabNavigator
  // Vendors should see VendorTabNavigator
  // Buyers and guests get regular app navigator
  const isDeliveryPartner = userRole === "delivery_partner";
  const isVendor = userRole === "vendor";
  
  return (
    <NavigationContainer>
      {isDeliveryPartner ? (
        // Delivery partners get their own tab navigator with delivery partner routes
        <AppNavigator isDeliveryPartner={true} isVendor={false} />
      ) : isVendor ? (
        // Vendors get their own tab navigator with vendor routes
        <AppNavigator isDeliveryPartner={false} isVendor={true} />
      ) : (
        // Buyers and guests get regular app navigator
        <AppNavigator isDeliveryPartner={false} isVendor={false} />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <TabBarProvider>
          <RootNavigator />
        </TabBarProvider>
      </Provider>
    </ErrorBoundary>
  );
}
