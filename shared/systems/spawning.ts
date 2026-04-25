import { Vec2, type GameState } from "../state/gameState.js";
import { Enemy, type EnemyKind } from "../state/entities.js";
import {
  SPAWN_RING_HALF_W,
  SPAWN_RING_HALF_H,
  SPAWN_GUN_BIAS_IDLE,
  SPAWN_ARC_NARROWING,
  FIGHTER_HP,
  FIGHTER_SIZE,
  FIGHTER_FIRE_COOLDOWN_SEC,
  SWARMER_HP,
  SWARMER_SIZE,
  SWARMER_CONTACT_DAMAGE,
  TANK_HP,
  TANK_SIZE,
  TANK_FIRE_COOLDOWN_SEC,
  SNIPER_HP,
  SNIPER_SIZE,
  SNIPER_FIRE_COOLDOWN_SEC,
  MINIBOSS_HP,
  MINIBOSS_SIZE,
  MINIBOSS_FIRE_COOLDOWN_SEC,
  MINIBOSS_FIRST_SPAWN_SEC,
  MINIBOSS_INTERVAL_SEC,
  ENEMY_SPAWN_INTERVAL_SEC,
  DIFFICULTY_SPAWN_DIV_FLOOR,
  DIFFICULTY_SPAWN_SCALE_PER_MIN,
  BOSS_HP,
  BOSS_SIZE,
  BOSS_FIRE_COOLDOWN_SEC,
  BOSS_SPAWN_SEC,
} from "../content/tuning.js";
import { getLayout, gunOutward } from "../content/layouts/index.js";
import { nextId } from "./ids.js";

interface SpawnWeight {
  kind: EnemyKind;
  weight: number;
}

function spawnWeightsForTime(tSec: number): SpawnWeight[] {
  const out: SpawnWeight[] = [{ kind: "fighter", weight: 1 }];
  if (tSec > 30) out.push({ kind: "swarmer", weight: 0.8 });
  if (tSec > 90) out.push({ kind: "tank", weight: 0.4 });
  if (tSec > 150) out.push({ kind: "sniper", weight: 0.35 });
  return out;
}

function pickKind(weights: SpawnWeight[]): EnemyKind {
  const total = weights.reduce((a, w) => a + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w.kind;
  }
  return weights[0]!.kind;
}

export function pickSpawnPosition(state: GameState): { x: number; y: number } {
  const def = getLayout(state.ship.layout);
  const idleBias = def.spawnBias === "balanced" ? { x: 0, y: 0 } : gunOutward(def.spawnBias);
  const mx = state.ship.driverMoveX;
  const my = state.ship.driverMoveY;
  const travelMag = Math.min(1, Math.hypot(mx, my));
  const idleScale = SPAWN_GUN_BIAS_IDLE * (1 - travelMag);
  const biasX = mx + idleBias.x * idleScale;
  const biasY = my + idleBias.y * idleScale;
  const biasMag = Math.hypot(biasX, biasY);
  const centerAngle =
    biasMag < 0.01 ? Math.random() * Math.PI * 2 : Math.atan2(biasY, biasX);
  const strength = Math.min(1, biasMag);
  const arcHalf = Math.PI * (1 - strength * SPAWN_ARC_NARROWING);
  const theta = centerAngle + (Math.random() * 2 - 1) * arcHalf;
  const shipX = state.ship.position.x;
  const shipY = state.ship.position.y;
  return {
    x: shipX + Math.cos(theta) * SPAWN_RING_HALF_W,
    y: shipY + Math.sin(theta) * SPAWN_RING_HALF_H,
  };
}

