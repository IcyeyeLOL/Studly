import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const B = {
  primary: '#4BAED0',
  dark: '#2d7fa3',
};

/**
 * Splash screen shown when the app opens.
 * Matches the design: blue gradient, white icon with "Sy", "Studly", "LEARN THE HUMAN WAY".
 * Calls onDone after 1800ms.
 */
export function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <LinearGradient
      colors={[B.primary, B.dark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.iconText}>Sy</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Studly</Text>
        <Text style={styles.tagline}>LEARN THE HUMAN WAY</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    backgroundColor: 'white',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 12,
  },
  iconText: {
    fontFamily: 'Georgia',
    fontWeight: '700',
    fontSize: 36,
    color: B.primary,
  },
  textWrap: {
    alignItems: 'center',
    marginTop: 14,
  },
  title: {
    fontFamily: 'Georgia',
    fontWeight: '700',
    fontSize: 28,
    color: 'white',
    letterSpacing: 1,
  },
  tagline: {
    marginTop: 4,
    fontFamily: 'System',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 4,
  },
});
