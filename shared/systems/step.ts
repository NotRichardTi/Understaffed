import type { GameState } from "../state/gameState.js";
import type { InputFrame } from "../state/inputFrame.js";
import { tickGuns } from "./guns.js";
import { tickSpawning } from "./spawning.js";
import { tickEnemies } from "./enemies.js";
import { tickMotion } from "./motion.js";
import { tickCollisions, tickShipEnemyPush } from "./collision.js";
import { tickCleanup } from "./cleanup.js";
import { tickTransit } from "./transit.js";
import { tickDriver } from "./driver.js";
import { tickRepair } from "./repair.js";
import { tickShield } from "./shield.js";
import { tickXpMagnet, tickLevelUpVote } from "./xp.js";
import { generateAiInputs } from "../ai/aiInputs.js";

export { TICK_HZ, TICK_DT_SEC } from "../content/tuning.js";

export function step(
  state: GameState,
  inputs: InputFrame[],
  dt: number,
): void {
  if (state.phase === "gameover" || state.phase === "victory") return;

  state.tick += 1;

  if (state.phase === "levelup") {
    tickLevelUpVote(state, inputs);
    return;
  }

  state.runTimeMs += dt * 1000;
  const allInputs = [...inputs, ...generateAiInputs(state)];

  tickTransit(state, allInputs);
  tickDriver(state, allInputs, dt);
  tickGuns(state, allInputs, dt);
  tickRepair(state, allInputs, dt);
  tickSpawning(state, dt);
  tickEnemies(state, dt);
  tickMotion(state, dt);
  tickShipEnemyPush(state);
  tickCollisions(state);
  tickShield(state, dt);
  tickXpMagnet(state, dt);
  tickCleanup(state);
}
