import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useSignIn, useClerk } from '@clerk/clerk-expo';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../utils/useLayout';
import { useNavigation } from '@react-navigation/native';
import { OAuthButtons } from '../components/OAuthButtons';

export function SignInScreen() {
  const navigation = useNavigation();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signOut } = useClerk();
  const { colors } = useTheme();
  const { insets, padding, scale, font } = useLayout();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showEmailCode, setShowEmailCode] = useState(false);
  const [error, setError] = useState('');

  const onSignInPress = useCallback(async () => {
    if (!isLoaded) return;
    setError('');
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
      } else if (signInAttempt.status === 'needs_second_factor') {
        const emailCodeFactor = signInAttempt.supportedSecondFactors?.find(
          (f) => f.strategy === 'email_code',
        );
        if (emailCodeFactor) {
          await signIn.prepareSecondFactor({
            strategy: 'email_code',
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          setShowEmailCode(true);
        }
      } else {
        setError(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || '';
      if (msg.toLowerCase().includes('session already exists') || msg.toLowerCase().includes('single session mode')) {
        try { await signOut(); } catch (_) {}
        try {
          const retry = await signIn.create({ identifier: emailAddress, password });
          if (retry.status === 'complete') { await setActive({ session: retry.createdSessionId }); return; }
        } catch (retryErr) {
          setError(retryErr?.errors?.[0]?.message || retryErr?.message || 'Sign in failed');
          return;
        }
      }
      setError(msg || 'Sign in failed');
    }
  }, [isLoaded, signIn, setActive, signOut, emailAddress, password]);

  const onVerifyPress = useCallback(async () => {
    if (!isLoaded) return;
    setError('');
    try {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
      } else {
        setError(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      setError(err?.errors?.[0]?.message || err?.message || 'Verification failed');
    }
  }, [isLoaded, signIn, setActive, code]);

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scale(12),
    padding: scale(14),
    fontSize: font(16),
    backgroundColor: colors.bg,
    color: colors.ink,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.wrapper, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.upper, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
          <Pressable
            onPress={() => navigation.navigate('AuthLanding')}
            style={[styles.closeBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            hitSlop={12}
          >
            <Text style={{ fontSize: 20, color: colors.ink, fontWeight: '300' }}>×</Text>
          </Pressable>
          <Text style={[styles.tagline, { fontSize: font(24), color: colors.ink }]}>
            Let's brainstorm
            <Text style={{ color: colors.primary }}>.</Text>
          </Text>
          <Text style={[styles.sub, { fontSize: font(14), color: colors.muted }]}>
            Homework → solutions
          </Text>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border, paddingHorizontal: padding, paddingTop: scale(24), paddingBottom: scale(24) + insets.bottom }]}>
          {showEmailCode ? (
            <>
              <Text style={[styles.panelTitle, { fontSize: font(18), color: colors.ink }]}>Verify your email</Text>
              <Text style={[styles.panelSub, { fontSize: font(14), color: colors.muted }]}>
                A verification code has been sent to your email.
              </Text>
              <TextInput
                style={[inputStyle, { marginTop: scale(16) }]}
                value={code}
                placeholder="Enter verification code"
                placeholderTextColor={colors.placeholder}
                onChangeText={setCode}
                keyboardType="numeric"
              />
              {error ? <Text style={[styles.error, { color: '#e74c3c' }]}>{error}</Text> : null}
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { backgroundColor: colors.primary, marginTop: scale(20) },
                  pressed && styles.btnPressed,
                ]}
                onPress={onVerifyPress}
              >
                <Text style={styles.btnText}>Verify</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.panelTitle, { fontSize: font(18), color: colors.ink }]}>Log in</Text>

              <OAuthButtons style={{ marginTop: scale(16) }} />

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.muted, fontSize: font(13) }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <TextInput
                style={inputStyle}
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Email"
                placeholderTextColor={colors.placeholder}
                onChangeText={setEmailAddress}
                keyboardType="email-address"
              />
              <TextInput
                style={[inputStyle, { marginTop: scale(12) }]}
                value={password}
                placeholder="Password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                onChangeText={setPassword}
              />
              {error ? <Text style={[styles.error, { color: '#e74c3c' }]}>{error}</Text> : null}
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { backgroundColor: colors.primary, marginTop: scale(20) },
                  (!emailAddress || !password) && styles.btnDisabled,
                  pressed && styles.btnPressed,
                ]}
                onPress={onSignInPress}
                disabled={!emailAddress || !password}
              >
                <Text style={styles.btnText}>Log in</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('SignUp')} style={{ marginTop: scale(16), alignSelf: 'center' }}>
                <Text style={{ fontSize: font(14), color: colors.muted }}>Don't have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign up</Text></Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  upper: {
    flex: 1,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: { fontWeight: '600', textAlign: 'center' },
  sub: { marginTop: 8, opacity: 0.85 },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
  },
  panelTitle: { fontWeight: '600' },
  panelSub: { marginTop: 4, opacity: 0.9 },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12 },
  error: { fontSize: 13, marginTop: 12 },
});
