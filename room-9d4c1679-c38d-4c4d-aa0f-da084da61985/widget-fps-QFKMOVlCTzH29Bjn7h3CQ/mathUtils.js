// =============================================================================
// MATH UTILITIES
// =============================================================================

export const degToRad = (degrees) => degrees * (Math.PI / 180);

export const radToDeg = (radians) => radians * (180 / Math.PI);

export const distance = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const normalizeAngle = (angle) => {
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) {
    normalized += 2 * Math.PI;
  }
  return normalized;
};

export const lerp = (a, b, t) => a + (b - a) * t;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const inBounds = (x, y, width, height) => x >= 0 && x < width && y >= 0 && y < height;

/**
 * Parse a hex color to RGB components
 * @param {string} hex - Hex color string (e.g., '#ff0000')
 * @returns {{r: number, g: number, b: number}}
 */
export const hexToRgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});
