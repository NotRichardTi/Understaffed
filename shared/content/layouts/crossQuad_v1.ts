import type { ShipLayoutDef } from "./types.js";

export const crossQuad_v1: ShipLayoutDef = {
  id: "cross-quad-v1",
  hull: {
    halfW: 110,
    halfH: 80,
    visualW: 220,
    visualH: 160,
  },
  stations: {
    driver: { x: -30, y: 0 },
    repair: { x:  30, y: 0 },
    guns: [
      { id: "station-gun-1", side: "top",    x:    0, y:  70 },
      { id: "station-gun-2", side: "bottom", x:    0, y: -70 },
      { id: "station-gun-3", side: "left",   x:  -95, y:   0 },
      { id: "station-gun-4", side: "right",  x:   95, y:   0 },
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
