import { Client, Room } from "colyseus";
import { RoomState } from "../../shared/net/roomState.js";
import { createInitialState } from "../../shared/state/gameState.js";
import { step, TICK_DT_SEC, TICK_HZ } from "../../shared/systems/step.js";
import { emptyInputFrame, type InputFrame } from "../../shared/state/inputFrame.js";
import {
  handleDebugEndGame,
  handlePickCharacter,
  handlePickStation,
  handlePlayerJoin,
  handlePlayerLeave,
  handleReturnToLobby,
  handleStartGame,
  handleToggleAiFill,
  handleToggleReady,
} from "../../shared/net/lobbyHandlers.js";

const PATCH_RATE_MS = 1000 / TICK_HZ;

interface PendingInput {
  sessionId: string;
  frame: InputFrame;
}

export class GameRoom extends Room<RoomState> {
  maxClients = 4;

  private inputBuffer: PendingInput[] = [];

  onCreate(options: { code?: string } = {}): void {
    const state = new RoomState();
    state.lobbyCode = options.code ?? this.roomId.slice(0, 4).toUpperCase();
    state.game = createInitialState();
    this.setState(state);
    this.setPatchRate(PATCH_RATE_MS);
    this.setSimulationInterval(() => this.tick(), 1000 / TICK_HZ);

    this.onMessage("input", (client, frame: InputFrame) => {
      if (!frame || frame.playerId !== client.sessionId) return;
      this.inputBuffer.push({ sessionId: client.sessionId, frame });
    });
    this.onMessage("pickCharacter", (client, data: { charIdx: number }) => {
      handlePickCharacter(this.state, client.sessionId, data?.charIdx ?? -1);
    });
    this.onMessage("pickStation", (client, data: { stationId: string }) => {
      handlePickStation(this.state, client.sessionId, data?.stationId ?? "");
    });
    this.onMessage("toggleReady", (client) => {
      handleToggleReady(this.state, client.sessionId);
    });
    this.onMessage("toggleAiFill", (client) => {
      handleToggleAiFill(this.state, client.sessionId);
    });
    this.onMessage("startGame", (client) => {
      handleStartGame(this.state, client.sessionId);
    });
    this.onMessage("returnToLobby", (client) => {
      handleReturnToLobby(this.state, client.sessionId);
    });
    this.onMessage("debugEndGame", (client, data: { outcome?: "gameover" | "victory" }) => {
      const outcome = data?.outcome === "victory" ? "victory" : "gameover";
      handleDebugEndGame(this.state, client.sessionId, outcome);
    });

    console.log(`[GameRoom ${this.roomId}] created code=${state.lobbyCode}`);
  }

  onJoin(client: Client, options: { name?: string } = {}): void {
    const name = (options.name ?? "Player").toString();
    handlePlayerJoin(this.state, client.sessionId, name);
    console.log(`[GameRoom ${this.roomId}] join ${client.sessionId} host=${this.state.hostSessionId}`);
  }

  onLeave(client: Client): void {
    handlePlayerLeave(this.state, client.sessionId);
    console.log(`[GameRoom ${this.roomId}] leave ${client.sessionId} host=${this.state.hostSessionId}`);
  }

  onDispose(): void {
    console.log(`[GameRoom ${this.roomId}] disposed`);
  }

  private tick(): void {
    if (this.state.phase !== "ingame") {
      this.inputBuffer.length = 0;
      return;
    }

    const frames: InputFrame[] = [];
    for (const pending of this.inputBuffer) {
      const crewId = this.state.sessionToCrew.get(pending.sessionId);
      if (!crewId) continue;
      const frame = pending.frame;
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
    this.inputBuffer.length = 0;

    step(this.state.game, frames, TICK_DT_SEC);
  }
}
