import { Vec2, type GameState } from "../state/gameState.js";
import { Enemy, Projectile } from "../state/entities.js";
import {
  FIGHTER_SPEED,
  FIGHTER_STOP_DIST,
  FIGHTER_FIRE_COOLDOWN_SEC,
  SWARMER_CONTACT_DAMAGE,
  SWARMER_HP,
  SWARMER_SIZE,
  SWARMER_SPEED,
  TANK_SPEED,
  TANK_STOP_DIST,
  TANK_FIRE_COOLDOWN_SEC,
  TANK_SHELL_SPEED,
  TANK_SHELL_DAMAGE,
  TANK_SHELL_SIZE,
  TANK_SHELL_TTL_SEC,
  TANK_SHELL_AOE,
  SNIPER_SPEED,
  SNIPER_STOP_DIST,
  SNIPER_FIRE_COOLDOWN_SEC,
  SNIPER_WINDUP_SEC,
  SNIPER_SHOT_SPEED,
  SNIPER_SHOT_DAMAGE,
  SNIPER_SHOT_SIZE,
  MINIBOSS_SPEED,
  MINIBOSS_BOOST_SPEED,
  MINIBOSS_STOP_DIST,
  MINIBOSS_FIRE_COOLDOWN_SEC,
  MINIBOSS_SPAWN_COOLDOWN_SEC,
  ENEMY_BULLET_SPEED,
  ENEMY_BULLET_DAMAGE,
  ENEMY_BULLET_SIZE,
  ENEMY_BULLET_TTL_SEC,
  BOSS_SPEED,
  BOSS_BOOST_SPEED,
  BOSS_FIRE_COOLDOWN_SEC,
  CAMERA_HALF_W,
  CAMERA_HALF_H,
  ENEMY_LEASH_NEAR_MAG,
  ENEMY_LEASH_BOOST_MAX_MAG,
  ENEMY_LEASH_EXIT_MARGIN,
} from "../content/tuning.js";
import { getLayout } from "../content/layouts/index.js";
import { nextId } from "./ids.js";

function approach(enemy: Enemy, shipX: number, shipY: number, speed: number, stopDist: number): void {
  const dx = shipX - enemy.position.x;
  const dy = shipY - enemy.position.y;
  const dist = Math.hypot(dx, dy);
  if (dist > stopDist) {
    enemy.velocity.x = (dx / dist) * speed;
    enemy.velocity.y = (dy / dist) * speed;
  } else {
    enemy.velocity.x = 0;
    enemy.velocity.y = 0;
  }
}

function fireBulletAt(
  state: GameState,
  enemy: Enemy,
  shipX: number,
  shipY: number,
  speed: number,
  damage: number,
  size: number,
  ttl: number,
  aoe?: number,
): void {
  const dx = shipX - enemy.position.x;
  const dy = shipY - enemy.position.y;
  const len = Math.hypot(dx, dy) || 1;
  const bullet = new Projectile();
  bullet.id = nextId(state, "ebullet");
  bullet.faction = "enemy";
  bullet.position = new Vec2(enemy.position.x, enemy.position.y);
  bullet.velocity = new Vec2((dx / len) * speed, (dy / len) * speed);
  bullet.damage = damage;
  bullet.ttlSec = ttl;
  bullet.size = size;
  if (aoe !== undefined) bullet.aoeRadius = aoe;
  state.projectiles.push(bullet);
}

function tickFighter(state: GameState, e: Enemy, dt: number, shipX: number, shipY: number): void {
  approach(e, shipX, shipY, FIGHTER_SPEED, FIGHTER_STOP_DIST);
  e.fireCooldownSec -= dt;
  const dist = Math.hypot(shipX - e.position.x, shipY - e.position.y);
  if (e.fireCooldownSec <= 0 && dist <= FIGHTER_STOP_DIST + 40) {
    e.fireCooldownSec = FIGHTER_FIRE_COOLDOWN_SEC;
    fireBulletAt(state, e, shipX, shipY, ENEMY_BULLET_SPEED, ENEMY_BULLET_DAMAGE, ENEMY_BULLET_SIZE, ENEMY_BULLET_TTL_SEC);
  }
}