function applyKindDefaults(e: Enemy, kind: EnemyKind): void {
  e.kind = kind;
  e.velocity.x = 0;
  e.velocity.y = 0;
  e.contactCooldownSec = 0;
  e.windupSec = 0;
  switch (kind) {
    case "fighter":
      e.hp = FIGHTER_HP;
      e.maxHp = FIGHTER_HP;
      e.fireCooldownSec = FIGHTER_FIRE_COOLDOWN_SEC;
      e.size = FIGHTER_SIZE;
      e.contactDamage = 0;
      e.subCooldownSec = 0;
      e.phase = 0;
      break;
    case "swarmer":
      e.hp = SWARMER_HP;
      e.maxHp = SWARMER_HP;
      e.fireCooldownSec = 999;
      e.size = SWARMER_SIZE;
      e.contactDamage = SWARMER_CONTACT_DAMAGE;
      e.subCooldownSec = 0;
      e.phase = 0;
      break;
    case "tank":
      e.hp = TANK_HP;
      e.maxHp = TANK_HP;
      e.fireCooldownSec = TANK_FIRE_COOLDOWN_SEC;
      e.size = TANK_SIZE;
      e.contactDamage = 0;
      e.subCooldownSec = 0;
      e.phase = 0;
      break;
    case "sniper":
      e.hp = SNIPER_HP;
      e.maxHp = SNIPER_HP;
      e.fireCooldownSec = SNIPER_FIRE_COOLDOWN_SEC;
      e.size = SNIPER_SIZE;
      e.contactDamage = 0;
      e.subCooldownSec = 0;
      e.phase = 0;
      break;
    case "miniboss":
      e.hp = MINIBOSS_HP;
      e.maxHp = MINIBOSS_HP;
      e.fireCooldownSec = MINIBOSS_FIRE_COOLDOWN_SEC;
      e.size = MINIBOSS_SIZE;
      e.contactDamage = 0;
      e.subCooldownSec = 4;
      e.phase = 0;
      break;
    case "boss":
      e.hp = BOSS_HP;
      e.maxHp = BOSS_HP;
      e.fireCooldownSec = BOSS_FIRE_COOLDOWN_SEC;
      e.size = BOSS_SIZE;
      e.contactDamage = 0;
      e.subCooldownSec = 5;
      e.phase = 1;
      break;
  }
}

function makeEnemy(state: GameState, kind: EnemyKind): Enemy {
  const { x, y } = pickSpawnPosition(state);
  const e = new Enemy();
  e.id = nextId(state, kind);
  e.position = new Vec2(x, y);
  applyKindDefaults(e, kind);
  return e;
}

export function recycleEnemy(state: GameState, e: Enemy): void {
  const { x, y } = pickSpawnPosition(state);
  e.position.x = x;
  e.position.y = y;
  applyKindDefaults(e, e.kind as EnemyKind);
}

function spawnInterval(tSec: number): number {
  const scale = 1 + tSec * (DIFFICULTY_SPAWN_SCALE_PER_MIN / 60);
  const raw = ENEMY_SPAWN_INTERVAL_SEC / scale;
  return Math.max(ENEMY_SPAWN_INTERVAL_SEC * DIFFICULTY_SPAWN_DIV_FLOOR, raw);
}

function bossActive(state: GameState): boolean {
  return state.enemies.some((e) => e.kind === "boss");
}

function minibossActive(state: GameState): boolean {
  return state.enemies.some((e) => e.kind === "miniboss");
}

export function tickSpawning(state: GameState, dt: number): void {
  const tSec = state.runTimeMs / 1000;

  if (!bossActive(state)) {
    if (
      tSec >= BOSS_SPAWN_SEC &&
      !state.bossSpawned
    ) {
      state.enemies.push(makeEnemy(state, "boss"));
      state.bossSpawned = true;
      return;
    }
  } else {
    return;
  }

  if (
    tSec >= MINIBOSS_FIRST_SPAWN_SEC &&
    !minibossActive(state) &&
    tSec >= state.nextMinibossAtSec
  ) {
    state.enemies.push(makeEnemy(state, "miniboss"));
    state.nextMinibossAtSec = tSec + MINIBOSS_INTERVAL_SEC;
  }

  state.enemySpawnCooldownSec -= dt;
  if (state.enemySpawnCooldownSec > 0) return;
  state.enemySpawnCooldownSec += spawnInterval(tSec);

  const weights = spawnWeightsForTime(tSec);
  const kind = pickKind(weights);
  state.enemies.push(makeEnemy(state, kind));
}
