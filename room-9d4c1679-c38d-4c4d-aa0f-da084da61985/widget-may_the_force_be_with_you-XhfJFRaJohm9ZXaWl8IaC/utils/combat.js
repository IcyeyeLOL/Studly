// Combat system - hitbox detection and damage calculation

export class CombatSystem {
  constructor(config) {
    this.config = config;
  }

  // Get hitbox for a player's attack
  getAttackHitbox(player) {
    if (player.state !== 'punching' && player.state !== 'kicking') {
      return null;
    }

    const hitboxWidth = player.state === 'punching' ? 60 : 80;
    const hitboxHeight = player.state === 'punching' ? 40 : 50;
    const offsetX = player.direction > 0 ? 40 : -40 - hitboxWidth;
    const offsetY = player.state === 'punching' ? -60 : -40;

    return {
      x: player.x + offsetX,
      y: player.y + offsetY,
      width: hitboxWidth,
      height: hitboxHeight
    };
  }

  // Get hurtbox for a player
  getHurtbox(player) {
    const height = player.state === 'crouching' ? 40 : 80;
    const width = 40;

    return {
      x: player.x - width / 2,
      y: player.y - height,
      width: width,
      height: height
    };
  }

  // Check if two boxes overlap
  boxesOverlap(box1, box2) {
    return (
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y
    );
  }

  // Check for hit between attacker and defender
  checkHit(attacker, defender) {
    const attackHitbox = this.getAttackHitbox(attacker);
    if (!attackHitbox) return null;

    const defenderHurtbox = this.getHurtbox(defender);
    
    if (this.boxesOverlap(attackHitbox, defenderHurtbox)) {
      const isBlocking = defender.state === 'crouching';
      const baseDamage = attacker.state === 'punching' 
        ? this.config.PUNCH_DAMAGE 
        : this.config.KICK_DAMAGE;
      
      const damage = isBlocking 
        ? baseDamage * this.config.BLOCK_REDUCTION 
        : baseDamage;

      return {
        damage: Math.round(damage),
        isBlocked: isBlocking,
        knockback: isBlocking ? this.config.KNOCKBACK_FORCE * 0.3 : this.config.KNOCKBACK_FORCE
      };
    }

    return null;
  }

  // Apply knockback to a player
  applyKnockback(player, attacker, knockbackForce) {
    const direction = player.x > attacker.x ? 1 : -1;
    return {
      ...player,
      vx: direction * knockbackForce,
      hitStunEndTime: Date.now() + this.config.HIT_STUN_DURATION
    };
  }
}
