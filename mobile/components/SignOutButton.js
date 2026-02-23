import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useClerk } from '@clerk/clerk-expo';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../utils/useLayout';

export function SignOutButton() {
  const { signOut } = useClerk();
  const { colors } = useTheme();
  const { scale, font } = useLayout();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <TouchableOpacity
      style={{
        marginTop: scale(8),
        paddingVertical: scale(14),
        borderRadius: scale(14),
        alignItems: 'center',
        backgroundColor: colors.primary,
      }}
      onPress={handleSignOut}
      activeOpacity={0.8}
    >
      <Text style={{ fontSize: font(15), color: '#fff', fontWeight: '600' }}>Sign out</Text>
    </TouchableOpacity>
  );
}
