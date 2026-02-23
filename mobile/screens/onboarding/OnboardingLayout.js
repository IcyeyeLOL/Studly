import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLayout } from '../../utils/useLayout';
import { useNavigation } from '@react-navigation/native';

const TOTAL_STEPS = 10;

export function OnboardingLayout({ step, children, onContinue, canContinue = true, continueLabel = 'Continue', hideBack = false, hideButton = false }) {
  const { colors } = useTheme();
  const { insets, padding, scale, font } = useLayout();
  const navigation = useNavigation();
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => setKeyboardOffset(e.endCoordinates.height);
    const onHide = () => setKeyboardOffset(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const progress = step / TOTAL_STEPS;
  const keyboardUp = keyboardOffset > 0;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      {/* Header: back + progress */}
      <View style={[styles.header, { paddingTop: insets.top + scale(8), paddingHorizontal: padding }]}>
        <View style={styles.headerRow}>
          {!hideBack ? (
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
              <Text style={{ fontSize: font(22), color: colors.ink }}>←</Text>
            </Pressable>
          ) : (
            <View style={{ width: 32 }} />
          )}
          <Text style={{ fontSize: font(12), color: colors.muted }}>{step} of {TOTAL_STEPS}</Text>
        </View>
        <View style={[styles.trackBg, { backgroundColor: colors.border, marginTop: scale(10) }]}>
          <View style={[styles.trackFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: padding,
          paddingTop: scale(24),
          paddingBottom: keyboardUp ? keyboardOffset : scale(24),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {/* Continue button */}
      {!hideButton && (
        <View style={[
          styles.footer,
          {
            paddingHorizontal: padding,
            paddingTop: scale(12),
            backgroundColor: colors.bg,
            paddingBottom: keyboardUp ? scale(12) : insets.bottom + scale(12),
            ...(keyboardUp && Platform.OS === 'ios' ? { marginBottom: keyboardOffset } : {}),
          },
        ]}>
          <Pressable
            onPress={onContinue}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: colors.primary, borderRadius: scale(14) },
              !canContinue && { opacity: 0.45 },
              pressed && canContinue && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.btnText, { fontSize: font(16) }]}>{continueLabel}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {},
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  trackBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  trackFill: { height: 4, borderRadius: 2 },
  footer: {},
  btn: { paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
