import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path, Rect, Line, G, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

/**
 * Advanced charts: line, bar, area, pie, donut, barh, scatter.
 * Multi-series, secondary y-axis, grid, legend. Entrance animation via Reanimated.
 */
const PADDING = { top: 12, right: 12, bottom: 32, left: 44 };
const PADDING_RIGHT_SECONDARY = 36;
const CHART_WIDTH = 300;
const CHART_HEIGHT = 180;
const AXIS_COLOR = 'rgba(128,128,128,0.45)';
const GRID_COLOR = 'rgba(128,128,128,0.2)';

const SERIES_COLORS = ['#5fc4e0', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

function getSeriesColor(index, primary) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function ChartWrapper({ children, scale }) {
  const opacity = useSharedValue(0);
  const scaleVal = useSharedValue(0.92);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 280 });
    scaleVal.value = withSpring(1, { damping: 14, stiffness: 120 });
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scaleVal.value }],
  }));
  return (
    <Animated.View style={[styles.animatedWrap, { marginVertical: scale(12) }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

export function ChartView({
  chartType,
  title,
  yAxisLabel,
  labels,
  values,
  seriesLabels = [],
  seriesValues = [],
  xValues = [],
  secondaryValues = [],
  secondaryLabel = '',
  colors,
  isDark,
  scale,
  font,
}) {
  const primary = colors?.primary ?? '#5fc4e0';
  const muted = colors?.muted ?? '#6b7280';
  const hasSecondary = secondaryValues && secondaryValues.length > 0;
  const rightPad = hasSecondary ? PADDING_RIGHT_SECONDARY : PADDING.right;

  const hasMulti = seriesValues.length > 0;
  const dataSeries = hasMulti ? seriesValues : (values && values.length ? [values] : []);
  const n = dataSeries[0]?.length ?? 0;
  if (n === 0 && chartType !== 'scatter') return null;

  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const innerWidth = width - PADDING.left - rightPad;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  // ─── Scatter ───────────────────────────────────────────────────────────
  if (chartType === 'scatter' && xValues.length > 0 && seriesValues.length > 0) {
    const allX = xValues;
    const allY = seriesValues.flat();
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const xRange = (maxX - minX) || 1;
    const yRange = (maxY - minY) || 1;
    const xScale = (x) => PADDING.left + ((x - minX) / xRange) * innerWidth;
    const yScale = (y) => PADDING.top + innerHeight - ((y - minY) / yRange) * innerHeight;

    return (
      <ChartWrapper scale={scale}>
        <View style={styles.wrapper}>
          {title ? <Text style={[styles.title, { fontSize: font(12), color: muted, marginBottom: scale(6) }]} numberOfLines={2}>{title}</Text> : null}
          <Svg width={width} height={height} style={styles.svg}>
            <Line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + innerHeight} stroke={AXIS_COLOR} strokeWidth={1} />
            <Line x1={PADDING.left} y1={PADDING.top + innerHeight} x2={PADDING.left + innerWidth} y2={PADDING.top + innerHeight} stroke={AXIS_COLOR} strokeWidth={1} />
            {seriesValues.map((ys, seriesIdx) => (
              <G key={seriesIdx}>
                {ys.map((y, i) => {
                  const x = xValues[i];
                  if (x == null || y == null) return null;
                  return (
                    <Circle key={i} cx={xScale(x)} cy={yScale(y)} r={5} fill={getSeriesColor(seriesIdx, primary)} stroke={isDark ? '#1a2832' : '#fff'} strokeWidth={1.5} />
                  );
                })}
              </G>
            ))}
          </Svg>
          {hasMulti && seriesLabels.length > 0 && (
            <View style={[styles.legendWrap, { marginTop: scale(6), flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'center' }]}>
              {seriesLabels.slice(0, seriesValues.length).map((name, i) => (
                <View key={i} style={[styles.legendItem, { marginHorizontal: scale(6) }]}>
                  <View style={[styles.legendDot, { backgroundColor: getSeriesColor(i, primary) }]} />
                  <Text style={[styles.legendText, { fontSize: font(11), color: muted }]} numberOfLines={1}>{name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ChartWrapper>
    );
  }

  // ─── Horizontal bar (barh) ─────────────────────────────────────────────
  if (chartType === 'barh') {
    const singleValues = values && values.length ? values : dataSeries[0];
    const maxV = Math.max(...singleValues, 1);
    const barH = Math.max(14, (innerHeight / singleValues.length) * 0.7);
    const gap = innerHeight / singleValues.length;
    const xScaleBarh = (v) => PADDING.left + (v / maxV) * innerWidth;
    const yPos = (i) => PADDING.top + i * gap + (gap - barH) / 2;

    return (
      <ChartWrapper scale={scale}>
        <View style={styles.wrapper}>
          {title ? <Text style={[styles.title, { fontSize: font(12), color: muted, marginBottom: scale(6) }]} numberOfLines={2}>{title}</Text> : null}
          <Svg width={width} height={height} style={styles.svg}>
            <Line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + innerHeight} stroke={AXIS_COLOR} strokeWidth={1} />
            <Line x1={PADDING.left} y1={PADDING.top + innerHeight} x2={PADDING.left + innerWidth} y2={PADDING.top + innerHeight} stroke={AXIS_COLOR} strokeWidth={1} />
            {singleValues.map((v, i) => (
              <Rect key={i} x={PADDING.left} y={yPos(i)} width={Math.max(4, xScaleBarh(v) - PADDING.left)} height={barH} fill={primary} rx={4} opacity={0.9} />
            ))}
          </Svg>
          <View style={{ marginLeft: PADDING.left, width: innerWidth, marginTop: 2 }}>
            {(labels || singleValues.map((_, i) => `Item ${i + 1}`)).slice(0, singleValues.length).map((label, i) => (
              <View key={i} style={{ height: Math.max(gap - 2, 20), justifyContent: 'center' }}>
                <Text style={[styles.barhLabel, { fontSize: font(10), color: muted }]} numberOfLines={1}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ChartWrapper>
    );
  }

  // ─── Pie / Donut ───────────────────────────────────────────────────────
  if (chartType === 'pie' || chartType === 'donut') {
    const singleValues = values && values.length ? values : dataSeries[0];
    const total = singleValues.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    const radius = Math.min(innerWidth, innerHeight) / 2 - 8;
    const innerRadius = chartType === 'donut' ? radius * 0.52 : 0;
    const cx = PADDING.left + innerWidth / 2;
    const cy = PADDING.top + innerHeight / 2;
    let startAngle = -90;
    const pieLabels = labels?.length ? labels : singleValues.map((_, i) => `Item ${i + 1}`);

    const slices = singleValues.map((v, i) => {
      const angle = (v / total) * 360;
      const endAngle = startAngle + angle;
      const rad1 = (startAngle * Math.PI) / 180;
      const rad2 = (endAngle * Math.PI) / 180;
      const x1 = cx + radius * Math.cos(rad1);
      const y1 = cy + radius * Math.sin(rad1);
      const x2 = cx + radius * Math.cos(rad2);
      const y2 = cy + radius * Math.sin(rad2);
      const xi1 = cx + innerRadius * Math.cos(rad1);
      const yi1 = cy + innerRadius * Math.sin(rad1);
      const xi2 = cx + innerRadius * Math.cos(rad2);
      const yi2 = cy + innerRadius * Math.sin(rad2);
      const large = angle > 180 ? 1 : 0;
      const d = chartType === 'donut'
        ? `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerRadius} ${innerRadius} 0 ${large} 0 ${xi1} ${yi1} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
      startAngle = endAngle;
      return { d, color: getSeriesColor(i, primary), label: pieLabels[i], value: v, pct: ((v / total) * 100).toFixed(0) };
    });

    return (
      <ChartWrapper scale={scale}>
        <View style={styles.wrapper}>
          {title ? <Text style={[styles.title, { fontSize: font(12), color: muted, marginBottom: scale(6) }]} numberOfLines={2}>{title}</Text> : null}
          <Svg width={width} height={height} style={styles.svg}>
            <Defs>
              {slices.map((s, i) => (
                <LinearGradient key={i} id={`pie-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={s.color} stopOpacity={1} />
                  <Stop offset="100%" stopColor={s.color} stopOpacity={0.75} />
                </LinearGradient>
              ))}
            </Defs>
            {slices.map((s, i) => (
              <Path key={i} d={s.d} fill={`url(#pie-${i})`} stroke={isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)'} strokeWidth={1} />
            ))}
          </Svg>
          <View style={[styles.legendWrap, { marginTop: scale(6) }]}>
            {slices.map((s, i) => (
              <View key={i} style={[styles.legendItem, { marginRight: scale(12) }]}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <Text style={[styles.legendText, { fontSize: font(11), color: muted }]} numberOfLines={1}>{s.label} ({s.pct}%)</Text>
              </View>
            ))}
          </View>
        </View>
      </ChartWrapper>
    );
  }

  // ─── Line / Bar / Area (cartesian) with optional secondary y-axis ───────
  const allValues = hasMulti ? dataSeries.flat() : values;
  const withSecondary = hasSecondary ? [...allValues, ...secondaryValues] : allValues;
  const minVal = Math.min(...withSecondary);
  const maxVal = Math.max(...withSecondary);
  const yBase = minVal < 0 ? 0 : minVal;
  const yRange = (maxVal - yBase) || 1;
  const yScale = (v) => PADDING.top + innerHeight - ((v - yBase) / yRange) * innerHeight;

  const secMin = hasSecondary ? Math.min(...secondaryValues) : 0;
  const secMax = hasSecondary ? Math.max(...secondaryValues) : 1;
  const secBase = secMin < 0 ? 0 : secMin;
  const secRange = (secMax - secBase) || 1;
  const secondaryYScale = (v) => PADDING.top + innerHeight - ((v - secBase) / secRange) * innerHeight;
  const secTicks = 4;
  const secTickValues = [];
  for (let t = 0; t <= secTicks; t++) secTickValues.push(secBase + (secRange * t) / secTicks);

  const xScale = (i) => PADDING.left + (i / Math.max(n - 1, 1)) * innerWidth;
  const yTicks = 4;
  const yTickValues = [];
  for (let t = 0; t <= yTicks; t++) yTickValues.push(yBase + (yRange * t) / yTicks);

  const barMinHeight = (chartType === 'bar' && yRange === 0) ? 8 : 0;
  const barHeight = (v) => {
    const h = yScale(yBase) - yScale(v);
    return chartType === 'bar' && Math.abs(h) < 1 ? (v >= 0 ? barMinHeight : -barMinHeight) : h;
  };

  return (
    <ChartWrapper scale={scale}>
      <View style={styles.wrapper}>
        {title ? <Text style={[styles.title, { fontSize: font(12), color: muted, marginBottom: 4 }]} numberOfLines={2}>{title}</Text> : null}
        {yAxisLabel ? <Text style={[styles.yAxisLabel, { fontSize: font(9), color: muted, marginBottom: 2 }]} numberOfLines={1}>{yAxisLabel}</Text> : null}
        <Svg width={width} height={height} style={styles.svg}>
          {yTickValues.map((v, i) => (
            <Line key={i} x1={PADDING.left} y1={yScale(v)} x2={PADDING.left + innerWidth} y2={yScale(v)} stroke={GRID_COLOR} strokeWidth={1} strokeDasharray="4 3" />
          ))}
          <Line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + innerHeight} stroke={AXIS_COLOR} strokeWidth={1} />
          <Line x1={PADDING.left} y1={PADDING.top + innerHeight} x2={PADDING.left + innerWidth} y2={PADDING.top + innerHeight} stroke={AXIS_COLOR} strokeWidth={1} />
          {hasSecondary && (
            <>
              <Line x1={width - rightPad} y1={PADDING.top} x2={width - rightPad} y2={PADDING.top + innerHeight} stroke={AXIS_COLOR} strokeWidth={1} />
              {secTickValues.map((v, i) => (
                <SvgText key={i} x={width - rightPad + 6} y={secondaryYScale(v) + 4} fill={muted} fontSize={font(9)} textAnchor="start">
                  {v === Math.floor(v) ? String(Math.round(v)) : v.toFixed(1)}
                </SvgText>
              ))}
            </>
          )}
          {yTickValues.map((v, i) => (
            <SvgText key={i} x={PADDING.left - 6} y={yScale(v) + 4} fill={muted} fontSize={font(9)} textAnchor="end">
              {v === Math.floor(v) ? String(Math.round(v)) : v.toFixed(1)}
            </SvgText>
          ))}
          {dataSeries.map((series, seriesIdx) => {
            const color = hasMulti ? getSeriesColor(seriesIdx, primary) : primary;
            if (chartType === 'bar') {
              const numSeries = dataSeries.length;
              const barW = Math.max(6, (innerWidth / n) * 0.8 / numSeries - 2);
              const barGap = innerWidth / n;
              const xOffset = PADDING.left + (barGap - barW * numSeries - (numSeries - 1) * 2) / 2;
              return (
                <G key={seriesIdx}>
                  {series.map((v, i) => {
                    const h = barHeight(v);
                    const x = xOffset + i * barGap + seriesIdx * (barW + 2);
                    return (
                      <Rect key={i} x={x} y={h >= 0 ? yScale(v) : yScale(v) + h} width={barW} height={Math.abs(h)} fill={color} rx={3} opacity={0.9} />
                    );
                  })}
                </G>
              );
            }
            const pathD = series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`).join(' ');
            const areaD = chartType === 'area' ? `${pathD} L ${xScale(series.length - 1)} ${yScale(yBase)} L ${xScale(0)} ${yScale(yBase)} Z` : null;
            return (
              <G key={seriesIdx}>
                {chartType === 'area' && areaD && <Path d={areaD} fill={color} opacity={0.35} />}
                <Path d={pathD} stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {series.map((v, i) => (
                  <Circle key={i} cx={xScale(i)} cy={yScale(v)} r={3.5} fill={color} stroke={isDark ? '#1a2832' : '#fff'} strokeWidth={1} />
                ))}
              </G>
            );
          })}
          {hasSecondary && (
            <G>
              <Path
                d={secondaryValues.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${secondaryYScale(v)}`).join(' ')}
                stroke={getSeriesColor(dataSeries.length, primary)}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray="6 4"
              />
              {secondaryValues.map((v, i) => (
                <Circle key={i} cx={xScale(i)} cy={secondaryYScale(v)} r={3.5} fill={getSeriesColor(dataSeries.length, primary)} stroke={isDark ? '#1a2832' : '#fff'} strokeWidth={1} />
              ))}
            </G>
          )}
        </Svg>
        <View style={[styles.labelsRow, { marginLeft: PADDING.left, width: innerWidth, marginTop: 4 }]}>
          {(labels || []).slice(0, n).map((label, i) => (
            <Text key={i} style={[styles.label, { fontSize: font(10), color: muted, flex: 1 }]} numberOfLines={1}>{label}</Text>
          ))}
        </View>
        {hasMulti && seriesLabels.length > 0 && (
          <View style={[styles.legendWrap, { marginTop: scale(8), flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'center' }]}>
            {seriesLabels.slice(0, dataSeries.length).map((name, i) => (
              <View key={i} style={[styles.legendItem, { marginHorizontal: scale(6) }]}>
                <View style={[styles.legendDot, { backgroundColor: getSeriesColor(i, primary) }]} />
                <Text style={[styles.legendText, { fontSize: font(11), color: muted }]} numberOfLines={1}>{name}</Text>
              </View>
            ))}
            {hasSecondary && secondaryLabel && (
              <View style={[styles.legendItem, { marginHorizontal: scale(6) }]}>
                <View style={[styles.legendDot, { backgroundColor: getSeriesColor(dataSeries.length, primary) }]} />
                <Text style={[styles.legendText, { fontSize: font(11), color: muted }]} numberOfLines={1}>{secondaryLabel}</Text>
              </View>
            )}
          </View>
        )}
        {!hasMulti && hasSecondary && secondaryLabel && (
          <View style={[styles.legendWrap, { marginTop: scale(6) }]}>
            <View style={[styles.legendItem, { marginRight: scale(12) }]}>
              <View style={[styles.legendDot, { backgroundColor: primary }]} />
              <Text style={[styles.legendText, { fontSize: font(11), color: muted }]}>{yAxisLabel || 'Primary'}</Text>
            </View>
            <View style={[styles.legendItem]}>
              <View style={[styles.legendDot, { backgroundColor: getSeriesColor(1, primary) }]} />
              <Text style={[styles.legendText, { fontSize: font(11), color: muted }]}>{secondaryLabel}</Text>
            </View>
          </View>
        )}
      </View>
    </ChartWrapper>
  );
}

const styles = StyleSheet.create({
  animatedWrap: { alignItems: 'center' },
  wrapper: { alignItems: 'center' },
  svg: {},
  title: { textAlign: 'center' },
  yAxisLabel: { textAlign: 'center' },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  label: { textAlign: 'center' },
  barhLabel: {},
  legendWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: {},
});
