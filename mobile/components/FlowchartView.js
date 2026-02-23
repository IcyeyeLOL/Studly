import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Parses solution text into steps and renders as a flowchart with a hand-drawn feel.
 * Soft shadows, dashed borders, and organic connectors.
 * Filters out divider-only steps (e.g. "---") so they don't appear as their own cards.
 */
function isDividerOnly(step) {
  const t = step.trim();
  if (!t) return true;
  const withoutDividers = t.replace(/[\s\-–—]*/g, '');
  return withoutDividers.length === 0;
}

function parseSteps(text) {
  if (!text || !text.trim()) return [];
  const normalized = text.trim();
  const byDoubleNewline = normalized.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (byDoubleNewline.length > 1) {
    const filtered = byDoubleNewline.filter((s) => !isDividerOnly(s));
    return filtered.length > 0 ? filtered : [normalized];
  }
  const byNumbered = normalized.split(/\n(?=(?:\s*\d+[.)]\s|Step\s+\d))/i).map((s) => s.trim()).filter(Boolean);
  if (byNumbered.length > 1) {
    const filtered = byNumbered.filter((s) => !isDividerOnly(s));
    return filtered.length > 0 ? filtered : [normalized];
  }
  const bySingle = normalized.split(/\n/).map((s) => s.trim()).filter(Boolean);
  if (bySingle.length > 1) {
    const filtered = bySingle.filter((s) => !isDividerOnly(s));
    return filtered.length > 0 ? filtered : [normalized];
  }
  return [normalized];
}

/**
 * Removes a redundant "Step N: Title" line from the start of step content
 * so we only show the blue step label, not a duplicate in black.
 */
function stripRedundantStepHeader(step) {
  const trimmed = step.trim();
  const lines = trimmed.split(/\n/);
  const first = lines[0]?.trim() || '';
  if (/^Step\s+\d+[.:]?\s*.+$/i.test(first)) {
    const rest = lines.slice(1).join('\n').trim();
    return rest || first.replace(/^Step\s+\d+[.:]?\s*/i, '').trim();
  }
  return trimmed;
}

function ArrowDownHandDrawn({ size = 24, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ alignSelf: 'center' }}>
      <Path
        d="M12 3v14m0 0l-3.5-3.5m3.5 3.5l3.5-3.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 3"
        fill="none"
      />
    </Svg>
  );
}

export function FlowchartView({ text, subject, colors, isDark, scale, font }) {
  const steps = parseSteps(text);
  const primary = colors?.primary ?? '#5fc4e0';
  const cardBg = colors?.card ?? (isDark ? '#1a2832' : '#fff');
  const borderColor = colors?.border ?? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)');
  const ink = colors?.ink ?? (isDark ? '#e8f4f8' : '#1a1a1a');

  return (
    <View style={styles.column}>
      {subject ? (
        <Text
          selectable
          style={[
            styles.subject,
            {
              fontSize: font(10),
              color: colors?.muted || '#6b7280',
              marginBottom: scale(10),
              letterSpacing: 1,
              textAlign: 'center',
            },
          ]}
        >
          {String(subject).toUpperCase()}
        </Text>
      ) : null}
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <View
            style={[
              styles.node,
              {
                backgroundColor: cardBg,
                borderRadius: scale(14),
                borderWidth: 1.5,
                borderColor,
                borderStyle: 'dashed',
                padding: scale(16),
                marginHorizontal: scale(2),
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              },
            ]}
          >
            <Text
              selectable
              style={[
                styles.stepLabel,
                {
                  fontSize: font(11),
                  color: primary,
                  marginBottom: scale(6),
                  fontWeight: '700',
                  letterSpacing: 0.5,
                },
              ]}
            >
              {steps.length > 1 ? `Step ${i + 1}` : 'Solution'}
            </Text>
            <Text
              selectable
              style={[
                styles.stepText,
                {
                  fontSize: font(14),
                  color: ink,
                  lineHeight: font(22),
                  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                },
              ]}
            >
              {stripRedundantStepHeader(step)}
            </Text>
          </View>
          {i < steps.length - 1 ? (
            <View style={{ paddingVertical: scale(8) }}>
              <ArrowDownHandDrawn size={scale(28)} color={primary} />
            </View>
          ) : null}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'stretch',
  },
  subject: {
    fontWeight: '700',
  },
  node: {},
  stepLabel: {},
  stepText: {},
});