function tickSwarmer(e: Enemy, shipX: number, shipY: number, hullHalfW: number, hullHalfH: number): void {
  const ehalf = e.size / 2;
  const touching =
    Math.abs(shipX - e.position.x) < hullHalfW + ehalf &&
    Math.abs(shipY - e.position.y) < hullHalfH + ehalf;
  if (touching) {
    e.velocity.x = 0;
    e.velocity.y = 0;
    return;
  }
  approach(e, shipX, shipY, SWARMER_SPEED, 0);
}

function tickTank(state: GameState, e: Enemy, dt: number, shipX: number, shipY: number): void {
  approach(e, shipX, shipY, TANK_SPEED, TANK_STOP_DIST);
  e.fireCooldownSec -= dt;
  const dist = Math.hypot(shipX - e.position.x, shipY - e.position.y);
  if (e.fireCooldownSec <= 0 && dist <= TANK_STOP_DIST + 200) {
    e.fireCooldownSec = TANK_FIRE_COOLDOWN_SEC;
    fireBulletAt(state, e, shipX, shipY, TANK_SHELL_SPEED, TANK_SHELL_DAMAGE, TANK_SHELL_SIZE, TANK_SHELL_TTL_SEC, TANK_SHELL_AOE);
  }
}

function tickSniper(state: GameState, e: Enemy, dt: number, shipX: number, shipY: number): void {
  approach(e, shipX, shipY, SNIPER_SPEED, SNIPER_STOP_DIST);
  if ((e.windupSec ?? 0) > 0) {
    e.windupSec = (e.windupSec ?? 0) - dt;
    if ((e.windupSec ?? 0) <= 0) {
      e.windupSec = 0;
      fireBulletAt(state, e, shipX, shipY, SNIPER_SHOT_SPEED, SNIPER_SHOT_DAMAGE, SNIPER_SHOT_SIZE, 1.5);
      e.fireCooldownSec = SNIPER_FIRE_COOLDOWN_SEC;
    }
    return;
  }
  e.fireCooldownSec -= dt;
  if (e.fireCooldownSec <= 0) {
    e.windupSec = SNIPER_WINDUP_SEC;
  }
}

