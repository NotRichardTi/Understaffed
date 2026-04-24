import { Client, Room } from "colyseus.js";
import { RoomState } from "@shared/net/roomState.js";
import type { InputFrame } from "@shared/state/inputFrame.js";
import type { NetClient, NetMessageType } from "./NetClient.js";

export interface RemoteNetOptions {
  url: string;
  mode: "host" | "join";
  code?: string;
  name: string;
}

export async function createRemoteNet(opts: RemoteNetOptions): Promise<NetClient> {
  const client = new Client(opts.url);
  const joinOptions = { name: opts.name, code: opts.code };
  const room: Room<RoomState> =
    opts.mode === "host"
      ? await client.create<RoomState>("game", joinOptions)
      : await client.join<RoomState>("game", joinOptions);

  await new Promise<void>((resolve) => {
    room.onStateChange.once(() => resolve());
  });

  return {
    get state(): RoomState {
      return room.state;
    },
    sessionId: room.sessionId,
    isSinglePlayer: false,
    send(type: NetMessageType, data?: unknown): void {
      room.send(type, data);
    },
    sendInput(frame: InputFrame): void {
      room.send("input", frame);
    },
    dispose(): void {
      void room.leave();
    },
  };
}
