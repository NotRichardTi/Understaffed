import { NO_ID, NO_TICK, type GameState, type Station } from "@shared/state/gameState.js";
import { TICK_HZ } from "@shared/content/tuning.js";
import { getMode, getSelectedBot, setLevelUpActive } from "../input/keyboard.js";

export interface Hud {
  update: (state: GameState) => void;
  dispose: () => void;
}

const STYLE = `
.hud {
  position: fixed;
  inset: 0;
  pointer-events: none;
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  color: #eaf0ff;
  text-shadow: 0 0 4px rgba(0,0,0,0.8);
}
.hud__top {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.hud__bar {
  width: 360px;
  height: 12px;
  border: 1px solid rgba(255,255,255,0.35);
  background: rgba(0,0,0,0.35);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}
.hud__bar-fill {
  height: 100%;
  transition: width 120ms linear, background-color 120ms linear;
}
.hud__bar-fill--hull { background: #ff5a5a; }
.hud__bar-fill--shield { background: #5ac8ff; }
.hud__bar-fill--shield.is-down { background: #555; }
.hud__label {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.85;
}
.hud__station {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 6px 14px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 2px;
}
.hud__station.is-transit { color: #ffcc66; border-color: rgba(255,204,102,0.5); }
.hud__menu {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.55);
}
.hud__menu[data-active="true"] { display: flex; }
.hud__menu-inner {
  background: rgba(10,14,24,0.95);
  border: 1px solid rgba(255,255,255,0.25);
  padding: 22px 28px;
  min-width: 320px;
}
.hud__menu-title {
  font-size: 14px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 14px;
  opacity: 0.85;
}
.hud__menu-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(255,255,255,0.08);
  font-size: 13px;
}
.hud__menu-row:last-child { border-bottom: none; }
.hud__menu-row.is-unavailable { opacity: 0.35; }
.hud__menu-row.is-current { color: #9effb0; }
.hud__menu-hotkey {
  display: inline-block;
  width: 20px;
  text-align: center;
  color: #aabbdd;
}
.hud__gameover {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  letter-spacing: 0.2em;
  color: #ff7878;
  background: rgba(0,0,0,0.55);
}
.hud__gameover[data-active="true"] { display: flex; }
.hud__roster {
  position: absolute;
  top: 18px;
  left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(0,0,0,0.35);
  padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 2px;
  min-width: 180px;
}
.hud__roster-title { opacity: 0.75; margin-bottom: 2px; }
.hud__roster-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hud__roster-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.hud__roster-row.is-selected {
  outline: 1px solid #ffcc66;
  padding: 2px 4px;
  margin: -2px -4px;
}
.hud__cmd-prompt {
  position: absolute;
  top: 138px;
  left: 18px;
  min-width: 180px;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 8px 10px;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,204,102,0.55);
  color: #ffcc66;
  border-radius: 2px;
  display: none;
  line-height: 1.45;
}
.hud__cmd-prompt[data-active="true"] { display: block; }
.hud__xp-wrap {
  position: absolute;
  bottom: 54px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.hud__xp-label { font-size: 10px; letter-spacing: 0.18em; opacity: 0.75; }
.hud__xp-bar {
  width: 520px;
  height: 8px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 2px;
  overflow: hidden;
}
.hud__xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #6fffad, #60ffe0);
  transition: width 120ms linear;
}
.hud__levelup {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(2,4,10,0.78);
}
.hud__levelup[data-active="true"] { display: flex; }
.hud__levelup-inner {
  background: rgba(10,14,24,0.95);
  border: 1px solid rgba(110,255,180,0.45);
  padding: 22px 28px;
  min-width: 420px;
  box-shadow: 0 0 40px rgba(110,255,180,0.15);
}
.hud__levelup-title {
  font-size: 15px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #6fffad;
  margin-bottom: 14px;
}
.hud__levelup-opt {
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 2px;
  margin-bottom: 8px;
  display: flex;
  gap: 12px;
  align-items: baseline;
}
.hud__levelup-opt:last-child { margin-bottom: 0; }
.hud__levelup-key {
  color: #6fffad;
  font-weight: bold;
  letter-spacing: 0.14em;
  width: 24px;
}
.hud__levelup-label {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  flex: 0 0 auto;
}
.hud__levelup-desc {
  font-size: 12px;
  opacity: 0.7;
  margin-left: auto;
}
.hud__levelup-votes {
  font-size: 12px;
  letter-spacing: 0.1em;
  color: #6fffad;
  min-width: 44px;
  text-align: right;
}
.hud__levelup-opt.is-mine {
  border-color: #6fffad;
  background: rgba(111,255,173,0.08);
}
.hud__timer {
  position: absolute;
  top: 18px;
  right: 18px;
  text-align: right;
  font-size: 12px;
  letter-spacing: 0.14em;
  background: rgba(0,0,0,0.35);
  padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 2px;
  min-width: 150px;
}
.hud__timer-main { font-size: 18px; letter-spacing: 0.22em; }
.hud__timer-sub { font-size: 10px; opacity: 0.7; margin-top: 2px; }
.hud__boss {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 520px;
}
.hud__boss[data-active="true"] { display: flex; }
.hud__boss-label {
  font-size: 11px;
  letter-spacing: 0.24em;
  color: #ff9aa6;
  text-transform: uppercase;
}
.hud__boss-bar {
  width: 100%;
  height: 10px;
  border: 1px solid rgba(255,90,110,0.55);
  background: rgba(40,0,10,0.55);
  border-radius: 2px;
  overflow: hidden;
}
.hud__boss-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff3355, #ff8ca6);
  transition: width 120ms linear;
}
.hud__victory {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  letter-spacing: 0.26em;
  color: #6fffad;
  background: rgba(2,10,6,0.7);
}
.hud__victory[data-active="true"] { display: flex; }
`;

