import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLayout } from '../../../utils/useLayout';
import { useNavigation } from '@react-navigation/native';
import { useOnboarding } from '../OnboardingContext';

const PHASES = [
  'Analyzing your subjects...',
  'Identifying your struggles...',
  'Matching study strategies...',
  'Personalizing output style...',
  'Finalizing your plan...',
];

export function BuildingPlanStep() {
  const { colors } = useTheme();
  const { insets, scale, font } = useLayout();
  const navigation = useNavigation();
  const { data } = useOnboarding();

  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const animVal = useRef(new Animated.Value(0)).current;

  const circleScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const phaseOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(circleScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(phaseOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const totalDuration = 4000;
    const interval = 30;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      const p = Math.min(elapsed / totalDuration, 1);
      setProgress(Math.round(p * 100));
      setPhase(Math.min(Math.floor(p * PHASES.length), PHASES.length - 1));
      if (p >= 1) {
        clearInterval(timer);
        setTimeout(() => navigation.replace('OB_PlanReady'), 400);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [navigation]);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: progress / 100,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [progress, animVal]);

  const barWidth = animVal.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.circleOuter, { borderColor: colors.primary + '30', transform: [{ scale: Animated.multiply(circleScale, pulseAnim) }] }]}>
          <Text style={{ fontSize: font(32), fontWeight: '700', color: colors.primary }}>{progress}%</Text>
        </Animated.View>
        <Animated.View style={{ opacity: titleOpacity }}>
          <Text style={[styles.title, { fontSize: font(18), color: colors.ink }]}>
            Building your custom plan
          </Text>
        </Animated.View>
        <Animated.View style={{ opacity: phaseOpacity }}>
          <Text style={[styles.phase, { fontSize: font(14), color: colors.muted }]}>
            {PHASES[phase]}
          </Text>
        </Animated.View>

        <View style={[styles.trackBg, { backgroundColor: colors.border, marginTop: scale(32) }]}>
          <Animated.View style={[styles.trackFill, { backgroundColor: colors.primary, width: barWidth }]} />
        </View>

        {data.subjects?.length > 0 && (
          <View style={[styles.tags, { marginTop: scale(24) }]}>
            {data.subjects.map((s) => (
              <View key={s} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: font(12), color: colors.ink }}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  circleOuter: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  phase: { textAlign: 'center' },
  trackBg: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
  trackFill: { height: 6, borderRadius: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
});
