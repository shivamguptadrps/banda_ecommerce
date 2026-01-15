import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";

interface SpinnerProps {
  size?: "small" | "large";
  color?: string;
  style?: any;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "large",
  color = "#22C55E",
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
});
