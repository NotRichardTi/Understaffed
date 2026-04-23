import { Schema, type } from "@colyseus/schema";
import { Vec2 } from "./vec2.js";
export { Vec2 };

export type EnemyKind = "fighter" | "swarmer" | "tank" | "sniper" | "miniboss" | "boss";
export type Faction = "player" | "enemy";

export class Enemy extends Schema {
  @type("string") id: string = "";
  @type("string") kind: string = "fighter";
  @type(Vec2) position: Vec2 = new Vec2();
  @type(Vec2) velocity: Vec2 = new Vec2();
  @type("number") hp: number = 0;
  @type("number") maxHp: number = 0;
  @type("number") fireCooldownSec: number = 0;
  @type("number") size: number = 0;
  @type("number") contactDamage: number = 0;
  @type("number") contactCooldownSec: number = 0;
  @type("number") windupSec: number = 0;
  @type("number") subCooldownSec: number = 0;
  @type("number") phase: number = 0;
}

export class Projectile extends Schema {
  @type("string") id: string = "";
  @type("string") faction: string = "player";
  @type(Vec2) position: Vec2 = new Vec2();
  @type(Vec2) velocity: Vec2 = new Vec2();
  @type("number") damage: number = 0;
  @type("number") ttlSec: number = 0;
  @type("number") size: number = 0;
  @type("number") piercesLeft: number = 0;
  @type("number") aoeRadius: number = 0;
}

export class XpOrb extends Schema {
  @type("string") id: string = "";
  @type(Vec2) position: Vec2 = new Vec2();
  @type(Vec2) velocity: Vec2 = new Vec2();
}
