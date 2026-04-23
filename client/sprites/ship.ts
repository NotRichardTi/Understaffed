import { Color3 } from "@babylonjs/core/Maths/math.color";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { createPlaceholderSprite, type PlaceholderHandle } from "./placeholderSprite.js";
import type { GameState, Station } from "@shared/state/gameState.js";
import {
  GUN_BARREL_LEN,
  GUN_BASE_OFFSET_Y,
} from "@shared/content/tuning.js";

const SHIP_W = 256;
const SHIP_H = 128;
const GLASS_W = 34;
const GLASS_H = 34;
const CREW_BODY_W = 10;
const CREW_BODY_H = 14;
const CREW_HEAD_SIZE = 8;
const GUN_BASE_SIZE = 22;
const BARREL_H = 8;

const COLOR_HULL = new Color3(0.35, 0.4, 0.55);
const COLOR_GLASS_LIT = new Color3(0.22, 0.45, 0.75);
const COLOR_GLASS_DIM = new Color3(0.11, 0.22, 0.38);
const COLOR_GUN_BASE = new Color3(0.25, 0.28, 0.36);
const COLOR_BARREL = new Color3(0.6, 0.65, 0.75);
const CREW_COLORS: Record<string, Color3> = {
  "crew-0": new Color3(1.0, 0.85, 0.35),
  "crew-1": new Color3(0.4, 0.85, 1.0),
  "crew-2": new Color3(0.5, 1.0, 0.5),
  "crew-3": new Color3(1.0, 0.55, 0.9),
};
const COLOR_CREW_FALLBACK = new Color3(0.85, 0.85, 0.85);

interface StationVisual {
  station: Station;
  glass: PlaceholderHandle;
  gunBase?: PlaceholderHandle;
  gunPivot?: TransformNode;
}

interface CrewAvatar {
  root: TransformNode;
  body: PlaceholderHandle;
  head: PlaceholderHandle;
}

