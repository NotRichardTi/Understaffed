import { NO_ID, Vec2, type GameState, type GunSide, type Station } from "../state/gameState.js";
import type { InputFrame } from "../state/inputFrame.js";
import { Projectile } from "../state/entities.js";
import {
  GUN_FIRE_COOLDOWN_SEC,
  GUN_ROTATE_SPEED_RAD_PER_SEC,
  PLAYER_BULLET_SPEED,
  PLAYER_BULLET_DAMAGE,
  PLAYER_BULLET_SIZE,
  PLAYER_BULLET_TTL_SEC,
} from "../content/tuning.js";
import { getLayout, gunDefaultAngle, gunOutward } from "../content/layouts/index.js";
import { nextId } from "./ids.js";

export function clampAimAngle(
  aimX: number,
  aimY: number,
  side: GunSide,
  prev: number,
  dt: number,
): number {
  if (Math.abs(aimX) < 0.01 && Math.abs(aimY) < 0.01) return prev;
  let target = Math.atan2(aimY, aimX);
  const out = gunDefaultAngle(side);
  let rel = target - out;
  while (rel >  Math.PI) rel -= 2 * Math.PI;
  while (rel < -Math.PI) rel += 2 * Math.PI;
  if (rel >  Math.PI / 2) rel =  Math.PI / 2;
  if (rel < -Math.PI / 2) rel = -Math.PI / 2;
  target = out + rel;

  const maxStep = GUN_ROTATE_SPEED_RAD_PER_SEC * dt;
  let diff = target - prev;
  while (diff >  Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const step = Math.max(-maxStep, Math.min(maxStep, diff));
  return prev + step;
}

function findInputForStation(
  inputs: InputFrame[],
  station: Station,
): InputFrame | null {
  for (const input of inputs) {
    if (input.stationId === station.id) return input;
  }
  return null;
}

export function tickGuns(
  state: GameState,
  inputs: InputFrame[],
  dt: number,
): void {
  const shipX = state.ship.position.x;
  const shipY = state.ship.position.y;
  const visuals = getLayout(state.ship.layout).visuals;
  const up = state.upgrades;
  const fireCooldown = GUN_FIRE_COOLDOWN_SEC / up.gunFireRateMul;
  const bulletSpeed = PLAYER_BULLET_SPEED * up.gunBulletSpeedMul;
  const bulletDamage = PLAYER_BULLET_DAMAGE * up.gunDamageMul;
  const shotCount = 1 + up.gunMultiShot;
  const spread = up.gunMultiShot > 0 ? (Math.PI / 12) * up.gunMultiShot : 0;

  for (const station of state.stations) {
    if (station.kind !== "gun") continue;
    if (station.occupantCrewId === NO_ID) continue;

    const side = (station.gunSide || "top") as GunSide;
    const prevAngle = station.aimAngle;

    const input = findInputForStation(inputs, station);
    const aimX = input?.aimX ?? 0;
    const aimY = input?.aimY ?? 0;
    const angle = clampAimAngle(aimX, aimY, side, prevAngle, dt);
    station.aimAngle = angle;

    const out = gunOutward(side);
    const baseX = shipX + station.hardpoint.x + out.x * visuals.gunBaseOffset;
    const baseY = shipY + station.hardpoint.y + out.y * visuals.gunBaseOffset;

    const cooldown = station.fireCooldownSec - dt;
    if (cooldown <= 0) {
      for (let i = 0; i < shotCount; i++) {
        const t = shotCount === 1 ? 0 : i / (shotCount - 1) - 0.5;
        const shotAngle = angle + t * spread;
        const muzzleX = baseX + Math.cos(shotAngle) * visuals.gunBarrelLen;
        const muzzleY = baseY + Math.sin(shotAngle) * visuals.gunBarrelLen;
        const bullet = new Projectile();
        bullet.id = nextId(state, "bullet");
        bullet.faction = "player";
        bullet.position = new Vec2(muzzleX, muzzleY);
        bullet.velocity = new Vec2(Math.cos(shotAngle) * bulletSpeed, Math.sin(shotAngle) * bulletSpeed);
        bullet.damage = bulletDamage;
        bullet.ttlSec = PLAYER_BULLET_TTL_SEC;
        bullet.size = PLAYER_BULLET_SIZE;
        bullet.piercesLeft = up.gunPiercing;
        state.projectiles.push(bullet);
      }
      station.fireCooldownSec = fireCooldown;
    } else {
      station.fireCooldownSec = cooldown;
    }
  }
}
