import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import { useSignUp, useSignIn, useAuth, useClerk, useOAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLayout } from '../../../utils/useLayout';
import { useNavigation } from '@react-navigation/native';
import { OnboardingLayout } from '../OnboardingLayout';

WebBrowser.maybeCompleteAuthSession();

function OAuthButtons({ onApple, onGoogle, loading, error, onSkip, colors, scale, font, insets }) {
  const fadeTitle = useRef(new Animated.Value(0)).current;
  const fadeApple = useRef(new Animated.Value(0)).current;
  const fadeGoogle = useRef(new Animated.Value(0)).current;
  const fadeSkip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anims = [fadeTitle, fadeApple, fadeGoogle, fadeSkip];
    Animated.parallel(
      anims.map((a, i) =>
        Animated.timing(a, { toValue: 1, duration: 420, delay: 150 + i * 140, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      )
    ).start();
  }, []);

  const slideStyle = (anim, d = 28) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [d, 0] }) }],
  });

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <Animated.View style={styles.content}>
        <Animated.View style={slideStyle(fadeTitle)}>
          <Text style={[styles.title, { fontSize: font(24), color: colors.ink, marginBottom: scale(40) }]}>
            Save your progress
          </Text>
        </Animated.View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: scale(40) }} />
        ) : (
          <>
            <Animated.View style={slideStyle(fadeApple, 20)}>
              <Pressable
                onPress={onApple}
                style={({ pressed }) => [
                  styles.oauthBtn,
                  { backgroundColor: '#000', borderRadius: scale(14), marginBottom: scale(14) },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Svg width={20} height={20} viewBox="0 0 814 1000" style={{ marginRight: scale(10) }}>
                  <Path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57.8-155.5-127.4C44.4 723.3 0 578.2 0 440.6c0-221.8 144.1-339.4 286.2-339.4 75.3 0 138.1 49.5 185.3 49.5 45.2 0 115.8-52.6 200.8-52.6 32.4 0 149.1 3.2 225.8 120.8z" fill="#fff" />
                  <Path d="M554.1 0c6.5 49.5-14 99-40.8 136.1-29 39.4-78.4 69.8-126.5 69.8-7.8-47.1 16.5-96.7 43.5-131.5C458.5 37.7 513.3 3.8 554.1 0z" fill="#fff" />
                </Svg>
                <Text style={{ fontSize: font(16), color: '#fff', fontWeight: '600' }}>Sign in with Apple</Text>
              </Pressable>
            </Animated.View>

            <Animated.View style={slideStyle(fadeGoogle, 20)}>
              <Pressable
                onPress={onGoogle}
                style={({ pressed }) => [
                  styles.oauthBtn,
                  { backgroundColor: colors.card, borderRadius: scale(14), borderWidth: 1, borderColor: colors.border },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Svg width={20} height={20} viewBox="0 0 48 48" style={{ marginRight: scale(10) }}>
                  <Path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107" />
                  <Path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00" />
                  <Path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50" />
                  <Path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2" />
                </Svg>
                <Text style={{ fontSize: font(16), color: colors.ink, fontWeight: '600' }}>Sign in with Google</Text>
              </Pressable>
            </Animated.View>
          </>
        )}

        {error ? <Text style={[styles.error, { color: '#e74c3c', marginTop: scale(16) }]}>{error}</Text> : null}
      </Animated.View>

      <Animated.View style={[{ paddingBottom: insets.bottom + scale(20), alignItems: 'center' }, slideStyle(fadeSkip, 15)]}>
        <Pressable onPress={onSkip}>
          <Text style={{ fontSize: font(14), color: colors.muted }}>
            Would you like to sign in later?{' '}
            <Text style={{ color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' }}>Skip</Text>
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function SaveProgressStep() {
  const { colors } = useTheme();
  const { scale, font, insets } = useLayout();
  const navigation = useNavigation();
  const { isSignedIn } = useAuth();

  const [showEmail, setShowEmail] = useState(false);
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      navigation.replace('OB_Paywall');
    }
  }, [isSignedIn, navigation]);

  if (pendingVerification) {
    return (
      <VerifyView
        email={email}
        code={code}
        setCode={setCode}
        error={error}
        colors={colors}
        scale={scale}
        font={font}
        navigation={navigation}
      />
    );
  }

  if (showEmail) {
    return (
      <EmailView
        mode={mode}
        setMode={setMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        error={error}
        setError={setError}
        setPendingVerification={setPendingVerification}
        colors={colors}
        scale={scale}
        font={font}
        navigation={navigation}
        onBack={() => setShowEmail(false)}
      />
    );
  }

  return (
    <OAuthView
      error={error}
      setError={setError}
      loading={loading}
      setLoading={setLoading}
      colors={colors}
      scale={scale}
      font={font}
      insets={insets}
      navigation={navigation}
      onSkip={() => setShowEmail(true)}
    />
  );
}

function VerifyView({ email, code, setCode, error, colors, scale, font, navigation }) {
  const { signUp, setActive, isLoaded } = useSignUp();

  const onVerify = useCallback(async () => {
    if (!isLoaded) return;
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        navigation.replace('OB_Paywall');
      }
    } catch (err) {
      // error handled by parent
    }
  }, [isLoaded, signUp, setActive, code, navigation]);

  const inputStyle = {
    borderWidth: 1, borderColor: colors.border, borderRadius: scale(12),
    padding: scale(14), fontSize: font(16), backgroundColor: colors.card, color: colors.ink,
  };

  return (
    <OnboardingLayout step={9} onContinue={onVerify} canContinue={code.length >= 4} continueLabel="Verify" hideBack>
      <Text style={[styles.title, { fontSize: font(22), color: colors.ink }]}>Verify your email</Text>
      <Text style={[styles.sub, { fontSize: font(14), color: colors.muted }]}>We sent a code to {email}</Text>
      <TextInput
        style={[inputStyle, { marginTop: scale(16) }]}
        placeholder="Verification code"
        placeholderTextColor={colors.placeholder}
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
      />
      {error ? <Text style={[styles.error, { color: '#e74c3c' }]}>{error}</Text> : null}
    </OnboardingLayout>
  );
}

function EmailView({ mode, setMode, email, setEmail, password, setPassword, error, setError, setPendingVerification, colors, scale, font, navigation, onBack }) {
  const { signUp, isLoaded: upLoaded } = useSignUp();
  const { signIn, setActive: setActiveIn, isLoaded: inLoaded } = useSignIn();
  const { signOut } = useClerk();

  const onSignUp = useCallback(async () => {
    if (!upLoaded) return;
    setError('');
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || '';
      if (msg.toLowerCase().includes('session already exists') || msg.toLowerCase().includes('single session mode')) {
        try { await signOut(); } catch (_) {}
        try {
          await signUp.create({ emailAddress: email, password });
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          setPendingVerification(true);
          return;
        } catch (retryErr) { setError(retryErr?.errors?.[0]?.message || retryErr?.message || 'Sign up failed'); return; }
      }
      setError(msg || 'Sign up failed');
    }
  }, [upLoaded, signUp, signOut, email, password, setError, setPendingVerification]);

  const onSignIn = useCallback(async () => {
    if (!inLoaded) return;
    setError('');
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === 'complete') {
        await setActiveIn({ session: attempt.createdSessionId });
        navigation.replace('OB_Paywall');
      }
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || '';
      if (msg.toLowerCase().includes('session already exists') || msg.toLowerCase().includes('single session mode')) {
        try { await signOut(); } catch (_) {}
        try {
          const retry = await signIn.create({ identifier: email, password });
          if (retry.status === 'complete') { await setActiveIn({ session: retry.createdSessionId }); navigation.replace('OB_Paywall'); return; }
        } catch (retryErr) { setError(retryErr?.errors?.[0]?.message || retryErr?.message || 'Sign in failed'); return; }
      }
      setError(msg || 'Sign in failed');
    }
  }, [inLoaded, signIn, setActiveIn, signOut, email, password, navigation, setError]);

  const inputStyle = {
    borderWidth: 1, borderColor: colors.border, borderRadius: scale(12),
    padding: scale(14), fontSize: font(16), backgroundColor: colors.card, color: colors.ink,
  };

  return (
    <OnboardingLayout
      step={9}
      onContinue={mode === 'signup' ? onSignUp : onSignIn}
      canContinue={email.length > 0 && password.length > 0}
      continueLabel={mode === 'signup' ? 'Create account' : 'Log in'}
      hideBack
    >
      <Text style={[styles.title, { fontSize: font(22), color: colors.ink }]}>
        {mode === 'signup' ? 'Create your account' : 'Welcome back'}
      </Text>
      <TextInput style={[inputStyle, { marginTop: scale(20) }]} placeholder="Email" placeholderTextColor={colors.placeholder} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={[inputStyle, { marginTop: scale(12) }]} placeholder="Password" placeholderTextColor={colors.placeholder} secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={[styles.error, { color: '#e74c3c' }]}>{error}</Text> : null}
      <Pressable onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')} style={{ marginTop: scale(16), alignSelf: 'center' }}>
        <Text style={{ fontSize: font(14), color: colors.muted }}>
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{mode === 'signup' ? 'Log in' : 'Sign up'}</Text>
        </Text>
      </Pressable>
      <Pressable onPress={onBack} style={{ marginTop: scale(12), alignSelf: 'center' }}>
        <Text style={{ fontSize: font(13), color: colors.muted }}>← Back to other options</Text>
      </Pressable>
    </OnboardingLayout>
  );
}

