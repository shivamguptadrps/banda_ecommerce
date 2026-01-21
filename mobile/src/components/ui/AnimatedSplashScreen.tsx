import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions, Text, Image } from 'react-native';
import Svg, { Path, Circle, G, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onAnimationComplete?: () => void;
}

export function AnimatedSplashScreen({ onAnimationComplete }: AnimatedSplashScreenProps) {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const shoppingBagScale = useRef(new Animated.Value(0)).current;
  const shoppingBagOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const loadingDot1 = useRef(new Animated.Value(0)).current;
  const loadingDot2 = useRef(new Animated.Value(0)).current;
  const loadingDot3 = useRef(new Animated.Value(0)).current;
  const particles = useRef(
    Array.from({ length: 12 }, () => ({
      scale: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Main logo animation sequence
    const logoAnimation = Animated.sequence([
      // Logo appears with scale and rotation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotation, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Shopping bag appears
      Animated.parallel([
        Animated.spring(shoppingBagScale, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(shoppingBagOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Text appears
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]);

    // Particle animations
    const particleAnimations = particles.map((particle, index) => {
      const angle = (index * 360) / particles.length;
      const radius = 80 + Math.random() * 40;
      const translateX = Math.cos((angle * Math.PI) / 180) * radius;
      const translateY = Math.sin((angle * Math.PI) / 180) * radius;

      return Animated.parallel([
        Animated.spring(particle.scale, {
          toValue: 1,
          tension: 30,
          friction: 5,
          delay: 400 + index * 50,
          useNativeDriver: true,
        }),
        Animated.timing(particle.translateX, {
          toValue: translateX,
          duration: 1000,
          delay: 400 + index * 50,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(particle.translateY, {
          toValue: translateY,
          duration: 1000,
          delay: 400 + index * 50,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(particle.opacity, {
            toValue: 1,
            duration: 300,
            delay: 400 + index * 50,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 500,
            delay: 700,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    // Loading dots animation (continuous loop)
    const createLoadingAnimation = () => {
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(loadingDot1, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(loadingDot2, {
              toValue: 0.5,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(loadingDot3, {
              toValue: 0.3,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(loadingDot1, {
              toValue: 0.3,
              duration: 400,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(loadingDot2, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(loadingDot3, {
              toValue: 0.5,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(loadingDot1, {
              toValue: 0.5,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(loadingDot2, {
              toValue: 0.3,
              duration: 400,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(loadingDot3, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    // Start loading animation immediately
    const loadingAnimation = createLoadingAnimation();
    loadingAnimation.start();

    // Start all animations
    Animated.parallel([logoAnimation, ...particleAnimations]).start(() => {
      // After animations complete, wait a bit then fade out
      setTimeout(() => {
        loadingAnimation.stop();
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          // Call completion callback
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        });
      }, 500); // Reduced from 1000ms to 500ms
    });
    
    // Safety timeout - call completion after max 4 seconds
    const safetyTimeout = setTimeout(() => {
      console.warn("Splash animation timeout - forcing completion");
      loadingAnimation.stop();
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 4000);
    
    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [onAnimationComplete]);

  const logoRotationInterpolate = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      {/* Gradient Background with multiple layers for gradient effect */}
      <View style={styles.gradientLayer1} />
      <View style={styles.gradientLayer2} />
      <View style={styles.gradientLayer3} />
      <View style={styles.content}>
        {/* Animated Logo - Using actual logo image */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: logoScale },
                { rotate: logoRotationInterpolate },
              ],
              opacity: logoOpacity,
            },
          ]}
        >
          <Image
            source={require('../../../assets/mylogo.PNG')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Animated Shopping Bag Icon */}
        <Animated.View
          style={[
            styles.shoppingBagContainer,
            {
              transform: [{ scale: shoppingBagScale }],
              opacity: shoppingBagOpacity,
            },
          ]}
        >
          <Svg width={80} height={80} viewBox="0 0 80 80">
            <Path
              d="M40 15 L25 15 Q20 15 20 20 L20 60 Q20 65 25 65 L55 65 Q60 65 60 60 L60 20 Q60 15 55 15 L40 15 Z"
              fill="#FFFFFF"
              opacity="0.3"
            />
            <Path
              d="M30 25 L30 20 Q30 18 32 18 L48 18 Q50 18 50 20 L50 25"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        {/* Floating Particles */}
        {particles.map((particle, index) => {
          const angle = (index * 360) / particles.length;
          return (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  transform: [
                    { translateX: particle.translateX },
                    { translateY: particle.translateY },
                    { scale: particle.scale },
                  ],
                  opacity: particle.opacity,
                },
              ]}
            >
              <View style={styles.particleDot} />
            </Animated.View>
          );
        })}

        {/* Loading Indicator */}
        <Animated.View
          style={[
            styles.loadingContainer,
            {
              opacity: textOpacity,
            },
          ]}
        >
          <View style={styles.loadingDots}>
            <Animated.View
              style={[
                styles.loadingDot,
                {
                  opacity: loadingDot1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: loadingDot1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.loadingDot,
                {
                  opacity: loadingDot2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: loadingDot2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.loadingDot,
                {
                  opacity: loadingDot3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: loadingDot3.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </Animated.View>

        {/* App Name */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Animated.Text style={styles.appName}>Banda Baazar</Animated.Text>
          <Animated.Text style={styles.tagline}>
            Quick Commerce for Your City
          </Animated.Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7B2D8E',
  },
  gradientLayer1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#7B2D8E',
  },
  gradientLayer2: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#9D4EDD',
    opacity: 0.6,
  },
  gradientLayer3: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#C77DFF',
    opacity: 0.3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  shoppingBagContainer: {
    position: 'absolute',
    top: -20,
    right: -20,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
  },
  particleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  loadingContainer: {
    marginTop: 160,
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  textContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
    letterSpacing: 1,
  },
});
