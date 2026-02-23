import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLayout } from '../../../utils/useLayout';
import { useNavigation } from '@react-navigation/native';
import { useOnboarding } from '../OnboardingContext';
import { OnboardingLayout } from '../OnboardingLayout';
import { useStagger, fadeSlideStyle } from '../animUtils';

const GOALS = [
  { id: 'pass', icon: '✅', label: 'Pass my exams' },
  { id: 'straight_a', icon: '🏆', label: "Get straight A's" },
  { id: 'understand', icon: '💡', label: 'Understand concepts deeply' },
  { id: 'save_time', icon: '⚡', label: 'Save time on homework' },
];

export function GoalStep() {
  const { colors } = useTheme();
  const { scale, font } = useLayout();
  const navigation = useNavigation();
  const { data, setData } = useOnboarding();
  const [selected, setSelected] = useState(data.goal || '');

  const anims = useStagger(GOALS.length + 2, { delay: 80, startDelay: 100 });
  const titleAnim = anims[0];
  const subAnim = anims[1];
  const rowAnims = anims.slice(2);

  const onContinue = () => {
    setData({ goal: selected });
    navigation.navigate('OB_Frequency');
  };

  return (
    <OnboardingLayout step={4} onContinue={onContinue} canContinue={!!selected}>
      <Animated.View style={fadeSlideStyle(titleAnim)}>
        <Text style={[styles.title, { fontSize: font(22), color: colors.ink }]}>What's your goal?</Text>
      </Animated.View>
      <Animated.View style={fadeSlideStyle(subAnim)}>
        <Text style={[styles.sub, { fontSize: font(14), color: colors.muted }]}>
          Studly will optimize your experience around this.
        </Text>
      </Animated.View>
      {GOALS.map((g, i) => {
        const active = selected === g.id;
        return (
          <Animated.View key={g.id} style={fadeSlideStyle(rowAnims[i], 20)}>
            <Pressable
              onPress={() => setSelected(g.id)}
              style={[
                styles.row,
                {
                  backgroundColor: active ? colors.primary + '14' : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: scale(14),
                  padding: scale(16),
                  marginBottom: scale(10),
                },
              ]}
            >
              <Text style={{ fontSize: font(22), marginRight: scale(14) }}>{g.icon}</Text>
              <Text style={{ flex: 1, fontSize: font(15), color: colors.ink, fontWeight: active ? '600' : '500' }}>{g.label}</Text>
              {active && <View style={[styles.radio, { borderColor: colors.primary, backgroundColor: colors.primary }]} />}
              {!active && <View style={[styles.radio, { borderColor: colors.border }]} />}
            </Pressable>
          </Animated.View>
        );
      })}
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', marginBottom: 6 },
  sub: { marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
});
