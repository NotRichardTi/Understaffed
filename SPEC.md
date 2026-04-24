# Understaffed — Game Spec & Build Plan

A 2D side-scrolling co-op space shooter where you have more stations than crew. Built for Vibe Jam 2026. Deadline: **1 May 2026, 13:37 UTC**.

This document is the single source of truth for the game. Read it before every coding session. When in doubt, match this spec. When the spec is wrong, update it before writing code.

---

## 1. Vision

You command a small spaceship with your crew. The ship has five stations — one driver, one repair, three gun turrets — but you only have four crewmates. Someone is always missing from a station. Leaving your gun to patch the shield means the gun goes dark. Running a solo mission means coordinating AI crew. The fun is in the constant re-negotiation of *"who covers what."*

**Reference feel:** Vampire Survivors (auto-fire, enemy density, run length, XP upgrade pacing) crossed with Lovers in a Dangerous Spacetime (multi-station crew management) in a classic horizontal shmup frame.

**Art target:** Dead Cells–style 2D pixel sprites. Babylon.js sprite system, orthographic camera, parallax starfield backgrounds.

---

## 2. Locked Decisions

These are settled. Do not relitigate without explicit sign-off.

| Decision | Value |
|---|---|
| Engine | Babylon.js |
| Rendering | True 2D sprites, orthographic camera |
| Players (multiplayer) | Max 4 |
| Stations | Always exactly 5 (one more than max players) |
| Station breakdown | 1 driver, 1 repair, 3 guns |
| Gun layout | Randomized per run: either 2-top/1-bottom or 1-top/2-bottom |
| Enemy spawn balance | Heavier spawns on the side with more guns |
| Gun control | WASD aims, auto-fires; 180° swivel arc |
| Driver control | Move ship freely through the world (up/down/left/right); camera follows the ship |
| Repair | Hold to heal the shield; shield has a cooldown if fully depleted |
| Shield/hull | Shield absorbs damage; when down, hull takes direct hits |
| Station switching | 3-second transit; the leaving gun stops firing during transit; player visible in destination glass window after transit completes |
| Station claiming | First-come; players can send a switch-request UI ping to another player |
| Driver leaving | Must choose a destination; no unmanned ship |
| Run length | 20 minutes, boss every 5 minutes (3 mid-bosses + final boss) |
| Difficulty curve | Vampire Survivors–style increasing density over time |
| Fail state | Hull reaches 0 |
| Persistence | None. Pure roguelike — nothing carries between runs |
| XP / upgrades | Shared ship XP bar; on level-up, game pauses, all players vote on one of three upgrade options |
| AI crew | Automatic behavior; player can press `1`–`4` to select a bot, then `1`–`4` again to issue a command (go to specific station) |
| AI difficulty | All identical |
| Single-player vs. multiplayer | Single-player built first; multiplayer via Colyseus layered on top |
| Networking | Authoritative server (Colyseus on Railway) |
| Hosting | Railway (jam provides hosting; we use their Node support for server) |
| Multiplayer join | Lobby with shareable room code |
| Audio | User-sourced, not generated |
| Art | Mix of free pixel asset packs and AI-generated fills |

---

## 3. Core Gameplay Loop

1. Player joins/hosts a lobby, enters the game.
2. Ship appears centered on screen. The camera follows the ship (Vampire Survivors–style), so the ship stays roughly anchored to the middle of the view while the world scrolls around it as the driver moves. The parallax starfield shifts based on camera velocity to sell the sense of motion.
3. Enemies spawn on a ring just outside the camera's view and approach the ship. Spawns are weighted toward the ship's gun-heavy hemisphere (see §4.6). Some shoot, some melee, some snipe from range.
4. Crew at gun stations aim with WASD; guns auto-fire projectiles in whatever direction the stick is pointed, within a 180° arc.
5. Driver dodges incoming projectiles by moving the ship freely through the world; the camera follows.
6. Repair crewmember holds a button to regenerate the shield.
7. Enemies drop XP orbs on death. Orbs drift toward the ship (magnet radius). When the ship's XP bar fills, all gameplay pauses and the crew votes on one of three upgrade options.
8. Every 5 minutes, a boss spawns. Defeat it to continue.
9. Survive 20 minutes = win. Hull hits 0 = loss. Restart.