const CREW_COLOR_HEX: Record<string, string> = {
  "crew-0": "#ffd957",
  "crew-1": "#66d9ff",
  "crew-2": "#80ff80",
  "crew-3": "#ff8ce6",
};

const STATION_HOTKEYS: Record<string, string> = {
  "station-driver": "1",
  "station-repair": "2",
  "station-gun-1": "3",
  "station-gun-2": "4",
  "station-gun-3": "5",
};

function buildStationLabels(stations: Station[]): Record<string, string> {
  const labels: Record<string, string> = {};
  const topGuns = stations.filter((s) => s.kind === "gun" && s.gunSide === "top");
  const botGuns = stations.filter((s) => s.kind === "gun" && s.gunSide === "bottom");
  for (const s of stations) {
    if (s.kind === "driver") {
      labels[s.id] = "DRIVER";
    } else if (s.kind === "repair") {
      labels[s.id] = "REPAIR";
    } else if (s.gunSide === "top") {
      const idx = topGuns.indexOf(s);
      labels[s.id] = topGuns.length > 1 ? `TOP GUN ${idx + 1}` : "TOP GUN";
    } else {
      const idx = botGuns.indexOf(s);
      labels[s.id] = botGuns.length > 1 ? `BOTTOM GUN ${idx + 1}` : "BOTTOM GUN";
    }
  }
  return labels;
}

