import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { createGameScene } from "./scenes/gameScene.js";
import { startRenderLoop } from "./renderLoop.js";
import { attachKeyboard } from "./input/keyboard.js";
import { createHud, type Hud } from "./hud/hud.js";
import { createLocalNet } from "./net/LocalNet.js";
import { createRemoteNet } from "./net/RemoteNet.js";
import { createMainMenu, createMpMenu, type ScreenHandle } from "./menu/menu.js";
import { createLobby, type LobbyHandle } from "./menu/lobby.js";
import type { NetClient } from "./net/NetClient.js";

function defaultServerUrl(): string {
  if (import.meta.env.DEV) return "ws://localhost:2567";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}
const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? defaultServerUrl();

const canvas = document.getElementById("app") as HTMLCanvasElement | null;
if (!canvas) throw new Error("Canvas #app not found");

const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: false,
  antialias: true,
});

attachKeyboard(window);

let currentScene: Scene | null = null;
let currentScreen: ScreenHandle | null = null;
let currentLobby: LobbyHandle | null = null;
let currentNet: NetClient | null = null;
let currentHud: Hud | null = null;
let currentRenderStop: (() => void) | null = null;
let lobbyPollStop: number | null = null;
let lobbyPhaseCheckStop: number | null = null;

function disposeScene(): void {
  currentRenderStop?.();
  currentRenderStop = null;
  currentHud?.dispose();
  currentHud = null;
  currentScreen?.dispose();
  currentScreen = null;
  currentLobby?.dispose();
  currentLobby = null;
  if (lobbyPollStop !== null) { clearInterval(lobbyPollStop); lobbyPollStop = null; }
  if (lobbyPhaseCheckStop !== null) { clearInterval(lobbyPhaseCheckStop); lobbyPhaseCheckStop = null; }
  currentScene?.dispose();
  currentScene = null;
}

function disposeNet(): void {
  currentNet?.dispose();
  currentNet = null;
}

function makeMenuScene(): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.03, 0.04, 0.08, 1);
  const cam = new FreeCamera("menuCam", new Vector3(0, 0, -10), scene);
  cam.setTarget(Vector3.Zero());
  return scene;
}

engine.runRenderLoop(() => currentScene?.render());
window.addEventListener("resize", () => engine.resize());

function goMainMenu(): void {
  disposeScene();
  disposeNet();
  currentScene = makeMenuScene();
  currentScreen = createMainMenu(currentScene, {
    onSinglePlayer: () => startSingleplayer(),
    onMultiplayer: () => goMpMenu(),
  });
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateLobbyCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

function goMpMenu(): void {
  disposeScene();
  disposeNet();
  currentScene = makeMenuScene();
  currentScreen = createMpMenu(currentScene, {
    onBack: () => goMainMenu(),
    onHost: (name) => { void startMultiplayer("host", name, generateLobbyCode()); },
    onJoin: (name, code) => { void startMultiplayer("join", name, code); },
  });
}

function startSingleplayer(): void {
  disposeScene();
  disposeNet();
  currentNet = createLocalNet("Player");
  enterLobby();
}

async function startMultiplayer(mode: "host" | "join", name: string, code?: string): Promise<void> {
  disposeScene();
  disposeNet();
  try {
    currentNet = await createRemoteNet({ url: SERVER_URL, mode, name, code });
    enterLobby();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[net] connect failed", err);
    goMainMenu();
  }
}

function enterLobby(): void {
  if (!currentNet) return;
  const net = currentNet;
  currentScene = makeMenuScene();
  currentLobby = createLobby(currentScene, net, {
    onLeave: () => goMainMenu(),
    onStartGame: () => net.send("startGame"),
  });
  lobbyPollStop = window.setInterval(() => currentLobby?.update(), 100);
  lobbyPhaseCheckStop = window.setInterval(() => {
    if (net.state.phase === "ingame") enterGame();
  }, 100);
}

function enterGame(): void {
  if (!currentNet) return;
  const net = currentNet;

  if (lobbyPollStop !== null) { clearInterval(lobbyPollStop); lobbyPollStop = null; }
  if (lobbyPhaseCheckStop !== null) { clearInterval(lobbyPhaseCheckStop); lobbyPhaseCheckStop = null; }
  currentLobby?.dispose();
  currentLobby = null;
  currentScreen?.dispose();
  currentScreen = null;
  currentScene?.dispose();
  currentScene = null;

  const handles = createGameScene(engine, net.state.game);
  currentScene = handles.scene;
  currentHud = createHud(() => net.state.sessionToCrew.get(net.sessionId) ?? "");
  currentRenderStop = startRenderLoop({
    scene: handles.scene,
    net,
    render: (prev, next, alpha) => {
      handles.render(prev, next, alpha);
      currentHud?.update(next);
    },
  });
}

goMainMenu();
