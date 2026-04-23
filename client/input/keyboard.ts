import { emptyInputFrame, type InputFrame } from "@shared/state/inputFrame.js";
import type { GunSide, StationKind } from "@shared/state/gameState.js";
import {
  GUN_ROTATE_SPEED_RAD_PER_SEC,
  TICK_DT_SEC,
} from "@shared/content/tuning.js";

const keysDown = new Set<string>();
const gunAngleByStation: Record<string, number> = {};

type Mode = "idle" | "self-switch" | "cmd-pick-dest";
let mode: Mode = "idle";
let selectedBotId: string | null = null;

let pendingStationSwitch: string | null = null;
let pendingAiCommand: { targetCrewId: string; destination: string } | null = null;
let pendingVote: number | null = null;

export function setLevelUpActive(active: boolean): void {
  levelUpActive = active;
}
let levelUpActive = false;

const SELF_SWITCH_STATIONS: Record<string, string> = {
  "1": "station-driver",
  "2": "station-repair",
  "3": "station-gun-1",
  "4": "station-gun-2",
  "5": "station-gun-3",
};

const CMD_DEST: Record<string, string> = {
  "1": "station-driver",
  "2": "station-repair",
  "3": "gun-nearest",
};

const CMD_BOT: Record<string, string> = {
  "1": "crew-1",
  "2": "crew-2",
  "3": "crew-3",
};

function handleDigit(k: string): void {
  if (mode === "self-switch") {
    const target = SELF_SWITCH_STATIONS[k];
    if (target) {
      pendingStationSwitch = target;
      mode = "idle";
    } else if (k === "4" || k === "5") {
      // no-op in self-switch; 1-5 covered above
    }
    return;
  }
  if (mode === "cmd-pick-dest") {
    if (k === "4") {
      mode = "idle";
      selectedBotId = null;
      return;
    }
    const dest = CMD_DEST[k];
    if (dest && selectedBotId) {
      pendingAiCommand = { targetCrewId: selectedBotId, destination: dest };
    }
    mode = "idle";
    selectedBotId = null;
    return;
  }
  const botId = CMD_BOT[k];
  if (botId) {
    selectedBotId = botId;
    mode = "cmd-pick-dest";
  }
}

let attached = false;
export function attachKeyboard(target: Window | HTMLElement = window): () => void {
  if (attached) return () => {};
  attached = true;
  const onDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    keysDown.add(k);
    if (k === "q") {
      mode = mode === "self-switch" ? "idle" : "self-switch";
      selectedBotId = null;
      return;
    }
    if (k === "escape") {
      mode = "idle";
      selectedBotId = null;
      return;
    }
    if (levelUpActive && /^[1-3]$/.test(k)) {
      pendingVote = parseInt(k, 10) - 1;
      return;
    }
    if (/^[1-5]$/.test(k)) handleDigit(k);
  };
  const onUp = (e: KeyboardEvent) => {
    keysDown.delete(e.key.toLowerCase());
  };
  target.addEventListener("keydown", onDown as EventListener);
  target.addEventListener("keyup", onUp as EventListener);
  return () => {
    target.removeEventListener("keydown", onDown as EventListener);
    target.removeEventListener("keyup", onUp as EventListener);
    attached = false;
  };
}

export function isKeyDown(key: string): boolean {
  return keysDown.has(key.toLowerCase());
}

export function getMode(): Mode {
  return mode;
}

export function getSelectedBot(): string | null {
  return selectedBotId;
}

function updateGunAngle(stationId: string, side: GunSide): number {
  const minAngle = side === "top" ? 0 : -Math.PI;
  const maxAngle = side === "top" ? Math.PI : 0;
  let angle =
    gunAngleByStation[stationId] ?? (side === "top" ? Math.PI / 2 : -Math.PI / 2);

  const left = isKeyDown("a");
  const right = isKeyDown("d");
  const delta = GUN_ROTATE_SPEED_RAD_PER_SEC * TICK_DT_SEC;
  if (left) angle += delta;
  if (right) angle -= delta;
  if (angle < minAngle) angle = minAngle;
  if (angle > maxAngle) angle = maxAngle;

  gunAngleByStation[stationId] = angle;
  return angle;
}

export function gatherInputFrame(
  playerId: string,
  stationId: string,
  stationKind: StationKind | null,
  gunSide: GunSide | null,
): InputFrame {
  const frame = emptyInputFrame(playerId, stationId);

  const left = isKeyDown("a");
  const right = isKeyDown("d");
  const up = isKeyDown("w");
  const down = isKeyDown("s");
  const ax = (right ? 1 : 0) - (left ? 1 : 0);
  const ay = (up ? 1 : 0) - (down ? 1 : 0);

  if (stationKind === "gun" && gunSide) {
    const angle = updateGunAngle(stationId, gunSide);
    frame.aimX = Math.cos(angle);
    frame.aimY = Math.sin(angle);
  } else if (stationKind === "driver") {
    frame.moveX = ax;
    frame.moveY = ay;
  }

  if (stationKind === "repair") {
    frame.repairHeld = isKeyDown(" ") || isKeyDown("spacebar");
  }

  if (pendingStationSwitch) {
    frame.stationSwitchRequest = pendingStationSwitch;
    pendingStationSwitch = null;
  }

  if (pendingAiCommand) {
    frame.aiCommand = pendingAiCommand;
    pendingAiCommand = null;
  }

  if (pendingVote !== null) {
    frame.voteChoice = pendingVote;
    pendingVote = null;
  }

  return frame;
}
