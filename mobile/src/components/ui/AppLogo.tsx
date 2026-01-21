import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';

interface AppLogoProps {
  width?: number;
  height?: number;
  showText?: boolean;
}

export function AppLogo({ width = 120, height = 120, showText = false }: AppLogoProps) {
  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox="0 0 120 120">
        <G>
          {/* Main Shopping Bag */}
          <Path
            d="M60 15 L35 15 Q25 15 25 25 L25 95 Q25 105 35 105 L85 105 Q95 105 95 95 L95 25 Q95 15 85 15 L60 15 Z"
            fill="#7B2D8E"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          {/* Bag Handle */}
          <Path
            d="M40 35 L40 25 Q40 20 45 20 L75 20 Q80 20 80 25 L80 35"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Shopping Items - Fruits/Products */}
          <Circle cx="50" cy="60" r="8" fill="#22C55E" />
          <Circle cx="70" cy="60" r="8" fill="#22C55E" />
          <Circle cx="60" cy="75" r="6" fill="#F59E0B" />
          {/* Smile/Checkmark */}
          <Path
            d="M45 80 Q60 90 75 80"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </G>
      </Svg>
      {showText && (
        <View style={styles.textContainer}>
          <Svg width={width * 1.5} height={40} viewBox="0 0 180 40">
            <SvgText
              x="90"
              y="25"
              fontSize="24"
              fontWeight="800"
              fill="#7B2D8E"
              textAnchor="middle"
              fontFamily="system"
            >
              Banda Baazar
            </SvgText>
          </Svg>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginTop: 8,
  },
});
