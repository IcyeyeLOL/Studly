// =============================================================================
// WEAPON RENDERER — Pre-rendered DOOM-style weapon sprites via offscreen canvas
// =============================================================================

import { WEAPON_TYPE } from './gameData';

// Cache: weaponCache[weaponType] = { canvas, offsetY }
let weaponCache = null;
let cachedWidth = 0;
let cachedHeight = 0;

export function getWeaponCache() {
  return weaponCache;
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------
function metalGradient(ctx, x1, y1, x2, y2, baseColor) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  // Parse base color to get tints
  const c = parseColor(baseColor);
  const dark = darken(c, 0.5);
  const mid = darken(c, 0.8);
  const light = lighten(c, 1.4);
  const highlight = lighten(c, 1.8);

  g.addColorStop(0, toCSS(dark));
  g.addColorStop(0.25, toCSS(mid));
  g.addColorStop(0.45, toCSS(highlight));
  g.addColorStop(0.55, toCSS(light));
  g.addColorStop(0.75, toCSS(mid));
  g.addColorStop(1, toCSS(dark));
  return g;
}

function parseColor(hex) {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { r: 128, g: 128, b: 128 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function darken(c, f) {
  return { r: Math.floor(c.r * f), g: Math.floor(c.g * f), b: Math.floor(c.b * f) };
}

function lighten(c, f) {
  return {
    r: Math.min(255, Math.floor(c.r * f)),
    g: Math.min(255, Math.floor(c.g * f)),
    b: Math.min(255, Math.floor(c.b * f)),
  };
}

function toCSS(c) {
  return `rgb(${c.r},${c.g},${c.b})`;
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// PISTOL
// ---------------------------------------------------------------------------
function drawPistol(ctx, w, h) {
  const cx = w / 2;
  const baseY = h;

  // --- Barrel ---
  const barrelW = 22;
  const barrelH = 60;
  const barrelY = baseY - 130;
  ctx.fillStyle = metalGradient(ctx, cx - barrelW / 2, 0, cx + barrelW / 2, 0, '#7a7a7a');
  roundRect(ctx, cx - barrelW / 2, barrelY, barrelW, barrelH, 2);
  ctx.fill();

  // Front sight
  ctx.fillStyle = '#888';
  ctx.fillRect(cx - 2, barrelY - 4, 4, 6);

  // Ejection port
  ctx.fillStyle = '#333';
  ctx.fillRect(cx + barrelW / 2 - 6, barrelY + 10, 5, 12);

  // --- Slide ---
  const slideW = 30;
  const slideH = 28;
  const slideY = barrelY + barrelH - 4;
  ctx.fillStyle = metalGradient(ctx, cx - slideW / 2, 0, cx + slideW / 2, 0, '#606060');
  roundRect(ctx, cx - slideW / 2, slideY, slideW, slideH, 3);
  ctx.fill();

  // Serrations on slide
  ctx.fillStyle = '#4a4a4a';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(cx - slideW / 2 + 2, slideY + 4 + i * 4, slideW - 4, 1);
  }

  // Specular highlight line
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - slideW / 2 + 3, slideY + 2);
  ctx.lineTo(cx + slideW / 2 - 3, slideY + 2);
  ctx.stroke();

  // --- Trigger guard (bezier) ---
  ctx.strokeStyle = '#4a4a4a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 8, slideY + slideH);
  ctx.bezierCurveTo(cx - 10, slideY + slideH + 14, cx + 10, slideY + slideH + 14, cx + 8, slideY + slideH);
  ctx.stroke();

  // Trigger
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(cx - 1, slideY + slideH + 2, 3, 8);

  // --- Grip ---
  const gripW = 26;
  const gripH = 52;
  const gripY = slideY + slideH - 2;
  ctx.fillStyle = '#4a3a2a';
  roundRect(ctx, cx - gripW / 2, gripY, gripW, gripH, 3);
  ctx.fill();

  // Cross-hatch texture on grip
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    // Diagonal one way
    ctx.beginPath();
    ctx.moveTo(cx - gripW / 2 + 3, gripY + 6 + i * 5);
    ctx.lineTo(cx + gripW / 2 - 3, gripY + 6 + i * 5 + 8);
    ctx.stroke();
    // Other way
    ctx.beginPath();
    ctx.moveTo(cx - gripW / 2 + 3, gripY + 6 + i * 5 + 8);
    ctx.lineTo(cx + gripW / 2 - 3, gripY + 6 + i * 5);
    ctx.stroke();
  }

  // Magazine baseplate
  ctx.fillStyle = '#555';
  ctx.fillRect(cx - gripW / 2 + 2, gripY + gripH - 4, gripW - 4, 5);

  // Barrel bore
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(cx, barrelY - 1, 5, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// SHOTGUN
// ---------------------------------------------------------------------------
function drawShotgun(ctx, w, h) {
  const cx = w / 2;
  const baseY = h;

  // --- Double barrels ---
  const barrelSpacing = 10;
  const barrelR = 7;
  const barrelH = 100;
  const barrelY = baseY - 175;

  for (const dx of [-barrelSpacing / 2, barrelSpacing / 2]) {
    // Barrel body with roundness gradient
    ctx.fillStyle = metalGradient(ctx, cx + dx - barrelR, 0, cx + dx + barrelR, 0, '#5a5a5a');
    roundRect(ctx, cx + dx - barrelR, barrelY, barrelR * 2, barrelH, 2);
    ctx.fill();
  }

  // Barrel rib (top center between barrels)
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(cx - 2, barrelY, 4, barrelH * 0.7);

  // Front bead sight
  ctx.fillStyle = '#ccccaa';
  ctx.beginPath();
  ctx.arc(cx, barrelY - 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Barrel rims
  ctx.fillStyle = '#707070';
  for (const dx of [-barrelSpacing / 2, barrelSpacing / 2]) {
    ctx.fillRect(cx + dx - barrelR - 1, barrelY - 2, barrelR * 2 + 2, 4);
  }

  // Bore openings
  ctx.fillStyle = '#0a0a0a';
  for (const dx of [-barrelSpacing / 2, barrelSpacing / 2]) {
    ctx.beginPath();
    ctx.arc(cx + dx, barrelY - 1, barrelR - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Receiver ---
  const recvW = 42;
  const recvH = 30;
  const recvY = barrelY + barrelH;
  ctx.fillStyle = metalGradient(ctx, cx - recvW / 2, 0, cx + recvW / 2, 0, '#4a4a4a');
  roundRect(ctx, cx - recvW / 2, recvY, recvW, recvH, 4);
  ctx.fill();

  // Shell loading port
  ctx.fillStyle = '#222';
  roundRect(ctx, cx - 6, recvY + 8, 12, 16, 2);
  ctx.fill();

  // --- Pump (wood) ---
  const pumpW = 48;
  const pumpH = 14;
  const pumpY = barrelY + barrelH * 0.55;
  ctx.fillStyle = '#6a5030';
  roundRect(ctx, cx - pumpW / 2, pumpY, pumpW, pumpH, 3);
  ctx.fill();
  // Wood grain
  ctx.strokeStyle = '#5a4020';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - pumpW / 2 + 4, pumpY + 3 + i * 3);
    ctx.bezierCurveTo(cx - 8, pumpY + 2 + i * 3, cx + 8, pumpY + 4 + i * 3, cx + pumpW / 2 - 4, pumpY + 3 + i * 3);
    ctx.stroke();
  }

  // --- Stock (wood) ---
  const stockW = 32;
  const stockH = 60;
  const stockY = recvY + recvH - 4;
  ctx.fillStyle = '#6a5030';
  roundRect(ctx, cx - stockW / 2, stockY, stockW, stockH, 4);
  ctx.fill();
  // Wood grain
  ctx.strokeStyle = '#5a4020';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - stockW / 2 + 3, stockY + 6 + i * 9);
    ctx.bezierCurveTo(cx - 5, stockY + 4 + i * 9, cx + 5, stockY + 8 + i * 9, cx + stockW / 2 - 3, stockY + 6 + i * 9);
    ctx.stroke();
  }

  // Butt-plate
  ctx.fillStyle = '#3a3a3a';
  roundRect(ctx, cx - stockW / 2, stockY + stockH - 4, stockW, 6, 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// CHAINGUN
// ---------------------------------------------------------------------------
function drawChaingun(ctx, w, h) {
  const cx = w / 2;
  const baseY = h;

  // --- 4-barrel cluster ---
  const barrelH = 110;
  const barrelY = baseY - 185;
  const barrelR = 3.5;
  const barrelOffsets = [
    [-4, -4], [4, -4], [-4, 4], [4, 4]
  ];

  // Barrel housing
  ctx.fillStyle = metalGradient(ctx, cx - 14, 0, cx + 14, 0, '#555555');
  roundRect(ctx, cx - 12, barrelY, 24, barrelH, 2);
  ctx.fill();

  // Individual barrels
  for (const [dx, dy] of barrelOffsets) {
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.arc(cx + dx, barrelY + barrelH / 2, barrelR, 0, Math.PI * 2);
    ctx.fill();
    // Barrel line
    ctx.fillStyle = '#444';
    ctx.fillRect(cx + dx - 1, barrelY, 2, barrelH);
  }

  // Barrel bores (visible from front)
  ctx.fillStyle = '#0a0a0a';
  for (const [dx, dy] of barrelOffsets) {
    ctx.beginPath();
    ctx.arc(cx + dx, barrelY - 1, barrelR - 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vent slits on barrel housing
  ctx.fillStyle = '#606060';
  for (let i = 0; i < 4; i++) {
    const sy = barrelY + 20 + i * 22;
    ctx.fillRect(cx - 14, sy, 28, 6);
    // Vent holes
    ctx.fillStyle = '#333';
    ctx.fillRect(cx - 10, sy + 1, 20, 4);
    ctx.fillStyle = '#606060';
  }

  // --- Motor housing ---
  const motorW = 36;
  const motorH = 20;
  const motorY = barrelY + barrelH;
  ctx.fillStyle = metalGradient(ctx, cx - motorW / 2, 0, cx + motorW / 2, 0, '#484848');
  roundRect(ctx, cx - motorW / 2, motorY, motorW, motorH, 4);
  ctx.fill();

  // Motor vent slits
  ctx.fillStyle = '#333';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(cx - motorW / 2 + 4, motorY + 4 + i * 5, motorW - 8, 2);
  }

  // --- Receiver ---
  const recvW = 40;
  const recvH = 30;
  const recvY = motorY + motorH;
  ctx.fillStyle = metalGradient(ctx, cx - recvW / 2, 0, cx + recvW / 2, 0, '#484848');
  roundRect(ctx, cx - recvW / 2, recvY, recvW, recvH, 3);
  ctx.fill();

  // Carrying handle
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 8, motorY);
  ctx.bezierCurveTo(cx - 12, motorY - 14, cx + 12, motorY - 14, cx + 8, motorY);
  ctx.stroke();

  // --- Ammo belt + box magazine ---
  const beltX = cx + recvW / 2 - 4;
  const beltY = recvY + 4;
  const boxW = 20;
  const boxH = 38;

  // Box magazine
  ctx.fillStyle = '#5a5530';
  roundRect(ctx, beltX, beltY, boxW, boxH, 3);
  ctx.fill();

  // Brass ammo belt links
  ctx.fillStyle = '#aa9040';
  for (let i = 0; i < 5; i++) {
    roundRect(ctx, beltX + 2, beltY + 3 + i * 7, boxW - 4, 4, 1);
    ctx.fill();
  }
  // Belt connecting to receiver
  ctx.fillStyle = '#8a7030';
  ctx.fillRect(beltX - 4, beltY + 2, 6, 8);

  // --- Grip ---
  const gripW = 26;
  const gripH = 52;
  const gripY = recvY + recvH - 2;
  ctx.fillStyle = '#3a3a3a';
  roundRect(ctx, cx - gripW / 2, gripY, gripW, gripH, 3);
  ctx.fill();

  // Handle (wood/rubber grip)
  ctx.fillStyle = '#4a3a2a';
  roundRect(ctx, cx - gripW / 2 + 2, gripY + 2, gripW - 4, gripH - 6, 2);
  ctx.fill();

  // Grip texture
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - gripW / 2 + 4, gripY + 8 + i * 7);
    ctx.lineTo(cx + gripW / 2 - 4, gripY + 8 + i * 7);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Main init
// ---------------------------------------------------------------------------
export function initWeaponCache(width, height) {
  cachedWidth = width;
  cachedHeight = height;
  weaponCache = {};

  const weapons = [
    { type: WEAPON_TYPE.PISTOL, drawFn: drawPistol, w: 80, h: 180 },
    { type: WEAPON_TYPE.SHOTGUN, drawFn: drawShotgun, w: 100, h: 240 },
    { type: WEAPON_TYPE.MACHINEGUN, drawFn: drawChaingun, w: 110, h: 260 },
  ];

  for (const { type, drawFn, w, h } of weapons) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    drawFn(ctx, w, h);
    weaponCache[type] = { canvas, w, h };
  }

  return weaponCache;
}
