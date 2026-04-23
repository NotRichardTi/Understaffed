import { LevelUpOption, type GameState } from "../state/gameState.js";
import type { InputFrame } from "../state/inputFrame.js";
import {
  XP_MAGNET_SPEED,
  XP_PICKUP_RADIUS,
  XP_ORB_VALUE,
  xpThresholdForLevel,
  UPGRADE_CHOICES_PER_LEVEL,
} from "../content/tuning.js";
import { pickRandomUpgrades, UPGRADE_POOL } from "../content/upgradePool.js";

export function tickXpMagnet(state: GameState, dt: number): void {
  const shipX = state.ship.position.x;
  const shipY = state.ship.position.y;
  const radius = state.upgrades.xpMagnetRadius;
  const r2 = radius * radius;

  for (let i = state.xpOrbs.length - 1; i >= 0; i--) {
    const orb = state.xpOrbs[i]!;
    const dx = shipX - orb.position.x;
    const dy = shipY - orb.position.y;
    const d2 = dx * dx + dy * dy;

    if (d2 <= XP_PICKUP_RADIUS * XP_PICKUP_RADIUS) {
      state.xp += XP_ORB_VALUE;
      state.xpOrbs.splice(i, 1);
      continue;
    }

    if (d2 <= r2) {
      const d = Math.sqrt(d2) || 1;
      const nx = dx / d;
      const ny = dy / d;
      const pullFactor = 1 - d / radius;
      const speed = XP_MAGNET_SPEED * (0.4 + pullFactor);
      orb.velocity.x = nx * speed;
      orb.velocity.y = ny * speed;
    } else {
      orb.velocity.x *= Math.max(0, 1 - dt * 2);
      orb.velocity.y *= Math.max(0, 1 - dt * 2);
    }
  }

  if (state.phase === "playing" && state.xp >= state.xpToNext) {
    triggerLevelUp(state);
  }
}

function triggerLevelUp(state: GameState): void {
  state.xp -= state.xpToNext;
  state.level += 1;
  state.xpToNext = xpThresholdForLevel(state.level);
  state.phase = "levelup";
  const options = pickRandomUpgrades(UPGRADE_CHOICES_PER_LEVEL, state.upgradeStacks);
  state.levelUpOptions.splice(0, state.levelUpOptions.length);
  for (const o of options) {
    const opt = new LevelUpOption();
    opt.upgradeId = o.id;
    opt.label = o.label;
    opt.desc = o.desc;
    state.levelUpOptions.push(opt);
  }
}

export function tickLevelUpVote(state: GameState, inputs: InputFrame[]): void {
  if (state.phase !== "levelup") return;
  if (state.levelUpOptions.length === 0) {
    state.phase = "playing";
    state.levelUpVotes.clear();
    return;
  }

  const humanCrewIds = new Set<string>();
  state.crew.forEach((c) => { if (c.isHuman) humanCrewIds.add(c.id); });

  for (const input of inputs) {
    const choice = input.voteChoice;
    if (choice === null || choice < 0) continue;
    if (choice >= state.levelUpOptions.length) continue;
    if (!humanCrewIds.has(input.playerId)) continue;
    state.levelUpVotes.set(input.playerId, choice);
  }

  for (const crewId of Array.from(state.levelUpVotes.keys())) {
    if (!humanCrewIds.has(crewId)) state.levelUpVotes.delete(crewId);
  }

  const humanCount = humanCrewIds.size;
  if (humanCount === 0) {
    resolveVote(state, 0);
    return;
  }
  const threshold = Math.floor(humanCount / 2) + 1;
  const counts = new Array(state.levelUpOptions.length).fill(0) as number[];
  state.levelUpVotes.forEach((choice) => {
    if (choice >= 0 && choice < counts.length) counts[choice]! += 1;
  });
  let winner = -1;
  let max = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i]! > max) { max = counts[i]!; winner = i; }
  }
  if (max >= threshold) {
    resolveVote(state, winner);
    return;
  }

  if (state.levelUpVotes.size >= humanCount) {
    const top: number[] = [];
    for (let i = 0; i < counts.length; i++) {
      if (counts[i]! === max) top.push(i);
    }
    const pick = top[Math.floor(Math.random() * top.length)]!;
    resolveVote(state, pick);
  }
}

function resolveVote(state: GameState, choice: number): void {
  const picked = state.levelUpOptions[choice];
  if (picked) {
    const def = UPGRADE_POOL.find((u) => u.id === picked.upgradeId);
    if (def) {
      const prevHullMax = state.upgrades.hullMax;
      def.apply(state.upgrades);
      const prevStack = state.upgradeStacks.get(picked.upgradeId) ?? 0;
      state.upgradeStacks.set(picked.upgradeId, prevStack + 1);
      const hullDelta = state.upgrades.hullMax - prevHullMax;
      if (hullDelta > 0) {
        state.ship.hull = Math.min(state.upgrades.hullMax, state.ship.hull + hullDelta);
      }
    }
  }
  state.levelUpOptions.splice(0, state.levelUpOptions.length);
  state.levelUpVotes.clear();
  state.phase = "playing";
}
