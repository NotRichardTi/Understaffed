import type { GameState } from "../state/gameState.js";

export function nextId(state: GameState, prefix: string): string {
  const id = `${prefix}-${state.nextEntityId}`;
  state.nextEntityId += 1;
  return id;
}
