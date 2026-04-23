import type { GameState } from "../state/gameState.js";

export function tickMotion(state: GameState, dt: number): void {
  for (const p of state.projectiles) {
    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;
    p.ttlSec -= dt;
  }
  for (const e of state.enemies) {
    e.position.x += e.velocity.x * dt;
    e.position.y += e.velocity.y * dt;
  }
  for (const o of state.xpOrbs) {
    o.position.x += o.velocity.x * dt;
    o.position.y += o.velocity.y * dt;
  }
}
