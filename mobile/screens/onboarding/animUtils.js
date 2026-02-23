import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

export function useStagger(count, { delay = 100, startDelay = 150, duration = 420 } = {}) {
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.parallel(
      anims.map((a, i) =>
        Animated.timing(a, {
          toValue: 1,
          duration,
          delay: startDelay + i * delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);
  return anims;
}

export function useBounceIn(startDelay = 200) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: startDelay,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, []);
  return anim;
}

export function fadeSlideStyle(anim, distance = 28) {
  return {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };
}

export function scaleStyle(anim, from = 0.5) {
  return {
    opacity: anim,
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }],
  };
}
