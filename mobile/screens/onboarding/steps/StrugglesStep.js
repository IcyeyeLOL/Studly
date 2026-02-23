import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLayout } from '../../../utils/useLayout';
import { useNavigation } from '@react-navigation/native';
import { useOnboarding } from '../OnboardingContext';
import { OnboardingLayout } from '../OnboardingLayout';
import { useStagger, fadeSlideStyle } from '../animUtils';

const STRUGGLES = [
  { id: 'understand', icon: '🤯', label: "Don't understand the material" },
  { id: 'time', icon: '⏰', label: 'No time to study' },
  { id: 'notes', icon: '📝', label: 'Bad at taking notes' },
  { id: 'motivation', icon: '😴', label: 'Lack of motivation' },
  { id: 'help', icon: '🆘', label: 'No one to help me' },
  { id: 'overwhelmed', icon: '😰', label: 'Feeling overwhelmed' },
];

export function StrugglesStep() {
  const { colors } = useTheme();
  const { scale, font } = useLayout();
  const navigation = useNavigation();
  const { data, setData } = useOnboarding();
  const [selected, setSelected] = useState(data.struggles || []);

  const anims = useStagger(STRUGGLES.length + 2, { delay: 70, startDelay: 100 });
  const titleAnim = anims[0];
  const subAnim = anims[1];
  const rowAnims = anims.slice(2);

  const toggle = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const onContinue = () => {
    setData({ struggles: selected });
    navigation.navigate('OB_Goal');
  };

  return (
    <OnboardingLayout step={3} onContinue={onContinue} canContinue={selected.length > 0}>
      <Animated.View style={fadeSlideStyle(titleAnim)}>
        <Text style={[styles.title, { fontSize: font(22), color: colors.ink }]}>What's holding you back?</Text>
      </Animated.View>
      <Animated.View style={fadeSlideStyle(subAnim)}>
        <Text style={[styles.sub, { fontSize: font(14), color: colors.muted }]}>
          Select all that apply. We'll tailor Studly to help.
        </Text>
      </Animated.View>
      {STRUGGLES.map((s, i) => {
        const active = selected.includes(s.id);
        return (
          <Animated.View key={s.id} style={fadeSlideStyle(rowAnims[i], 20)}>
            <Pressable
              onPress={() => toggle(s.id)}
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
              <Text style={{ fontSize: font(22), marginRight: scale(14) }}>{s.icon}</Text>
              <Text style={{ flex: 1, fontSize: font(15), color: colors.ink, fontWeight: active ? '600' : '500' }}>{s.label}</Text>
              {active && <Text style={{ fontSize: font(18), color: colors.primary }}>✓</Text>}
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
});
