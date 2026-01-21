import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Text as SvgText } from "react-native-svg";

interface LogoProps {
  width?: number;
  height?: number;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  width = 160, 
  height = 44,
  showText = true 
}) => {
  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox="0 0 280 60">
        <Defs>
          <LinearGradient id="bagGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#10B981" />
            <Stop offset="100%" stopColor="#059669" />
          </LinearGradient>
          <LinearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#34D399" />
            <Stop offset="100%" stopColor="#10B981" />
          </LinearGradient>
        </Defs>
        
        {/* Shopping Bag Icon */}
        <Path
          d="M12 22C12 20.8954 12.8954 20 14 20H42C43.1046 20 44 20.8954 44 22V48C44 50.2091 42.2091 52 40 52H16C13.7909 52 12 50.2091 12 48V22Z"
          fill="url(#bagGradient)"
        />
        
        {/* Bag Handle */}
        <Path
          d="M20 20V16C20 12.6863 22.6863 10 26 10H30C33.3137 10 36 12.6863 36 16V20"
          stroke="url(#bagGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Leaf/Fresh indicator */}
        <Path
          d="M28 28C28 28 24 32 24 36C24 40 28 42 28 42C28 42 32 40 32 36C32 32 28 28 28 28Z"
          fill="url(#leafGradient)"
        />
        <Path
          d="M28 30V40"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        
        {/* Sparkle dots */}
        <Circle cx="20" cy="30" r="1.5" fill="white" opacity="0.8" />
        <Circle cx="36" cy="44" r="1.5" fill="white" opacity="0.8" />
        
        {showText && (
          <>
            {/* Text: Banda */}
            <SvgText
              x="64"
              y="38"
              fontSize="26"
              fontWeight="700"
              fill="#111827"
              fontFamily="System"
            >
              Banda
            </SvgText>
            
            {/* Text: BAZAAR */}
            <SvgText
              x="64"
              y="58"
              fontSize="18"
              fontWeight="500"
              fill="#10B981"
              fontFamily="System"
              letterSpacing="3"
            >
              BAZAAR
            </SvgText>
            
            {/* Tagline dot */}
            <Circle cx="156" cy="55" r="2" fill="#F59E0B" />
          </>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