export interface ShipHandles {
  root: TransformNode;
  placeAt: (x: number, y: number) => void;
  render: (prev: GameState, next: GameState, alpha: number) => void;
  dispose: () => void;
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function crewColor(crewId: string): Color3 {
  return CREW_COLORS[crewId] ?? COLOR_CREW_FALLBACK;
}

function headColor(base: Color3): Color3 {
  return new Color3(
    Math.min(1, base.r + 0.25),
    Math.min(1, base.g + 0.25),
    Math.min(1, base.b + 0.25),
  );
}

export function createShip(scene: Scene, initialState: GameState): ShipHandles {
  const root = new TransformNode("ship-root", scene);

  const hull = createPlaceholderSprite(scene, {
    name: "ship-hull",
    w: SHIP_W,
    h: SHIP_H,
    color: COLOR_HULL,
    z: 0,
    renderingGroupId: 1,
  });
  hull.mesh.parent = root;

  const visuals: StationVisual[] = [];

  for (const station of initialState.stations) {
    const glass = createPlaceholderSprite(scene, {
      name: `glass-${station.id}`,
      w: GLASS_W,
      h: GLASS_H,
      color: COLOR_GLASS_DIM,
      z: -0.1,
      parent: hull.mesh,
      renderingGroupId: 2,
    });
    glass.setPosition(station.hardpoint.x, station.hardpoint.y);

    const visual: StationVisual = { station, glass };

    if (station.kind === "gun") {
      const gunBase = createPlaceholderSprite(scene, {
        name: `gunbase-${station.id}`,
        w: GUN_BASE_SIZE,
        h: GUN_BASE_SIZE,
        color: COLOR_GUN_BASE,
        z: -0.2,
        parent: hull.mesh,
        renderingGroupId: 2,
      });
      const offsetY = station.gunSide === "top" ? GUN_BASE_OFFSET_Y : -GUN_BASE_OFFSET_Y;
      gunBase.setPosition(station.hardpoint.x, station.hardpoint.y + offsetY);

      const gunPivot = new TransformNode(`gunpivot-${station.id}`, scene);
      gunPivot.parent = hull.mesh;
      gunPivot.position.set(station.hardpoint.x, station.hardpoint.y + offsetY, -0.25);

      const barrel = createPlaceholderSprite(scene, {
        name: `barrel-${station.id}`,
        w: GUN_BARREL_LEN,
        h: BARREL_H,
        color: COLOR_BARREL,
        z: 0,
        renderingGroupId: 2,
      });
      barrel.mesh.parent = gunPivot;
      barrel.mesh.position.set(GUN_BARREL_LEN / 2, 0, 0);

      visual.gunBase = gunBase;
      visual.gunPivot = gunPivot;
    }

    visuals.push(visual);
  }

  const avatars: Record<string, CrewAvatar> = {};
  for (const crew of initialState.crew) {
    const avatarRoot = new TransformNode(`crew-${crew.id}`, scene);
    avatarRoot.parent = hull.mesh;

    const baseColor = crewColor(crew.id);
    const body = createPlaceholderSprite(scene, {
      name: `crewbody-${crew.id}`,
      w: CREW_BODY_W,
      h: CREW_BODY_H,
      color: baseColor,
      z: -0.32,
      renderingGroupId: 2,
    });
    body.mesh.parent = avatarRoot;
    body.mesh.position.set(0, -CREW_HEAD_SIZE / 2, -0.32);

    const head = createPlaceholderSprite(scene, {
      name: `crewhead-${crew.id}`,
      w: CREW_HEAD_SIZE,
      h: CREW_HEAD_SIZE,
      color: headColor(baseColor),
      z: -0.34,
      renderingGroupId: 2,
    });
    head.mesh.parent = avatarRoot;
    head.mesh.position.set(0, CREW_BODY_H / 2 - 1, -0.34);

    const initialStation = initialState.stations.find(
      (s) => s.id === crew.currentStationId,
    );
    if (initialStation) {
      avatarRoot.position.set(initialStation.hardpoint.x, initialStation.hardpoint.y, 0);
    } else {
      body.mesh.setEnabled(false);
      head.mesh.setEnabled(false);
    }

    avatars[crew.id] = {
      root: avatarRoot,
      body,
      head,
    };
  }

  function placeAt(x: number, y: number): void {
    root.position.x = x;
    root.position.y = y;
  }

  function crewPosition(crew: GameState["crew"][number], state: GameState): { x: number; y: number } | null {
    if (!crew.currentStationId) return null;
    const s = state.stations.find((st) => st.id === crew.currentStationId);
    if (!s) return null;
    return { x: s.hardpoint.x, y: s.hardpoint.y };
  }

  function render(prev: GameState, next: GameState, alpha: number): void {
    const prevX = prev.ship.position.x;
    const prevY = prev.ship.position.y;
    const nextX = next.ship.position.x;
    const nextY = next.ship.position.y;
    root.position.x = prevX + (nextX - prevX) * alpha;
    root.position.y = prevY + (nextY - prevY) * alpha;

    for (const visual of visuals) {
      const current = next.stations.find((s) => s.id === visual.station.id);
      if (!current) continue;
      const occupied = current.occupantCrewId !== "";
      const mat = visual.glass.mesh.material as import("@babylonjs/core/Materials/standardMaterial").StandardMaterial | null;
      if (mat) mat.emissiveColor = occupied ? COLOR_GLASS_LIT : COLOR_GLASS_DIM;

      if (visual.gunPivot && current.kind === "gun") {
        const prevStation = prev.stations.find((s) => s.id === current.id);
        const prevAngle = prevStation?.aimAngle ?? current.aimAngle ?? 0;
        const nextAngle = current.aimAngle ?? prevAngle;
        visual.gunPivot.rotation.z = lerpAngle(prevAngle, nextAngle, alpha);
      }
    }

    for (const crew of next.crew) {
      const avatar = avatars[crew.id];
      if (!avatar) continue;
      const pos = crewPosition(crew, next);
      const visible = pos !== null;
      avatar.body.mesh.setEnabled(visible);
      avatar.head.mesh.setEnabled(visible);
      if (pos) {
        avatar.root.position.x = pos.x;
        avatar.root.position.y = pos.y;
      }
    }
  }

  function dispose(): void {
    hull.dispose();
    for (const v of visuals) {
      v.glass.dispose();
      v.gunBase?.dispose();
      v.gunPivot?.dispose();
    }
    for (const id of Object.keys(avatars)) {
      const a = avatars[id]!;
      a.body.dispose();
      a.head.dispose();
      a.root.dispose();
    }
    root.dispose();
  }

  placeAt(initialState.ship.position.x, initialState.ship.position.y);

  return { root, placeAt, render, dispose };
}
