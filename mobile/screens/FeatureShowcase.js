import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../utils/useLayout';

const { width: SW, height: SH } = Dimensions.get('window');

const STEPS = [
  {
    title: 'Your sidebar',
    body: 'Tap the menu icon to access your chats, projects, and saved solutions.',
    position: 'top',
    arrowDirection: 'up',
    arrowAlign: 'left',
  },
  {
    title: 'Expert AI for every subject',
    body: 'Pick a subject and Studly becomes a tutor who knows exactly how that field is taught \u2014 not a generic chatbot.',
    position: 'bottom',
    arrowDirection: 'down',
    arrowAlign: 'center',
  },
  {
    title: 'Attachments, projects & style',
    body: 'Tap + to attach images, organize into projects, or switch between handwritten and flowchart solutions.',
    position: 'bottom',
    arrowDirection: 'down',
    arrowAlign: 'left',
  },
  {
    title: "You're all set!",
    body: 'Ask any question and get clear, structured answers \u2014 handwritten notes, flowcharts, and charts built right in.',
    position: 'center',
    arrowDirection: null,
    arrowAlign: 'center',
  },
];

function Arrow({ direction, align, color, scale: s }) {
  if (!direction) return null;
  const size = s(10);
  const triangle = {
    width: 0,
    height: 0,
    borderLeftWidth: size,
    borderRightWidth: size,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  };
  if (direction === 'up') {
    triangle.borderBottomWidth = size * 1.2;
    triangle.borderBottomColor = color;
  } else {
    triangle.borderTopWidth = size * 1.2;
    triangle.borderTopColor = color;
  }

  const alignStyle = align === 'left' ? { alignSelf: 'flex-start', marginLeft: s(28) }
    : align === 'right' ? { alignSelf: 'flex-end', marginRight: s(28) }
    : { alignSelf: 'center' };

  return <View style={[triangle, alignStyle]} />;
}

export function FeatureShowcase({ onDone }) {
  const { colors } = useTheme();
  const { insets, scale, font } = useLayout();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    tooltipAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(tooltipAnim, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => { animateIn(); }, [step]);

  const goNext = () => {
    if (isLast) {
      onDone?.();
      return;
    }
    Animated.timing(tooltipAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep((s) => s + 1);
    });
  };

  const tooltipOpacity = tooltipAnim;
  const tooltipTranslateY = tooltipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [current.position === 'top' ? -20 : current.position === 'bottom' ? 20 : 0, 0],
  });

  const tooltipPosition = current.position === 'top'
    ? { top: insets.top + scale(60) }
    : current.position === 'bottom'
    ? { bottom: insets.bottom + scale(90) }
    : { top: SH / 2 - scale(100) };

  const cardBg = colors.card;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={goNext} />
      </Animated.View>

      <View style={[styles.skipRow, { top: insets.top + scale(14), right: scale(20) }]} pointerEvents="box-none">
        <Pressable onPress={onDone} hitSlop={16}>
          <Text style={{ fontSize: font(15), color: '#fff', fontWeight: '600' }}>Skip</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.tooltipWrap,
          tooltipPosition,
          { paddingHorizontal: scale(24), opacity: tooltipOpacity, transform: [{ translateY: tooltipTranslateY }] },
        ]}
        pointerEvents="box-none"
      >
        {current.arrowDirection === 'up' && (
          <Arrow direction="up" align={current.arrowAlign} color={cardBg} scale={scale} />
        )}

        <View style={[styles.tooltip, { backgroundColor: cardBg, borderRadius: scale(16), padding: scale(20) }]}>
          <Text style={[styles.tooltipTitle, { fontSize: font(20), color: colors.ink }]}>{current.title}</Text>
          <Text style={[styles.tooltipBody, { fontSize: font(14), color: colors.muted, lineHeight: font(21) }]}>{current.body}</Text>

          <View style={styles.tooltipFooter}>
            <View style={styles.dots}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === step ? colors.primary : colors.border },
                    i === step && styles.dotActive,
                  ]}
                />
              ))}
            </View>

            <Pressable
              onPress={goNext}
              style={({ pressed }) => [
                styles.nextBtn,
                { backgroundColor: colors.primary, borderRadius: scale(10) },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={{ fontSize: font(14), color: '#fff', fontWeight: '700' }}>
                {isLast ? "Got it!" : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>

        {current.arrowDirection === 'down' && (
          <Arrow direction="down" align={current.arrowAlign} color={cardBg} scale={scale} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  skipRow: { position: 'absolute', zIndex: 20 },
  tooltipWrap: { position: 'absolute', left: 0, right: 0, zIndex: 15 },
  tooltip: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipTitle: { fontWeight: '700', marginBottom: 8 },
  tooltipBody: {},
  tooltipFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotActive: { width: 20, borderRadius: 4 },
  nextBtn: { paddingVertical: 10, paddingHorizontal: 22 },
});
