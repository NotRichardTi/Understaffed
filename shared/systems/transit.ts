import { NO_ID, NO_TICK, type GameState, type Crew, type Station } from "../state/gameState.js";
import type { InputFrame } from "../state/inputFrame.js";
import { TICK_HZ, TRANSIT_DURATION_SEC } from "../content/tuning.js";

function resolveDestination(state: GameState, dest: string): Station | null {
  if (dest === "gun-nearest") {
    return (
      state.stations.find(
        (s) => s.kind === "gun" && s.occupantCrewId === NO_ID,
      ) ?? null
    );
  }
  return state.stations.find((s) => s.id === dest) ?? null;
}

function beginTransit(state: GameState, crew: Crew, target: Station): void {
  if (crew.pendingStationId !== NO_ID) return;
  if (crew.currentStationId === target.id) return;

  const arriveTick = state.tick + Math.ceil(TRANSIT_DURATION_SEC * TICK_HZ);

  if (target.occupantCrewId !== NO_ID) {
    if (!crew.isHuman) return;
    const other = state.crew.find((c) => c.id === target.occupantCrewId);
    if (!other || other.isHuman || other.pendingStationId !== NO_ID) return;
    const origin = state.stations.find((s) => s.id === crew.currentStationId);
    if (!origin) return;

    origin.occupantCrewId = NO_ID;
    target.occupantCrewId = NO_ID;

    crew.currentStationId = NO_ID;
    crew.pendingStationId = target.id;
    crew.arriveTick = arriveTick;

    other.currentStationId = NO_ID;
    other.pendingStationId = origin.id;
    other.arriveTick = arriveTick;
    return;
  }

  if (crew.currentStationId !== NO_ID) {
    const cur = state.stations.find((s) => s.id === crew.currentStationId);
    if (cur) cur.occupantCrewId = NO_ID;
  }
  crew.currentStationId = NO_ID;
  crew.pendingStationId = target.id;
  crew.arriveTick = arriveTick;
}

export function tickTransit(state: GameState, inputs: InputFrame[]): void {
  for (const input of inputs) {
    if (input.stationSwitchRequest) {
      const human = state.crew.find((c) => c.isHuman);
      if (human) {
        const target = resolveDestination(state, input.stationSwitchRequest);
        if (target) beginTransit(state, human, target);
      }
    }

    if (input.aiCommand) {
      const bot = state.crew.find(
        (c) => c.id === input.aiCommand!.targetCrewId && !c.isHuman,
      );
      if (bot) {
        const target = resolveDestination(state, input.aiCommand.destination);
        if (target) beginTransit(state, bot, target);
      }
    }
  }

  for (const crew of state.crew) {
    if (crew.pendingStationId === NO_ID || crew.arriveTick === NO_TICK) continue;
    if (state.tick < crew.arriveTick) continue;
    const target = state.stations.find((s) => s.id === crew.pendingStationId);
    if (target && target.occupantCrewId === NO_ID) {
      target.occupantCrewId = crew.id;
      crew.currentStationId = target.id;
    }
    crew.pendingStationId = NO_ID;
    crew.arriveTick = NO_TICK;
  }
}
