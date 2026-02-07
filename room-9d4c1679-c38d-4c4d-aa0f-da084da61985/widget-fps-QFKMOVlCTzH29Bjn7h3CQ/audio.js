// =============================================================================
// AUDIO SYSTEM — Procedural Web Audio API sounds
// =============================================================================

let audioCtx = null;
let audioMuted = false;

export const setAudioMuted = (val) => { audioMuted = val; };

/** Lazily initialize the AudioContext on first user interaction */
export const ensureAudioCtx = () => {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { /* Web Audio not available */ }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/** Create a white-noise buffer of given duration */
const createNoiseBuffer = (ctx, duration) => {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

/**
 * Play a procedural sound effect.
 * @param {'gunshot'|'shotgun'|'machinegun'|'enemyHurt'|'enemyDeath'|'playerHurt'|'pickup'|'footstep'|'doorOpen'|'emptyClick'} name
 * @param {number} volume - 0 to 1
 */
export const playSound = (name, volume = 0.5) => {
  if (audioMuted) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(ctx.destination);

  switch (name) {
    case 'gunshot': {
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.15);
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1000;
      bandpass.Q.value = 0.8;
      const env = ctx.createGain();
      env.gain.setValueAtTime(1, now);
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      noise.connect(bandpass);
      bandpass.connect(env);
      env.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.15);
      break;
    }

    case 'shotgun': {
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.25);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 800;
      const env = ctx.createGain();
      env.gain.setValueAtTime(1, now);
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      noise.connect(lp);
      lp.connect(env);
      env.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.25);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
      const oscEnv = ctx.createGain();
      oscEnv.gain.setValueAtTime(0.6, now);
      oscEnv.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(oscEnv);
      oscEnv.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }

    case 'machinegun': {
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.06);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 600;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.8, now);
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      noise.connect(hp);
      hp.connect(env);
      env.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.06);
      break;
    }

    case 'enemyHurt': {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.4, now);
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    }

    case 'enemyDeath': {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.5, now);
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.5);
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.3);
      const nEnv = ctx.createGain();
      nEnv.gain.setValueAtTime(0.2, now + 0.05);
      nEnv.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      noise.connect(nEnv);
      nEnv.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.35);
      break;
    }

    case 'playerHurt': {
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.3);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.6, now);
      env.gain.linearRampToValueAtTime(0.3, now + 0.05);
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      noise.connect(lp);
      lp.connect(env);
      env.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.3);
      break;
    }

    case 'pickup': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      osc.frequency.setValueAtTime(1200, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.2);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.3, now);
      env.gain.setValueAtTime(0.3, now + 0.15);
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    }

    case 'footstep': {
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.04);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 300;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.15, now);
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      noise.connect(lp);
      lp.connect(env);
      env.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.05);
      break;
    }

    case 'doorOpen': {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.01, now);
      env.gain.linearRampToValueAtTime(0.3, now + 0.1);
      env.gain.setValueAtTime(0.3, now + 0.25);
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    }

    case 'emptyClick': {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.15, now);
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }
  }
};
