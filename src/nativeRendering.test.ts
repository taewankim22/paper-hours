import { describe, expect, it, vi } from "vitest";
import { MeshBasicMaterial, Texture, type WebGLRenderer } from "three";
import {
  bindNativePage,
  configureNative,
  observeContextLoss,
} from "./nativeRendering";
import { useView } from "./store";
import type { ExperimentalCanvas, ExperimentalGL } from "./native";

function fakeRenderer() {
  const snapshot = { width: 460, height: 640, close: vi.fn() };
  const canvas = Object.assign(new EventTarget(), {
    setAttribute: vi.fn(),
    appendChild: vi.fn(),
    requestPaint: vi.fn(),
    captureElementImage: vi.fn(() => snapshot),
    isConnected: true,
  }) as unknown as ExperimentalCanvas;
  const boundTexture = {};
  const gl = {
    TEXTURE_2D: 3553,
    TEXTURE_BINDING_2D: 32873,
    RGBA8: 32856,
    SRGB8_ALPHA8: 35907,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    texElementImage2D: vi.fn(),
    texElementSubImage2D: vi.fn(),
    texImage2D: vi.fn(),
    getParameter: vi.fn(() => boundTexture),
  } as unknown as ExperimentalGL;
  const renderer = {
    domElement: canvas,
    getContext: () => gl,
  } as unknown as WebGLRenderer;
  return { canvas, gl, renderer, snapshot };
}
describe("native rendering startup and compatibility", () => {
  it("prefers the modern upload when both names exist and reuses its allocation", () => {
    const { renderer, gl, snapshot } = fakeRenderer();
    const oldUpload = gl.texElementImage2D;
    configureNative(renderer);
    const element = {} as HTMLElement;
    expect(gl.texElementImage2D!.length).toBe(3);
    gl.texElementImage2D!(gl.TEXTURE_2D, gl.RGBA8, element);
    gl.texElementImage2D!(gl.TEXTURE_2D, gl.RGBA8, element);
    expect(oldUpload).not.toHaveBeenCalled();
    expect(gl.texElementSubImage2D).toHaveBeenCalledTimes(2);
    expect(gl.texElementSubImage2D).toHaveBeenLastCalledWith(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      element,
    );
    expect(gl.texImage2D).toHaveBeenCalledTimes(1);
    expect(gl.texImage2D).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      0,
      gl.SRGB8_ALPHA8,
      460,
      640,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    expect(snapshot.close).toHaveBeenCalledTimes(2);
    snapshot.width = 500;
    gl.texElementImage2D!(gl.TEXTURE_2D, gl.RGBA8, element);
    expect(gl.texImage2D).toHaveBeenCalledTimes(2);
  });
  it("retains the legacy path when modern upload is unavailable", () => {
    const { renderer, gl } = fakeRenderer();
    delete gl.texElementSubImage2D;
    const original = gl.texElementImage2D;
    configureNative(renderer);
    expect(gl.texElementImage2D).toBe(original);
  });
  it("does not expose a texture or geometry until the populated HTML has painted", () => {
    const { canvas } = fakeRenderer();
    const element = {
      childElementCount: 0,
      style: { backfaceVisibility: "hidden" },
    } as HTMLElement;
    const material = new MeshBasicMaterial(),
      texture = new Texture();
    const binding = bindNativePage(canvas, element, material, texture);
    expect(element.style.backfaceVisibility).toBe("visible");
    expect(material.map).toBeNull();
    expect(binding.ready()).toBe(false);
    canvas.dispatchEvent(new Event("paint"));
    expect(binding.ready()).toBe(false);
    Object.defineProperty(element, "childElementCount", { value: 1 });
    canvas.dispatchEvent(
      Object.assign(new Event("paint"), { changedElements: [{}] }),
    );
    expect(binding.ready()).toBe(false);
    canvas.dispatchEvent(
      Object.assign(new Event("paint"), { changedElements: [element] }),
    );
    expect(binding.ready()).toBe(true);
    expect(material.map).toBe(texture);
    const version = texture.version;
    binding.dispose();
    expect(element.style.backfaceVisibility).toBe("hidden");
    canvas.dispatchEvent(new Event("paint"));
    expect(texture.version).toBe(version);
    expect(material.map).toBeNull();
  });
  it("ignores context loss after observer cleanup and detached canvases", () => {
    const { canvas } = fakeRenderer(),
      onLoss = vi.fn();
    const dispose = observeContextLoss(canvas, onLoss);
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(onLoss).toHaveBeenCalledTimes(1);
    Object.defineProperty(canvas, "isConnected", {
      value: false,
      configurable: true,
    });
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(onLoss).toHaveBeenCalledTimes(1);
    dispose();
    Object.defineProperty(canvas, "isConnected", { value: true });
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(onLoss).toHaveBeenCalledTimes(1);
  });
  it("preserves the first failure when later teardown events arrive", () => {
    useView.setState({ mode: "native", nativeError: "" });
    useView.getState().fallback("Initial upload failed");
    useView.getState().fallback("Context lost during cleanup");
    expect(useView.getState().nativeError).toBe("Initial upload failed");
  });
});
