import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLayout } from '../../../utils/useLayout';
import { useNavigation } from '@react-navigation/native';
import { useStagger, useBounceIn, fadeSlideStyle, scaleStyle } from '../animUtils';

export function WelcomeStep() {
  const { colors } = useTheme();
  const { insets, padding, scale, font } = useLayout();
  const navigation = useNavigation();

  const iconAnim = useBounceIn(100);
  const [titleAnim, subAnim, btnAnim, legalAnim] = useStagger(4, { delay: 140, startDelay: 300 });

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <View style={[styles.upper, { paddingTop: insets.top + scale(60) }]}>
        <Animated.View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }, scaleStyle(iconAnim, 0.3)]}>
          <Text style={{ fontSize: font(42) }}>✏️</Text>
        </Animated.View>
        <Animated.View style={fadeSlideStyle(titleAnim)}>
          <Text style={[styles.title, { fontSize: font(26), color: colors.ink }]}>
            Homework made easy
          </Text>
        </Animated.View>
        <Animated.View style={fadeSlideStyle(subAnim)}>
          <Text style={[styles.sub, { fontSize: font(15), color: colors.muted }]}>
            Studly turns your questions into handwritten solutions and flowcharts — like a tutor in your pocket.
          </Text>
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingHorizontal: padding, paddingBottom: insets.bottom + scale(16) }]}>
        <Animated.View style={fadeSlideStyle(btnAnim, 20)}>
          <Pressable
            onPress={() => navigation.navigate('OB_Subjects')}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: colors.primary, borderRadius: scale(14) },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.btnText, { fontSize: font(16) }]}>Get Started</Text>
          </Pressable>
        </Animated.View>
        <Animated.View style={{ opacity: legalAnim }}>
          <Text style={[styles.legal, { fontSize: font(11), color: colors.muted }]}>
            By continuing you agree to our Terms of Service
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  upper: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: { width: 88, height: 88, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  sub: { textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  footer: { paddingTop: 12 },
  btn: { paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  legal: { textAlign: 'center', marginTop: 12, opacity: 0.8 },
});
