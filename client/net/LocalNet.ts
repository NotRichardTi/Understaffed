import { RoomState } from "@shared/net/roomState.js";
import {
  handlePickCharacter,
  handlePickStation,
  handlePlayerJoin,
  handleStartGame,
  handleToggleAiFill,
  handleToggleReady,
} from "@shared/net/lobbyHandlers.js";
import { createInitialState } from "@shared/state/gameState.js";
import { step, TICK_DT_SEC, TICK_HZ } from "@shared/systems/step.js";
import { emptyInputFrame, type InputFrame } from "@shared/state/inputFrame.js";
import type { NetClient, NetMessageType } from "./NetClient.js";

const LOCAL_SESSION = "local";

export function createLocalNet(playerName: string = "Player"): NetClient {
  const state = new RoomState();
  state.lobbyCode = "SOLO";
  state.aiFill = true;
  state.game = createInitialState();

  handlePlayerJoin(state, LOCAL_SESSION, playerName);

  const inputBuffer: InputFrame[] = [];

  const tick = (): void => {
    if (state.phase !== "ingame") {
      inputBuffer.length = 0;
      return;
    }
    const crewId = state.sessionToCrew.get(LOCAL_SESSION);
    if (!crewId) {
      inputBuffer.length = 0;
      step(state.game, [], TICK_DT_SEC);
      return;
    }
    const frames: InputFrame[] = [];
    for (const frame of inputBuffer) {
      const normalized = emptyInputFrame(crewId, frame.stationId);
      normalized.aimX = frame.aimX;
      normalized.aimY = frame.aimY;
      normalized.moveX = frame.moveX;
      normalized.moveY = frame.moveY;
      normalized.repairHeld = frame.repairHeld;
      normalized.stationSwitchRequest = frame.stationSwitchRequest;
      normalized.aiCommand = frame.aiCommand;
      normalized.voteChoice = frame.voteChoice;
      frames.push(normalized);
    }
    inputBuffer.length = 0;
    step(state.game, frames, TICK_DT_SEC);
  };

  const timer = setInterval(tick, 1000 / TICK_HZ);

  return {
    state,
    sessionId: LOCAL_SESSION,
    send(type: NetMessageType, data?: unknown): void {
      switch (type) {
        case "pickCharacter": {
          const d = data as { charIdx: number } | undefined;
          handlePickCharacter(state, LOCAL_SESSION, d?.charIdx ?? -1);
          break;
        }
        case "pickStation": {
          const d = data as { stationId: string } | undefined;
          handlePickStation(state, LOCAL_SESSION, d?.stationId ?? "");
          break;
        }
        case "toggleReady":
          handleToggleReady(state, LOCAL_SESSION);
          break;
        case "toggleAiFill":
          handleToggleAiFill(state, LOCAL_SESSION);
          break;
        case "startGame":
          handleStartGame(state, LOCAL_SESSION);
          break;
        case "leave":
        case "input":
          break;
      }
    },
    sendInput(frame: InputFrame): void {
      inputBuffer.push(frame);
    },
    dispose(): void {
      clearInterval(timer);
    },
  };
}
