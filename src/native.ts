import * as THREE from "three";
export type ExperimentalCanvas = HTMLCanvasElement & {
  requestPaint?: () => void;
  captureElementImage?: (element: HTMLElement) => {
    width: number;
    height: number;
    close?: () => void;
  };
  updateElementGeometry?: (
    element: HTMLElement,
    options: { canvasTransform: DOMMatrix },
  ) => void;
  getElementTransform?: (element: HTMLElement, matrix: DOMMatrix) => DOMMatrix;
};
export type ExperimentalGL = WebGL2RenderingContext & {
  texElementImage2D?: (...args: any[]) => void;
  texElementSubImage2D?: (
    target: number,
    level: number,
    x: number,
    y: number,
    element: HTMLElement,
  ) => void;
};
export function detectNative() {
  const canvas = document.createElement("canvas") as ExperimentalCanvas;
  const gl = canvas.getContext("webgl2") as ExperimentalGL | null;
  const report = {
    userAgent: navigator.userAgent,
    threeRevision: THREE.REVISION,
    htmlTexture: typeof (THREE as any).HTMLTexture === "function",
    webgl2: !!gl,
    uploadLegacy: typeof gl?.texElementImage2D === "function",
    uploadModern: typeof gl?.texElementSubImage2D === "function",
    requestPaint: typeof canvas.requestPaint === "function",
    legacyGeometry: typeof canvas.getElementTransform === "function",
    modernGeometry: typeof canvas.updateElementGeometry === "function",
    capture: typeof canvas.captureElementImage === "function",
  };
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return {
    ...report,
    supported:
      report.htmlTexture &&
      report.requestPaint &&
      ((report.uploadLegacy && report.legacyGeometry) ||
        (report.uploadModern && report.modernGeometry && report.capture)),
  };
}
export const capabilities = detectNative();
export { configureNative } from "./nativeRendering";
