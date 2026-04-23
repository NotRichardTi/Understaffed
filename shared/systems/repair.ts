import { NO_ID, NO_TICK, type GameState } from "../state/gameState.js";
import type { InputFrame } from "../state/inputFrame.js";
import { SHIELD_REPAIR_RATE_PER_SEC } from "../content/tuning.js";

export function tickRepair(state: GameState, inputs: InputFrame[], dt: number): void {
  const repair = state.stations.find((s) => s.kind === "repair");
  if (!repair || repair.occupantCrewId === NO_ID) return;

  const input = inputs.find((i) => i.stationId === repair.id);
  if (!input || !input.repairHeld) return;
  if (state.ship.shieldCooldownUntilTick !== NO_TICK) return;

  const rate = SHIELD_REPAIR_RATE_PER_SEC * state.upgrades.repairRateMul;
  const newShield = Math.min(state.upgrades.shieldMax, state.ship.shield + rate * dt);
  state.ship.shield = newShield;
}
