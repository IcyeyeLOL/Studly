import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import Svg, { Path, G, ClipPath, Defs, Rect } from 'react-native-svg';
import { useOAuth, useClerk } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../utils/useLayout';

WebBrowser.maybeCompleteAuthSession();

// Official Apple logo SVG (white or black fill depending on button bg)
function AppleLogo({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 814 1000">
      <Path
        d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57.8-155.5-127.4C44.4 723.3 0 578.2 0 440.6c0-221.8 144.1-339.4 286.2-339.4 75.3 0 138.1 49.5 185.3 49.5 45.2 0 115.8-52.6 200.8-52.6 32.4 0 149.1 3.2 225.8 120.8z"
        fill={color}
      />
      <Path
        d="M554.1 0c6.5 49.5-14 99-40.8 136.1-29 39.4-78.4 69.8-126.5 69.8-7.8-47.1 16.5-96.7 43.5-131.5C458.5 37.7 513.3 3.8 554.1 0z"
        fill={color}
      />
    </Svg>
  );
}

// Official Google "G" logo SVG (always 4-color)
function GoogleLogo({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107" />
      <Path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00" />
      <Path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50" />
      <Path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2" />
    </Svg>
  );
}

/**
 * Reusable OAuth buttons for Apple (iOS only) and Google.
 *
 * Props:
 *   onSuccess  — optional callback fired after a session is successfully activated
 *   style      — optional style for the outer wrapper View
 */
export function OAuthButtons({ onSuccess, style }) {
  const { colors, isDark } = useTheme();
  const { scale, font } = useLayout();
  const { signOut } = useClerk();

  const { startOAuthFlow: startApple } = useOAuth({ strategy: 'oauth_apple' });
  const { startOAuthFlow: startGoogle } = useOAuth({ strategy: 'oauth_google' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectUrl = Linking.createURL('/oauth-native-callback');

  const handleOAuth = useCallback(async (startFlow) => {
    setError('');
    setLoading(true);
    try {
      const { createdSessionId, setActive } = await startFlow({ redirectUrl });
      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        onSuccess?.();
      }
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || '';
      if (
        msg.toLowerCase().includes('session already exists') ||
        msg.toLowerCase().includes('single session mode')
      ) {
        try { await signOut(); } catch (_) {}
        try {
          const { createdSessionId, setActive } = await startFlow({ redirectUrl });
          if (createdSessionId) {
            await setActive({ session: createdSessionId });
            onSuccess?.();
          }
        } catch (retryErr) {
          setError(retryErr?.errors?.[0]?.message || retryErr?.message || 'Sign in failed');
        }
      } else if (!msg.toLowerCase().includes('cancel')) {
        setError(msg || 'Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  }, [signOut, onSuccess, redirectUrl]);

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // Apple button: black bg on light mode, white bg on dark mode (per Apple HIG)
  const appleBg = isDark ? '#ffffff' : '#000000';
  const appleTextColor = isDark ? '#000000' : '#ffffff';

  return (
    <View style={[styles.container, style]}>
      {Platform.OS === 'ios' && (
        <Pressable
          onPress={() => handleOAuth(startApple)}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: appleBg, borderRadius: scale(14), marginBottom: scale(12) },
            pressed && styles.pressed,
          ]}
        >
          <AppleLogo color={appleTextColor} size={scale(20)} />
          <Text style={[styles.btnText, { color: appleTextColor, fontSize: font(16), marginLeft: scale(10) }]}>
            Continue with Apple
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => handleOAuth(startGoogle)}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: colors.card, borderRadius: scale(14), borderWidth: 1, borderColor: colors.border },
          pressed && styles.pressed,
        ]}
      >
        <GoogleLogo size={scale(20)} />
        <Text style={[styles.btnText, { color: colors.ink, fontSize: font(16), marginLeft: scale(10) }]}>
          Continue with Google
        </Text>
      </Pressable>

      {error ? (
        <Text style={[styles.error, { color: '#e74c3c', fontSize: font(13) }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  btnText: { fontWeight: '600' },
  pressed: { opacity: 0.85 },
  error: { textAlign: 'center', marginTop: 12 },
});
