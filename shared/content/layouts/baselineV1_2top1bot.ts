import type { ShipLayoutDef } from "./types.js";

export const baselineV1_2top1bot: ShipLayoutDef = {
  id: "baseline-v1-2top-1bot",
  hull: {
    halfW: 128,
    halfH: 64,
    visualW: 256,
    visualH: 128,
  },
  stations: {
    driver: { x: -70, y: 0 },
    repair: { x: 60, y: 0 },
    guns: [
      { id: "station-gun-1", side: "top",    x: -30, y:  60 },
      { id: "station-gun-2", side: "top",    x:  40, y:  60 },
      { id: "station-gun-3", side: "bottom", x:  10, y: -60 },
    ],
  },
  visuals: {
    glassSize: 34,
    gunBaseSize: 22,
    gunBarrelLen: 38,
    gunBarrelH: 8,
    gunBaseOffset: 24,
    crewBodyW: 10,
    crewBodyH: 14,
    crewHeadSize: 8,
  },
};
