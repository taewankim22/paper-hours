import { Raycaster, Vector2, type Camera, type Mesh } from "three";
import type { ExperimentalCanvas } from "./native";

/** Transitional Chrome exposes both APIs while still using legacy transforms. */
export function selectNativeGeometry(
  canvas: ExperimentalCanvas,
  element: HTMLElement,
  identity: DOMMatrix,
  probe: DOMMatrix,
): "legacy" | "modern" {
  if (!canvas.updateElementGeometry) return "legacy";
  if (canvas.getElementTransform) {
    // The legacy getter converts its second argument; the modern getter ignores
    // it and returns stored geometry. Function.length cannot distinguish them:
    // the old second argument was optional.
    const a = canvas.getElementTransform(element, identity).toFloat64Array();
    const b = canvas.getElementTransform(element, probe).toFloat64Array();
    if (a.some((value, i) => Math.abs(value - b[i]) > 0.00001)) return "legacy";
  }
  return "modern";
}

/** Detect an actual page click that the browser failed to deliver to its DOM. */
export function observeNativePagePointer(
  canvas: HTMLCanvasElement,
  page: HTMLElement,
  mesh: Mesh,
  camera: Camera,
  editing: () => boolean,
  onMiss: () => void,
) {
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const down = (event: PointerEvent) => {
    if (!editing() || event.button !== 0) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    camera.updateMatrixWorld();
    mesh.updateWorldMatrix(true, false);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.intersectObject(mesh, false).length) return;
    if (event.target && page.contains(event.target as Node)) return;
    // Do not synthesize input events or pretend raycasting is native interaction.
    // Replace the failed rendering path with explicitly labeled, real CSS DOM.
    onMiss();
  };
  const options = { capture: true };
  canvas.addEventListener("pointerdown", down, options);
  return () => canvas.removeEventListener("pointerdown", down, options);
}
