import { describe, expect, it, vi } from "vitest";
import {
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
} from "three";
import type { ExperimentalCanvas } from "./native";
import {
  observeNativePagePointer,
  selectNativeGeometry,
} from "./nativeInteraction";

const matrix = (x = 0) =>
  ({
    toFloat64Array: () =>
      new Float64Array(new Matrix4().makeTranslation(x, 0, 0).elements),
  }) as DOMMatrix;

describe("native geometry compatibility", () => {
  it("detects legacy behavior even when both methods exist and getter length is one", () => {
    const canvas = {
      updateElementGeometry: vi.fn(),
      getElementTransform: (_element: HTMLElement, transform = matrix()) =>
        transform,
    } as unknown as ExperimentalCanvas;
    expect(canvas.getElementTransform!.length).toBe(1);
    expect(
      selectNativeGeometry(canvas, {} as HTMLElement, matrix(), matrix(17)),
    ).toBe("legacy");
  });
  it("uses modern geometry when the getter ignores the old argument", () => {
    const canvas = {
      updateElementGeometry: vi.fn(),
      getElementTransform: () => matrix(80),
    } as unknown as ExperimentalCanvas;
    expect(
      selectNativeGeometry(canvas, {} as HTMLElement, matrix(), matrix(17)),
    ).toBe("modern");
  });
  it("uses legacy geometry when no update method exists", () => {
    expect(
      selectNativeGeometry(
        {} as ExperimentalCanvas,
        {} as HTMLElement,
        matrix(),
        matrix(17),
      ),
    ).toBe("legacy");
  });
});

describe("native pointer recovery", () => {
  function scene() {
    const canvas = Object.assign(new EventTarget(), {
      getBoundingClientRect: () => ({
        left: 100,
        top: 200,
        width: 800,
        height: 600,
      }),
    }) as HTMLCanvasElement;
    const page = { contains: vi.fn(() => false) } as unknown as HTMLElement;
    const mesh = new Mesh(new PlaneGeometry(4.6, 6.4), new MeshBasicMaterial());
    const camera = new PerspectiveCamera(38, 800 / 600, 0.1, 80);
    camera.position.z = 10;
    const onMiss = vi.fn(),
      editing = vi.fn(() => true);
    const dispose = observeNativePagePointer(
      canvas,
      page,
      mesh,
      camera,
      editing,
      onMiss,
    );
    const click = (x = 500, y = 500, button = 0) =>
      canvas.dispatchEvent(
        Object.assign(new Event("pointerdown"), {
          clientX: x,
          clientY: y,
          button,
        }),
      );
    return { canvas, page, onMiss, editing, click, dispose };
  }
  it("recovers a real mesh hit whose pointer event lands on the canvas", () => {
    const s = scene();
    s.click();
    expect(s.onMiss).toHaveBeenCalledOnce();
    s.dispose();
    s.click();
    expect(s.onMiss).toHaveBeenCalledOnce();
  });
  it("leaves properly routed DOM clicks and Explore gestures alone", () => {
    const s = scene();
    vi.mocked(s.page.contains).mockReturnValue(true);
    s.click();
    expect(s.onMiss).not.toHaveBeenCalled();
    vi.mocked(s.page.contains).mockReturnValue(false);
    s.editing.mockReturnValue(false);
    s.click();
    expect(s.onMiss).not.toHaveBeenCalled();
    s.dispose();
  });
  it("does not switch modes on desk clicks or right-button panning", () => {
    const s = scene();
    s.click(101, 201);
    s.click(500, 500, 2);
    expect(s.onMiss).not.toHaveBeenCalled();
    s.dispose();
  });
});
