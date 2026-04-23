import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

export interface PlaceholderOptions {
  name: string;
  w: number;
  h: number;
  color: Color3;
  z?: number;
  parent?: Mesh;
  renderingGroupId?: number;
}

export interface PlaceholderHandle {
  mesh: Mesh;
  setPosition: (x: number, y: number) => void;
  dispose: () => void;
}

export function createPlaceholderSprite(
  scene: Scene,
  opts: PlaceholderOptions,
): PlaceholderHandle {
  const { name, w, h, color, z = 0, parent, renderingGroupId } = opts;
  const mesh = MeshBuilder.CreatePlane(name, { width: w, height: h }, scene);
  const mat = new StandardMaterial(`${name}-mat`, scene);
  mat.emissiveColor = color;
  mat.disableLighting = true;
  mesh.material = mat;
  mesh.position.set(0, 0, z);
  if (parent) mesh.parent = parent;
  if (renderingGroupId !== undefined) mesh.renderingGroupId = renderingGroupId;

  return {
    mesh,
    setPosition: (x: number, y: number) => {
      mesh.position.x = x;
      mesh.position.y = y;
    },
    dispose: () => {
      mat.dispose();
      mesh.dispose();
    },
  };
}
