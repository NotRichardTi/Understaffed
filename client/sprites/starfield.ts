import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

interface LayerConfig {
  name: string;
  z: number;
  count: number;
  speed: number;
  size: number;
  color: Color3;
}

interface Star {
  mesh: Mesh;
}

interface Layer {
  config: LayerConfig;
  material: StandardMaterial;
  stars: Star[];
}

export interface Starfield {
  update: (dtSec: number) => void;
  resize: (viewW: number, viewH: number) => void;
  dispose: () => void;
}

function makeLayerMaterial(scene: Scene, cfg: LayerConfig): StandardMaterial {
  const mat = new StandardMaterial(`${cfg.name}-mat`, scene);
  mat.emissiveColor = cfg.color;
  mat.diffuseColor = new Color3(0, 0, 0);
  mat.specularColor = new Color3(0, 0, 0);
  mat.disableLighting = true;
  mat.freeze();
  return mat;
}

function placeStar(
  mesh: Mesh,
  viewW: number,
  viewH: number,
  atLeftEdge: boolean,
) {
  const halfW = viewW / 2;
  const halfH = viewH / 2;
  mesh.position.x = atLeftEdge
    ? halfW + Math.random() * (viewW * 0.25)
    : -halfW + Math.random() * viewW;
  mesh.position.y = -halfH + Math.random() * viewH;
}

function buildLayer(
  scene: Scene,
  cfg: LayerConfig,
  viewW: number,
  viewH: number,
): Layer {
  const material = makeLayerMaterial(scene, cfg);
  const stars: Star[] = [];
  for (let i = 0; i < cfg.count; i++) {
    const mesh = MeshBuilder.CreatePlane(
      `${cfg.name}-${i}`,
      { width: cfg.size, height: cfg.size },
      scene,
    );
    mesh.material = material;
    mesh.position.z = cfg.z;
    mesh.renderingGroupId = 0;
    mesh.isPickable = false;
    mesh.doNotSyncBoundingInfo = true;
    placeStar(mesh, viewW, viewH, false);
    stars.push({ mesh });
  }
  return { config: cfg, material, stars };
}

export function createStarfield(
  scene: Scene,
  viewW: number,
  viewH: number,
): Starfield {
  let currentW = viewW;
  let currentH = viewH;

  const configs: LayerConfig[] = [
    { name: "stars-far", z: 15, count: 60, speed: 20, size: 2, color: new Color3(0.55, 0.6, 0.75) },
    { name: "stars-mid", z: 10, count: 90, speed: 55, size: 3, color: new Color3(0.8, 0.85, 0.95) },
    { name: "stars-near", z: 5, count: 40, speed: 120, size: 4, color: new Color3(1, 1, 1) },
  ];

  const layers: Layer[] = configs.map((cfg) => buildLayer(scene, cfg, currentW, currentH));

  return {
    update: (dtSec: number) => {
      for (const layer of layers) {
        const dx = layer.config.speed * dtSec;
        const leftEdge = -currentW / 2 - layer.config.size;
        for (const s of layer.stars) {
          s.mesh.position.x -= dx;
          if (s.mesh.position.x < leftEdge) {
            placeStar(s.mesh, currentW, currentH, true);
          }
        }
      }
    },
    resize: (w: number, h: number) => {
      currentW = w;
      currentH = h;
      for (const layer of layers) {
        for (const s of layer.stars) {
          const halfW = w / 2;
          const halfH = h / 2;
          if (Math.abs(s.mesh.position.x) > halfW || Math.abs(s.mesh.position.y) > halfH) {
            placeStar(s.mesh, w, h, false);
          }
        }
      }
    },
    dispose: () => {
      for (const layer of layers) {
        for (const s of layer.stars) s.mesh.dispose();
        layer.material.dispose();
      }
    },
  };
}
