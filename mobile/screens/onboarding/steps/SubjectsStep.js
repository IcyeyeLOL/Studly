import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLayout } from '../../../utils/useLayout';
import { useNavigation } from '@react-navigation/native';
import { useOnboarding } from '../OnboardingContext';
import { OnboardingLayout } from '../OnboardingLayout';
import { useStagger, fadeSlideStyle } from '../animUtils';

const SUBJECTS = ['Math', 'Science', 'English', 'History', 'Computer Science', 'Business', 'Other'];

export function SubjectsStep() {
  const { colors } = useTheme();
  const { scale, font } = useLayout();
  const navigation = useNavigation();
  const { data, setData } = useOnboarding();
  const [selected, setSelected] = useState(data.subjects || []);

  const anims = useStagger(SUBJECTS.length + 2, { delay: 70, startDelay: 100 });
  const titleAnim = anims[0];
  const subAnim = anims[1];
  const chipAnims = anims.slice(2);

  const toggle = (s) => {
    setSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const onContinue = () => {
    setData({ subjects: selected });
    navigation.navigate('OB_Struggles');
  };

  return (
    <OnboardingLayout step={2} onContinue={onContinue} canContinue={selected.length > 0}>
      <Animated.View style={fadeSlideStyle(titleAnim)}>
        <Text style={[styles.title, { fontSize: font(22), color: colors.ink }]}>What subjects do you study?</Text>
      </Animated.View>
      <Animated.View style={fadeSlideStyle(subAnim)}>
        <Text style={[styles.sub, { fontSize: font(14), color: colors.muted }]}>
          This helps us build YOUR custom study plan.
        </Text>
      </Animated.View>
      <View style={styles.chips}>
        {SUBJECTS.map((s, i) => {
          const active = selected.includes(s);
          return (
            <Animated.View key={s} style={fadeSlideStyle(chipAnims[i], 20)}>
              <Pressable
                onPress={() => toggle(s)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: scale(12),
                    paddingVertical: scale(14),
                    paddingHorizontal: scale(20),
                    marginBottom: scale(10),
                  },
                ]}
              >
                <Text style={{ fontSize: font(15), fontWeight: '600', color: active ? '#fff' : colors.ink }}>{s}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', marginBottom: 6 },
  sub: { marginBottom: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderWidth: 1 },
});