---

## 4. Systems Spec

### 4.1 Ship & Stations

The ship is a single static sprite (with animated turrets/thrusters) positioned around 30% from the left of the screen. Stations are fixed points on the ship sprite with:

- A **glass window** sprite that displays the crew member inside (or goes dark during transit / if unmanned).
- A **station type**: `driver | repair | gun`.
- A **gun-specific direction** (top or bottom) if `gun`.
- A **hardpoint** for visual mount (the turret or the cockpit glass).

On run start, randomize whether the layout is 2-top/1-bottom or 1-bottom/2-top. Store the layout in the run's game state so enemy spawning can read it.

### 4.2 Shield & Hull

- **Hull:** Starts at 100. When it hits 0, game over. Cannot be healed.
- **Shield:** Starts at 100. Absorbs all incoming damage while > 0. Can be regenerated at the repair station.
- **Shield cooldown:** If shield hits 0, it enters a **forced cooldown** (suggested: 8 seconds) where it cannot be repaired at all. During cooldown, all damage goes to hull. After cooldown, shield can be repaired from 0 again.
- **Repair rate:** Holding the repair button regenerates shield at a fixed rate (suggested: 20/sec — tune during playtesting).

### 4.3 Guns

- Each gun has a 180° swivel arc oriented outward from the ship (top guns fire upward-hemisphere, bottom guns fire downward-hemisphere).
- WASD rotates the gun barrel. The barrel's current angle determines projectile direction.
- Gun auto-fires at a fixed cadence (suggested start: 3 shots/sec; upgradeable).
- When the station is **unmanned or in transit**, the gun does not fire at all. (The glass window shows the reason.)

### 4.4 Driver

- Moves the ship freely through the world. The camera follows the ship (Vampire Survivors–style), keeping it roughly centered on screen.
- Base movement speed: tune during playtest.
- Cannot leave the station without choosing a destination.
- Movement is snappy/arcade (no momentum), unless playtest shows momentum feels better.

### 4.5 Station Switching

- Any crew member can initiate a switch by pressing a station key (suggested: `Q` to open a station map, then click/press to pick a destination).
- Once chosen: their glass goes dark, the gun (if applicable) stops firing, and a 3-second transit timer starts.
- When the timer expires: the crew appears in the destination glass, the new station becomes operable.
- **Switch-request UI:** a player can ping another player's station with a "swap?" icon. The other player sees a prompt and accepts/declines. Accept triggers a mutual switch.
- If a destination is already occupied, the switch cannot be initiated (first-come).

### 4.6 Enemies

Enemies spawn on a ring just outside the camera's view, around the ship. Spawn distribution is weighted toward the gun-heavy hemisphere (so a 2-top/1-bottom layout sees more top-side spawns).

**Camera recycling.** As the ship traverses the world, regular enemies that drift far outside the camera are recycled — despawned and re-emitted as fresh spawns on the outer ring. Regular enemies do **not** retain HP across recycles, which keeps synced state small. **Mini-bosses and bosses are exempt**: they retain HP and are never camera-recycled; they persist in-world until killed.

| Enemy | Behavior | Threat |
|---|---|---|
| Fighter | Standard approach, fires medium-speed projectiles | Baseline |
| Swarmer | Fast, no ranged attack, melees the ship on contact | High if undodged; driver must create distance |
| Tank | Slow, fires slow-moving projectiles that explode in an AoE on impact or proximity | Can cluster-damage the ship; prioritize killing |
| Sniper | Long-range, long wind-up, fires a fast high-damage projectile | Punishes stationary driver |
| Mini-boss | Larger, higher HP, combines 2 behaviors (e.g., sniper + swarm escort) | Appears at tuned intervals |
| Boss | Spawns every 5 minutes. Multi-phase. Room-clearing attack patterns | Run-gating |

