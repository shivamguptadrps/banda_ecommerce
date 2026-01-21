import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TabNavigator } from "./TabNavigator";
import CategoryDetailScreen from "../screens/CategoryDetailScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import ProductListingScreen from "../screens/ProductListingScreen";
import SearchScreen from "../screens/SearchScreen";
import VendorStoreScreen from "../screens/VendorStoreScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import AddressListScreen from "../screens/AddressListScreen";
import AddressFormScreen from "../screens/AddressFormScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import ReturnRequestScreen from "../screens/ReturnRequestScreen";
import ReturnRequestsScreen from "../screens/ReturnRequestsScreen";
import ReturnRequestDetailScreen from "../screens/ReturnRequestDetailScreen";
import DeliveryPartnerLoginScreen from "../screens/delivery/DeliveryPartnerLoginScreen";
import DeliveryPartnerOrdersScreen from "../screens/delivery/DeliveryPartnerOrdersScreen";
import DeliveryPartnerOrderDetailScreen from "../screens/delivery/DeliveryPartnerOrderDetailScreen";
import { DeliveryPartnerTabNavigator } from "./DeliveryPartnerTabNavigator";
import { VendorTabNavigator } from "./VendorTabNavigator";
import VendorOrderDetailScreen from "../screens/vendor/VendorOrderDetailScreen";
import VendorProductCreateScreen from "../screens/vendor/VendorProductCreateScreen";
import VendorProductEditScreen from "../screens/vendor/VendorProductEditScreen";

const Stack = createNativeStackNavigator();

export function AppNavigator({ 
  isDeliveryPartner = false, 
  isVendor = false 
}: { 
  isDeliveryPartner?: boolean;
  isVendor?: boolean;
}) {
  // Determine initial route based on user role
  let initialRoute = "MainTabs";
  if (isDeliveryPartner) {
    initialRoute = "DeliveryPartnerTabs";
  } else if (isVendor) {
    initialRoute = "VendorTabs";
  }

  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      {/* Role-specific root tabs */}
      {!isDeliveryPartner && !isVendor ? (
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      ) : null}

      {isDeliveryPartner ? (
        <Stack.Screen name="DeliveryPartnerTabs" component={DeliveryPartnerTabNavigator} options={{ headerShown: false }} />
      ) : null}

      {isVendor ? (
        <Stack.Screen name="VendorTabs" component={VendorTabNavigator} options={{ headerShown: false }} />
      ) : null}
      
      {/* Auth Screens */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="DeliveryPartnerLogin"
        component={DeliveryPartnerLoginScreen}
        options={{
          headerShown: false,
        }}
      />
      
      {/* Buyer-only Screens (vendors/delivery partners must not see product listing, cart, etc.) */}
      {!isDeliveryPartner && !isVendor ? (
        <>
          <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProductListing" component={ProductListingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
          <Stack.Screen name="VendorStore" component={VendorStoreScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AddressList" component={AddressListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AddressForm" component={AddressFormScreen} options={{ headerShown: false }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ReturnRequest" component={ReturnRequestScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ReturnRequests" component={ReturnRequestsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ReturnRequestDetail" component={ReturnRequestDetailScreen} options={{ headerShown: false }} />
        </>
      ) : null}
      
      {/* Delivery Partner Screens */}
      <Stack.Screen
        name="DeliveryPartnerOrders"
        component={DeliveryPartnerOrdersScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="DeliveryPartnerOrderDetail"
        component={DeliveryPartnerOrderDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      
      {/* Vendor Screens */}
      <Stack.Screen
        name="VendorOrderDetail"
        component={VendorOrderDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="VendorProductCreate"
        component={VendorProductCreateScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="VendorProductEdit"
        component={VendorProductEditScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

