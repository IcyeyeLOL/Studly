import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLayout } from '../../../utils/useLayout';
import { useNavigation } from '@react-navigation/native';
import { OnboardingLayout } from '../OnboardingLayout';
import { useStagger, useBounceIn, fadeSlideStyle, scaleStyle } from '../animUtils';

const STATS = [
  { value: '50,000+', label: 'students use Studly' },
  { value: '92%', label: 'improved by' },
  { value: '4.8', label: 'avg rating' },
];

export function SocialProofStep() {
  const { colors } = useTheme();
  const { scale, font } = useLayout();
  const navigation = useNavigation();

  const anims = useStagger(6, { delay: 120, startDelay: 100 });
  const [titleAnim, subAnim, chartAnim, stat1, stat2, stat3] = anims;
  const statAnims = [stat1, stat2, stat3];

  return (
    <OnboardingLayout step={6} onContinue={() => navigation.navigate('OB_BuildingPlan')}>
      <Animated.View style={fadeSlideStyle(titleAnim)}>
        <Text style={[styles.title, { fontSize: font(20), color: colors.ink, textAlign: 'center' }]} numberOfLines={3}>
          Studly creates long-term results
        </Text>
      </Animated.View>
      <Animated.View style={fadeSlideStyle(subAnim)}>
        <Text style={[styles.sub, { fontSize: font(14), color: colors.muted, textAlign: 'center' }]}>
          Students who use Studly consistently see real improvement.
        </Text>
      </Animated.View>

      {/* Grade improvement visual */}
      <Animated.View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: scale(16), padding: scale(20), marginTop: scale(16) }, fadeSlideStyle(chartAnim)]}>
        <View style={styles.barRow}>
          <View style={{ flex: 1, marginRight: scale(12) }}>
            <Text style={{ fontSize: font(12), color: colors.muted, marginBottom: scale(6) }}>Before Studly</Text>
            <View style={[styles.bar, { backgroundColor: colors.border, width: '55%', height: scale(10), borderRadius: scale(5) }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: font(12), color: colors.muted, marginBottom: scale(6) }}>After Studly</Text>
            <View style={[styles.bar, { backgroundColor: colors.primary, width: '92%', height: scale(10), borderRadius: scale(5) }]} />
          </View>
        </View>
        <Text style={{ fontSize: font(13), color: colors.ink, fontWeight: '600', marginTop: scale(16), textAlign: 'center' }}>
          Average grade improvement: +23%
        </Text>
      </Animated.View>

      {/* Stats row */}
      <View style={[styles.statsRow, { marginTop: scale(24) }]}>
        {STATS.map((s, i) => (
          <Animated.View
            key={s.label}
            style={[
              styles.statCard,
              {
                backgroundColor: colors.primary + '12',
                borderColor: colors.primary + '40',
                borderRadius: scale(16),
                padding: scale(16),
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 4,
              },
              scaleStyle(statAnims[i], 0.7),
            ]}
          >
            <Text style={{ fontSize: font(22), fontWeight: '800', color: colors.primary, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
            <Text style={{ fontSize: font(11), color: colors.ink, fontWeight: '500', marginTop: scale(6), textAlign: 'center' }} numberOfLines={3}>{s.label}</Text>
          </Animated.View>
        ))}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', marginBottom: 6 },
  sub: { marginBottom: 8 },
  chartCard: { borderWidth: 1 },
  barRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bar: {},
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, alignItems: 'center', borderWidth: 1 },
});