Enemy HP, damage, and spawn rate should scale with run time. Consider a simple difficulty curve: `spawn_rate = base + time_elapsed * k`.

### 4.7 XP & Upgrades

- Enemies drop XP orbs. Orbs have a magnet radius and drift toward the ship.
- Ship has a single shared XP bar. When it fills, a **level-up** triggers:
  - All gameplay pauses.
  - A modal appears showing 3 random upgrades.
  - All living players vote (click / press). Majority wins. Ties go to a re-roll or driver's pick (TBD — default to **driver's pick** for simplicity).
  - (Stretch: add an optional 10-second vote timer.)

**Upgrade pool** (starter list — expand during playtest):

- **Guns:** +fire rate, +projectile damage, +projectile speed, multi-shot (fires 2/3 projectiles in a spread), piercing (projectiles hit multiple enemies)
- **Repair:** +repair rate, +shield max, -shield cooldown duration, passive shield regen
- **Driver:** +ship movement speed, dodge-dash (brief i-frames on button press), push aura (nudges close enemies back)
- **Ship-wide (rarer):** +hull max, +XP magnet radius, auto-gun mode (unmanned guns fire at low rate), +10 hull instant heal (one-time)

Upgrades apply globally to their station type. E.g., "+fire rate" buffs all three gun stations.

### 4.8 AI Crew (Single-Player)

- On single-player start, the game spawns 3 AI crewmates. The player occupies one station; AI occupies the other three (leaving one station empty at any given time, because stations = players + 1).
- **AI automatic behavior:**
  - Gun AI: aims at the nearest threatening enemy within its arc, otherwise sweeps the arc.
  - Driver AI: avoids projectiles within a lookahead window, stays centered when safe.
  - Repair AI: holds repair if shield < 100% and not in cooldown; idles otherwise.
  - AI does not voluntarily switch stations unless commanded.
- **Commanding AI:**
  - Press `1`, `2`, `3`, or `4` to target a specific AI crewmate (the game displays which AI is which in the HUD).
  - A small command menu opens: `1. Go to Driver`, `2. Go to Repair`, `3. Go to Gun [nearest unmanned]`, `4. Cancel`.
  - Commanded AI triggers a station switch exactly like a player would.
  - Menu is live (does not pause).

### 4.9 HUD

- Hull bar (top-center)
- Shield bar + cooldown indicator (just below hull)
- XP bar (bottom of screen, Vampire Survivors style)
- Timer (top-right, counts up to 20:00, shows next boss countdown)
- Mini-map or station diagram (left side): shows all 5 stations, which are manned/empty/in-transit, and crew identities
- Per-station HUD details (fire rate, etc.) shown on hover/focus

---

## 5. Architecture

This is the most important section. The architecture choice determines whether we can hit the deadline on both single- and multi-player.

### 5.1 The Principle

**Game logic is a pure function of state + inputs.** Rendering and input handling are decoupled from game logic.

```
step(state, inputsFromAllCrew, dt) => newState
```

- In **single-player**, `step()` runs in the client. Inputs come from the keyboard (player) + AI logic (bots). Rendering reads from client state.
- In **multiplayer**, `step()` runs on the Colyseus server. Clients send inputs over the wire; the server runs `step()` and broadcasts state; clients render from the received state. AI crew can still run server-side to fill empty slots.

If you follow this pattern from day one, swapping in Colyseus is a layer addition, not a rewrite.

### 5.2 Suggested Folder Structure

```
/client                 — Babylon.js rendering + input
  /scenes
  /sprites
  /hud
  /input
/server                 — Colyseus server (Phase 5+)
  /rooms
/shared                 — Pure game logic (runs in both!)
  /state                — State shapes (Ship, Station, Enemy, Projectile, etc.)
  /systems              — step() sub-systems: movement, collision, spawning, damage, upgrade
  /ai                   — Bot decision logic (also shared)
  /content              — Enemy defs, upgrade pool, boss patterns
/assets
  /sprites
  /audio
```

