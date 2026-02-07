// =============================================================================
// SPRITE RENDERER — Pre-rendered DOOM-style enemy sprites via offscreen canvas
// =============================================================================
// Draws detailed sprites at high res, downscales to ~24x30, then upscales to
// 64x80 with nearest-neighbor for chunky pixel-art look.

import { ENEMY_TYPE, ENEMY_STATE } from './gameData';

// Cache: spriteCache[type][state][frameIdx] = offscreen canvas
let spriteCache = null;

// Sprite dimensions per type
const SPRITE_DIMS = {
  [ENEMY_TYPE.GRUNT]:   { w: 64, h: 80 },
  [ENEMY_TYPE.SOLDIER]: { w: 64, h: 80 },
  [ENEMY_TYPE.DEMON]:   { w: 80, h: 72 },
};

// Aspect ratios for rendering (width / height)
export const SPRITE_ASPECT = {
  [ENEMY_TYPE.GRUNT]:   0.6,
  [ENEMY_TYPE.SOLDIER]: 0.6,
  [ENEMY_TYPE.DEMON]:   1.1,
};

export function getSpriteCache() {
  return spriteCache;
}

export function getSpriteDims(type) {
  return SPRITE_DIMS[type] || SPRITE_DIMS[ENEMY_TYPE.GRUNT];
}

// ---------------------------------------------------------------------------
// Pixelation helper: draw at high-res, downscale, then upscale nearest-neighbor
// ---------------------------------------------------------------------------
function pixelate(canvas, lowW, lowH) {
  const w = canvas.width;
  const h = canvas.height;

  // Downscale to low-res
  const low = document.createElement('canvas');
  low.width = lowW;
  low.height = lowH;
  const lCtx = low.getContext('2d');
  lCtx.imageSmoothingEnabled = true;
  lCtx.drawImage(canvas, 0, 0, lowW, lowH);

  // Upscale back with nearest-neighbor
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, w, h);
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------
function makeGradient(ctx, x1, y1, x2, y2, stops) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const [offset, color] of stops) {
    g.addColorStop(offset, color);
  }
  return g;
}

