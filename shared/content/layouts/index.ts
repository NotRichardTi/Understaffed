import { baselineV1_2top1bot } from "./baselineV1_2top1bot.js";
import { baselineV1_1top2bot } from "./baselineV1_1top2bot.js";
import { crossQuad_v1 } from "./crossQuad_v1.js";
import type { ShipLayoutDef } from "./types.js";

export type { ShipLayoutDef, GunSide, SpawnBias, LayoutGun, LayoutHull, LayoutStations, LayoutVisuals } from "./types.js";
export { gunOutward, gunDefaultAngle } from "./types.js";

const ALL_LAYOUTS: ReadonlyArray<ShipLayoutDef> = [
  baselineV1_2top1bot,
  baselineV1_1top2bot,
  crossQuad_v1,
];

export const LAYOUTS: Readonly<Record<string, ShipLayoutDef>> = Object.freeze(
  Object.fromEntries(ALL_LAYOUTS.map((l) => [l.id, l])),
);

// Pool drawn from when createInitialState() is called without an explicit id.
// Edit this list to control which layouts the game randomly picks between.
// Currently locked to the cross-quad layout for testing; add baseline ids back to mix.
export const LAYOUT_POOL: ReadonlyArray<string> = [
  crossQuad_v1.id,
];

export const DEFAULT_LAYOUT_ID = LAYOUT_POOL[0]!;

export function getLayout(id: string): ShipLayoutDef {
  return LAYOUTS[id] ?? LAYOUTS[DEFAULT_LAYOUT_ID]!;
}

export function pickRandomLayoutId(): string {
  if (LAYOUT_POOL.length === 0) return DEFAULT_LAYOUT_ID;
  const i = Math.floor(Math.random() * LAYOUT_POOL.length);
  return LAYOUT_POOL[i] ?? DEFAULT_LAYOUT_ID;
}
