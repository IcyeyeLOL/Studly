// =============================================================================
// VISUAL EFFECTS SYSTEM
// =============================================================================

export const screenShake = {
  intensity: 0,
  decay: 0.9,
  offsetX: 0,
  offsetY: 0,

  trigger(intensity = 0.5) {
    this.intensity = Math.min(1, this.intensity + intensity);
  },

  update() {
    if (this.intensity > 0.01) {
      const maxOffset = this.intensity * 15;
      this.offsetX = (Math.random() - 0.5) * 2 * maxOffset;
      this.offsetY = (Math.random() - 0.5) * 2 * maxOffset;
      this.intensity *= this.decay;
    } else {
      this.intensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
    }
    return { x: this.offsetX, y: this.offsetY };
  },

  reset() {
    this.intensity = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }
};

export const PARTICLE_TYPE = {
  MUZZLE_FLASH: 'muzzle_flash',
  BULLET_SPARK: 'bullet_spark',
  WALL_DUST: 'wall_dust',
  BLOOD: 'blood',
  DEATH_EXPLOSION: 'death_explosion',
};

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 200;
  }

  spawn(type, screenX, screenY, count = 1, options = {}) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const particle = this.createParticle(type, screenX, screenY, options);
      if (particle) this.particles.push(particle);
    }
  }

  createParticle(type, x, y, options) {
    const baseParticle = { x, y, life: 1, maxLife: 1 };

    switch (type) {
      case PARTICLE_TYPE.MUZZLE_FLASH:
        return {
          ...baseParticle, type,
          vx: 0, vy: 0,
          size: 40 + Math.random() * 20,
          maxLife: 0.1, life: 0.1,
          color: '#ff8c00', alpha: 1,
        };

      case PARTICLE_TYPE.BULLET_SPARK:
        return {
          ...baseParticle, type,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 - 3,
          size: 2 + Math.random() * 3,
          maxLife: 0.3 + Math.random() * 0.2,
          life: 0.3 + Math.random() * 0.2,
          color: '#e07020', alpha: 1, gravity: 0.3,
        };

      case PARTICLE_TYPE.WALL_DUST:
        return {
          ...baseParticle, type,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4 - 1,
          size: 4 + Math.random() * 6,
          maxLife: 0.5 + Math.random() * 0.3,
          life: 0.5 + Math.random() * 0.3,
          color: options.color || '#6b5a4a', alpha: 0.7, gravity: 0.1,
        };

      case PARTICLE_TYPE.BLOOD:
        return {
          ...baseParticle, type,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6 - 2,
          size: 3 + Math.random() * 4,
          maxLife: 0.4 + Math.random() * 0.3,
          life: 0.4 + Math.random() * 0.3,
          color: '#8b0000', alpha: 0.9, gravity: 0.4,
        };

      case PARTICLE_TYPE.DEATH_EXPLOSION: {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        return {
          ...baseParticle, type,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 6 + Math.random() * 10,
          maxLife: 0.6 + Math.random() * 0.4,
          life: 0.6 + Math.random() * 0.4,
          color: options.color || '#8b0000', alpha: 1, gravity: 0.15,
        };
      }

      default:
        return null;
    }
  }

  update(deltaTime = 1/60) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) {
        p.vy += p.gravity;
      }
      p.alpha = (p.life / p.maxLife) * (p.type === PARTICLE_TYPE.MUZZLE_FLASH ? 1 : 0.9);
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === PARTICLE_TYPE.MUZZLE_FLASH) {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
        gradient.addColorStop(0.3, 'rgba(255, 140, 0, 0.7)');
        gradient.addColorStop(0.6, 'rgba(200, 80, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(160, 40, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
  }
}

// Global particle system instance
export const particles = new ParticleSystem();

export const screenFlash = {
  color: 'rgba(255, 0, 0, 0)',
  alpha: 0,
  decay: 0.92,

  trigger(color, intensity = 0.4) {
    this.color = color;
    this.alpha = Math.min(1, intensity);
  },

  update() {
    if (this.alpha > 0.01) {
      this.alpha *= this.decay;
    } else {
      this.alpha = 0;
    }
  },

  render(ctx, width, height) {
    if (this.alpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  },

  reset() {
    this.alpha = 0;
  }
};

export const fadeTransition = {
  active: false,
  fadeIn: false,
  progress: 0,
  speed: 0.05,
  onComplete: null,

  fadeOut(onComplete = null) {
    this.active = true;
    this.fadeIn = false;
    this.progress = 0;
    this.onComplete = onComplete;
  },

  startFadeIn() {
    this.active = true;
    this.fadeIn = true;
    this.progress = 1;
    this.onComplete = null;
  },

  update() {
    if (!this.active) return false;

    if (this.fadeIn) {
      this.progress -= this.speed;
      if (this.progress <= 0) {
        this.progress = 0;
        this.active = false;
      }
    } else {
      this.progress += this.speed;
      if (this.progress >= 1) {
        this.progress = 1;
        this.active = false;
        if (this.onComplete) {
          this.onComplete();
          this.onComplete = null;
        }
      }
    }
    return this.active;
  },

  render(ctx, width, height) {
    if (this.progress > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.progress;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  },

  reset() {
    this.active = false;
    this.progress = 0;
    this.onComplete = null;
  }
};

export const invulnerability = {
  active: false,
  duration: 0,
  maxDuration: 90,
  flashRate: 6,

  trigger() {
    this.active = true;
    this.duration = this.maxDuration;
  },

  update() {
    if (this.active) {
      this.duration--;
      if (this.duration <= 0) {
        this.active = false;
        this.duration = 0;
      }
    }
    return this.active;
  },

  isVisible() {
    if (!this.active) return true;
    return Math.floor(this.duration / this.flashRate) % 2 === 0;
  },

  getFlashAlpha() {
    if (!this.active) return 0;
    return Math.sin(this.duration * 0.3) * 0.3 + 0.3;
  },

  reset() {
    this.active = false;
    this.duration = 0;
  }
};

export const attackWarnings = {
  warnings: [],

  add(enemyId, screenX, screenY, type = 'melee') {
    this.warnings = this.warnings.filter(w => w.enemyId !== enemyId);
    this.warnings.push({
      enemyId,
      x: screenX,
      y: screenY,
      progress: 0,
      type,
      maxProgress: type === 'ranged' ? 30 : 20,
    });
  },

  remove(enemyId) {
    this.warnings = this.warnings.filter(w => w.enemyId !== enemyId);
  },

  update() {
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i];
      w.progress++;
      if (w.progress >= w.maxProgress) {
        this.warnings.splice(i, 1);
      }
    }
  },

  render(ctx) {
    for (const w of this.warnings) {
      const alpha = 0.5 + Math.sin(w.progress * 0.5) * 0.3;
      const size = 20 + (w.progress / w.maxProgress) * 15;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = w.type === 'ranged' ? '#cc4400' : '#8b0000';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(w.x, w.y, size, 0, Math.PI * 2);
      ctx.stroke();

      if (w.type === 'ranged') {
        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', w.x, w.y);
      }

      ctx.restore();
    }
  },

  clear() {
    this.warnings = [];
  }
};
