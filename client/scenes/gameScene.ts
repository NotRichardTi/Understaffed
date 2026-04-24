import { Scene } from "@babylonjs/core/scene";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { createOrthoCamera, type OrthoCamera } from "./camera.js";
import { createStarfield, type Starfield } from "../sprites/starfield.js";
import { createShip, type ShipHandles } from "../sprites/ship.js";
import { createEntityPool, type EntityPool } from "../sprites/entityPool.js";
import type { GameState } from "@shared/state/gameState.js";
import type { Enemy, Projectile, XpOrb } from "@shared/state/entities.js";

export interface GameSceneHandles {
  scene: Scene;
  render: (prev: GameState, next: GameState, alpha: number) => void;
}

const COLOR_FIGHTER = new Color3(0.85, 0.25, 0.3);
const COLOR_SWARMER = new Color3(1.0, 0.6, 0.15);
const COLOR_TANK = new Color3(0.55, 0.35, 0.2);
const COLOR_SNIPER = new Color3(0.95, 0.85, 0.2);
const COLOR_SNIPER_WINDUP = new Color3(1.0, 0.25, 0.25);
const COLOR_MINIBOSS = new Color3(0.85, 0.25, 0.85);
const COLOR_BOSS = new Color3(0.95, 0.2, 0.45);
const COLOR_PLAYER_BULLET = new Color3(1.0, 0.95, 0.4);
const COLOR_ENEMY_BULLET = new Color3(1.0, 0.35, 0.3);
const COLOR_TANK_SHELL = new Color3(1.0, 0.5, 0.15);
const COLOR_XP_ORB = new Color3(0.35, 0.95, 0.7);

export function createGameScene(engine: Engine, initialState: GameState): GameSceneHandles {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.03, 0.06, 1);
  scene.autoClear = true;

  const ortho: OrthoCamera = createOrthoCamera(scene, engine);

  const starfield: Starfield = createStarfield(
    scene,
    ortho.getViewWidthUnits(),
    ortho.getViewHeightUnits(),
  );

  const ship: ShipHandles = createShip(scene, initialState);

  function enemyColor(e: Enemy): Color3 {
    switch (e.kind) {
      case "swarmer": return COLOR_SWARMER;
      case "tank": return COLOR_TANK;
      case "sniper": return (e.windupSec ?? 0) > 0 ? COLOR_SNIPER_WINDUP : COLOR_SNIPER;
      case "miniboss": return COLOR_MINIBOSS;
      case "boss": return COLOR_BOSS;
      default: return COLOR_FIGHTER;
    }
  }

  const enemyPool: EntityPool<Enemy> = createEntityPool({
    scene,
    namePrefix: "enemy",
    renderingGroupId: 3,
    z: -0.5,
    getId: (e) => e.id,
    getSize: (e) => ({ w: e.size, h: e.size }),
    getPosition: (e) => e.position,
    getColor: enemyColor,
  });

  const projectilePool: EntityPool<Projectile> = createEntityPool({
    scene,
    namePrefix: "bullet",
    renderingGroupId: 3,
    z: -0.6,
    getId: (p) => p.id,
    getSize: (p) => ({ w: p.size, h: p.size }),
    getPosition: (p) => p.position,
    getColor: (p) => {
      if (p.faction === "player") return COLOR_PLAYER_BULLET;
      if (p.aoeRadius) return COLOR_TANK_SHELL;
      return COLOR_ENEMY_BULLET;
    },
  });

  const xpOrbPool: EntityPool<XpOrb> = createEntityPool({
    scene,
    namePrefix: "orb",
    renderingGroupId: 2,
    z: -0.15,
    getId: (o) => o.id,
    getSize: () => ({ w: 10, h: 10 }),
    getPosition: (o) => o.position,
    getColor: () => COLOR_XP_ORB,
  });

  engine.onResizeObservable.add(() => {
    starfield.resize(ortho.getViewWidthUnits(), ortho.getViewHeightUnits());
  });

  return {
    scene,
    render: (prev, next, alpha) => {
      ship.render(prev, next, alpha);
      const shipX = ship.root.position.x;
      const shipY = ship.root.position.y;
      ortho.camera.position.x = shipX;
      ortho.camera.position.y = shipY;
      starfield.setCameraOffset(shipX, shipY);
      enemyPool.sync(next.enemies);
      projectilePool.sync(next.projectiles);
      xpOrbPool.sync(next.xpOrbs);
    },
  };
}