function OAuthView({ error, setError, loading, setLoading, colors, scale, font, insets, navigation, onSkip }) {
  const { signOut } = useClerk();
  const { startOAuthFlow: startApple } = useOAuth({ strategy: 'oauth_apple' });
  const { startOAuthFlow: startGoogle } = useOAuth({ strategy: 'oauth_google' });

  const handleOAuth = useCallback(async (startFlow) => {
    setError('');
    setLoading(true);
    try {
      const { createdSessionId, setActive } = await startFlow();
      if (createdSessionId) { await setActive({ session: createdSessionId }); }
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || '';
      if (msg.toLowerCase().includes('session already exists') || msg.toLowerCase().includes('single session mode')) {
        try { await signOut(); } catch (_) {}
        try {
          const { createdSessionId, setActive } = await startFlow();
          if (createdSessionId) { await setActive({ session: createdSessionId }); }
        } catch (retryErr) { setError(retryErr?.errors?.[0]?.message || retryErr?.message || 'Sign in failed'); }
      } else if (!msg.toLowerCase().includes('cancel')) { setError(msg || 'Sign in failed'); }
    } finally { setLoading(false); }
  }, [signOut, setError, setLoading]);

  return (
    <OAuthButtons
      onApple={() => handleOAuth(startApple)}
      onGoogle={() => handleOAuth(startGoogle)}
      loading={loading}
      error={error}
      onSkip={onSkip}
      colors={colors}
      scale={scale}
      font={font}
      insets={insets}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginTop: 4 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  title: { fontWeight: '700', textAlign: 'center' },
  sub: { textAlign: 'center', marginBottom: 8 },
  error: { fontSize: 13, textAlign: 'center' },
  oauthBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
});
