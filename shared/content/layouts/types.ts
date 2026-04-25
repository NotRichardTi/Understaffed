export type GunSide = "top" | "bottom" | "left" | "right";

export interface LayoutGun {
  readonly id: string;
  readonly side: GunSide;
  readonly x: number;
  readonly y: number;
}

/** Outward unit direction for a gun's barrel/base relative to its hardpoint. */
export function gunOutward(side: GunSide): { readonly x: number; readonly y: number } {
  switch (side) {
    case "top":    return { x:  0, y:  1 };
    case "bottom": return { x:  0, y: -1 };
    case "right":  return { x:  1, y:  0 };
    case "left":   return { x: -1, y:  0 };
  }
}

/** Initial barrel angle (radians) for a gun on this side, pointing outward. */
export function gunDefaultAngle(side: GunSide): number {
  switch (side) {
    case "top":    return  Math.PI / 2;
    case "bottom": return -Math.PI / 2;
    case "right":  return  0;
    case "left":   return  Math.PI;
  }
}

export interface LayoutHull {
  readonly halfW: number;
  readonly halfH: number;
  readonly visualW: number;
  readonly visualH: number;
}

export interface LayoutStations {
  readonly driver: { readonly x: number; readonly y: number };
  readonly repair: { readonly x: number; readonly y: number };
  readonly guns: ReadonlyArray<LayoutGun>;
}

export interface LayoutVisuals {
  readonly glassSize: number;
  readonly gunBaseSize: number;
  readonly gunBarrelLen: number;
  readonly gunBarrelH: number;
  /** Distance the gun base sits past the hardpoint along the side's outward normal. */
  readonly gunBaseOffset: number;
  readonly crewBodyW: number;
  readonly crewBodyH: number;
  readonly crewHeadSize: number;
}

export interface ShipLayoutDef {
  readonly id: string;
  readonly hull: LayoutHull;
  readonly stations: LayoutStations;
  readonly visuals: LayoutVisuals;
}
