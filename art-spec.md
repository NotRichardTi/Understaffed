# Art Spec

This is the contract between the codebase and any sprite art (commissioned, AI-generated, or hand-drawn) that drops into `assets/sprites/`. Every dimension here is locked to what the engine expects. Off-spec art will read as broken (mixels, blurry scaling, fractional pixels).

## Base ratio

- Camera vertical extent: **1080 world units** ([client/scenes/camera.ts](client/scenes/camera.ts))
- Design reference canvas: **1920 × 1080** (i.e., 1080 px tall)
- At the design reference: **1 world unit = 1 screen pixel**
- All "world-size" numbers in [shared/content/tuning.ts](shared/content/tuning.ts) and the layout files are therefore also screen-pixel sizes at 1080p.

## Scale factor: **2×**

Every gameplay sprite is authored at **half its world-size in source texels**, then rendered at 2× scale via NEAREST sampling. So a 32-world-unit fighter ⇒ 16×16 source-texel art ⇒ 32×32 screen pixels with chunky 2-px blocks.

If we ever switch to 3× for a chunkier feel, every dimension below is recomputed by `world-size ÷ 3` instead. Don't mix scales — that's the #1 mixel cause.

## Sprite dimensions (source texels at 2×)

### Ship hull (one sprite per layout)

| Layout | World size | **Source art** | Notes |
|---|---|---|---|
| `cross-quad-v1` (current pool) | 220 × 160 | **110 × 80** | Square-ish hull with hardpoints on all four sides |
| `baseline-v1-2top-1bot` | 256 × 128 | 128 × 64 | Wider hull, top-heavy gun arrangement |
| `baseline-v1-1top-2bot` | 256 × 128 | 128 × 64 | Wider hull, bottom-heavy gun arrangement |

The hull is composited with separate sprites layered on top (glass, gun bases, barrels, crew). Don't bake stations into the hull texture.

### Shared ship parts (one sprite each, reused across layouts)

| Part | World size | **Source art** | Notes |
|---|---|---|---|
| Glass window | 34 × 34 | **17 × 17** | One sprite. Tinted brighter when manned, dimmer when empty (handled in code). |
| Gun base | 22 × 22 | **11 × 11** | Mounts at each gun hardpoint. Rotation-symmetric — same sprite for top/bottom/left/right guns (oriented in code). |
| Gun barrel | 38 × 8 | **19 × 4** | Rectangular barrel pointing outward (+X in local space). Rotated in code per `aimAngle`. **See "Pending decision: barrel rotation."** |
| Crew body | 10 × 14 | **5 × 7** | ⚠ Very small. See "Pending decision: crew avatar size." |
| Crew head | 8 × 8 | **4 × 4** | ⚠ Tiny — basically a 4-px blob. |

Crew sprites are tinted per crew slot in code; deliver as grayscale or a neutral base color.

### Enemies

| Entity | World size | **Source art** | Notes |
|---|---|---|---|
| Fighter | 32 | **16 × 16** | Common shooter enemy. |
| Swarmer | 20 | **10 × 10** | Fast melee. Smaller silhouette. |
| Tank | 46 | **23 × 23** | Slow, fires AOE shells. Bulky. |
| Sniper | 26 | **13 × 13** | Long-range, tells with a windup. Distinguishable telegraph posture. |
| Miniboss | 72 | **36 × 36** | Mid-fight pressure unit. Spawns swarmers. |
| Boss | 110 | **55 × 55** | End-game encounter. Multi-phase visual change at 50% HP would be nice (separate sprite for phase 2). |

### Projectiles

| Entity | World size | **Source art** | Notes |
|---|---|---|---|
| Player bullet | 6 | **3 × 3** | ⚠ Too small for sprite art. See "Pending decision: tiny bullets." |
| Enemy bullet | 8 | **4 × 4** | ⚠ Same. |
| Tank shell | 14 | **7 × 7** | Workable as art. AOE projectile. |
| Sniper shot | 7 | **4 × 4** | ⚠ Same problem. |

### Pickups / FX

| Entity | World size | **Source art** | Notes |
|---|---|---|---|
| XP orb | 10 | **5 × 5** | Small glowing pickup. Animation (pulse) optional but nice. |

## Render conventions

When the first real sprite lands, these flip on (engine-wide):

