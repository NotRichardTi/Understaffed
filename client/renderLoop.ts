import type { Scene } from "@babylonjs/core/scene";
import type { GameState, GunSide, StationKind } from "@shared/state/gameState.js";
import { TICK_DT_SEC } from "@shared/systems/step.js";
import { gatherInputFrame } from "./input/keyboard.js";
import type { NetClient } from "./net/NetClient.js";

export interface RenderLoopOptions {
  scene: Scene;
  net: NetClient;
  render: (prev: GameState, next: GameState, alpha: number) => void;
  onStarfieldUpdate?: (dtSec: number) => void;
}

const TICK_DT_MS = TICK_DT_SEC * 1000;

export function startRenderLoop(opts: RenderLoopOptions): () => void {
  const { scene, net, render, onStarfieldUpdate } = opts;

  let prev: GameState = net.state.game.clone() as GameState;
  let next: GameState = net.state.game.clone() as GameState;
  let lastTick = net.state.game.tick;
  let tickStartMs = performance.now();
  let lastInputSentTick = -1;
  let lastRenderMs = performance.now();

  const observer = scene.onBeforeRenderObservable.add(() => {
    const nowMs = performance.now();
    const dtSec = (nowMs - lastRenderMs) / 1000;
    lastRenderMs = nowMs;

    const crewId = net.state.sessionToCrew.get(net.sessionId) ?? "";
    const crew = crewId ? net.state.game.crew.find((c) => c.id === crewId) : undefined;
    const stationId = crew?.currentStationId ?? "";
    const station = stationId ? net.state.game.stations.find((s) => s.id === stationId) : undefined;
    const stationKind = (station?.kind ?? null) as StationKind | null;
    const gunSide = (station?.gunSide ? (station.gunSide as GunSide) : null);

    if (net.state.game.tick !== lastTick) {
      prev = next;
      next = net.state.game.clone() as GameState;
      lastTick = net.state.game.tick;
      tickStartMs = nowMs;
    }

    if (lastTick !== lastInputSentTick && net.state.phase === "ingame") {
      const frame = gatherInputFrame(net.sessionId, stationId, stationKind, gunSide);
      net.sendInput(frame);
      lastInputSentTick = lastTick;
    }

    const alpha = Math.min(1, (nowMs - tickStartMs) / TICK_DT_MS);
    onStarfieldUpdate?.(dtSec);
    render(prev, next, alpha);
  });

  return () => {
    scene.onBeforeRenderObservable.remove(observer);
  };
}
