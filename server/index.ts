import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { createServer } from "http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GameRoom } from "./rooms/GameRoom.js";

const PORT = Number(process.env.PORT) || 2567;
const SERVE_STATIC = process.env.NODE_ENV === "production";

const app = express();
app.get("/health", (_req, res) => res.send("ok"));

if (SERVE_STATIC) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(__dirname, "../../dist");
  app.use(express.static(distDir));
  app.get(/^(?!\/health).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
  console.log(`[server] serving static from ${distDir}`);
}

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("game", GameRoom).filterBy(["code"]);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
