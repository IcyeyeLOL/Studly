// =============================================================================
// ENEMY AI SYSTEM
// =============================================================================

import { TILE, ENEMY_STATE, ENEMY_STATS, isSolidTile } from './gameData';
import { CONFIG, canvasDims } from './config';
import { getTile, getTileHeight, isWalkable, isDoorPassable } from './levelHelpers';
import { playSound } from './audio';
import { attackWarnings } from './effects';

export const hasLineOfSight = (map, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.01) return true;

  const steps = Math.ceil(dist / 0.3);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sx = x1 + dx * t;
    const sy = y1 + dy * t;
    const tile = getTile(map, sx, sy);
    if (isSolidTile(tile)) {
      // Open doors don't block line of sight
      if (tile === TILE.DOOR && isDoorPassable(Math.floor(sx), Math.floor(sy))) {
        continue;
      }
      return false;
    }
  }
  return true;
};

export const updateEnemies = (enemies, map, playerX, playerY, onPlayerDamage, onEnemyKilled, dt = 1, playerAngle = 0, heightMap = null) => {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.state === ENEMY_STATE.DEAD) continue;

    const stats = ENEMY_STATS[enemy.type];
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    const angleToPlayer = Math.atan2(dy, dx);

    if (enemy.attackTimer > 0) enemy.attackTimer -= dt;
    if (enemy.hurtTimer > 0) enemy.hurtTimer -= dt;
    if (enemy.alertTimer > 0) enemy.alertTimer -= dt;
    if (enemy.projectileTimer > 0) {
      enemy.projectileTimer -= dt;
      if (enemy.projectileTimer <= 0) {
        if (hasLineOfSight(map, enemy.x, enemy.y, playerX, playerY)) {
          onPlayerDamage(stats.damage);
        }
      }
    }

    switch (enemy.state) {
      case ENEMY_STATE.IDLE: {
        if (enemy.thinkTimer <= 0) {
          enemy.thinkTimer = 30;
          if (distToPlayer <= stats.sightRange && hasLineOfSight(map, enemy.x, enemy.y, playerX, playerY)) {
            enemy.state = ENEMY_STATE.ALERT;
            enemy.alertTimer = 30;
            enemy.angle = angleToPlayer;
          }
        }
        enemy.thinkTimer -= dt;
        break;
      }

      case ENEMY_STATE.ALERT: {
        enemy.angle = angleToPlayer;
        if (enemy.alertTimer <= 0) {
          enemy.state = ENEMY_STATE.CHASE;
        }
        break;
      }

      case ENEMY_STATE.CHASE: {
        if (distToPlayer > stats.sightRange * 1.5) {
          if (!hasLineOfSight(map, enemy.x, enemy.y, playerX, playerY)) {
            enemy.state = ENEMY_STATE.IDLE;
            enemy.thinkTimer = 60;
            break;
          }
        }

        if (distToPlayer <= stats.attackRange) {
          enemy.state = ENEMY_STATE.ATTACK;
          break;
        }

        enemy.angle = angleToPlayer;
        const enemySpeed = stats.speed * dt;
        const moveX = Math.cos(angleToPlayer) * enemySpeed;
        const moveY = Math.sin(angleToPlayer) * enemySpeed;
        const ENEMY_RADIUS = 0.2;
        const eFloorH = heightMap ? getTileHeight(map, heightMap, enemy.x, enemy.y).floorH : 0;
        const newX = enemy.x + moveX;
        const newY = enemy.y + moveY;

        if (isWalkable(map, newX, enemy.y, ENEMY_RADIUS, heightMap, eFloorH)) {
          enemy.x = newX;
        } else {
          const slideAngle = angleToPlayer + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
          const slideX = enemy.x + Math.cos(slideAngle) * enemySpeed;
          if (isWalkable(map, slideX, enemy.y, ENEMY_RADIUS, heightMap, eFloorH)) {
            enemy.x = slideX;
          }
        }
        if (isWalkable(map, enemy.x, newY, ENEMY_RADIUS, heightMap, eFloorH)) {
          enemy.y = newY;
        } else {
          const slideAngle = angleToPlayer + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
          const slideY = enemy.y + Math.sin(slideAngle) * enemySpeed;
          if (isWalkable(map, enemy.x, slideY, ENEMY_RADIUS, heightMap, eFloorH)) {
            enemy.y = slideY;
          }
        }
        break;
      }

      case ENEMY_STATE.ATTACK: {
        enemy.angle = angleToPlayer;

        if (distToPlayer > stats.attackRange * 1.3) {
          enemy.state = ENEMY_STATE.CHASE;
          attackWarnings.remove(enemy.id);
          break;
        }

        if (enemy.attackTimer <= 0) {
          enemy.attackTimer = stats.attackCooldown;

          let relativeAngle = angleToPlayer - playerAngle + Math.PI;
          while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
          while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;
          const screenX = (relativeAngle / CONFIG.FOV_RADIANS + 0.5) * canvasDims.width;
          const screenY = canvasDims.halfHeight;

          attackWarnings.add(enemy.id, screenX, screenY, stats.attackType);

          if (stats.attackType === 'melee') {
            if (distToPlayer <= stats.attackRange * 1.3) {
              onPlayerDamage(stats.damage);
            }
          } else if (stats.attackType === 'ranged') {
            enemy.projectileTimer = stats.projectileDelay || 20;
          }
        }
        break;
      }

      case ENEMY_STATE.HURT: {
        if (enemy.hurtTimer <= 0) {
          enemy.state = ENEMY_STATE.CHASE;
        }
        break;
      }

      default:
        break;
    }
  }
};

export const damageEnemy = (enemy, damage, onEnemyKilled) => {
  if (enemy.state === ENEMY_STATE.DEAD) return;

  enemy.health -= damage;

  if (enemy.health <= 0) {
    enemy.health = 0;
    enemy.state = ENEMY_STATE.DEAD;
    enemy.alive = false;
    enemy.deathTimer = 60;
    playSound('enemyDeath', 0.45);
    if (onEnemyKilled) onEnemyKilled(enemy);
  } else {
    enemy.state = ENEMY_STATE.HURT;
    enemy.hurtTimer = 15;
    playSound('enemyHurt', 0.35);
  }
};
