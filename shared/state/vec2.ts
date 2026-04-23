import { Schema, type } from "@colyseus/schema";

export class Vec2 extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;

  constructor(x: number = 0, y: number = 0) {
    super();
    this.x = x;
    this.y = y;
  }
}
