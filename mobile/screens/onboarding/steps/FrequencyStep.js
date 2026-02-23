import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLayout } from '../../../utils/useLayout';
import { useNavigation } from '@react-navigation/native';
import { useOnboarding } from '../OnboardingContext';
import { OnboardingLayout } from '../OnboardingLayout';
import { useStagger, fadeSlideStyle } from '../animUtils';

const FREQUENCIES = [
  { id: 'rarely', label: 'Rarely', desc: 'A few times a month' },
  { id: '1-2', label: '1-2x / week', desc: 'Getting started' },
  { id: '3-5', label: '3-5x / week', desc: 'Consistent effort' },
  { id: 'daily', label: 'Daily', desc: 'Fully committed' },
];

export function FrequencyStep() {
  const { colors } = useTheme();
  const { scale, font } = useLayout();
  const navigation = useNavigation();
  const { data, setData } = useOnboarding();
  const [selected, setSelected] = useState(data.frequency || '');

  const anims = useStagger(FREQUENCIES.length + 2, { delay: 80, startDelay: 100 });
  const titleAnim = anims[0];
  const subAnim = anims[1];
  const rowAnims = anims.slice(2);

  const onContinue = () => {
    setData({ frequency: selected });
    navigation.navigate('OB_SocialProof');
  };

  return (
    <OnboardingLayout step={5} onContinue={onContinue} canContinue={!!selected}>
      <Animated.View style={fadeSlideStyle(titleAnim)}>
        <Text style={[styles.title, { fontSize: font(22), color: colors.ink }]}>How often do you study?</Text>
      </Animated.View>
      <Animated.View style={fadeSlideStyle(subAnim)}>
        <Text style={[styles.sub, { fontSize: font(14), color: colors.muted }]}>
          This will be used to calibrate your custom plan.
        </Text>
      </Animated.View>
      {FREQUENCIES.map((f, i) => {
        const active = selected === f.id;
        return (
          <Animated.View key={f.id} style={fadeSlideStyle(rowAnims[i], 20)}>
            <Pressable
              onPress={() => setSelected(f.id)}
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
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: font(15), color: colors.ink, fontWeight: '600' }}>{f.label}</Text>
                <Text style={{ fontSize: font(12), color: colors.muted, marginTop: 2 }}>{f.desc}</Text>
              </View>
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
