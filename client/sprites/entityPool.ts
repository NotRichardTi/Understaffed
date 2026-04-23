import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

export interface EntityPool<T> {
  sync: (entities: ReadonlyArray<T>) => void;
  dispose: () => void;
}

export interface EntityPoolConfig<T> {
  scene: Scene;
  namePrefix: string;
  renderingGroupId?: number;
  z?: number;
  getId: (e: T) => string;
  getSize: (e: T) => { w: number; h: number };
  getPosition: (e: T) => { x: number; y: number };
  getColor: (e: T) => Color3;
  getRotation?: (e: T) => number;
}

interface Entry {
  mesh: Mesh;
  material: StandardMaterial;
  w: number;
  h: number;
}

export function createEntityPool<T>(cfg: EntityPoolConfig<T>): EntityPool<T> {
  const entries = new Map<string, Entry>();

  function build(e: T): Entry {
    const { w, h } = cfg.getSize(e);
    const mesh = MeshBuilder.CreatePlane(
      `${cfg.namePrefix}-${cfg.getId(e)}`,
      { width: w, height: h },
      cfg.scene,
    );
    const mat = new StandardMaterial(`${mesh.name}-mat`, cfg.scene);
    mat.emissiveColor = cfg.getColor(e);
    mat.diffuseColor = new Color3(0, 0, 0);
    mat.specularColor = new Color3(0, 0, 0);
    mat.disableLighting = true;
    mesh.material = mat;
    mesh.position.z = cfg.z ?? 0;
    mesh.renderingGroupId = cfg.renderingGroupId ?? 1;
    mesh.isPickable = false;
    return { mesh, material: mat, w, h };
  }

  return {
    sync: (entities) => {
      const seen = new Set<string>();
      for (const e of entities) {
        const id = cfg.getId(e);
        seen.add(id);
        let entry = entries.get(id);
        if (!entry) {
          entry = build(e);
          entries.set(id, entry);
        }
        const pos = cfg.getPosition(e);
        entry.mesh.position.x = pos.x;
        entry.mesh.position.y = pos.y;
        if (cfg.getRotation) entry.mesh.rotation.z = cfg.getRotation(e);
        entry.material.emissiveColor = cfg.getColor(e);
      }
      for (const [id, entry] of entries) {
        if (!seen.has(id)) {
          entry.material.dispose();
          entry.mesh.dispose();
          entries.delete(id);
        }
      }
    },
    dispose: () => {
      for (const entry of entries.values()) {
        entry.material.dispose();
        entry.mesh.dispose();
      }
      entries.clear();
    },
  };
}
