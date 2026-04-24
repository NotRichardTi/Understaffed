import type { RoomState } from "@shared/net/roomState.js";
import type { InputFrame } from "@shared/state/inputFrame.js";

export type NetMessageType = "input" | "pickCharacter" | "pickStation" | "toggleReady" | "startGame" | "toggleAiFill" | "leave" | "returnToLobby" | "debugEndGame";

export interface NetClient {
  readonly state: RoomState;
  readonly sessionId: string;
  readonly isSinglePlayer: boolean;
  send(type: NetMessageType, data?: unknown): void;
  sendInput(frame: InputFrame): void;
  dispose(): void;
}
