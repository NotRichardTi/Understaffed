import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

interface LayerConfig {
  name: string;
  z: number;
  count: number;
  parallaxFactor: number;
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
  resize: (viewW: number, viewH: number) => void;
  setCameraOffset: (x: number, y: number) => void;
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

function placeStar(mesh: Mesh, viewW: number, viewH: number): void {
  mesh.position.x = -viewW / 2 + Math.random() * viewW;
  mesh.position.y = -viewH / 2 + Math.random() * viewH;
}

function buildLayer(
  scene: Scene,
  cfg: LayerConfig,
  viewW: number,
  viewH: number,
  parent: TransformNode,
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
    mesh.parent = parent;
    mesh.position.z = cfg.z;
    mesh.renderingGroupId = 0;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    placeStar(mesh, viewW, viewH);
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
  let prevOffsetX: number | null = null;
  let prevOffsetY = 0;

  const root = new TransformNode("starfield-root", scene);

  const configs: LayerConfig[] = [
    { name: "stars-far", z: 15, count: 60, parallaxFactor: 0.15, size: 2, color: new Color3(0.55, 0.6, 0.75) },
    { name: "stars-mid", z: 10, count: 90, parallaxFactor: 0.4, size: 3, color: new Color3(0.8, 0.85, 0.95) },
    { name: "stars-near", z: 5, count: 40, parallaxFactor: 0.85, size: 4, color: new Color3(1, 1, 1) },
  ];

  const layers: Layer[] = configs.map((cfg) => buildLayer(scene, cfg, currentW, currentH, root));

  function wrapStar(mesh: Mesh): void {
    const halfW = currentW / 2;
    const halfH = currentH / 2;
    if (mesh.position.x < -halfW) mesh.position.x += currentW;
    else if (mesh.position.x > halfW) mesh.position.x -= currentW;
    if (mesh.position.y < -halfH) mesh.position.y += currentH;
    else if (mesh.position.y > halfH) mesh.position.y -= currentH;
  }

  return {
    resize: (w: number, h: number) => {
      currentW = w;
      currentH = h;
      for (const layer of layers) {
        for (const s of layer.stars) {
          const halfW = w / 2;
          const halfH = h / 2;
          if (Math.abs(s.mesh.position.x) > halfW || Math.abs(s.mesh.position.y) > halfH) {
            placeStar(s.mesh, w, h);
          }
        }
      }
    },
    setCameraOffset: (x: number, y: number) => {
      root.position.x = x;
      root.position.y = y;
      if (prevOffsetX === null) {
        prevOffsetX = x;
        prevOffsetY = y;
        return;
      }
      const dx = x - prevOffsetX;
      const dy = y - prevOffsetY;
      prevOffsetX = x;
      prevOffsetY = y;
      if (dx === 0 && dy === 0) return;
      for (const layer of layers) {
        const f = layer.config.parallaxFactor;
        const sx = -dx * f;
        const sy = -dy * f;
        for (const s of layer.stars) {
          s.mesh.position.x += sx;
          s.mesh.position.y += sy;
          wrapStar(s.mesh);
        }
      }
    },
    dispose: () => {
      for (const layer of layers) {
        for (const s of layer.stars) s.mesh.dispose();
        layer.material.dispose();
      }
      root.dispose();
    },
  };
}
