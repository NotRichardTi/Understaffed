import { Camera } from "@babylonjs/core/Cameras/camera";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Engine } from "@babylonjs/core/Engines/engine";
import type { Scene } from "@babylonjs/core/scene";

export const VIEW_HEIGHT_UNITS = 1080;

export interface OrthoCamera {
  camera: FreeCamera;
  getViewWidthUnits: () => number;
  getViewHeightUnits: () => number;
}

export function createOrthoCamera(scene: Scene, engine: Engine): OrthoCamera {
  const camera = new FreeCamera("cam", new Vector3(0, 0, -50), scene);
  camera.setTarget(Vector3.Zero());
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 200;

  let widthUnits = VIEW_HEIGHT_UNITS;

  const applyExtents = () => {
    const canvas = engine.getRenderingCanvas();
    if (!canvas) return;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    widthUnits = VIEW_HEIGHT_UNITS * aspect;
    camera.orthoTop = VIEW_HEIGHT_UNITS / 2;
    camera.orthoBottom = -VIEW_HEIGHT_UNITS / 2;
    camera.orthoLeft = -widthUnits / 2;
    camera.orthoRight = widthUnits / 2;
  };

  applyExtents();
  engine.onResizeObservable.add(applyExtents);

  return {
    camera,
    getViewWidthUnits: () => widthUnits,
    getViewHeightUnits: () => VIEW_HEIGHT_UNITS,
  };
}
