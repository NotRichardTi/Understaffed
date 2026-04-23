import { NO_TICK, type GameState } from "../state/gameState.js";

export function tickShield(state: GameState, _dt: number): void {
  if (
    state.ship.shieldCooldownUntilTick !== NO_TICK &&
    state.tick >= state.ship.shieldCooldownUntilTick
  ) {
    state.ship.shieldCooldownUntilTick = NO_TICK;
  }
}
