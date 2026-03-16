import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useStudlyStoreImpl } from '../store/useStudlyStore';

const lightColors = {
  primary: '#4BAED0',
  dark: '#2d7fa3',
  ink: '#1a3a4a',
  bg: '#f8fbfd',
  card: '#ffffff',
  border: 'rgba(0,0,0,0.08)',
  borderAccent: 'rgba(75,174,208,0.25)',
  placeholder: '#aac4d4',
  muted: '#6b8a9a',
};

const darkColors = {
  primary: '#5fc4e0',
  dark: '#3d9fc4',
  ink: '#e8f4f8',
  bg: '#0f1920',
  card: '#1a2832',
  border: 'rgba(255,255,255,0.08)',
  borderAccent: 'rgba(95,196,224,0.3)',
  placeholder: '#5a7a8a',
  muted: '#8aa8b8',
};

const ThemeContext = createContext({ colors: lightColors, isDark: false });

export function ThemeProvider({ children }) {
  const appearance = useStudlyStoreImpl((s) => s.appearance);
  const systemScheme = useColorScheme();
  const isDark = appearance === 'dark' || (appearance === null && systemScheme === 'dark');
  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);
  const value = useMemo(() => ({ colors, isDark }), [colors, isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx.colors) return { colors: lightColors, isDark: false };
  return ctx;
}
