import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
import { Vec2 } from "./vec2.js";
import { Enemy, Projectile, XpOrb } from "./entities.js";
import { defaultUpgrades, Upgrades } from "./upgrades.js";

export { Vec2 };
import {
  HULL_START,
  SHIELD_START,
  SHIP_POS_X,
  SHIP_POS_Y,
  xpThresholdForLevel,
} from "../content/tuning.js";
import {
  DEFAULT_LAYOUT_ID,
  getLayout,
  pickRandomLayoutId,
  type ShipLayoutDef,
} from "../content/layouts/index.js";
import { gunDefaultAngle, type GunSide } from "../content/layouts/types.js";

export type StationKind = "driver" | "repair" | "gun";
export type { GunSide };
export type GamePhase = "playing" | "levelup" | "gameover" | "victory";

export const NO_ID = "";
export const NO_TICK = -1;

export class Station extends Schema {
  @type("string") id: string = "";
  @type("string") kind: string = "gun";
  @type("string") gunSide: string = "";
  @type(Vec2) hardpoint: Vec2 = new Vec2();
  @type("string") occupantCrewId: string = NO_ID;
  @type("number") aimAngle: number = 0;
  @type("number") fireCooldownSec: number = 0;
}

export class Crew extends Schema {
  @type("string") id: string = "";
  @type("boolean") isHuman: boolean = false;
  @type("string") currentStationId: string = NO_ID;
  @type("string") pendingStationId: string = NO_ID;
  @type("number") arriveTick: number = NO_TICK;
}

export class Ship extends Schema {
  @type(Vec2) position: Vec2 = new Vec2();
  @type("number") hull: number = HULL_START;
  @type("number") shield: number = SHIELD_START;
  @type("number") shieldCooldownUntilTick: number = NO_TICK;
  @type("string") layout: string = DEFAULT_LAYOUT_ID;
  @type("number") driverMoveX: number = 0;
  @type("number") driverMoveY: number = 0;
}

export class LevelUpOption extends Schema {
  @type("string") upgradeId: string = "";
  @type("string") label: string = "";
  @type("string") desc: string = "";
}

export class GameState extends Schema {
  @type("number") tick: number = 0;
  @type("number") runTimeMs: number = 0;
  @type(Ship) ship: Ship = new Ship();
  @type([Station]) stations: ArraySchema<Station> = new ArraySchema<Station>();
  @type([Crew]) crew: ArraySchema<Crew> = new ArraySchema<Crew>();
  @type([Enemy]) enemies: ArraySchema<Enemy> = new ArraySchema<Enemy>();
  @type([Projectile]) projectiles: ArraySchema<Projectile> = new ArraySchema<Projectile>();
  @type([XpOrb]) xpOrbs: ArraySchema<XpOrb> = new ArraySchema<XpOrb>();
  @type("number") xp: number = 0;
  @type("number") xpToNext: number = 0;
  @type("number") level: number = 1;
  @type("string") phase: string = "playing";
  @type([LevelUpOption]) levelUpOptions: ArraySchema<LevelUpOption> = new ArraySchema<LevelUpOption>();
  @type({ map: "number" }) levelUpVotes: MapSchema<number> = new MapSchema<number>();
  @type(Upgrades) upgrades: Upgrades = new Upgrades();
  @type({ map: "number" }) upgradeStacks: MapSchema<number> = new MapSchema<number>();
  @type("number") nextEntityId: number = 1;
  @type("number") enemySpawnCooldownSec: number = 1.5;
  @type("number") nextMinibossAtSec: number = 0;
  @type("boolean") bossSpawned: boolean = false;
}

function makeGun(id: string, side: GunSide, x: number, y: number): Station {
  const s = new Station();
  s.id = id;
  s.kind = "gun";
  s.gunSide = side;
  s.hardpoint = new Vec2(x, y);
  s.aimAngle = gunDefaultAngle(side);
  s.fireCooldownSec = 0;
  return s;
}

function buildStations(def: ShipLayoutDef): Station[] {
  const driver = new Station();
  driver.id = "station-driver";
  driver.kind = "driver";
  driver.hardpoint = new Vec2(def.stations.driver.x, def.stations.driver.y);

  const repair = new Station();
  repair.id = "station-repair";
  repair.kind = "repair";
  repair.hardpoint = new Vec2(def.stations.repair.x, def.stations.repair.y);

  const guns = def.stations.guns.map((g) =>
    makeGun(g.id, g.side, g.x, g.y),
  );
  return [driver, repair, ...guns];
}

function makeCrew(id: string, isHuman: boolean, stationId: string): Crew {
  const c = new Crew();
  c.id = id;
  c.isHuman = isHuman;
  c.currentStationId = stationId;
  return c;
}

export function createInitialState(layoutId?: string): GameState {
  const chosenId = layoutId ?? pickRandomLayoutId();
  const def = getLayout(chosenId);
  const stations = buildStations(def);

  // Default seating used when this state is shown before the lobby has assigned crew.
  // Driver is human-only — left unmanned by default; the lobby's human picks fill it.
  const repairStation = stations.find((s) => s.kind === "repair")!;
  const gunStations = stations.filter((s) => s.kind === "gun");
  const humanGun = gunStations[0]!;
  const aiGuns = gunStations.slice(1, 3);

  humanGun.occupantCrewId = "crew-0";
  repairStation.occupantCrewId = "crew-1";
  if (aiGuns[0]) aiGuns[0].occupantCrewId = "crew-2";
  if (aiGuns[1]) aiGuns[1].occupantCrewId = "crew-3";

  const crew: Crew[] = [
    makeCrew("crew-0", true, humanGun.id),
    makeCrew("crew-1", false, repairStation.id),
    makeCrew("crew-2", false, aiGuns[0]?.id ?? NO_ID),
    makeCrew("crew-3", false, aiGuns[1]?.id ?? NO_ID),
  ];

  const s = new GameState();
  s.tick = 0;
  s.runTimeMs = 0;
  s.ship.position = new Vec2(SHIP_POS_X, SHIP_POS_Y);
  s.ship.hull = HULL_START;
  s.ship.shield = SHIELD_START;
  s.ship.shieldCooldownUntilTick = NO_TICK;
  s.ship.layout = def.id;
  s.ship.driverMoveX = 0;
  s.ship.driverMoveY = 0;
  s.stations.push(...stations);
  s.crew.push(...crew);
  s.xp = 0;
  s.xpToNext = xpThresholdForLevel(1);
  s.level = 1;
  s.phase = "playing";
  s.upgrades = defaultUpgrades();
  s.nextEntityId = 1;
  s.enemySpawnCooldownSec = 1.5;
  s.nextMinibossAtSec = 0;
  s.bossSpawned = false;
  return s;
}
