import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../utils/useLayout';
import { useNavigation } from '@react-navigation/native';

export function AuthLandingScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { insets, padding, scale, font } = useLayout();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.bg }]}>
      {/* Upper section */}
      <View style={[styles.upper, { backgroundColor: colors.bg }]}>
        <Text style={[styles.tagline, { fontSize: font(24), color: colors.ink }]}>
          Let's brainstorm
          <Text style={{ color: colors.primary }}>.</Text>
        </Text>
        <Text style={[styles.sub, { fontSize: font(14), color: colors.muted }]}>
          Homework → solutions
        </Text>
      </View>

      {/* Bottom rounded panel */}
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border, paddingHorizontal: padding, paddingTop: scale(24), paddingBottom: scale(24) + insets.bottom }]}>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.primary, marginBottom: scale(12) },
            pressed && styles.btnPressed,
          ]}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={[styles.btnText, { color: '#fff', fontWeight: '600' }]}>Sign up</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
            pressed && styles.btnPressed,
          ]}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={[styles.btnText, { color: colors.ink }]}>Log in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  upper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tagline: { fontWeight: '600', textAlign: 'center' },
  sub: { marginTop: 8, opacity: 0.85 },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.85 },
  btnText: { fontSize: 16 },
});
