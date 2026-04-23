import { Schema, type } from "@colyseus/schema";
import { HULL_START, SHIELD_START, XP_MAGNET_RADIUS } from "../content/tuning.js";

export class Upgrades extends Schema {
  @type("number") gunFireRateMul: number = 1;
  @type("number") gunDamageMul: number = 1;
  @type("number") gunBulletSpeedMul: number = 1;
  @type("number") gunMultiShot: number = 0;
  @type("number") gunPiercing: number = 0;
  @type("number") repairRateMul: number = 1;
  @type("number") shieldMax: number = SHIELD_START;
  @type("number") shieldCooldownMul: number = 1;
  @type("number") driverSpeedMul: number = 1;
  @type("number") xpMagnetRadius: number = XP_MAGNET_RADIUS;
  @type("number") hullMax: number = HULL_START;
}

export function defaultUpgrades(): Upgrades {
  return new Upgrades();
}
