/**
 * Parses answer text that may contain [CHART ...] blocks into segments.
 * Types: line, bar, area, pie, donut, barh, scatter.
 * Multi-series: seriesLabels + values with | (pipe-separated rows).
 * Scatter: xValues + yValues (numeric axes); multi-series: xValues once, yValues: a,b,c | d,e,f.
 * Secondary y-axis: secondaryValues + secondaryLabel (one extra series on right axis).
 */

const CHART_START = /\[CHART\s+type=(line|bar|area|pie|donut|barh|scatter)\s*\]/i;
const CHART_END = '[/CHART]';

function parseNumberList(str) {
  return str.split(',').map((s) => parseFloat(s.trim())).filter((n) => !Number.isNaN(n));
}

function parseChartBlock(innerText) {
  const lines = innerText.split('\n').map((s) => s.trim()).filter(Boolean);
  let title = '';
  let yAxisLabel = '';
  let labels = [];
  let values = [];
  let seriesLabels = [];
  let seriesValues = [];
  let xValues = [];
  let yValues = [];
  let scatterSeriesY = []; // for multi-series scatter: [ [y1,y2,...], [y1,y2,...] ]
  let secondaryValues = [];
  let secondaryLabel = '';
  let logScale = false;

  for (const line of lines) {
    if (/^logScale\s*:\s*/i.test(line)) {
      logScale = /^logScale\s*:\s*true/i.test(line);
      continue;
    }
    if (/^title\s*:\s*/i.test(line)) {
      title = line.replace(/^title\s*:\s*/i, '').trim();
      continue;
    }
    if (/^yAxisLabel\s*:\s*/i.test(line)) {
      yAxisLabel = line.replace(/^yAxisLabel\s*:\s*/i, '').trim();
      continue;
    }
    if (/^labels\s*:\s*/i.test(line)) {
      const rest = line.replace(/^labels\s*:\s*/i, '');
      labels = rest.split(',').map((s) => s.trim()).filter(Boolean);
      continue;
    }
    if (/^seriesLabels\s*:\s*/i.test(line)) {
      const rest = line.replace(/^seriesLabels\s*:\s*/i, '');
      seriesLabels = rest.split(',').map((s) => s.trim()).filter(Boolean);
      continue;
    }
    if (/^xValues\s*:\s*/i.test(line)) {
      xValues = parseNumberList(line.replace(/^xValues\s*:\s*/i, ''));
      continue;
    }
    if (/^yValues\s*:\s*/i.test(line)) {
      const rest = line.replace(/^yValues\s*:\s*/i, '').trim();
      if (rest.includes('|')) {
        scatterSeriesY = rest.split('|').map((row) => parseNumberList(row.trim())).filter((arr) => arr.length > 0);
      } else {
        yValues = parseNumberList(rest);
      }
      continue;
    }
    if (/^secondaryValues\s*:\s*/i.test(line)) {
      secondaryValues = parseNumberList(line.replace(/^secondaryValues\s*:\s*/i, ''));
      continue;
    }
    if (/^secondaryLabel\s*:\s*/i.test(line)) {
      secondaryLabel = line.replace(/^secondaryLabel\s*:\s*/i, '').trim();
      continue;
    }
    if (/^values\s*:\s*/i.test(line)) {
      const rest = line.replace(/^values\s*:\s*/i, '').trim();
      if (rest.includes('|')) {
        seriesValues = rest.split('|').map((row) => parseNumberList(row.trim())).filter((arr) => arr.length > 0);
      } else {
        values = parseNumberList(rest);
      }
      continue;
    }
  }

  // Scatter: xValues + yValues (or yValues with | for multi-series)
  if (xValues.length > 0 && (yValues.length > 0 || scatterSeriesY.length > 0)) {
    const ySeries = scatterSeriesY.length > 0 ? scatterSeriesY : [yValues];
    const n = Math.min(xValues.length, ...ySeries.map((arr) => arr.length));
    if (n === 0) return null;
    return {
      type: 'chart',
      chartType: 'scatter',
      title: title || '',
      yAxisLabel: yAxisLabel || '',
      labels: xValues.slice(0, n).map(String),
      values: null,
      xValues: xValues.slice(0, n),
      yValues: null,
      seriesLabels: seriesLabels.slice(0, ySeries.length),
      seriesValues: ySeries.map((arr) => arr.slice(0, n)),
      logScale,
    };
  }

  // Secondary y-axis: add to existing line/bar/area
  const hasSecondary = secondaryValues.length > 0 && secondaryValues.length === (values?.length ?? seriesValues[0]?.length ?? 0);

  const hasMultiSeries = seriesValues.length > 0;
  if (hasMultiSeries) {
    const n = Math.min(labels.length, ...seriesValues.map((arr) => arr.length));
    if (n === 0) return null;
    const out = {
      type: 'chart',
      chartType: 'line',
      title: title || '',
      yAxisLabel: yAxisLabel || '',
      labels: labels.slice(0, n),
      values: null,
      seriesLabels: seriesLabels.slice(0, seriesValues.length),
      seriesValues: seriesValues.map((arr) => arr.slice(0, n)),
      logScale,
    };
    if (hasSecondary) {
      out.secondaryValues = secondaryValues.slice(0, n);
      out.secondaryLabel = secondaryLabel;
    }
    return out;
  }

  if (labels.length === 0 && values.length === 0) return null;
  const n = Math.min(labels.length || values.length, values.length || labels.length);
  if (n === 0) return null;

  const out = {
    type: 'chart',
    chartType: 'line',
    title: title || '',
    yAxisLabel: yAxisLabel || '',
    labels: labels.length ? labels.slice(0, n) : values.map((_, i) => String(i + 1)),
    values: values.slice(0, n),
    seriesLabels: [],
    seriesValues: [],
    logScale,
  };
  if (hasSecondary) {
    out.secondaryValues = secondaryValues.slice(0, n);
    out.secondaryLabel = secondaryLabel;
  }
  return out;
}

/**
 * @param {string} text - Full answer text possibly containing [CHART type=...] ... [/CHART] blocks
 */
export function parseAnswerWithCharts(text) {
  if (!text || typeof text !== 'string') return [{ type: 'text', value: '' }];

  const segments = [];
  let remaining = text;

  while (remaining.length > 0) {
    const startMatch = remaining.match(CHART_START);
    if (!startMatch) {
      segments.push({ type: 'text', value: remaining });
      break;
    }

    const type = startMatch[1].toLowerCase();
    const before = remaining.slice(0, startMatch.index);
    if (before.trim()) segments.push({ type: 'text', value: before });

    const afterStart = remaining.slice(startMatch.index + startMatch[0].length);
    const endIdx = afterStart.indexOf(CHART_END);
    if (endIdx === -1) {
      segments.push({ type: 'text', value: remaining.slice(startMatch.index) });
      break;
    }

    const inner = afterStart.slice(0, endIdx);
    const parsed = parseChartBlock(inner);
    if (parsed) {
      parsed.chartType = type;
      segments.push(parsed);
    } else {
      segments.push({ type: 'text', value: remaining.slice(startMatch.index, startMatch.index + startMatch[0].length + endIdx + CHART_END.length) });
    }

    remaining = afterStart.slice(endIdx + CHART_END.length);
  }

  if (segments.length === 0) return [{ type: 'text', value: text }];
  return segments;
}
