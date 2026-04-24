import type { GameState } from "../state/gameState.js";
import { DESPAWN_HALF_W, DESPAWN_HALF_H } from "../content/tuning.js";
import { recycleEnemy } from "./spawning.js";

const NEVER_RECYCLE: Record<string, true> = { miniboss: true, boss: true };

export function tickCleanup(state: GameState): void {
  const shipX = state.ship.position.x;
  const shipY = state.ship.position.y;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i]!;
    const dx = p.position.x - shipX;
    const dy = p.position.y - shipY;
    const keep =
      p.ttlSec > 0 &&
      Math.abs(dx) <= DESPAWN_HALF_W &&
      Math.abs(dy) <= DESPAWN_HALF_H;
    if (!keep) state.projectiles.splice(i, 1);
  }

  for (const e of state.enemies) {
    if (NEVER_RECYCLE[e.kind]) continue;
    const dx = e.position.x - shipX;
    const dy = e.position.y - shipY;
    if (Math.abs(dx) > DESPAWN_HALF_W || Math.abs(dy) > DESPAWN_HALF_H) {
      recycleEnemy(state, e);
    }
  }

  for (let i = state.xpOrbs.length - 1; i >= 0; i--) {
    const o = state.xpOrbs[i]!;
    const dx = o.position.x - shipX;
    const dy = o.position.y - shipY;
    if (Math.abs(dx) > DESPAWN_HALF_W || Math.abs(dy) > DESPAWN_HALF_H) {
      state.xpOrbs.splice(i, 1);
    }
  }
}