function ellipse(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
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
// GRUNT (Zombie) sprite drawing
// ---------------------------------------------------------------------------
function drawGrunt(ctx, w, h, state, frame) {
  const cx = w / 2;

  // Colors
  const skinDark = '#6b3a2a';
  const skinMid = '#8b5e3c';
  const skinLight = '#a07050';
  const uniform = '#5a4a30';
  const uniformDark = '#3a2a18';
  const uniformTorn = '#4a3820';
  const boot = '#2a2218';
  const ribColor = '#c8a090';
  const eyeRed = '#ff3333';
  const eyeDim = '#cc2200';
  const bloodRed = '#8b1a1a';

  if (state === ENEMY_STATE.DEAD) {
    // Collapsed horizontal pile
    const baseY = h * 0.65;
    // Blood pool
    ctx.fillStyle = '#4a0808';
    ellipse(ctx, cx, h * 0.85, w * 0.42, h * 0.12);
    ctx.fill();
    // Body mound
    ctx.fillStyle = makeGradient(ctx, 0, baseY, 0, h * 0.95,
      [[0, uniformTorn], [0.5, skinDark], [1, bloodRed]]);
    ellipse(ctx, cx, h * 0.78, w * 0.38, h * 0.16);
    ctx.fill();
    // Head lump
    ctx.fillStyle = skinDark;
    ellipse(ctx, cx - w * 0.2, h * 0.72, w * 0.12, h * 0.08);
    ctx.fill();
    // Eye (dead)
    ctx.fillStyle = '#440000';
    ctx.beginPath();
    ctx.arc(cx - w * 0.24, h * 0.70, 2, 0, Math.PI * 2);
    ctx.fill();
    // Arm sprawled
    ctx.fillStyle = skinDark;
    ctx.fillRect(cx + w * 0.1, h * 0.73, w * 0.25, h * 0.04);
    pixelate(ctx.canvas, 24, 30);
    return;
  }

  // Lean offset for CHASE / HURT
  let lean = 0;
  if (state === ENEMY_STATE.CHASE) lean = (frame === 0 ? -2 : 2);
  if (state === ENEMY_STATE.HURT) lean = 5;

  // --- Legs ---
  const legY = h * 0.68;
  const legH = h * 0.22;
  const legW = w * 0.10;
  const legSpread = (state === ENEMY_STATE.CHASE)
    ? (frame === 0 ? 6 : -4) : 0;

  // Left leg
  ctx.fillStyle = uniformDark;
  ctx.fillRect(cx - w * 0.14 - legSpread / 2 + lean, legY, legW, legH);
  // Right leg
  ctx.fillRect(cx + w * 0.06 + legSpread / 2 + lean, legY, legW, legH);

  // Boots
  ctx.fillStyle = boot;
  ctx.fillRect(cx - w * 0.16 - legSpread / 2 + lean, legY + legH - h * 0.04, legW + 4, h * 0.06);
  ctx.fillRect(cx + w * 0.04 + legSpread / 2 + lean, legY + legH - h * 0.04, legW + 4, h * 0.06);

  // --- Torso ---
  const torsoTop = h * 0.28;
  const torsoH = h * 0.42;
  ctx.fillStyle = makeGradient(ctx, cx - w * 0.2, 0, cx + w * 0.2, 0,
    [[0, uniformDark], [0.3, uniform], [0.7, uniformTorn], [1, uniformDark]]);
  roundRect(ctx, cx - w * 0.20 + lean, torsoTop, w * 0.40, torsoH, 4);
  ctx.fill();

  // Torn uniform - exposed flesh on right side
  ctx.fillStyle = skinMid;
  ctx.fillRect(cx + w * 0.05 + lean, torsoTop + h * 0.08, w * 0.12, h * 0.18);
  // Ribs
  ctx.strokeStyle = ribColor;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.06 + lean, torsoTop + h * 0.10 + i * 6);
    ctx.lineTo(cx + w * 0.16 + lean, torsoTop + h * 0.11 + i * 6);
    ctx.stroke();
  }

  // Belt
  ctx.fillStyle = '#3a3028';
  ctx.fillRect(cx - w * 0.20 + lean, torsoTop + torsoH - h * 0.04, w * 0.40, h * 0.04);

  // --- Arms ---
  const armY = torsoTop + h * 0.06;
  const armW = w * 0.09;

  if (state === ENEMY_STATE.ATTACK) {
    // Attack: arm extended with claw
    const extDir = frame === 0 ? 1 : -1;
    const armExtX = extDir > 0 ? cx + w * 0.20 + lean : cx - w * 0.28 + lean;
    // Extended arm
    ctx.fillStyle = skinMid;
    ctx.fillRect(armExtX, armY + h * 0.04, w * 0.22, armW);
    // Claw
    ctx.fillStyle = '#4a2a1a';
    const clawX = extDir > 0 ? armExtX + w * 0.20 : armExtX - w * 0.06;
    ctx.beginPath();
    ctx.moveTo(clawX, armY + h * 0.02);
    ctx.lineTo(clawX + extDir * 8, armY);
    ctx.lineTo(clawX + extDir * 4, armY + h * 0.05);
    ctx.lineTo(clawX + extDir * 10, armY + h * 0.06);
    ctx.lineTo(clawX + extDir * 4, armY + h * 0.08);
    ctx.lineTo(clawX + extDir * 8, armY + h * 0.12);
    ctx.lineTo(clawX, armY + h * 0.10);
    ctx.closePath();
    ctx.fill();
    // Other arm hangs
    const otherX = extDir > 0 ? cx - w * 0.28 + lean : cx + w * 0.20 + lean;
    ctx.fillStyle = skinDark;
    ctx.fillRect(otherX, armY, armW, h * 0.22);
  } else {
    // Normal arms at sides
    ctx.fillStyle = skinDark;
    ctx.fillRect(cx - w * 0.28 + lean, armY, armW, h * 0.24);
    ctx.fillStyle = skinMid;
    ctx.fillRect(cx + w * 0.20 + lean, armY, armW, h * 0.24);
    // Hands
    ctx.fillStyle = skinLight;
    ellipse(ctx, cx - w * 0.24 + lean, armY + h * 0.26, 4, 5);
    ctx.fill();
    ellipse(ctx, cx + w * 0.24 + lean, armY + h * 0.26, 4, 5);
    ctx.fill();
  }

  // --- Head ---
  const headCX = cx + lean;
  const headCY = h * 0.18;
  const headRX = w * 0.14;
  const headRY = h * 0.12;

  // Neck
  ctx.fillStyle = skinDark;
  ctx.fillRect(headCX - w * 0.06, h * 0.24, w * 0.12, h * 0.06);

  // Head shape
  ctx.fillStyle = makeGradient(ctx, headCX - headRX, headCY - headRY,
    headCX + headRX, headCY + headRY,
    [[0, skinDark], [0.4, skinMid], [0.8, skinLight], [1, skinDark]]);
  ellipse(ctx, headCX, headCY, headRX, headRY);
  ctx.fill();

  // Brow ridge
  ctx.fillStyle = skinDark;
  ctx.fillRect(headCX - w * 0.10, headCY - h * 0.06, w * 0.20, h * 0.02);

  // Eyes (asymmetric, red)
  ctx.fillStyle = eyeRed;
  ctx.beginPath();
  ctx.arc(headCX - w * 0.06, headCY - h * 0.01, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = eyeDim;
  ctx.beginPath();
  ctx.arc(headCX + w * 0.06, headCY - h * 0.01, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.fillStyle = '#3a1a1a';
  ctx.fillRect(headCX - w * 0.06, headCY + h * 0.04, w * 0.12, h * 0.02);

  // Hair / scalp shadow
  ctx.fillStyle = '#2a1a0a';
  ellipse(ctx, headCX, headCY - h * 0.08, headRX * 0.8, headRY * 0.3);
  ctx.fill();

  pixelate(ctx.canvas, 24, 30);
}

// ---------------------------------------------------------------------------
// SOLDIER (Shotgun Guy) sprite drawing
// ---------------------------------------------------------------------------
function drawSoldier(ctx, w, h, state, frame) {
  const cx = w / 2;

  const armorGreen = '#5a7a4a';
  const armorDark = '#3a5a2a';
  const armorLight = '#7a9a6a';
  const helmetDark = '#3a4a2a';
  const helmetGreen = '#4a6a3a';
  const visor = '#88aacc';
  const skinTone = '#c8a888';
  const skinDark = '#9a7a5a';
  const bootDark = '#2a2a1a';
  const weaponGrey = '#4a4a4a';
  const weaponDark = '#333333';
  const woodStock = '#5a3a20';
  const beltColor = '#4a4020';
  const pouchColor = '#5a5030';

  if (state === ENEMY_STATE.DEAD) {
    const baseY = h * 0.65;
    // Blood pool
    ctx.fillStyle = '#3a0808';
    ellipse(ctx, cx, h * 0.85, w * 0.40, h * 0.10);
    ctx.fill();
    // Body
    ctx.fillStyle = makeGradient(ctx, 0, baseY, 0, h,
      [[0, armorGreen], [0.6, armorDark], [1, '#2a1a0a']]);
    ellipse(ctx, cx, h * 0.78, w * 0.36, h * 0.14);
    ctx.fill();
    // Helmet askew
    ctx.fillStyle = helmetDark;
    ellipse(ctx, cx + w * 0.22, h * 0.70, w * 0.10, h * 0.07);
    ctx.fill();
    ctx.fillStyle = visor;
    ctx.fillRect(cx + w * 0.18, h * 0.69, w * 0.06, h * 0.02);
    // Rifle on ground
    ctx.fillStyle = weaponGrey;
    ctx.fillRect(cx - w * 0.30, h * 0.76, w * 0.35, h * 0.025);
    pixelate(ctx.canvas, 24, 30);
    return;
  }

  let lean = 0;
  if (state === ENEMY_STATE.CHASE) lean = frame === 0 ? -1 : 1;
  if (state === ENEMY_STATE.HURT) lean = 4;

  // --- Legs ---
  const legY = h * 0.66;
  const legH = h * 0.24;
  const legW = w * 0.10;
  const legSpread = (state === ENEMY_STATE.CHASE) ? (frame === 0 ? 5 : -3) : 0;

  ctx.fillStyle = armorDark;
  ctx.fillRect(cx - w * 0.13 - legSpread / 2 + lean, legY, legW, legH);
  ctx.fillRect(cx + w * 0.05 + legSpread / 2 + lean, legY, legW, legH);

  // Boots
  ctx.fillStyle = bootDark;
  ctx.fillRect(cx - w * 0.15 - legSpread / 2 + lean, legY + legH - h * 0.05, legW + 4, h * 0.07);
  ctx.fillRect(cx + w * 0.03 + legSpread / 2 + lean, legY + legH - h * 0.05, legW + 4, h * 0.07);

  // --- Torso (armored) ---
  const torsoTop = h * 0.28;
  const torsoH = h * 0.40;
  ctx.fillStyle = makeGradient(ctx, cx - w * 0.22, 0, cx + w * 0.22, 0,
    [[0, armorDark], [0.3, armorGreen], [0.7, armorLight], [1, armorDark]]);
  roundRect(ctx, cx - w * 0.22 + lean, torsoTop, w * 0.44, torsoH, 5);
  ctx.fill();

  // Chest pouches
  ctx.fillStyle = pouchColor;
  ctx.fillRect(cx - w * 0.14 + lean, torsoTop + h * 0.06, w * 0.10, h * 0.08);
  ctx.fillRect(cx + w * 0.04 + lean, torsoTop + h * 0.06, w * 0.10, h * 0.08);
  // Pouch flaps
  ctx.fillStyle = armorDark;
  ctx.fillRect(cx - w * 0.14 + lean, torsoTop + h * 0.06, w * 0.10, h * 0.02);
  ctx.fillRect(cx + w * 0.04 + lean, torsoTop + h * 0.06, w * 0.10, h * 0.02);

  // Belt
  ctx.fillStyle = beltColor;
  ctx.fillRect(cx - w * 0.22 + lean, torsoTop + torsoH - h * 0.05, w * 0.44, h * 0.05);
  // Belt buckle
  ctx.fillStyle = '#aaa070';
  ctx.fillRect(cx - w * 0.04 + lean, torsoTop + torsoH - h * 0.04, w * 0.08, h * 0.03);

  // --- Arms + Rifle ---
  const armY = torsoTop + h * 0.04;

  if (state === ENEMY_STATE.ATTACK || state === ENEMY_STATE.CHASE) {
    // Holding rifle forward
    const rifleX = cx + w * 0.14 + lean;
    const rifleY = armY + h * 0.04;
    // Arm (forward-holding)
    ctx.fillStyle = armorGreen;
    ctx.fillRect(cx + w * 0.18 + lean, armY + h * 0.02, w * 0.08, h * 0.14);
    // Other arm on grip
    ctx.fillStyle = armorDark;
    ctx.fillRect(cx - w * 0.24 + lean, armY + h * 0.02, w * 0.08, h * 0.16);
    // Rifle body
    ctx.fillStyle = weaponGrey;
    ctx.fillRect(rifleX, rifleY, w * 0.28, h * 0.035);
    // Barrel
    ctx.fillStyle = weaponDark;
    ctx.fillRect(rifleX + w * 0.24, rifleY - h * 0.005, w * 0.12, h * 0.025);
    // Wood stock
    ctx.fillStyle = woodStock;
    ctx.fillRect(rifleX - w * 0.06, rifleY + h * 0.005, w * 0.10, h * 0.025);

    // Muzzle flash for ATTACK frame 1
    if (state === ENEMY_STATE.ATTACK && frame === 1) {
      ctx.fillStyle = '#ffdd44';
      ctx.beginPath();
      ctx.arc(rifleX + w * 0.38, rifleY + h * 0.01, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(rifleX + w * 0.38, rifleY + h * 0.01, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Arms at sides
    ctx.fillStyle = armorGreen;
    ctx.fillRect(cx - w * 0.28 + lean, armY, w * 0.08, h * 0.24);
    ctx.fillStyle = armorDark;
    ctx.fillRect(cx + w * 0.22 + lean, armY, w * 0.08, h * 0.24);
    // Hands
    ctx.fillStyle = skinTone;
    ellipse(ctx, cx - w * 0.24 + lean, armY + h * 0.26, 4, 5);
    ctx.fill();
    ellipse(ctx, cx + w * 0.26 + lean, armY + h * 0.26, 4, 5);
    ctx.fill();
    // Rifle held vertically at side
    ctx.fillStyle = weaponGrey;
    ctx.fillRect(cx + w * 0.28 + lean, armY - h * 0.05, h * 0.025, h * 0.30);
  }

  // --- Head + Helmet ---
  const headCX = cx + lean;
  const headCY = h * 0.17;

  // Neck
  ctx.fillStyle = skinDark;
  ctx.fillRect(headCX - w * 0.05, h * 0.23, w * 0.10, h * 0.06);

  // Helmet
  ctx.fillStyle = makeGradient(ctx, headCX - w * 0.14, headCY - h * 0.10,
    headCX + w * 0.14, headCY + h * 0.06,
    [[0, helmetDark], [0.5, helmetGreen], [1, helmetDark]]);
  ellipse(ctx, headCX, headCY - h * 0.02, w * 0.16, h * 0.10);
  ctx.fill();

  // Helmet rim
  ctx.fillStyle = helmetDark;
  ctx.fillRect(headCX - w * 0.16, headCY + h * 0.02, w * 0.32, h * 0.03);

  // Face below helmet
  ctx.fillStyle = skinTone;
  roundRect(ctx, headCX - w * 0.10, headCY + h * 0.02, w * 0.20, h * 0.08, 3);
  ctx.fill();

  // Visor
  ctx.fillStyle = visor;
  ctx.fillRect(headCX - w * 0.12, headCY, w * 0.24, h * 0.04);
  // Visor shine
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(headCX - w * 0.10, headCY, w * 0.08, h * 0.015);

  // Eyes behind visor
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(headCX - w * 0.05, headCY + h * 0.015, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headCX + w * 0.05, headCY + h * 0.015, 2, 0, Math.PI * 2);
  ctx.fill();

  // Chin
  ctx.fillStyle = skinDark;
  roundRect(ctx, headCX - w * 0.06, headCY + h * 0.07, w * 0.12, h * 0.03, 2);
  ctx.fill();

  pixelate(ctx.canvas, 24, 30);
}

// ---------------------------------------------------------------------------
// DEMON (Pinky) sprite drawing
// ---------------------------------------------------------------------------
function drawDemon(ctx, w, h, state, frame) {
  const cx = w / 2;

  const pinkDark = '#7a1a1a';
  const pinkMid = '#a03030';
  const pinkLight = '#c04848';
  const hornColor = '#5a3020';
  const hornLight = '#7a5040';
  const teethColor = '#e8e0d0';
  const eyeYellow = '#ffcc00';
  const mouthDark = '#2a0808';
  const clawColor = '#4a2a18';

  if (state === ENEMY_STATE.DEAD) {
    // Mound of flesh on its side
    ctx.fillStyle = '#3a0505';
    ellipse(ctx, cx, h * 0.82, w * 0.44, h * 0.12);
    ctx.fill();
    ctx.fillStyle = makeGradient(ctx, 0, h * 0.55, 0, h * 0.90,
      [[0, pinkMid], [0.5, pinkDark], [1, '#3a0a0a']]);
    ellipse(ctx, cx, h * 0.72, w * 0.42, h * 0.18);
    ctx.fill();
    // Horn sticking up
    ctx.fillStyle = hornColor;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.25, h * 0.62);
    ctx.lineTo(cx - w * 0.30, h * 0.45);
    ctx.lineTo(cx - w * 0.20, h * 0.60);
    ctx.closePath();
    ctx.fill();
    // Eye (dead)
    ctx.fillStyle = '#660000';
    ctx.beginPath();
    ctx.arc(cx - w * 0.10, h * 0.64, 3, 0, Math.PI * 2);
    ctx.fill();
    pixelate(ctx.canvas, 30, 27);
    return;
  }

  const isChase = state === ENEMY_STATE.CHASE;
  const isAttack = state === ENEMY_STATE.ATTACK;
  const isHurt = state === ENEMY_STATE.HURT;
  let lean = isHurt ? 5 : (isChase ? (frame === 0 ? -3 : 3) : 0);

  // --- Legs (digitigrade / thick) ---
  const legY = h * 0.60;
  const legH = h * 0.28;
  const legW = w * 0.12;
  const legSpread = isChase ? (frame === 0 ? 8 : -5) : 0;

  // Upper legs
  ctx.fillStyle = pinkDark;
  ctx.fillRect(cx - w * 0.18 - legSpread / 2 + lean, legY, legW, legH * 0.5);
  ctx.fillRect(cx + w * 0.08 + legSpread / 2 + lean, legY, legW, legH * 0.5);
  // Lower legs (thinner, digitigrade)
  ctx.fillStyle = pinkMid;
  ctx.fillRect(cx - w * 0.16 - legSpread / 2 + lean, legY + legH * 0.45, legW * 0.7, legH * 0.55);
  ctx.fillRect(cx + w * 0.10 + legSpread / 2 + lean, legY + legH * 0.45, legW * 0.7, legH * 0.55);
  // Feet/claws
  ctx.fillStyle = clawColor;
  ctx.fillRect(cx - w * 0.20 - legSpread / 2 + lean, legY + legH - h * 0.03, legW + 4, h * 0.05);
  ctx.fillRect(cx + w * 0.06 + legSpread / 2 + lean, legY + legH - h * 0.03, legW + 4, h * 0.05);

  // --- Body (wide, muscular) ---
  const bodyTop = h * 0.22;
  const bodyH = h * 0.42;
  ctx.fillStyle = makeGradient(ctx, cx - w * 0.34, 0, cx + w * 0.34, 0,
    [[0, pinkDark], [0.25, pinkMid], [0.5, pinkLight], [0.75, pinkMid], [1, pinkDark]]);
  roundRect(ctx, cx - w * 0.34 + lean, bodyTop, w * 0.68, bodyH, 8);
  ctx.fill();

  // Body ridges (muscular detail)
  ctx.strokeStyle = pinkDark;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.20 + lean, bodyTop + h * 0.10 + i * 8);
    ctx.bezierCurveTo(
      cx - w * 0.05 + lean, bodyTop + h * 0.08 + i * 8,
      cx + w * 0.05 + lean, bodyTop + h * 0.08 + i * 8,
      cx + w * 0.20 + lean, bodyTop + h * 0.10 + i * 8
    );
    ctx.stroke();
  }

  // --- Arms (thick, ending in claws) ---
  const armY = bodyTop + h * 0.06;

  if (isAttack) {
    const extDir = frame === 0 ? 1 : -1;
    // Extended arm
    ctx.fillStyle = pinkMid;
    const extX = extDir > 0 ? cx + w * 0.30 + lean : cx - w * 0.44 + lean;
    ctx.fillRect(extX, armY + h * 0.04, w * 0.20, w * 0.12);
    // Claw
    ctx.fillStyle = clawColor;
    const clawBaseX = extDir > 0 ? extX + w * 0.18 : extX - w * 0.04;
    ctx.beginPath();
    ctx.moveTo(clawBaseX, armY);
    ctx.lineTo(clawBaseX + extDir * 12, armY - 2);
    ctx.lineTo(clawBaseX + extDir * 6, armY + h * 0.06);
    ctx.lineTo(clawBaseX + extDir * 14, armY + h * 0.07);
    ctx.lineTo(clawBaseX + extDir * 6, armY + h * 0.10);
    ctx.lineTo(clawBaseX + extDir * 12, armY + h * 0.14);
    ctx.lineTo(clawBaseX, armY + h * 0.12);
    ctx.closePath();
    ctx.fill();
    // Other arm
    const otherX = extDir > 0 ? cx - w * 0.42 + lean : cx + w * 0.30 + lean;
    ctx.fillStyle = pinkDark;
    ctx.fillRect(otherX, armY, w * 0.12, h * 0.20);
  } else {
    // Arms at sides
    ctx.fillStyle = pinkMid;
    ctx.fillRect(cx - w * 0.42 + lean, armY, w * 0.12, h * 0.24);
    ctx.fillRect(cx + w * 0.32 + lean, armY, w * 0.12, h * 0.24);
    // Claws at ends
    ctx.fillStyle = clawColor;
    for (const sx of [-1, 1]) {
      const baseX = sx < 0 ? cx - w * 0.42 + lean : cx + w * 0.32 + lean;
      const baseClawY = armY + h * 0.22;
      ctx.beginPath();
      ctx.moveTo(baseX, baseClawY);
      ctx.lineTo(baseX - 3, baseClawY + 8);
      ctx.lineTo(baseX + w * 0.04, baseClawY + 2);
      ctx.lineTo(baseX + w * 0.06, baseClawY + 10);
      ctx.lineTo(baseX + w * 0.08, baseClawY + 2);
      ctx.lineTo(baseX + w * 0.12, baseClawY + 7);
      ctx.lineTo(baseX + w * 0.12, baseClawY);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- Head (wide jaw, horns) ---
  const headCX = cx + lean;
  const headCY = h * 0.14;

  // Horns
  ctx.fillStyle = makeGradient(ctx, 0, headCY - h * 0.14, 0, headCY,
    [[0, hornLight], [1, hornColor]]);
  // Left horn
  ctx.beginPath();
  ctx.moveTo(headCX - w * 0.10, headCY - h * 0.02);
  ctx.bezierCurveTo(
    headCX - w * 0.22, headCY - h * 0.08,
    headCX - w * 0.28, headCY - h * 0.16,
    headCX - w * 0.20, headCY - h * 0.20
  );
  ctx.lineTo(headCX - w * 0.14, headCY - h * 0.10);
  ctx.lineTo(headCX - w * 0.06, headCY);
  ctx.closePath();
  ctx.fill();
  // Right horn
  ctx.beginPath();
  ctx.moveTo(headCX + w * 0.10, headCY - h * 0.02);
  ctx.bezierCurveTo(
    headCX + w * 0.22, headCY - h * 0.08,
    headCX + w * 0.28, headCY - h * 0.16,
    headCX + w * 0.20, headCY - h * 0.20
  );
  ctx.lineTo(headCX + w * 0.14, headCY - h * 0.10);
  ctx.lineTo(headCX + w * 0.06, headCY);
  ctx.closePath();
  ctx.fill();

  // Head shape (wide)
  ctx.fillStyle = makeGradient(ctx, headCX - w * 0.20, headCY - h * 0.08,
    headCX + w * 0.20, headCY + h * 0.10,
    [[0, pinkDark], [0.4, pinkMid], [0.7, pinkLight], [1, pinkMid]]);
  ellipse(ctx, headCX, headCY, w * 0.20, h * 0.10);
  ctx.fill();

  // Eyes (yellow, menacing)
  ctx.fillStyle = eyeYellow;
  ctx.beginPath();
  ctx.arc(headCX - w * 0.08, headCY - h * 0.02, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headCX + w * 0.08, headCY - h * 0.02, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Pupils
  ctx.fillStyle = '#cc0000';
  ctx.beginPath();
  ctx.arc(headCX - w * 0.08, headCY - h * 0.02, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headCX + w * 0.08, headCY - h * 0.02, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Massive jaw with teeth
  ctx.fillStyle = mouthDark;
  roundRect(ctx, headCX - w * 0.16, headCY + h * 0.04, w * 0.32, h * 0.08, 3);
  ctx.fill();
  // Teeth (triangular)
  ctx.fillStyle = teethColor;
  const teethY = headCY + h * 0.04;
  const teethCount = 6;
  const teethW = w * 0.30 / teethCount;
  for (let i = 0; i < teethCount; i++) {
    const tx = headCX - w * 0.14 + i * teethW;
    ctx.beginPath();
    ctx.moveTo(tx, teethY);
    ctx.lineTo(tx + teethW / 2, teethY + h * 0.04);
    ctx.lineTo(tx + teethW, teethY);
    ctx.closePath();
    ctx.fill();
  }
  // Bottom teeth (smaller)
  const bTeethY = headCY + h * 0.10;
  for (let i = 0; i < teethCount; i++) {
    const tx = headCX - w * 0.14 + i * teethW;
    ctx.beginPath();
    ctx.moveTo(tx, bTeethY);
    ctx.lineTo(tx + teethW / 2, bTeethY - h * 0.03);
    ctx.lineTo(tx + teethW, bTeethY);
    ctx.closePath();
    ctx.fill();
  }

  // Brow ridge
  ctx.fillStyle = pinkDark;
  ctx.fillRect(headCX - w * 0.18, headCY - h * 0.05, w * 0.36, h * 0.025);

  pixelate(ctx.canvas, 30, 27);
}

// ---------------------------------------------------------------------------
// Main init function — generates all sprites
// ---------------------------------------------------------------------------
const STATES_TO_RENDER = [
  ENEMY_STATE.IDLE,
  ENEMY_STATE.ALERT,
  ENEMY_STATE.CHASE,
  ENEMY_STATE.ATTACK,
  ENEMY_STATE.HURT,
  ENEMY_STATE.DEAD,
];

const FRAMES_PER_STATE = 2;

const DRAW_FN = {
  [ENEMY_TYPE.GRUNT]: drawGrunt,
  [ENEMY_TYPE.SOLDIER]: drawSoldier,
  [ENEMY_TYPE.DEMON]: drawDemon,
};

export function initSpriteCache() {
  spriteCache = {};

  for (const type of Object.values(ENEMY_TYPE)) {
    spriteCache[type] = {};
    const dims = SPRITE_DIMS[type];
    const drawFn = DRAW_FN[type];
    if (!drawFn) continue;

    for (const state of STATES_TO_RENDER) {
      spriteCache[type][state] = [];

      // ALERT uses IDLE drawings
      const drawState = state === ENEMY_STATE.ALERT ? ENEMY_STATE.IDLE : state;

      for (let f = 0; f < FRAMES_PER_STATE; f++) {
        const canvas = document.createElement('canvas');
        canvas.width = dims.w;
        canvas.height = dims.h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, dims.w, dims.h);
        drawFn(ctx, dims.w, dims.h, drawState, f);
        spriteCache[type][state].push(canvas);
      }
    }
  }

  return spriteCache;
}
