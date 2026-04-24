import { NO_ID, NO_TICK, type GameState, type GunSide, type Station } from "../state/gameState.js";
import { emptyInputFrame, type InputFrame } from "../state/inputFrame.js";
import type { Enemy } from "../state/entities.js";
import {
  SHIELD_START,
  SHIP_HALF_H,
  SHIP_HALF_W,
} from "../content/tuning.js";

function nearestEnemyInHemisphere(
  enemies: Enemy[],
  gunX: number,
  gunY: number,
  side: "top" | "bottom",
): Enemy | null {
  let best: Enemy | null = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dy = e.position.y - gunY;
    if (side === "top" && dy < -4) continue;
    if (side === "bottom" && dy > 4) continue;
    const dx = e.position.x - gunX;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

function fillGunFrame(
  f: InputFrame,
  station: Station,
  state: GameState,
): void {
  const side = (station.gunSide || "top") as GunSide;
  const gunX = state.ship.position.x + station.hardpoint.x;
  const gunY = state.ship.position.y + station.hardpoint.y;
  const target = nearestEnemyInHemisphere(state.enemies, gunX, gunY, side);
  if (target) {
    const dx = target.position.x - gunX;
    const dy = target.position.y - gunY;
    const len = Math.hypot(dx, dy) || 1;
    f.aimX = dx / len;
    f.aimY = dy / len;
  } else {
    f.aimX = 1;
    f.aimY = side === "top" ? 0.01 : -0.01;
  }
}

function fillRepairFrame(f: InputFrame, state: GameState): void {
  if (state.ship.shieldCooldownUntilTick !== NO_TICK) return;
  if (state.ship.shield >= SHIELD_START) return;
  f.repairHeld = true;
}

const DODGE_LOOKAHEAD_SEC = 2.2;
const PROJECTILE_SCAN_RADIUS = 360;
const SHIP_DODGE_RADIUS = Math.max(SHIP_HALF_W, SHIP_HALF_H) + 18;
const SWARMER_AVOID_RADIUS = 210;
const ORB_SEEK_RADIUS = 480;
const ORB_FORCE_CAP = 0.5;
const IMMINENT_DANGER_THRESHOLD = 1.4;
const COVERAGE_SCAN_RADIUS = 700;
const COVERAGE_MARGIN = 90;
const COVERAGE_FORCE_CAP = 0.55;
const LIGHT_DODGE_SUPPRESSION = 0.7;
const COVERAGE_AGGRESSION_BOOST = 1.0;
const HEAVY_PROJECTILE_DAMAGE = 20;

function fillDriverFrame(f: InputFrame, state: GameState): void {
  const shipX = state.ship.position.x;
  const shipY = state.ship.position.y;

  const inShieldCooldown = state.ship.shieldCooldownUntilTick !== NO_TICK;
  const shieldReady = inShieldCooldown
    ? 0
    : state.ship.shield / Math.max(1, state.upgrades.shieldMax);
  const hullFactor = state.ship.hull / Math.max(1, state.upgrades.hullMax);
  const aggression = Math.max(0, Math.min(1, shieldReady * hullFactor));
  const lightDodgeScale = 1 - aggression * LIGHT_DODGE_SUPPRESSION;

  let forceX = 0;
  let forceY = 0;
  let danger = 0;

  for (const p of state.projectiles) {
    if (p.faction !== "enemy") continue;
    const dpx = shipX - p.position.x;
    const dpy = shipY - p.position.y;
    const distNow = Math.hypot(dpx, dpy);
    if (distNow > PROJECTILE_SCAN_RADIUS) continue;

    const vx = p.velocity.x;
    const vy = p.velocity.y;
    const speed = Math.hypot(vx, vy);
    if (speed < 1) continue;

    const rawT = (dpx * vx + dpy * vy) / (speed * speed);
    if (rawT < -0.1) continue;
    const t = Math.min(rawT, DODGE_LOOKAHEAD_SEC);

    const futureX = p.position.x + vx * t;
    const futureY = p.position.y + vy * t;
    const caDx = shipX - futureX;
    const caDy = shipY - futureY;
    const caDist = Math.hypot(caDx, caDy);

    const hitRadius = SHIP_DODGE_RADIUS + (p.aoeRadius ?? 0);
    if (caDist > hitRadius + 40) continue;

    const urgency = Math.max(0.2, 1 - caDist / (hitRadius + 40));
    const timeFactor = Math.max(0.25, 1 - t / DODGE_LOOKAHEAD_SEC);
    let w = urgency * timeFactor * 3.0;

    const isHeavy = (p.aoeRadius ?? 0) > 0 || p.damage >= HEAVY_PROJECTILE_DAMAGE;
    const isUnavoidable = caDist < 4;
    if (!isHeavy && !isUnavoidable) {
      w *= lightDodgeScale;
    }

    if (caDist < 4) {
      const perpX = -vy / speed;
      const perpY = vx / speed;
      const roomAbove = 240 - shipY;
      const roomBelow = 240 + shipY;
      const preferDown = roomBelow > roomAbove ? 1 : -1;
      const sign = Math.sign(perpY) === preferDown || perpY === 0 ? 1 : -1;
      forceX += perpX * sign * w * 0.25;
      forceY += perpY * sign * w;
    } else {
      forceX += (caDx / caDist) * w;
      forceY += (caDy / caDist) * w;
    }

    if (caDist < hitRadius && t < 1.3) danger += w;
  }

  for (const e of state.enemies) {
    if (!e.contactDamage) continue;
    const dx = shipX - e.position.x;
    const dy = shipY - e.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist > SWARMER_AVOID_RADIUS) continue;
    const urgency = 1 - dist / SWARMER_AVOID_RADIUS;
    const len = dist || 1;
    const w = urgency * 2.2;
    forceX += (dx / len) * w;
    forceY += (dy / len) * w;
    if (dist < 110) danger += w;
  }

  if (danger < IMMINENT_DANGER_THRESHOLD) {
    const magnet = state.upgrades.xpMagnetRadius;
    const magnetKeepOut = magnet * 0.7;
    let orbFx = 0;
    let orbFy = 0;
    for (const o of state.xpOrbs) {
      const dx = o.position.x - shipX;
      const dy = o.position.y - shipY;
      const dist = Math.hypot(dx, dy);
      if (dist < magnetKeepOut) continue;
      if (dist > ORB_SEEK_RADIUS) continue;
      const len = dist || 1;
      const w = 40 / (dist + 60);
      orbFx += (dx / len) * w;
      orbFy += (dy / len) * w;
    }
    const orbMag = Math.hypot(orbFx, orbFy);
    if (orbMag > ORB_FORCE_CAP) {
      orbFx = (orbFx / orbMag) * ORB_FORCE_CAP;
      orbFy = (orbFy / orbMag) * ORB_FORCE_CAP;
    }
    forceX += orbFx;
    forceY += orbFy;
  }

  let topActive = false;
  let bottomActive = false;
  for (const s of state.stations) {
    if (s.kind !== "gun" || s.occupantCrewId === NO_ID) continue;
    if (s.gunSide === "top") topActive = true;
    else if (s.gunSide === "bottom") bottomActive = true;
  }

  if (topActive !== bottomActive) {
    let sumY = 0;
    let weight = 0;
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.position.x - shipX;
      const dy = e.position.y - shipY;
      const d = Math.hypot(dx, dy);
      if (d > COVERAGE_SCAN_RADIUS) continue;
      const w = 1 / (d + 120);
      sumY += e.position.y * w;
      weight += w;
    }
    if (weight > 0) {
      const avgEnemyY = sumY / weight;
      const desiredShipY = topActive ? avgEnemyY - COVERAGE_MARGIN : avgEnemyY + COVERAGE_MARGIN;
      const coverageCap = COVERAGE_FORCE_CAP * (1 + aggression * COVERAGE_AGGRESSION_BOOST);
      const coverageForce = Math.tanh((desiredShipY - shipY) / 140) * coverageCap;
      forceY += coverageForce;
    }
  }

  const mag = Math.hypot(forceX, forceY);
  if (mag < 0.08) return;
  f.moveX = forceX / mag;
  f.moveY = forceY / mag;
}

export function generateAiInputs(state: GameState): InputFrame[] {
  const frames: InputFrame[] = [];
  for (const crew of state.crew) {
    if (crew.isHuman) continue;
    if (crew.currentStationId === NO_ID) continue;
    const station = state.stations.find((s) => s.id === crew.currentStationId);
    if (!station) continue;
    const f = emptyInputFrame(crew.id, crew.currentStationId);
    if (station.kind === "gun") fillGunFrame(f, station, state);
    else if (station.kind === "repair") fillRepairFrame(f, state);
    else if (station.kind === "driver") fillDriverFrame(f, state);
    frames.push(f);
  }
  return frames;
}
