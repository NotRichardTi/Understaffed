import type { Scene } from "@babylonjs/core/scene";
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Rectangle,
  StackPanel,
  TextBlock,
} from "@babylonjs/gui";
import type { NetClient } from "../net/NetClient.js";
import type { LobbyPlayer, RoomState } from "@shared/net/roomState.js";
import { STATION_IDS } from "@shared/net/lobbyHandlers.js";

export interface LobbyHandle {
  dispose: () => void;
  update: () => void;
}

export interface LobbyActions {
  onLeave: () => void;
  onStartGame: () => void;
}

const CHAR_COLORS = ["#ffd966", "#66d9ff", "#7fff7f", "#ff8ee8"];
const CHAR_NAMES = ["Yellow", "Cyan", "Green", "Pink"];

const STATION_META: Record<string, { label: string; group: "gun" | "driver" | "repair" }> = {
  "station-gun-1": { label: "Gun 1", group: "gun" },
  "station-gun-2": { label: "Gun 2", group: "gun" },
  "station-gun-3": { label: "Gun 3", group: "gun" },
  "station-driver": { label: "Driver", group: "driver" },
  "station-repair": { label: "Repair", group: "repair" },
};

function makeTitle(text: string, size = 32): TextBlock {
  const t = new TextBlock();
  t.text = text;
  t.color = "#e6edf3";
  t.fontSize = size;
  t.height = `${size + 16}px`;
  t.fontFamily = "ui-monospace, monospace";
  return t;
}

function makeText(text: string, size = 14, color = "#8892a0"): TextBlock {
  const t = new TextBlock();
  t.text = text;
  t.color = color;
  t.fontSize = size;
  t.height = `${size + 8}px`;
  t.fontFamily = "ui-monospace, monospace";
  return t;
}

function makeSpacer(h: number): Rectangle {
  const r = new Rectangle();
  r.height = `${h}px`;
  r.thickness = 0;
  return r;
}