- **Texture sampling: `NEAREST_NEAREST`** — no bilinear smoothing between texels. Set on every `Texture` load.
- **Mipmaps: off** — no mip generation for sprite textures (they're for 3D distance scaling).
- **Engine `antialias: false`** — flip [client/main.ts](client/main.ts) constructor option. MSAA softens chunky edges.
- **No baked anti-aliasing in PNGs** — sprites must use hard pixel edges. Transparent backgrounds via 1-bit alpha (or per-pixel if pixel-art-creator outputs that, but binary is preferred).

## Palette

Pick **one** palette and use it for every gameplay sprite. Recommended starting points (in rough order of fit for a dark-fantasy / sci-fi space shooter):

- **AAP-64** (64 colors, naturalistic) — flexible, well-suited to space + machinery + organic enemies. [https://lospec.com/palette-list/aap-64](https://lospec.com/palette-list/aap-64)
- **Endesga 32** (32 colors, saturated) — punchier, more arcade-y. [https://lospec.com/palette-list/endesga-32](https://lospec.com/palette-list/endesga-32)
- **Resurrect 64** (64 colors, balanced) — middle-ground. [https://lospec.com/palette-list/resurrect-64](https://lospec.com/palette-list/resurrect-64)

UI/HUD does *not* need to obey this palette — render UI at native resolution with whatever colors fit (see SPEC §4.9). The palette rule is for in-world art only.

When using the pixel-art-creator skill, set color mode to **Indexed** with the chosen palette so every sprite is enforced consistent at the source.

## Pending decisions

These need answers before / during art-sourcing. Each blocks a subset of the sprite list above.

### 1. Barrel rotation strategy

The gun barrel rotates in real-time (`gunPivot.rotation.z = aimAngle`). NEAREST-sampled rotated pixel art looks jaggy and shimmers as the angle changes. Options:

- **(A) Pre-rendered rotation sheet:** bake the barrel at 16 or 32 angles, look up the closest sprite per frame. Cleanest pixel-art result. Requires `pixel-art-animator` skill or hand authoring. Adds 16-32 source files for what's currently one barrel sprite.
- **(B) LINEAR sampling on barrel only:** barrel becomes slightly soft, doesn't match ship's NEAREST sharpness. Localized mixel; usually unnoticed.
- **(C) Non-pixel-art barrel:** stylized solid-color or vector-style barrel. Cleanly contrasts the rest of the art and avoids the rotation problem entirely.

**Recommendation:** start with C (solid rectangles, basically what we have now) for first-pass art, upgrade to A only if barrels read as visually weak.

### 2. Tiny bullets (3-4 source texels)

Bullets at 3×3 or 4×4 source texels can't carry visual character. Options:

- **(A) Bump bullet world-sizes** (e.g., `PLAYER_BULLET_SIZE 6 → 12`): gives 6×6 source art. Changes hitboxes; needs balance pass.
- **(B) Solid-color procedural rendering:** keep the current colored-rectangle approach for bullets only. Many pixel-art shmups do this — bullets are flat color discs/squares with optional glow.
- **(C) Fixed minimum source size with visual ≠ collision:** all bullets authored at 8×8 source minimum even if the world-size (and hitbox) is smaller. Visual is bigger than hitbox — feels generous to the player.

**Recommendation:** B for player/enemy bullets (they're high-volume and short-lived), A for shells (tank shells already 7×7, bumping to 16 → 8×8 source is workable).

### 3. Crew avatar size

At 2×, crew body is 5×7 and crew head is 4×4 — too small for any character art. Options:

- **(A) Bump crew sizes in layouts:** `crewBodyW/H/crewHeadSize` ~doubled. Crew silhouettes become readable.
- **(B) Accept abstract pixel-blobs:** crew are recognizable color blobs inside the glass, not characters. Reads as "small figure inside cockpit" from a distance — fine for most viewing.
- **(C) Skip crew sprites entirely:** glass window changes color when manned vs. empty; no figure shown. Simplest, slight loss of personality.

**Recommendation:** B for first pass — match the VS-distance vibe where crew are color-coded specks. Revisit if playtesting wants more character readability.

### 4. VFX / particle strategy

Explosions, muzzle flashes, hit sparks, projectile trails. Options:

- **(A) Pixel-art VFX:** frame-by-frame sprite sheets at the same scale as gameplay. Most labor-intensive.
- **(B) Soft particle quads:** additive-blended colored circles/squares. Easy. Slight visual mismatch with the rest of the pixel art (technically a mixel) that most players don't notice.
- **(C) Hybrid:** key VFX (boss explosions, level-up flash) get pixel-art frames; common VFX (bullet impacts, muzzle flashes) are soft particles.

**Recommendation:** B for first art pass, upgrade to C if any specific VFX feels weak.

### 5. Boss phase 2 visual

Boss flips to phase 2 at 50% HP. Either:
- **(A) Same sprite, different tint** (cheap, easy).
- **(B) Second source sprite for phase 2** (better game-feel, double the boss art budget).

**Recommendation:** A for jam scope, B if there's time at polish.

## Delivery checklist

For each sprite delivered into `assets/sprites/`:

- [ ] Filename matches the entity name (e.g., `fighter.png`, `ship-cross-quad.png`).
- [ ] Exact dimensions match the **Source art** column above. No "approximately."
- [ ] Color mode: Indexed, with the chosen palette. (RGB also acceptable if palette discipline is enforced manually.)
- [ ] Transparent background where appropriate.
- [ ] No baked anti-aliasing — only hard pixel edges.
- [ ] Single sprite per file, no sheet packing (unless explicitly requested for a rotation sheet).
- [ ] Visual direction: assume light from upper-left across all sprites.

## Pixel-art-creator skill prompt template

A starting prompt to paste into the skill, customized per entity:

```
Create a pixel art sprite with these exact specs:
- Canvas: <SOURCE_W>×<SOURCE_H>
- Color mode: Indexed, AAP-64 palette
- Background: transparent
- No anti-aliasing — hard pixel edges only
- Subject: <DESIGN NOTES, e.g. "small space fighter, top-down view, gunmetal hull
  with one front-facing thruster, red cockpit glass, lighting from upper-left">
- Output: single PNG at exact canvas dimensions
```

Replace `<SOURCE_W>×<SOURCE_H>` with the **Source art** value from the table.

## When this spec changes

- **Camera zoom changes:** if `VIEW_HEIGHT_UNITS` in [client/scenes/camera.ts](client/scenes/camera.ts) changes, the "1 world unit = 1 screen pixel" anchor shifts. Recompute the **Source art** column for everything.
- **Scale factor changes:** if we move to 3×, divide every world-size by 3 instead of 2 to get new source dimensions.
- **New layout added:** add a row to the ship-hull table with that layout's `visualW × visualH` ÷ 2.
- **Tuning changes that resize entities:** any change to `*_SIZE` constants in [tuning.ts](shared/content/tuning.ts) requires updating that entity's row.
