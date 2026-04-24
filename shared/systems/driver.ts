import type { GameState } from "../state/gameState.js";
import type { InputFrame } from "../state/inputFrame.js";
import { DRIVER_SPEED } from "../content/tuning.js";

const INPUT_SMOOTH_RATE_PER_SEC = 22;

export function tickDriver(state: GameState, inputs: InputFrame[], dt: number): void {
  const driver = state.stations.find((s) => s.kind === "driver");

  let targetX = 0;
  let targetY = 0;
  if (driver && driver.occupantCrewId !== null) {
    const input = inputs.find((i) => i.stationId === driver.id);
    if (input) {
      const mx = input.moveX;
      const my = input.moveY;
      const len = Math.hypot(mx, my);
      if (len > 0.01) {
        targetX = mx / len;
        targetY = my / len;
      }
    }
  }

  const a = 1 - Math.exp(-INPUT_SMOOTH_RATE_PER_SEC * dt);
  state.ship.driverMoveX += (targetX - state.ship.driverMoveX) * a;
  state.ship.driverMoveY += (targetY - state.ship.driverMoveY) * a;

  const sx = state.ship.driverMoveX;
  const sy = state.ship.driverMoveY;
  const mag = Math.hypot(sx, sy);
  if (mag < 0.02) return;

  const speed = DRIVER_SPEED * state.upgrades.driverSpeedMul;
  state.ship.position.x += sx * speed * dt;
  state.ship.position.y += sy * speed * dt;
}