The `shared/` folder must not import from `client/` or `server/`. It is pure.

### 5.3 Tick Rate

- Game tick: 30 Hz (server-authoritative in multiplayer, fixed-step in single-player)
- Render: 60 FPS, interpolating between ticks

### 5.4 Input Model

An input frame is a small struct:

```ts
{
  playerId: string,
  stationId: string,       // which station they're currently at
  aimX: number,            // normalized -1..1 from WASD
  aimY: number,
  moveX: number,           // only used at driver
  moveY: number,
  repairHeld: boolean,     // only used at repair
  stationSwitchRequest: string | null,  // destination stationId, if switching
  aiCommand: { targetCrewId: string, destination: string } | null,
  voteChoice: number | null,  // 0/1/2 during upgrade modal
}
```

Every tick, collect all input frames, pass them to `step()`.

### 5.5 Keep Multiplayer Dead-Simple at First

When you get to Phase 5:
- Colyseus room holds the full game state.
- Clients send input frames via `room.send("input", frame)`.
- Server runs `step()` on tick.
- Server broadcasts state diffs via Colyseus's built-in schema sync.
- No lag compensation, no prediction, no rollback. This is a co-op game with low player count — it'll feel fine on a Railway-hosted server with normal pings.

---

## 6. Phased Build Plan

14 days. Tight but doable if we resist feature creep. Each phase has a **playable milestone** — at the end of each phase, *something* should be playable end-to-end. No phase is "groundwork only."

### Phase 1 — Scaffolding & Core Ship (Days 1–2)
- Vite + TypeScript + Babylon.js project set up.
- Orthographic camera, parallax starfield background.
- Ship sprite placed mid-left. Static.
- One player character sprite visible in one glass window.
- Project folder structure per §5.2 in place.
- Shared `step()` skeleton that runs every tick (even if it does nothing yet).

**Milestone:** You can see a ship in space with a crew member visible inside.

### Phase 2 — Guns & Enemies (Days 3–4)
- WASD aims a gun turret; auto-fires projectiles at a fixed cadence.
- Basic Fighter enemy spawns from the right, flies toward the ship, fires at it.
- Projectile collision. Hull takes damage. Hull bar in HUD.
- Enemy dies, drops a placeholder XP orb (no effect yet).

**Milestone:** You can fly, shoot one enemy type, take damage, and see the hull drop.

### Phase 3 — All Stations Online (Days 5–7)
- All 5 stations exist on the ship. Layout randomization.
- Repair station: hold-to-heal shield. Shield bar in HUD. Shield cooldown.
- Driver station: ship moves freely through the world, WASD controls; camera hard-follows the ship.
- Station switching: press `Q` to open station map, pick destination, 3-sec transit, glass goes dark during transit.
- Only one station can be occupied at a time (player is alone; AI comes next phase).

**Milestone:** You can switch between all 5 stations, experience the "stations > hands" tension solo.

### Phase 4 — AI Crew, Enemies, Bosses (Days 8–10)
- AI crew spawn on run start. Each runs its station's automatic behavior.
- Command menu: press `1`–`4` → target bot → `1`–`4` → command destination.
- All enemy types implemented (Fighter, Swarmer, Tank, Sniper, Mini-boss).
- Difficulty curve over time.
- One boss fight at 5:00. (Polish the others in Phase 6 if time.)
- XP orbs work. Level-up pause-menu. Three upgrade options. Voting UI (solo = auto-pick for now).
- Full 20-minute run playable end-to-end.

**Milestone:** Single-player vertical slice is playable end-to-end.

### Phase 5 — Colyseus Multiplayer (Days 11–12)
- Colyseus server project. Move `step()` into the server's room tick.
- Lobby page: create room (returns code), join room by code.
- Client sends inputs; server runs tick; clients render from received state.
- AI fills empty slots in multiplayer rooms (if fewer than 4 humans).
- Deploy server to Railway. Deploy client to Railway.
- Test 2-player, then 4-player session.

**Milestone:** Two browsers on two machines play together.

