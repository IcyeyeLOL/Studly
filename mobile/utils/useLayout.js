import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';

export function useLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const padding = Math.max(12, Math.min(width * 0.04, 20));
  const scale = (n) => Math.round(n * Math.min(Math.max(width / 375, 0.9), 1.2));
  const font = (n) =>
    Math.round(n * (width <= 375 ? width / 375 : 0.95 + 0.05 * Math.min(width / 375, 1.2)));
  return { insets, padding, scale, font };
}
