import type { RoomState } from "@shared/net/roomState.js";
import type { InputFrame } from "@shared/state/inputFrame.js";

export type NetMessageType = "input" | "pickCharacter" | "pickStation" | "toggleReady" | "startGame" | "toggleAiFill" | "leave";

export interface NetClient {
  readonly state: RoomState;
  readonly sessionId: string;
  send(type: NetMessageType, data?: unknown): void;
  sendInput(frame: InputFrame): void;
  dispose(): void;
}
