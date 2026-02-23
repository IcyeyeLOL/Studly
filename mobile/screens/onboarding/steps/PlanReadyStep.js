import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLayout } from '../../../utils/useLayout';
import { useNavigation } from '@react-navigation/native';
import { useOnboarding } from '../OnboardingContext';
import { OnboardingLayout } from '../OnboardingLayout';
import { useStagger, useBounceIn, fadeSlideStyle, scaleStyle } from '../animUtils';

const GOAL_LABELS = {
  pass: 'Pass your exams',
  straight_a: "Get straight A's",
  understand: 'Deep understanding',
  save_time: 'Save time on homework',
};

const FREQ_LABELS = {
  rarely: 'Light schedule',
  '1-2': '1-2 sessions/week',
  '3-5': '3-5 sessions/week',
  daily: 'Daily sessions',
};

export function PlanReadyStep() {
  const { colors } = useTheme();
  const { scale, font } = useLayout();
  const navigation = useNavigation();
  const { data } = useOnboarding();

  const checkAnim = useBounceIn(50);
  const anims = useStagger(6, { delay: 100, startDelay: 250 });
  const [titleAnim, subAnim, subjectsAnim, goalAnim, schedAnim, affirmAnim] = anims;

  const recommendedStyle = (data.goal === 'understand' || data.goal === 'straight_a') ? 'Handwritten' : 'Flowchart';

  return (
    <OnboardingLayout step={8} onContinue={() => navigation.navigate('OB_SaveProgress')} continueLabel="Save my plan">
      <Animated.View style={[{ alignItems: 'center', marginBottom: scale(4) }, scaleStyle(checkAnim, 0.3)]}>
        <Text style={{ fontSize: font(40) }}>✅</Text>
      </Animated.View>

      <Animated.View style={fadeSlideStyle(titleAnim)}>
        <Text style={[styles.title, { fontSize: font(22), color: colors.ink }]}>Your custom plan is ready</Text>
      </Animated.View>
      <Animated.View style={fadeSlideStyle(subAnim)}>
        <Text style={[styles.sub, { fontSize: font(14), color: colors.muted }]}>
          Based on your answers, here's what Studly built for you.
        </Text>
      </Animated.View>

      {/* Plan summary card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: scale(16), padding: scale(20), marginTop: scale(16) }]}>

        <Animated.View style={fadeSlideStyle(subjectsAnim, 16)}>
          <Text style={[styles.sectionLabel, { fontSize: font(11), color: colors.muted }]}>SUBJECTS</Text>
          <View style={styles.tags}>
            {(data.subjects || []).map((s) => (
              <View key={s} style={[styles.tag, { backgroundColor: colors.primary + '14', borderRadius: scale(8), paddingVertical: scale(6), paddingHorizontal: scale(12) }]}>
                <Text style={{ fontSize: font(13), color: colors.primary, fontWeight: '600' }}>{s}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={fadeSlideStyle(goalAnim, 16)}>
          <Text style={[styles.sectionLabel, { fontSize: font(11), color: colors.muted, marginTop: scale(18) }]}>GOAL</Text>
          <Text style={{ fontSize: font(15), color: colors.ink, fontWeight: '600' }}>
            {GOAL_LABELS[data.goal] || 'Custom goal'}
          </Text>
        </Animated.View>

        <Animated.View style={fadeSlideStyle(schedAnim, 16)}>
          <Text style={[styles.sectionLabel, { fontSize: font(11), color: colors.muted, marginTop: scale(18) }]}>STUDY SCHEDULE</Text>
          <Text style={{ fontSize: font(15), color: colors.ink, fontWeight: '600' }}>
            {FREQ_LABELS[data.frequency] || 'Flexible'}
          </Text>

          <Text style={[styles.sectionLabel, { fontSize: font(11), color: colors.muted, marginTop: scale(18) }]}>RECOMMENDED OUTPUT</Text>
          <Text style={{ fontSize: font(15), color: colors.ink, fontWeight: '600' }}>
            {recommendedStyle} solutions
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.affirmation, { backgroundColor: colors.primary + '0c', borderRadius: scale(14), padding: scale(16), marginTop: scale(20) }, scaleStyle(affirmAnim, 0.9)]}>
        <Text style={{ fontSize: font(14), color: colors.ink, textAlign: 'center', lineHeight: font(20) }}>
          Based on students with similar profiles, you have a <Text style={{ fontWeight: '700', color: colors.primary }}>high chance of success</Text> with Studly.
        </Text>
      </Animated.View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  sub: { textAlign: 'center' },
  card: { borderWidth: 1 },
  sectionLabel: { fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {},
  affirmation: {},
});
