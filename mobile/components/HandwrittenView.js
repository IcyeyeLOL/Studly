import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

/**
 * Renders solution text in a handwritten-style view for a more humanistic feel.
 * Paper-like background, notebook margin, warm ink, and natural typography.
 */
function splitIntoBlocks(text) {
  if (!text || !text.trim()) return [];
  const trimmed = text.trim();
  const byDouble = trimmed.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (byDouble.length > 1) return byDouble;
  const byStep = trimmed.split(/\n(?=Step\s+\d+[:.]?)/i).map((s) => s.trim()).filter(Boolean);
  if (byStep.length > 1) return byStep;
  const byNumber = trimmed.split(/\n(?=\d+[.)]\s)/).map((s) => s.trim()).filter(Boolean);
  if (byNumber.length > 1) return byNumber;
  return [trimmed];
}

const INK_COLOR = '#1a1a1a';
const PAPER_CREAM = '#faf6f0';
const MARGIN_RED = '#c45c4a';
const MARGIN_RED_DARK = '#d47162';

export function HandwrittenView({ text, subject, colors, isDark, scale, font }) {
  const blocks = splitIntoBlocks(text);
  const paperBg = isDark ? (colors?.card ?? '#1a2832') : (PAPER_CREAM);
  const ink = colors?.ink ?? INK_COLOR;
  const borderColor = colors?.border ?? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');
  const marginColor = isDark ? MARGIN_RED_DARK : MARGIN_RED;

  return (
    <View
      style={[
        styles.paper,
        {
          backgroundColor: paperBg,
          borderRadius: scale(14),
          borderWidth: 1,
          borderColor,
          padding: scale(18),
          paddingTop: scale(20),
          paddingLeft: scale(20),
          borderLeftWidth: scale(4),
          borderLeftColor: marginColor,
        },
      ]}
    >
      {subject ? (
        <Text
          selectable
          style={[
            styles.subject,
            {
              fontSize: font(10),
              color: colors?.muted ?? '#6b7280',
              marginBottom: scale(10),
              letterSpacing: 1.2,
            },
          ]}
        >
          {String(subject).toUpperCase()}
        </Text>
      ) : null}
      <View style={styles.content}>
        {blocks.map((block, i) => (
          <View key={i} style={[styles.block, { marginBottom: i < blocks.length - 1 ? scale(14) : 0 }]}>
            <Text
              selectable
              style={[
                styles.handwritten,
                {
                  fontSize: font(15),
                  color: ink,
                  lineHeight: font(24),
                  fontStyle: 'italic',
                  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                  letterSpacing: 0.3,
                },
              ]}
            >
              {block}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  subject: {
    fontWeight: '700',
  },
  content: {},
  block: {},
  handwritten: {},
});