export function createLobby(scene: Scene, net: NetClient, actions: LobbyActions): LobbyHandle {
  const t = AdvancedDynamicTexture.CreateFullscreenUI("LobbyUI", true, scene);
  t.idealWidth = 1280;
  t.renderAtIdealSize = true;

  const root = new StackPanel("lobbyRoot");
  root.isVertical = true;
  root.width = "720px";
  root.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  root.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  root.spacing = 8;

  const header = makeTitle("LOBBY", 36);
  root.addControl(header);
  const codeLine = makeText("", 16, "#c8d2df");
  root.addControl(codeLine);
  root.addControl(makeSpacer(12));

  root.addControl(makeText("CHARACTER", 14));
  const charRow = new StackPanel("charRow");
  charRow.isVertical = false;
  charRow.height = "80px";
  charRow.spacing = 10;
  const charButtons: Button[] = [];
  for (let i = 0; i < 4; i++) {
    const b = Button.CreateSimpleButton(`char-${i}`, CHAR_NAMES[i]!);
    b.width = "140px";
    b.height = "72px";
    b.color = "#0b0d12";
    b.background = CHAR_COLORS[i]!;
    b.thickness = 0;
    b.cornerRadius = 6;
    b.fontSize = 16;
    b.fontFamily = "ui-monospace, monospace";
    b.onPointerUpObservable.add(() => {
      net.send("pickCharacter", { charIdx: i });
    });
    charButtons.push(b);
    charRow.addControl(b);
  }
  root.addControl(charRow);
  root.addControl(makeSpacer(8));

  root.addControl(makeText("STATION", 14));
  const stationRowA = new StackPanel("stationRowA");
  stationRowA.isVertical = false;
  stationRowA.height = "52px";
  stationRowA.spacing = 8;
  const stationRowB = new StackPanel("stationRowB");
  stationRowB.isVertical = false;
  stationRowB.height = "52px";
  stationRowB.spacing = 8;
  const stationButtons: Record<string, Button> = {};
  for (let i = 0; i < STATION_IDS.length; i++) {
    const sid = STATION_IDS[i]!;
    const meta = STATION_META[sid]!;
    const b = Button.CreateSimpleButton(`station-${sid}`, meta.label);
    b.width = "140px";
    b.height = "48px";
    b.color = "#e6edf3";
    b.background = "#1f2631";
    b.thickness = 1;
    b.cornerRadius = 4;
    b.fontSize = 16;
    b.fontFamily = "ui-monospace, monospace";
    b.onPointerUpObservable.add(() => {
      net.send("pickStation", { stationId: sid });
    });
    stationButtons[sid] = b;
    (i < 3 ? stationRowA : stationRowB).addControl(b);
  }
  root.addControl(stationRowA);
  root.addControl(stationRowB);
  root.addControl(makeSpacer(12));

  root.addControl(makeText("PLAYERS", 14));
  const playerList = new StackPanel("playerList");
  playerList.isVertical = true;
  playerList.spacing = 4;
  playerList.height = "140px";
  root.addControl(playerList);
  root.addControl(makeSpacer(12));

  const hintLabel = makeText("", 14, "#f0b86b");
  root.addControl(hintLabel);

  const actionRow = new StackPanel("actionRow");
  actionRow.isVertical = false;
  actionRow.height = "56px";
  actionRow.spacing = 10;

  const readyBtn = Button.CreateSimpleButton("ready", "Ready");
  readyBtn.width = "180px";
  readyBtn.height = "48px";
  readyBtn.color = "#e6edf3";
  readyBtn.background = "#1f2631";
  readyBtn.thickness = 1;
  readyBtn.cornerRadius = 4;
  readyBtn.fontSize = 18;
  readyBtn.fontFamily = "ui-monospace, monospace";
  readyBtn.onPointerUpObservable.add(() => {
    net.send("toggleReady");
  });
  actionRow.addControl(readyBtn);

  const aiFillBtn = Button.CreateSimpleButton("aiFill", "AI Fill: ON");
  aiFillBtn.width = "180px";
  aiFillBtn.height = "48px";
  aiFillBtn.color = "#e6edf3";
  aiFillBtn.background = "#1f2631";
  aiFillBtn.thickness = 1;
  aiFillBtn.cornerRadius = 4;
  aiFillBtn.fontSize = 16;
  aiFillBtn.fontFamily = "ui-monospace, monospace";
  aiFillBtn.onPointerUpObservable.add(() => {
    net.send("toggleAiFill");
  });
  actionRow.addControl(aiFillBtn);

  const startBtn = Button.CreateSimpleButton("start", "Start Game");
  startBtn.width = "180px";
  startBtn.height = "48px";
  startBtn.color = "#e6edf3";
  startBtn.background = "#2b5d8a";
  startBtn.thickness = 0;
  startBtn.cornerRadius = 4;
  startBtn.fontSize = 18;
  startBtn.fontFamily = "ui-monospace, monospace";
  startBtn.onPointerUpObservable.add(() => {
    actions.onStartGame();
  });
  actionRow.addControl(startBtn);

  const leaveBtn = Button.CreateSimpleButton("leave", "Leave");
  leaveBtn.width = "140px";
  leaveBtn.height = "48px";
  leaveBtn.color = "#e6edf3";
  leaveBtn.background = "#3a1f26";
  leaveBtn.thickness = 0;
  leaveBtn.cornerRadius = 4;
  leaveBtn.fontSize = 16;
  leaveBtn.fontFamily = "ui-monospace, monospace";
  leaveBtn.onPointerUpObservable.add(() => {
    actions.onLeave();
  });
  actionRow.addControl(leaveBtn);
  root.addControl(actionRow);

  t.addControl(root);

  function update(): void {
    const state: RoomState = net.state;
    codeLine.text = `Code: ${state.lobbyCode}`;

    const me = state.players.get(net.sessionId);
    const takenChars = new Set<number>();
    const takenStations = new Set<string>();
    state.players.forEach((p, sid) => {
      if (sid !== net.sessionId) {
        if (p.charIdx >= 0) takenChars.add(p.charIdx);
        if (p.stationId) takenStations.add(p.stationId);
      }
    });

    for (let i = 0; i < 4; i++) {
      const b = charButtons[i]!;
      const taken = takenChars.has(i);
      const mine = me?.charIdx === i;
      b.thickness = mine ? 4 : 0;
      b.color = mine ? "#ffffff" : "#0b0d12";
      b.alpha = taken && !mine ? 0.3 : 1;
      b.isHitTestVisible = !(taken && !mine);
    }

    for (const sid of STATION_IDS) {
      const b = stationButtons[sid]!;
      const taken = takenStations.has(sid);
      const mine = me?.stationId === sid;
      b.background = mine ? "#2b5d8a" : "#1f2631";
      b.thickness = mine ? 2 : 1;
      b.alpha = taken && !mine ? 0.3 : 1;
      b.isHitTestVisible = !(taken && !mine);
    }

    playerList.clearControls();
    state.players.forEach((p: LobbyPlayer, sid: string) => {
      const row = new StackPanel(`p-${sid}`);
      row.isVertical = false;
      row.height = "28px";
      row.spacing = 8;
      const swatch = new Rectangle();
      swatch.width = "20px";
      swatch.height = "20px";
      swatch.thickness = 0;
      swatch.background = p.charIdx >= 0 ? CHAR_COLORS[p.charIdx]! : "#333";
      row.addControl(swatch);
      const name = makeText(`${p.name}${sid === state.hostSessionId ? " (host)" : ""}`, 14, "#e6edf3");
      name.width = "200px";
      name.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      row.addControl(name);
      const station = makeText(p.stationId ? STATION_META[p.stationId]?.label ?? "?" : "—", 14, "#8892a0");
      station.width = "120px";
      station.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      row.addControl(station);
      const ready = makeText(p.ready ? "✓ READY" : "", 14, "#7fff7f");
      ready.width = "100px";
      ready.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      row.addControl(ready);
      playerList.addControl(row);
    });

    const isHost = state.hostSessionId === net.sessionId;
    aiFillBtn.isVisible = isHost;
    aiFillBtn.textBlock!.text = `AI Fill: ${state.aiFill ? "ON" : "OFF"}`;
    aiFillBtn.background = state.aiFill ? "#2b5d8a" : "#1f2631";

    startBtn.isVisible = isHost;
    let allReady = state.players.size > 0;
    state.players.forEach((p) => { if (!p.ready) allReady = false; });
    startBtn.alpha = allReady ? 1 : 0.4;
    startBtn.isHitTestVisible = allReady;

    if (!me) {
      hintLabel.text = "";
      readyBtn.alpha = 0.4;
      readyBtn.isHitTestVisible = false;
    } else if (me.stationId === "") {
      hintLabel.text = "Pick a station to ready up";
      readyBtn.alpha = 0.4;
      readyBtn.isHitTestVisible = false;
      readyBtn.textBlock!.text = "Ready";
    } else {
      hintLabel.text = "";
      readyBtn.alpha = 1;
      readyBtn.isHitTestVisible = true;
      readyBtn.textBlock!.text = me.ready ? "Unready" : "Ready";
      readyBtn.background = me.ready ? "#2b8a4e" : "#1f2631";
    }
  }

  update();

  return {
    dispose() {
      t.removeControl(root);
      root.dispose();
      t.dispose();
    },
    update,
  };
}

