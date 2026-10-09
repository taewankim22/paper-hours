import type { MeshBasicMaterial, Texture, WebGLRenderer } from "three";
import type { ExperimentalCanvas, ExperimentalGL } from "./native";

/** Prefer the new API even in transitional builds that expose both names. */
export function configureNative(renderer: WebGLRenderer) {
  const canvas = renderer.domElement as ExperimentalCanvas;
  const gl = renderer.getContext() as ExperimentalGL;
  canvas.setAttribute("layoutsubtree", "");
  canvas.setAttribute("content", "drawable");
  if (!gl.texElementSubImage2D || !canvas.captureElementImage) return;
  const sizes = new WeakMap<WebGLTexture, string>();
  const upload = gl.texElementSubImage2D.bind(gl);
  // Three r186 selects this signature using Function.length === 3.
  gl.texElementImage2D = function (
    target: number,
    _format: number,
    element: HTMLElement,
  ) {
    const snapshot = canvas.captureElementImage!(element);
    try {
      const width = Math.ceil(snapshot.width),
        height = Math.ceil(snapshot.height);
      if (!(width > 0 && height > 0))
        throw new Error("Native HTML snapshot has no size.");
      const texture = gl.getParameter(
        gl.TEXTURE_BINDING_2D,
      ) as WebGLTexture | null;
      if (!texture)
        throw new Error("No WebGL texture is bound for the HTML upload.");
      if (sizes.get(texture) !== `${width}:${height}`) {
        gl.texImage2D(
          target,
          0,
          // HTML paint is sRGB. Three's HTMLTexture branch hardcodes RGBA8,
          // which skips decoding and makes its output conversion wash out text.
          gl.SRGB8_ALPHA8,
          width,
          height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null,
        );
        sizes.set(texture, `${width}:${height}`);
      }
      upload(target, 0, 0, 0, element);
    } finally {
      snapshot.close?.();
    }
  };
}

/** A drawable snapshot does not exist until its first canvas paint event. */
export function bindNativePage(
  canvas: ExperimentalCanvas,
  element: HTMLElement,
  material: MeshBasicMaterial,
  texture: Texture,
) {
  let ready = false;
  // WebGL projection reverses the DOM plane's depth normal. Chrome's CSS
  // backface culling can therefore reject hits on a visibly front-facing mesh.
  // The native mesh already handles face culling; keep its DOM hit target visible.
  const previousBackface = element.style.backfaceVisibility;
  element.style.backfaceVisibility = "visible";
  // Keep the drawable's layout origin consistent with its pixel-to-mesh matrix.
  element.style.position = "absolute";
  element.style.left = "0";
  element.style.top = "0";
  element.style.transformOrigin = "0 0";
  const paint = (event: Event) => {
    const changed = (event as Event & { changedElements?: HTMLElement[] })
      .changedElements;
    if (changed && !changed.includes(element)) return;
    // React's separate DOM root may not have committed at the first paint.
    if (!element.childElementCount) return;
    if (!ready) {
      material.map = texture;
      material.needsUpdate = true;
      ready = true;
    }
    texture.needsUpdate = true;
  };
  canvas.addEventListener("paint", paint);
  canvas.appendChild(element);
  canvas.requestPaint?.();
  return {
    ready: () => ready,
    dispose: () => {
      canvas.removeEventListener("paint", paint);
      element.style.backfaceVisibility = previousBackface;
      material.map = null;
      material.needsUpdate = true;
      ready = false;
    },
  };
}

/** Teardown intentionally loses a context; it must not report a new failure. */
export function observeContextLoss(
  canvas: HTMLCanvasElement,
  onLoss: () => void,
) {
  const lost = () => {
    if (canvas.isConnected) onLoss();
  };
  canvas.addEventListener("webglcontextlost", lost);
  return () => canvas.removeEventListener("webglcontextlost", lost);
}
