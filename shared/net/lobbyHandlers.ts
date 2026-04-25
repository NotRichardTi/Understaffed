import { Crew, NO_ID, createInitialState } from "../state/gameState.js";
import { LobbyPlayer, type RoomState } from "./roomState.js";

export const CHAR_COUNT = 4;
export const MAX_PLAYERS = 4;

export const STATION_IDS = [
  "station-gun-1",
  "station-gun-2",
  "station-gun-3",
  "station-gun-4",
  "station-driver",
  "station-repair",
] as const;

export const GUN_STATION_IDS = [
  "station-gun-1",
  "station-gun-2",
  "station-gun-3",
  "station-gun-4",
] as const;
export const GUNNER_PICK_ID = "station-gunner";

function firstFreeCharIdx(state: RoomState): number {
  const taken = new Set<number>();
  state.players.forEach((p) => taken.add(p.charIdx));
  for (let i = 0; i < CHAR_COUNT; i++) {
    if (!taken.has(i)) return i;
  }
  return -1;
}

function charTaken(state: RoomState, charIdx: number, excludeSessionId: string): boolean {
  let taken = false;
  state.players.forEach((p, sid) => {
    if (sid !== excludeSessionId && p.charIdx === charIdx) taken = true;
  });
  return taken;
}

function stationTaken(state: RoomState, stationId: string, excludeSessionId: string): boolean {
  let taken = false;
  state.players.forEach((p, sid) => {
    if (sid !== excludeSessionId && p.stationId === stationId) taken = true;
  });
  return taken;
}

export function handlePlayerJoin(state: RoomState, sessionId: string, name: string): LobbyPlayer {
  const player = new LobbyPlayer();
  player.sessionId = sessionId;
  player.name = name.slice(0, 20) || "Player";
  player.charIdx = firstFreeCharIdx(state);
  player.stationId = "";
  player.ready = false;
  state.players.set(sessionId, player);
  if (state.hostSessionId === "") state.hostSessionId = sessionId;
  return player;
}

export function handlePlayerLeave(state: RoomState, sessionId: string): void {
  const crewId = state.sessionToCrew.get(sessionId);
  state.players.delete(sessionId);
  state.sessionToCrew.delete(sessionId);

  if (state.phase === "ingame" && crewId) {
    const crew = state.game.crew.find((c) => c.id === crewId);
    if (crew) crew.isHuman = false;
  }

  if (state.hostSessionId === sessionId) {
    const it = state.players.values().next();
    state.hostSessionId = it.done ? "" : it.value!.sessionId;
    if (state.phase === "ingame") {
      // Host left mid-game: continue game; host just reassigns
    }
  }

  // If all players gone mid-game, phase stays "ingame" but room will dispose shortly.
  // If lobby phase and host reassigned, lobby continues with remaining players.
}

export function handlePickCharacter(state: RoomState, sessionId: string, charIdx: number): void {
  if (state.phase !== "lobby") return;
  const player = state.players.get(sessionId);
  if (!player) return;
  if (!Number.isInteger(charIdx) || charIdx < 0 || charIdx >= CHAR_COUNT) return;
  if (charTaken(state, charIdx, sessionId)) return;
  player.charIdx = charIdx;
  player.ready = false;
}

export function handlePickStation(state: RoomState, sessionId: string, stationId: string): void {
  if (state.phase !== "lobby") return;
  const player = state.players.get(sessionId);
  if (!player) return;

  let resolvedId: string;
  if (stationId === GUNNER_PICK_ID) {
    const free = GUN_STATION_IDS.find((id) => !stationTaken(state, id, sessionId));
    if (!free) return;
    resolvedId = free;
  } else {
    if (!STATION_IDS.includes(stationId as typeof STATION_IDS[number])) return;
    if (stationTaken(state, stationId, sessionId)) return;
    resolvedId = stationId;
  }

  player.stationId = resolvedId;
  player.ready = false;
}

export function handleToggleReady(state: RoomState, sessionId: string): void {
  if (state.phase !== "lobby") return;
  const player = state.players.get(sessionId);
  if (!player) return;
  if (player.stationId === "") return;
  if (player.charIdx < 0) return;
  player.ready = !player.ready;
}

export function handleToggleAiFill(state: RoomState, sessionId: string): void {
  if (state.phase !== "lobby") return;
  if (sessionId !== state.hostSessionId) return;
  state.aiFill = !state.aiFill;
}

export function handleDebugEndGame(state: RoomState, sessionId: string, outcome: "gameover" | "victory"): void {
  if (state.phase !== "ingame") return;
  if (sessionId !== state.hostSessionId) return;
  if (state.game.phase !== "playing" && state.game.phase !== "levelup") return;
  state.game.phase = outcome;
}

export function handleReturnToLobby(state: RoomState, sessionId: string): boolean {
  if (state.phase !== "ingame") return false;
  if (sessionId !== state.hostSessionId) return false;
  const gp = state.game.phase;
  if (gp !== "gameover" && gp !== "victory") return false;

  state.game = createInitialState();
  state.sessionToCrew.clear();
  state.players.forEach((p) => {
    p.stationId = "";
    p.ready = false;
  });
  state.phase = "lobby";
  return true;
}

export function handleStartGame(state: RoomState, sessionId: string): boolean {
  if (state.phase !== "lobby") return false;
  if (sessionId !== state.hostSessionId) return false;
  if (state.players.size === 0) return false;
  let allReady = true;
  state.players.forEach((p) => { if (!p.ready) allReady = false; });
  if (!allReady) return false;

  state.game = createInitialState();
  state.sessionToCrew.clear();
  state.game.crew.splice(0, state.game.crew.length);
  state.game.stations.forEach((s) => { s.occupantCrewId = NO_ID; });

  const usedCharIdx = new Set<number>();
  const usedStations = new Set<string>();

  state.players.forEach((player, sid) => {
    const crewId = `crew-${player.charIdx}`;
    usedCharIdx.add(player.charIdx);
    const crew = new Crew();
    crew.id = crewId;
    crew.isHuman = true;
    crew.currentStationId = player.stationId;
    state.game.crew.push(crew);
    state.sessionToCrew.set(sid, crewId);
    const station = state.game.stations.find((s) => s.id === player.stationId);
    if (station) {
      station.occupantCrewId = crewId;
      usedStations.add(station.id);
    }
  });

  if (state.aiFill) {
    const availableStations = state.game.stations.filter((s) => !usedStations.has(s.id));
    for (let idx = 0; idx < CHAR_COUNT && state.game.crew.length < MAX_PLAYERS; idx++) {
      if (usedCharIdx.has(idx)) continue;
      const station = availableStations.shift();
      if (!station) break;
      const crew = new Crew();
      crew.id = `crew-${idx}`;
      crew.isHuman = false;
      crew.currentStationId = station.id;
      station.occupantCrewId = crew.id;
      state.game.crew.push(crew);
    }
  }

  state.phase = "ingame";
  return true;
}