function leashedSpeed(
  e: Enemy,
  shipX: number,
  shipY: number,
  baseSpeed: number,
  boostSpeed: number,
): number {
  const dx = e.position.x - shipX;
  const dy = e.position.y - shipY;
  const mag = Math.hypot(dx / CAMERA_HALF_W, dy / CAMERA_HALF_H);
  if (mag >= ENEMY_LEASH_BOOST_MAX_MAG) {
    const len = Math.hypot(dx, dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;
    const sp = e.size / 2;
    const marginX = CAMERA_HALF_W + sp + ENEMY_LEASH_EXIT_MARGIN;
    const marginY = CAMERA_HALF_H + sp + ENEMY_LEASH_EXIT_MARGIN;
    const distX = Math.abs(dirX) > 1e-6 ? marginX / Math.abs(dirX) : Infinity;
    const distY = Math.abs(dirY) > 1e-6 ? marginY / Math.abs(dirY) : Infinity;
    const snapDist = Math.min(distX, distY);
    e.position.x = shipX + dirX * snapDist;
    e.position.y = shipY + dirY * snapDist;
    return boostSpeed;
  }
  if (mag <= ENEMY_LEASH_NEAR_MAG) return baseSpeed;
  const t = Math.min(1, (mag - ENEMY_LEASH_NEAR_MAG) / (1 - ENEMY_LEASH_NEAR_MAG));
  return baseSpeed + (boostSpeed - baseSpeed) * t;
}

function tickMiniboss(state: GameState, e: Enemy, dt: number, shipX: number, shipY: number): void {
  const speed = leashedSpeed(e, shipX, shipY, MINIBOSS_SPEED, MINIBOSS_BOOST_SPEED);
  approach(e, shipX, shipY, speed, MINIBOSS_STOP_DIST);
  e.fireCooldownSec -= dt;
  if (e.fireCooldownSec <= 0) {
    e.fireCooldownSec = MINIBOSS_FIRE_COOLDOWN_SEC;
    fireBulletAt(state, e, shipX, shipY, ENEMY_BULLET_SPEED * 1.15, ENEMY_BULLET_DAMAGE * 1.6, ENEMY_BULLET_SIZE + 2, ENEMY_BULLET_TTL_SEC);
  }
  e.subCooldownSec = (e.subCooldownSec ?? 0) - dt;
  if ((e.subCooldownSec ?? 0) <= 0) {
    e.subCooldownSec = MINIBOSS_SPAWN_COOLDOWN_SEC;
    for (let i = 0; i < 2; i++) {
      const swarmer = new Enemy();
      swarmer.id = nextId(state, "swarmer");
      swarmer.kind = "swarmer";
      swarmer.position = new Vec2(e.position.x, e.position.y + (i === 0 ? -20 : 20));
      swarmer.hp = SWARMER_HP;
      swarmer.maxHp = SWARMER_HP;
      swarmer.fireCooldownSec = 999;
      swarmer.size = SWARMER_SIZE;
      swarmer.contactDamage = SWARMER_CONTACT_DAMAGE;
      state.enemies.push(swarmer);
    }
  }
}

function tickBoss(state: GameState, e: Enemy, dt: number, shipX: number, shipY: number): void {
  const speed = leashedSpeed(e, shipX, shipY, BOSS_SPEED, BOSS_BOOST_SPEED);
  const hpFrac = e.hp / e.maxHp;
  if (hpFrac < 0.5 && (e.phase ?? 1) < 2) e.phase = 2;

  const distToShip = Math.hypot(e.position.x - shipX, e.position.y - shipY);
  if (distToShip > 500) {
    approach(e, shipX, shipY, speed, 20);
  } else {
    const targetY = shipY + Math.sin(state.tick / 40) * 180;
    approach(e, e.position.x, targetY, BOSS_SPEED, 4);
  }

  e.fireCooldownSec -= dt;
  if (e.fireCooldownSec <= 0) {
    e.fireCooldownSec = BOSS_FIRE_COOLDOWN_SEC * ((e.phase ?? 1) === 2 ? 0.7 : 1);
    const count: number = (e.phase ?? 1) === 2 ? 5 : 3;
    const spread = Math.PI / 8;
    const dx = shipX - e.position.x;
    const dy = shipY - e.position.y;
    const baseAngle = Math.atan2(dy, dx);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const ang = baseAngle + t * spread * 2;
      const bullet = new Projectile();
      bullet.id = nextId(state, "ebullet");
      bullet.faction = "enemy";
      bullet.position = new Vec2(e.position.x, e.position.y);
      bullet.velocity = new Vec2(Math.cos(ang) * ENEMY_BULLET_SPEED, Math.sin(ang) * ENEMY_BULLET_SPEED);
      bullet.damage = ENEMY_BULLET_DAMAGE;
      bullet.ttlSec = ENEMY_BULLET_TTL_SEC;
      bullet.size = ENEMY_BULLET_SIZE;
      state.projectiles.push(bullet);
    }
  }

  e.subCooldownSec = (e.subCooldownSec ?? 0) - dt;
  if ((e.subCooldownSec ?? 0) <= 0 && (e.phase ?? 1) === 2) {
    e.subCooldownSec = 3.5;
    fireBulletAt(state, e, shipX, shipY, TANK_SHELL_SPEED * 1.3, TANK_SHELL_DAMAGE, TANK_SHELL_SIZE + 4, TANK_SHELL_TTL_SEC, TANK_SHELL_AOE);
  } else if ((e.subCooldownSec ?? 0) <= 0) {
    e.subCooldownSec = 5;
  }
}

export function tickEnemies(state: GameState, dt: number): void {
  const shipX = state.ship.position.x;
  const shipY = state.ship.position.y;
  const hull = getLayout(state.ship.layout).hull;

  for (const e of state.enemies) {
    if (e.contactCooldownSec !== undefined && e.contactCooldownSec > 0) {
      e.contactCooldownSec = Math.max(0, e.contactCooldownSec - dt);
    }
    switch (e.kind) {
      case "fighter": tickFighter(state, e, dt, shipX, shipY); break;
      case "swarmer": tickSwarmer(e, shipX, shipY, hull.halfW, hull.halfH); break;
      case "tank": tickTank(state, e, dt, shipX, shipY); break;
      case "sniper": tickSniper(state, e, dt, shipX, shipY); break;
      case "miniboss": tickMiniboss(state, e, dt, shipX, shipY); break;
      case "boss": tickBoss(state, e, dt, shipX, shipY); break;
    }
  }
}