### Phase 6 — Polish (Days 13–14)
- All 4 bosses (not just 1).
- Audio: source SFX + music. Hook up to events.
- Art pass: swap placeholder sprites for real assets.
- Juice: particle effects, screen shake on big hits, hit-flash on enemies, death animations.
- Balance pass: tune HP, damage, spawn rates, upgrade strengths.
- Bug fixing.
- Submit to jam, verify required JS snippet is installed per rule 02.

**Milestone:** Game ships.

---

## 7. Out of Scope (Do Not Build)

These have been explicitly cut or deferred. Resist adding them.

- **Interior ship view.** No walking around inside the ship. No platforming.
- **Alien boarders / hull breaches from enemies.** Not in the jam build.
- **Per-player upgrades** or **per-player XP pools.** One shared bar, shared vote.
- **Procedural ship layouts.** One ship design, randomized gun positions only.
- **Persistent meta-progression.** Every run is fresh.
- **Mobile/touch support.** Desktop keyboard only for the jam.
- **Accounts, saves, leaderboards.** Jam scope.
- **Vote timer** (starter version). Hold for post-playtest.
- **Lag compensation / client prediction.** Server-authoritative is fine for 4p co-op.

---

## 8. Asset Pipeline

- **Sprites:** Source from itch.io free/paid packs (search: "space shooter pixel art", "ui pixel art"). Fill gaps with AI generation (Pixelicious, Scenario.gg, or self-hosted SD with pixel LoRAs). Pin art dimensions: ship ~256×128px, enemies 32–64px, projectiles 8–16px.
- **Audio:** User-sourced. Suggest freesound.org (CC0), OpenGameArt, or purchased packs.
- **Fonts:** A free pixel font (e.g., VT323, Press Start 2P) for the HUD.

Keep all assets in `/assets/sprites` and `/assets/audio` with sensible filenames. Preload everything on the lobby screen (per rule 08: no loading screens mid-game).

---

## 9. Required Jam Compliance

- **Rule 02:** Add the required JS snippet to the deployed game. Do this in Phase 6, do not forget. Verify after deploy.
- **Rule 03:** At least 90% of code written by AI. Using Claude Code satisfies this.
- **Rule 05:** Free-to-play, no login. Lobby uses codes, no accounts.
- **Rule 08:** No loading screens / heavy downloads. Preload on lobby, keep total bundle small, compress sprites aggressively.
- **Rule 10:** Submit before 1 May 2026, 13:37 UTC. Submit early per the P.S., keep iterating.

---

## 10. Your First Claude Code Prompt

When you open Claude Code in the empty project folder, paste this as the first message:

> I'm building a game called Understaffed for Vibe Jam 2026. Read `SPEC.md` at the project root for the full design.
>
> For this session, execute **Phase 1** from the spec (§6). Goals: scaffold the project with Vite + TypeScript + Babylon.js, set up the folder structure per §5.2, get an orthographic camera with a parallax starfield rendering, place a static ship sprite mid-left, and render one placeholder player sprite visible in one glass window. Also lay down the skeleton of the `shared/step()` pure function per §5.1 — it doesn't need to do anything yet, but the pattern should be in place so later phases can build on it.
>
> Stop when Phase 1's milestone is hit. Do not start Phase 2. When you're done, summarize what you built, what assumptions you made, and what's ready for me to review before Phase 2.

After each phase completes, review the output, then paste the next phase's equivalent prompt. Keep each session scoped to one phase. Don't let Claude Code run ahead.

---

## 11. Open Questions / TBD

Resolve these during playtest, not up front:

- Exact shield regen rate, cooldown duration.
- Exact gun fire rate baseline.
- Exact driver movement speed and camera-follow feel (hard-follow vs. deadzone/smoothing).
- Enemy HP/damage curves.
- Upgrade strengths.
- Boss patterns (design mid-jam after core loop is proven fun).
- Tie-break rule for upgrade votes (default: driver picks).
- Vote timer duration (if added later).

---

*Last updated: 2026-04-23. Edit this file as decisions change.*
