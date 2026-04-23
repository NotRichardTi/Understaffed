import { NO_TICK, Vec2, type GameState } from "../state/gameState.js";
import { XpOrb, type EnemyKind } from "../state/entities.js";
import {
  SHIP_HALF_W,
  SHIP_HALF_H,
  SHIELD_COOLDOWN_SEC,
  SWARMER_MELEE_COOLDOWN_SEC,
  WORLD_HALF_W,
  WORLD_HALF_H,
  TICK_HZ,
} from "../content/tuning.js";
import { nextId } from "./ids.js";

const PUSHABLE_ENEMY_KINDS: Record<EnemyKind, boolean> = {
  fighter: true,
  swarmer: true,
  sniper: true,
  tank: false,
  miniboss: false,
  boss: false,
};

const ENEMY_PUSH_SHARE = 0.7;

export function tickShipEnemyPush(state: GameState): void {
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const ehalf = enemy.size / 2;
    const dx = enemy.position.x - state.ship.position.x;
    const dy = enemy.position.y - state.ship.position.y;
    const overlapX = SHIP_HALF_W + ehalf - Math.abs(dx);
    const overlapY = SHIP_HALF_H + ehalf - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) continue;

    let pushX = 0;
    let pushY = 0;
    if (overlapX < overlapY) {
      pushX = overlapX * (dx >= 0 ? 1 : -1);
    } else {
      pushY = overlapY * (dy >= 0 ? 1 : -1);
    }

    const pushable = PUSHABLE_ENEMY_KINDS[enemy.kind as EnemyKind];
    const enemyShare = pushable ? ENEMY_PUSH_SHARE : 0;
    const shipShare = 1 - enemyShare;

    enemy.position.x += pushX * enemyShare;
    enemy.position.y += pushY * enemyShare;
    state.ship.position.x -= pushX * shipShare;
    state.ship.position.y -= pushY * shipShare;
  }

  const minX = -WORLD_HALF_W + SHIP_HALF_W;
  const maxX = WORLD_HALF_W - SHIP_HALF_W;
  const minY = -WORLD_HALF_H + SHIP_HALF_H;
  const maxY = WORLD_HALF_H - SHIP_HALF_H;
  if (state.ship.position.x < minX) state.ship.position.x = minX;
  if (state.ship.position.x > maxX) state.ship.position.x = maxX;
  if (state.ship.position.y < minY) state.ship.position.y = minY;
  if (state.ship.position.y > maxY) state.ship.position.y = maxY;
}

function aabbOverlap(
  ax: number, ay: number, ahw: number, ahh: number,
  bx: number, by: number, bhw: number, bhh: number,
): boolean {
  return (
    Math.abs(ax - bx) < ahw + bhw &&
    Math.abs(ay - by) < ahh + bhh
  );
}

function applyDamageToShip(state: GameState, damage: number): void {
  let remaining = damage;
  if (state.ship.shieldCooldownUntilTick === NO_TICK && state.ship.shield > 0) {
    const absorbed = Math.min(state.ship.shield, remaining);
    state.ship.shield -= absorbed;
    remaining -= absorbed;
    if (state.ship.shield <= 0) {
      state.ship.shield = 0;
      const dur = SHIELD_COOLDOWN_SEC * state.upgrades.shieldCooldownMul;
      state.ship.shieldCooldownUntilTick = state.tick + Math.ceil(dur * TICK_HZ);
    }
  }
  if (remaining > 0) {
    state.ship.hull = Math.max(0, state.ship.hull - remaining);
    if (state.ship.hull <= 0) {
      state.phase = "gameover";
    }
  }
}

function detonateAoe(state: GameState, x: number, y: number, radius: number, damage: number): void {
  const shipX = state.ship.position.x;
  const shipY = state.ship.position.y;
  const r2 = radius * radius;
  const dxS = shipX - x;
  const dyS = shipY - y;
  if (dxS * dxS + dyS * dyS <= r2) {
    applyDamageToShip(state, damage);
  }
}

function orbsForEnemy(kind: string): number {
  switch (kind) {
    case "tank": return 3;
    case "miniboss": return 10;
    case "boss": return 25;
    case "sniper": return 2;
    default: return 1;
  }
}

export function tickCollisions(state: GameState): void {
  const shipX = state.ship.position.x;
  const shipY = state.ship.position.y;

  for (const bullet of state.projectiles) {
    if (bullet.ttlSec <= 0) continue;
    const bhalf = bullet.size / 2;

    if (bullet.faction === "player") {
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        const ehalf = enemy.size / 2;
        if (aabbOverlap(
          bullet.position.x, bullet.position.y, bhalf, bhalf,
          enemy.position.x, enemy.position.y, ehalf, ehalf,
        )) {
          enemy.hp -= bullet.damage;
          if ((bullet.piercesLeft ?? 0) > 0) {
            bullet.piercesLeft = (bullet.piercesLeft ?? 0) - 1;
          } else {
            bullet.ttlSec = 0;
          }
          break;
        }
      }
    } else {
      const hitShip = aabbOverlap(
        bullet.position.x, bullet.position.y, bhalf, bhalf,
        shipX, shipY, SHIP_HALF_W, SHIP_HALF_H,
      );
      if (hitShip) {
        if (bullet.aoeRadius) {
          detonateAoe(state, bullet.position.x, bullet.position.y, bullet.aoeRadius, bullet.damage);
        } else {
          applyDamageToShip(state, bullet.damage);
        }
        bullet.ttlSec = 0;
      }
    }
  }

  let bossDefeated = false;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i]!;
    if (enemy.hp > 0) {
      if (enemy.contactDamage && enemy.contactDamage > 0) {
        const ehalf = enemy.size / 2;
        const touching = aabbOverlap(
          enemy.position.x, enemy.position.y, ehalf, ehalf,
          shipX, shipY, SHIP_HALF_W, SHIP_HALF_H,
        );
        if (touching && (enemy.contactCooldownSec ?? 0) <= 0) {
          applyDamageToShip(state, enemy.contactDamage);
          enemy.contactCooldownSec = SWARMER_MELEE_COOLDOWN_SEC;
        }
      }
      continue;
    }
    if (enemy.kind === "boss") bossDefeated = true;
    const count = orbsForEnemy(enemy.kind);
    for (let k = 0; k < count; k++) {
      const spread = count > 1 ? 26 : 0;
      const ox = enemy.position.x + (Math.random() - 0.5) * spread;
      const oy = enemy.position.y + (Math.random() - 0.5) * spread;
      const orb = new XpOrb();
      orb.id = nextId(state, "orb");
      orb.position = new Vec2(ox, oy);
      state.xpOrbs.push(orb);
    }
    state.enemies.splice(i, 1);
  }

  if (bossDefeated && state.phase === "playing") {
    state.phase = "victory";
  }
}
