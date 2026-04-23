import { Vec2, type GameState } from "../state/gameState.js";
import { Enemy, type EnemyKind } from "../state/entities.js";
import {
  WORLD_HALF_W,
  WORLD_HALF_H,
  SPAWN_MARGIN,
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

type SpawnSide = "top" | "bottom" | "left" | "right";

const SPAWN_SIDES: SpawnSide[] = ["top", "bottom", "left", "right"];

function pickSpawnSide(): SpawnSide {
  return SPAWN_SIDES[Math.floor(Math.random() * SPAWN_SIDES.length)]!;
}

function spawnPosForSide(side: SpawnSide): { x: number; y: number } {
  switch (side) {
    case "top":
      return {
        x: (Math.random() * 2 - 1) * WORLD_HALF_W,
        y: WORLD_HALF_H + SPAWN_MARGIN,
      };
    case "bottom":
      return {
        x: (Math.random() * 2 - 1) * WORLD_HALF_W,
        y: -WORLD_HALF_H - SPAWN_MARGIN,
      };
    case "left":
      return {
        x: -WORLD_HALF_W - SPAWN_MARGIN,
        y: (Math.random() * 2 - 1) * WORLD_HALF_H,
      };
    case "right":
      return {
        x: WORLD_HALF_W + SPAWN_MARGIN,
        y: (Math.random() * 2 - 1) * WORLD_HALF_H,
      };
  }
}

function makeEnemy(state: GameState, kind: EnemyKind): Enemy {
  const { x, y } = spawnPosForSide(pickSpawnSide());
  const e = new Enemy();
  e.id = nextId(state, kind);
  e.kind = kind;
  e.position = new Vec2(x, y);

  switch (kind) {
    case "fighter":
      e.hp = FIGHTER_HP;
      e.maxHp = FIGHTER_HP;
      e.fireCooldownSec = FIGHTER_FIRE_COOLDOWN_SEC;
      e.size = FIGHTER_SIZE;
      break;
    case "swarmer":
      e.hp = SWARMER_HP;
      e.maxHp = SWARMER_HP;
      e.fireCooldownSec = 999;
      e.size = SWARMER_SIZE;
      e.contactDamage = SWARMER_CONTACT_DAMAGE;
      break;
    case "tank":
      e.hp = TANK_HP;
      e.maxHp = TANK_HP;
      e.fireCooldownSec = TANK_FIRE_COOLDOWN_SEC;
      e.size = TANK_SIZE;
      break;
    case "sniper":
      e.hp = SNIPER_HP;
      e.maxHp = SNIPER_HP;
      e.fireCooldownSec = SNIPER_FIRE_COOLDOWN_SEC;
      e.size = SNIPER_SIZE;
      break;
    case "miniboss":
      e.hp = MINIBOSS_HP;
      e.maxHp = MINIBOSS_HP;
      e.fireCooldownSec = MINIBOSS_FIRE_COOLDOWN_SEC;
      e.size = MINIBOSS_SIZE;
      e.subCooldownSec = 4;
      break;
    case "boss":
      e.hp = BOSS_HP;
      e.maxHp = BOSS_HP;
      e.fireCooldownSec = BOSS_FIRE_COOLDOWN_SEC;
      e.size = BOSS_SIZE;
      e.phase = 1;
      e.subCooldownSec = 5;
      break;
  }
  return e;
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
