import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLayout } from '../../../utils/useLayout';
import { useOnboarding } from '../OnboardingContext';
import { useStudlyStoreImpl } from '../../../store/useStudlyStore';
import { useNavigation } from '@react-navigation/native';

const GOAL_LABELS = {
  pass: 'Pass your exams',
  straight_a: "Get straight A's",
  understand: 'Deep understanding',
  save_time: 'Save time on homework',
};

function useStaggeredEntrance(count, delay = 120, startDelay = 200) {
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    const seq = anims.map((anim, i) =>
      Animated.timing(anim, { toValue: 1, duration: 450, delay: startDelay + i * delay, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    );
    Animated.parallel(seq).start();
  }, []);
  return anims;
}

function AnimatedEntry({ anim, children, style }) {
  const opacity = anim;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

export function PaywallStep() {
  const { colors } = useTheme();
  const { insets, padding, scale, font } = useLayout();
  const { data } = useOnboarding();
  const { isSignedIn } = useAuth();
  const navigation = useNavigation();
  const setOnboardingCompleted = useStudlyStoreImpl((s) => s.setOnboardingCompleted);
  const setOnboardingData = useStudlyStoreImpl((s) => s.setOnboardingData);

  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [view, setView] = useState('main');

  const mainAnims = useStaggeredEntrance(6, 100, 150);

  const discountGift = useRef(new Animated.Value(0)).current;
  const discountContent = useRef(new Animated.Value(0)).current;
  const discountCard = useRef(new Animated.Value(0)).current;
  const discountCta = useRef(new Animated.Value(0)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;
  const ctaGlow = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isSignedIn) {
      navigation.replace('OB_SaveProgress');
    }
  }, [isSignedIn, navigation]);

  useEffect(() => {
    if (view === 'discount') {
      discountGift.setValue(0);
      discountContent.setValue(0);
      discountCard.setValue(0);
      discountCta.setValue(0);
      badgePulse.setValue(1);

      Animated.sequence([
        Animated.spring(discountGift, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(discountContent, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.spring(discountCard, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
        Animated.timing(discountCta, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(badgePulse, { toValue: 1.08, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(badgePulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        ).start();
      });
    }
  }, [view]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaGlow, { toValue: 1.03, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(ctaGlow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const [unlocking, setUnlocking] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const loadingFade = useRef(new Animated.Value(0)).current;
  const loadingScale = useRef(new Animated.Value(0.8)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const LOADING_PHASES = [
    'Activating your account...',
    'Setting up your study plan...',
    'Preparing your workspace...',
    'Almost there...',
  ];

  const unlock = (plan) => {
    setUnlocking(true);
    setOnboardingData({ ...data, plan, isPaid: true });

    Animated.parallel([
      Animated.timing(loadingFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(loadingScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();

    let phase = 0;
    const phaseInterval = setInterval(() => {
      phase++;
      if (phase < LOADING_PHASES.length) {
        setLoadingPhase(phase);
      }
    }, 700);

    setTimeout(() => {
      clearInterval(phaseInterval);
      spinAnim.stopAnimation();

      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start();
      setLoadingPhase(-1);

      setTimeout(() => {
        setOnboardingCompleted(true);
      }, 1200);
    }, 2800);
  };

  const spinRotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (unlocking) {
    return (
      <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
        <Animated.View style={[styles.loadingOverlay, { opacity: loadingFade, transform: [{ scale: loadingScale }] }]}>
          {loadingPhase >= 0 ? (
            <>
              <Animated.View style={{ transform: [{ rotate: spinRotation }], marginBottom: scale(24) }}>
                <View style={[styles.spinner, { borderColor: colors.border, borderTopColor: colors.primary }]} />
              </Animated.View>
              <Text style={{ fontSize: font(18), fontWeight: '700', color: colors.ink, marginBottom: scale(10), textAlign: 'center' }}>
                Setting up Studly
              </Text>
              <Text style={{ fontSize: font(14), color: colors.muted, textAlign: 'center' }}>
                {LOADING_PHASES[loadingPhase]}
              </Text>
            </>
          ) : (
            <>
              <Animated.View style={{ transform: [{ scale: checkScale }], marginBottom: scale(24) }}>
                <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                  <Text style={{ fontSize: font(32), color: '#fff' }}>✓</Text>
                </View>
              </Animated.View>
              <Text style={{ fontSize: font(22), fontWeight: '700', color: colors.ink, marginBottom: scale(8), textAlign: 'center' }}>
                You're all set!
              </Text>
              <Text style={{ fontSize: font(14), color: colors.muted, textAlign: 'center' }}>
                Welcome to Studly
              </Text>
            </>
          )}
        </Animated.View>
      </View>
    );
  }

  if (view === 'discount') {
    const giftScale = discountGift.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
    const contentOpacity = discountContent;
    const contentTranslateY = discountContent.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
    const cardScale = discountCard.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
    const cardOpacity = discountCard;
    const ctaOpacity = discountCta;
    const ctaTranslateY = discountCta.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

    return (
      <View style={[styles.wrapper, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
          <View style={styles.discountUpper}>
            <Animated.View style={{ alignItems: 'center', marginBottom: scale(16), transform: [{ scale: giftScale }] }}>
              <Text style={{ fontSize: font(48) }}>🎁</Text>
            </Animated.View>

            <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
              <Text style={{ fontSize: font(13), color: colors.primary, fontWeight: '700', letterSpacing: 1, textAlign: 'center' }}>
                WAIT — SPECIAL OFFER
              </Text>
              <Text style={[styles.title, { fontSize: font(24), color: colors.ink, textAlign: 'center', marginTop: scale(8) }]}>
                We don't want you to miss out
              </Text>
              <Text style={{ fontSize: font(14), color: colors.muted, textAlign: 'center', marginTop: scale(8), lineHeight: font(22) }}>
                Get everything Studly offers at our lowest price ever. This offer won't appear again.
              </Text>
            </Animated.View>

            <Animated.View style={[styles.planCard, {
              borderColor: colors.primary,
              borderRadius: scale(16),
              padding: scale(20),
              marginTop: scale(28),
              backgroundColor: colors.primary + '08',
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            }]}>
              <Animated.View style={[styles.badge, { backgroundColor: '#e74c3c', borderRadius: scale(6), paddingHorizontal: scale(10), paddingVertical: scale(4), alignSelf: 'flex-start', marginBottom: scale(12), transform: [{ scale: badgePulse }] }]}>
                <Text style={{ fontSize: font(11), fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>80% OFF</Text>
              </Animated.View>

              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontSize: font(36), fontWeight: '800', color: colors.ink }}>$19.99</Text>
                <Text style={{ fontSize: font(15), color: colors.muted, fontWeight: '500' }}> / year</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(6) }}>
                <Text style={{ fontSize: font(14), color: colors.muted, textDecorationLine: 'line-through' }}>$120/yr</Text>
                <Text style={{ fontSize: font(14), color: colors.primary, fontWeight: '600', marginLeft: scale(8) }}>Just $1.67/mo</Text>
              </View>

              <View style={[styles.trialBadge, { backgroundColor: colors.primary + '15', borderRadius: scale(8), padding: scale(10), marginTop: scale(14) }]}>
                <Text style={{ fontSize: font(13), color: colors.primary, fontWeight: '600', textAlign: 'center' }}>
                  Includes 3-day free trial — cancel anytime
                </Text>
              </View>
            </Animated.View>
          </View>
        </ScrollView>

        <Animated.View style={[styles.bottomCta, { paddingHorizontal: padding, paddingBottom: insets.bottom + scale(16), paddingTop: scale(12), backgroundColor: colors.bg, opacity: ctaOpacity, transform: [{ translateY: ctaTranslateY }] }]}>
          <Animated.View style={{ transform: [{ scale: ctaGlow }] }}>
            <Pressable
              onPress={() => unlock('yearly_discount')}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: colors.primary, borderRadius: scale(14) },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.btnText, { fontSize: font(16) }]}>Claim This Deal</Text>
            </Pressable>
          </Animated.View>

          <Pressable onPress={() => setView('main')} style={{ marginTop: scale(14), alignSelf: 'center' }}>
            <Text style={{ fontSize: font(13), color: colors.muted }}>No thanks, I'll pay full price</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setView('discount')} hitSlop={12} style={[styles.closeBtn, { top: insets.top + scale(12) }]}>
          <Text style={{ fontSize: font(20), color: colors.muted, fontWeight: '300' }}>✕</Text>
        </Pressable>

        <View style={styles.upper}>
          {/* Header */}
          <AnimatedEntry anim={mainAnims[0]}>
            <Text style={{ fontSize: font(13), color: colors.primary, fontWeight: '700', letterSpacing: 1, marginBottom: scale(8) }}>YOUR PLAN IS READY</Text>
            <Text style={[styles.title, { fontSize: font(24), color: colors.ink }]}>
              Unlock Studly to reach your goals
            </Text>
            <Text style={[styles.sub, { fontSize: font(14), color: colors.muted }]}>
              {GOAL_LABELS[data.goal] || 'Crush your homework'} with handwritten solutions, flowcharts, and AI-powered explanations.
            </Text>
          </AnimatedEntry>

          {/* Features */}
          <AnimatedEntry anim={mainAnims[1]} style={{ marginTop: scale(20) }}>
            {[
              ['Unlimited questions', '♾️'],
              ['Handwritten solutions', '✏️'],
              ['Flowchart breakdowns', '📊'],
              ['Custom study plan', '🎯'],
            ].map(([label, icon]) => (
              <View key={label} style={[styles.featureRow, { marginBottom: scale(10) }]}>
                <Text style={{ fontSize: font(18), marginRight: scale(10) }}>{icon}</Text>
                <Text style={{ fontSize: font(14), color: colors.ink, fontWeight: '500' }}>{label}</Text>
              </View>
            ))}
          </AnimatedEntry>

          {/* Plan selection */}
          <View style={{ marginTop: scale(20) }}>
            {/* Yearly */}
            <AnimatedEntry anim={mainAnims[2]}>
              <Pressable
                onPress={() => setSelectedPlan('yearly')}
                style={[
                  styles.planCard,
                  {
                    borderColor: selectedPlan === 'yearly' ? colors.primary : colors.border,
                    borderRadius: scale(14),
                    padding: scale(16),
                    marginBottom: scale(10),
                    backgroundColor: selectedPlan === 'yearly' ? colors.primary + '08' : colors.card,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: font(16), fontWeight: '700', color: colors.ink }}>Yearly</Text>
                      <View style={[styles.badge, { backgroundColor: colors.primary, borderRadius: scale(4), paddingHorizontal: scale(8), paddingVertical: scale(2), marginLeft: scale(8) }]}>
                        <Text style={{ fontSize: font(10), fontWeight: '800', color: '#fff' }}>BEST VALUE</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: scale(4) }}>
                      <Text style={{ fontSize: font(24), fontWeight: '800', color: colors.ink }}>$49.99</Text>
                      <Text style={{ fontSize: font(13), color: colors.muted }}> / year</Text>
                    </View>
                    <Text style={{ fontSize: font(12), color: colors.primary, fontWeight: '600', marginTop: scale(2) }}>$4.17/mo — save 58%</Text>
                  </View>
                  <View style={[styles.radio, { borderColor: selectedPlan === 'yearly' ? colors.primary : colors.border }]}>
                    {selectedPlan === 'yearly' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                  </View>
                </View>
              </Pressable>
            </AnimatedEntry>

            {/* Monthly */}
            <AnimatedEntry anim={mainAnims[3]}>
              <Pressable
                onPress={() => setSelectedPlan('monthly')}
                style={[
                  styles.planCard,
                  {
                    borderColor: selectedPlan === 'monthly' ? colors.primary : colors.border,
                    borderRadius: scale(14),
                    padding: scale(16),
                    backgroundColor: selectedPlan === 'monthly' ? colors.primary + '08' : colors.card,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: font(16), fontWeight: '700', color: colors.ink }}>Monthly</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: scale(4) }}>
                      <Text style={{ fontSize: font(24), fontWeight: '800', color: colors.ink }}>$9.99</Text>
                      <Text style={{ fontSize: font(13), color: colors.muted }}> / month</Text>
                    </View>
                    <Text style={{ fontSize: font(12), color: colors.muted, marginTop: scale(2) }}>$120/yr billed monthly</Text>
                  </View>
                  <View style={[styles.radio, { borderColor: selectedPlan === 'monthly' ? colors.primary : colors.border }]}>
                    {selectedPlan === 'monthly' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                  </View>
                </View>
              </Pressable>
            </AnimatedEntry>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <AnimatedEntry anim={mainAnims[4]}>
        <View style={[styles.bottomCta, { paddingHorizontal: padding, paddingBottom: insets.bottom + scale(16), paddingTop: scale(12), backgroundColor: colors.bg }]}>
          <AnimatedEntry anim={mainAnims[5]}>
            <View style={[styles.trialBadge, { backgroundColor: colors.primary + '12', borderRadius: scale(10), padding: scale(10), marginBottom: scale(12) }]}>
              <Text style={{ fontSize: font(13), color: colors.primary, fontWeight: '600', textAlign: 'center' }}>
                3-day free trial included — cancel anytime
              </Text>
            </View>
          </AnimatedEntry>

          <Animated.View style={{ transform: [{ scale: ctaGlow }] }}>
            <Pressable
              onPress={() => unlock(selectedPlan)}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: colors.primary, borderRadius: scale(14) },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.btnText, { fontSize: font(16) }]}>Start Free Trial</Text>
            </Pressable>
          </Animated.View>

          <Text style={{ fontSize: font(11), color: colors.muted, textAlign: 'center', marginTop: scale(10), lineHeight: font(16) }}>
            You won't be charged for 3 days. Cancel anytime before your trial ends.
          </Text>
        </View>
      </AnimatedEntry>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  upper: { flex: 1, paddingHorizontal: 24, paddingTop: 56, justifyContent: 'center' },
  discountUpper: { flex: 1, paddingHorizontal: 24, paddingTop: 60, justifyContent: 'center' },
  title: { fontWeight: '700', marginBottom: 8 },
  sub: { lineHeight: 22 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  closeBtn: { position: 'absolute', right: 20, zIndex: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  planCard: { borderWidth: 2 },
  badge: {},
  trialBadge: {},
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: 12, height: 12, borderRadius: 6 },
  bottomCta: {},
  btn: { paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  loadingOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  spinner: { width: 48, height: 48, borderRadius: 24, borderWidth: 4 },
  checkCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
