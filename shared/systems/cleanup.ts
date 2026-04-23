import type { GameState } from "../state/gameState.js";
import { WORLD_HALF_W, WORLD_HALF_H, SPAWN_MARGIN } from "../content/tuning.js";

export function tickCleanup(state: GameState): void {
  const limitX = WORLD_HALF_W + SPAWN_MARGIN * 2;
  const limitY = WORLD_HALF_H + SPAWN_MARGIN * 2;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i]!;
    const keep =
      p.ttlSec > 0 &&
      Math.abs(p.position.x) <= limitX &&
      Math.abs(p.position.y) <= limitY;
    if (!keep) state.projectiles.splice(i, 1);
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i]!;
    if (Math.abs(e.position.x) > limitX || Math.abs(e.position.y) > limitY) {
      state.enemies.splice(i, 1);
    }
  }

  for (let i = state.xpOrbs.length - 1; i >= 0; i--) {
    const o = state.xpOrbs[i]!;
    if (Math.abs(o.position.x) > limitX || Math.abs(o.position.y) > limitY) {
      state.xpOrbs.splice(i, 1);
    }
  }
}
