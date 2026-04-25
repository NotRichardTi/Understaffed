import { NO_ID, NO_TICK, type GameState, type GunSide, type Station } from "../state/gameState.js";
import { emptyInputFrame, type InputFrame } from "../state/inputFrame.js";
import type { Enemy } from "../state/entities.js";
import {
  SHIELD_START,
} from "../content/tuning.js";
import { gunOutward } from "../content/layouts/index.js";

function nearestEnemyInHemisphere(
  enemies: Enemy[],
  gunX: number,
  gunY: number,
  side: GunSide,
): Enemy | null {
  const out = gunOutward(side);
  let best: Enemy | null = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dx = e.position.x - gunX;
    const dy = e.position.y - gunY;
    if (dx * out.x + dy * out.y < -4) continue;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

function fillGunFrame(
  f: InputFrame,
  station: Station,
  state: GameState,
): void {
  const side = (station.gunSide || "top") as GunSide;
  const gunX = state.ship.position.x + station.hardpoint.x;
  const gunY = state.ship.position.y + station.hardpoint.y;
  const target = nearestEnemyInHemisphere(state.enemies, gunX, gunY, side);
  if (target) {
    const dx = target.position.x - gunX;
    const dy = target.position.y - gunY;
    const len = Math.hypot(dx, dy) || 1;
    f.aimX = dx / len;
    f.aimY = dy / len;
  } else {
    const out = gunOutward(side);
    f.aimX = out.x !== 0 ? out.x : 1;
    f.aimY = out.y !== 0 ? out.y : (side === "top" ? 0.01 : -0.01);
  }
}

function fillRepairFrame(f: InputFrame, state: GameState): void {
  if (state.ship.shieldCooldownUntilTick !== NO_TICK) return;
  if (state.ship.shield >= SHIELD_START) return;
  f.repairHeld = true;
}

export function generateAiInputs(state: GameState): InputFrame[] {
  const frames: InputFrame[] = [];
  for (const crew of state.crew) {
    if (crew.isHuman) continue;
    if (crew.currentStationId === NO_ID) continue;
    const station = state.stations.find((s) => s.id === crew.currentStationId);
    if (!station) continue;
    const f = emptyInputFrame(crew.id, crew.currentStationId);
    if (station.kind === "gun") fillGunFrame(f, station, state);
    else if (station.kind === "repair") fillRepairFrame(f, state);
    // Driver is human-only — no AI input is generated when unmanned.
    frames.push(f);
  }
  return frames;
}