export function createHud(getMyCrewId: () => string = () => ""): Hud {
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "hud";
  root.innerHTML = `
    <div class="hud__top">
      <div class="hud__bar"><div class="hud__bar-fill hud__bar-fill--hull" data-ref="hull-fill" style="width:100%"></div></div>
      <div class="hud__bar" data-ref="shield-bar"><div class="hud__bar-fill hud__bar-fill--shield" data-ref="shield-fill" style="width:100%"></div></div>
    </div>
    <div class="hud__station" data-ref="station">AT: —</div>
    <div class="hud__menu" data-ref="menu">
      <div class="hud__menu-inner">
        <div class="hud__menu-title">STATION MAP — press 1-5 or Q to close</div>
        <div data-ref="menu-rows"></div>
      </div>
    </div>
    <div class="hud__roster" data-ref="roster"></div>
    <div class="hud__cmd-prompt" data-ref="cmd-prompt"></div>
    <div class="hud__xp-wrap">
      <div class="hud__xp-label" data-ref="xp-label">LV 1</div>
      <div class="hud__xp-bar"><div class="hud__xp-fill" data-ref="xp-fill" style="width:0%"></div></div>
    </div>
    <div class="hud__levelup" data-ref="levelup">
      <div class="hud__levelup-inner">
        <div class="hud__levelup-title" data-ref="levelup-title">LEVEL UP — PICK AN UPGRADE</div>
        <div data-ref="levelup-opts"></div>
      </div>
    </div>
    <div class="hud__timer" data-ref="timer">
      <div class="hud__timer-main" data-ref="timer-main">00:00</div>
    </div>
    <div class="hud__boss" data-ref="boss">
      <div class="hud__boss-label" data-ref="boss-label">BOSS</div>
      <div class="hud__boss-bar"><div class="hud__boss-fill" data-ref="boss-fill" style="width:100%"></div></div>
    </div>
    <div class="hud__gameover" data-ref="gameover">HULL BREACH</div>
    <div class="hud__victory" data-ref="victory">VICTORY</div>
  `;
  document.body.appendChild(root);

  const hullFill = root.querySelector<HTMLDivElement>('[data-ref="hull-fill"]')!;
  const shieldFill = root.querySelector<HTMLDivElement>('[data-ref="shield-fill"]')!;
  const stationEl = root.querySelector<HTMLDivElement>('[data-ref="station"]')!;
  const menu = root.querySelector<HTMLDivElement>('[data-ref="menu"]')!;
  const menuRows = root.querySelector<HTMLDivElement>('[data-ref="menu-rows"]')!;
  const roster = root.querySelector<HTMLDivElement>('[data-ref="roster"]')!;
  const cmdPrompt = root.querySelector<HTMLDivElement>('[data-ref="cmd-prompt"]')!;
  const xpFill = root.querySelector<HTMLDivElement>('[data-ref="xp-fill"]')!;
  const xpLabel = root.querySelector<HTMLDivElement>('[data-ref="xp-label"]')!;
  const levelUp = root.querySelector<HTMLDivElement>('[data-ref="levelup"]')!;
  const levelUpTitle = root.querySelector<HTMLDivElement>('[data-ref="levelup-title"]')!;
  const levelUpOpts = root.querySelector<HTMLDivElement>('[data-ref="levelup-opts"]')!;
  const timerMain = root.querySelector<HTMLDivElement>('[data-ref="timer-main"]')!;
  const bossBox = root.querySelector<HTMLDivElement>('[data-ref="boss"]')!;
  const gameOver = root.querySelector<HTMLDivElement>('[data-ref="gameover"]')!;
  const victory = root.querySelector<HTMLDivElement>('[data-ref="victory"]')!;

  return {
    update: (state: GameState) => {
      const labels = buildStationLabels(state.stations);
      const labelFor = (id: string | null | undefined): string =>
        id ? labels[id] ?? "—" : "—";

      const hullMax = state.upgrades.hullMax;
      const hull = Math.max(0, state.ship.hull);
      hullFill.style.width = `${(hull / hullMax) * 100}%`;

      const shieldMax = state.upgrades.shieldMax;
      const shield = Math.max(0, state.ship.shield);
      const shieldDown = state.ship.shieldCooldownUntilTick !== NO_TICK;
      shieldFill.style.width = `${(shield / shieldMax) * 100}%`;
      shieldFill.classList.toggle("is-down", shieldDown);

      const myCrewId = getMyCrewId();
      const human = (myCrewId && state.crew.find((c) => c.id === myCrewId)) || state.crew.find((c) => c.isHuman);
      if (human && human.pendingStationId !== NO_ID && human.arriveTick !== NO_TICK) {
        const ticksLeft = Math.max(0, human.arriveTick - state.tick);
        const secLeft = (ticksLeft / TICK_HZ).toFixed(1);
        stationEl.textContent = `IN TRANSIT → ${labelFor(human.pendingStationId)} (${secLeft}s)`;
        stationEl.classList.add("is-transit");
      } else {
        const curLabel = labelFor(human?.currentStationId);
        stationEl.textContent = human?.currentStationId ? `AT: ${curLabel}` : "AT: —";
        stationEl.classList.remove("is-transit");
      }

      const mode = getMode();
      const selectedBot = getSelectedBot();

      const menuActive = mode === "self-switch";
      menu.setAttribute("data-active", menuActive ? "true" : "false");
      if (menuActive) {
        menuRows.innerHTML = state.stations
          .map((s) => {
            const isCurrent = s.id === human?.currentStationId;
            const hotkey = STATION_HOTKEYS[s.id] ?? "?";
            const occupant = s.occupantCrewId
              ? state.crew.find((c) => c.id === s.occupantCrewId)
              : null;
            let status: string;
            if (isCurrent) status = "(you)";
            else if (!occupant) status = "(empty)";
            else if (occupant.isHuman) status = "(player)";
            else status = `(swap w/ bot ${occupant.id.slice(-1)})`;
            const cls = [
              "hud__menu-row",
              isCurrent ? "is-current" : "",
              !isCurrent && occupant?.isHuman ? "is-unavailable" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return `<div class="${cls}"><span><span class="hud__menu-hotkey">${hotkey}</span> ${labels[s.id]}</span><span>${status}</span></div>`;
          })
          .join("");
      }

      const bots = state.crew.filter((c) => !c.isHuman);
      const rosterHtml = bots
        .map((c) => {
          const color = CREW_COLOR_HEX[c.id] ?? "#ccc";
          const label = `BOT ${c.id.slice(-1)}`;
          const loc = c.pendingStationId
            ? `→ ${labelFor(c.pendingStationId)}`
            : labelFor(c.currentStationId);
          const cls = selectedBot === c.id ? "hud__roster-row is-selected" : "hud__roster-row";
          return `<div class="${cls}"><span class="hud__roster-dot" style="background:${color}"></span><span>${label}</span><span style="margin-left:auto;opacity:0.8">${loc}</span></div>`;
        })
        .join("");
      roster.innerHTML = `<div class="hud__roster-title">CREW — press 1-3 to command</div>${rosterHtml}`;

      if (mode === "cmd-pick-dest" && selectedBot) {
        const label = `BOT ${selectedBot.slice(-1)}`;
        cmdPrompt.textContent = `${label} → 1:DRV  2:REP  3:GUN  4:CANCEL`;
        cmdPrompt.setAttribute("data-active", "true");
      } else {
        cmdPrompt.setAttribute("data-active", "false");
      }

      const xpPct = state.xpToNext > 0 ? (state.xp / state.xpToNext) * 100 : 0;
      xpFill.style.width = `${Math.min(100, xpPct)}%`;
      xpLabel.textContent = `LV ${state.level}`;

      const isLevelUp = state.phase === "levelup";
      setLevelUpActive(isLevelUp);
      levelUp.setAttribute("data-active", isLevelUp ? "true" : "false");
      if (isLevelUp) {
        const humanCount = state.crew.reduce((n, c) => n + (c.isHuman ? 1 : 0), 0);
        const threshold = Math.max(1, Math.floor(humanCount / 2) + 1);
        const counts = new Array(state.levelUpOptions.length).fill(0) as number[];
        state.levelUpVotes.forEach((choice) => {
          if (choice >= 0 && choice < counts.length) counts[choice]! += 1;
        });
        const myVote = myCrewId ? state.levelUpVotes.get(myCrewId) ?? -1 : -1;
        levelUpTitle.textContent = `LEVEL ${state.level} — PICK AN UPGRADE (1-3) — need ${threshold}/${humanCount}`;
        levelUpOpts.innerHTML = state.levelUpOptions
          .map((opt, i) => {
            const mine = myVote === i ? " is-mine" : "";
            const tally = `${counts[i] ?? 0}/${threshold}`;
            return `<div class="hud__levelup-opt${mine}"><span class="hud__levelup-key">${i + 1}</span><span class="hud__levelup-label">${opt.label}</span><span class="hud__levelup-desc">${opt.desc}</span><span class="hud__levelup-votes">${tally}</span></div>`;
          })
          .join("");
      }

      const tSec = state.runTimeMs / 1000;
      const mm = Math.floor(tSec / 60).toString().padStart(2, "0");
      const ss = Math.floor(tSec % 60).toString().padStart(2, "0");
      timerMain.textContent = `${mm}:${ss}`;
      bossBox.setAttribute("data-active", "false");

      gameOver.setAttribute("data-active", state.phase === "gameover" ? "true" : "false");
      victory.setAttribute("data-active", state.phase === "victory" ? "true" : "false");
    },
    dispose: () => {
      root.remove();
      style.remove();
    },
  };
}
