import type { Upgrades } from "../state/upgrades.js";

export interface UpgradeOption {
  id: string;
  label: string;
  desc: string;
  apply: (u: Upgrades) => void;
  maxStacks?: number;
}

export const UPGRADE_POOL: UpgradeOption[] = [
  {
    id: "fire_rate",
    label: "+Fire Rate",
    desc: "All guns fire 20% faster",
    apply: (u) => { u.gunFireRateMul *= 1.2; },
  },
  {
    id: "damage",
    label: "+Damage",
    desc: "Bullets deal 25% more damage",
    apply: (u) => { u.gunDamageMul *= 1.25; },
  },
  {
    id: "bullet_speed",
    label: "+Projectile Speed",
    desc: "Bullets travel 20% faster",
    apply: (u) => { u.gunBulletSpeedMul *= 1.2; },
  },
  {
    id: "multi_shot",
    label: "Multi-Shot",
    desc: "Guns fire +1 bullet in a spread",
    maxStacks: 2,
    apply: (u) => { u.gunMultiShot += 1; },
  },
  {
    id: "piercing",
    label: "Piercing Rounds",
    desc: "Bullets pierce +1 enemy",
    maxStacks: 2,
    apply: (u) => { u.gunPiercing += 1; },
  },
  {
    id: "repair_rate",
    label: "+Repair Rate",
    desc: "Shield repairs 30% faster",
    apply: (u) => { u.repairRateMul *= 1.3; },
  },
  {
    id: "shield_max",
    label: "+Shield Capacity",
    desc: "+25 max shield",
    apply: (u) => { u.shieldMax += 25; },
  },
  {
    id: "shield_cooldown",
    label: "-Shield Cooldown",
    desc: "Shield cooldown is 25% shorter",
    apply: (u) => { u.shieldCooldownMul *= 0.75; },
  },
  {
    id: "ship_speed",
    label: "+Ship Speed",
    desc: "Driver moves 20% faster",
    apply: (u) => { u.driverSpeedMul *= 1.2; },
  },
  {
    id: "xp_magnet",
    label: "+XP Magnet",
    desc: "XP orb pickup radius +40",
    apply: (u) => { u.xpMagnetRadius += 40; },
  },
  {
    id: "hull_patch",
    label: "Hull Patch",
    desc: "+20 max hull (and heal +20)",
    apply: (u) => { u.hullMax += 20; },
  },
];

export interface UpgradeStacksLike {
  get(id: string): number | undefined;
}

export function pickRandomUpgrades(
  n: number,
  stacks: UpgradeStacksLike,
  rand: () => number = Math.random,
): UpgradeOption[] {
  const eligible = UPGRADE_POOL.filter((u) => {
    const cur = stacks.get(u.id) ?? 0;
    return u.maxStacks === undefined || cur < u.maxStacks;
  });
  const copy = [...eligible];
  const out: UpgradeOption[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return out;
}
