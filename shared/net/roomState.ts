import { MapSchema, Schema, type } from "@colyseus/schema";
import { GameState } from "../state/gameState.js";

export class LobbyPlayer extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("number") charIdx: number = -1;
  @type("string") stationId: string = "";
  @type("boolean") ready: boolean = false;
}

export class RoomState extends Schema {
  @type("string") phase: string = "lobby";
  @type("string") hostSessionId: string = "";
  @type("boolean") aiFill: boolean = true;
  @type("string") lobbyCode: string = "";
  @type({ map: LobbyPlayer }) players = new MapSchema<LobbyPlayer>();
  @type({ map: "string" }) sessionToCrew = new MapSchema<string>();
  @type(GameState) game: GameState = new GameState();
}
