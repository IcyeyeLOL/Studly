import React from 'react';
import { Text, View } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../utils/useLayout';

export function ProfileAccountInfo() {
  const { user } = useUser();
  const { colors } = useTheme();
  const { font } = useLayout();

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? '';

  return (
    <View>
      {email ? (
        <Text style={{ fontSize: font(14), color: colors.ink }}>Signed in as {email}</Text>
      ) : (
        <Text style={{ fontSize: font(14), color: colors.muted }}>Account</Text>
      )}
    </View>
  );
}
