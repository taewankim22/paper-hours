import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
// r186 ships these exports; @types/three currently lags behind the implementation.
// @ts-expect-error new r186 addon has no declaration in the pinned types
import { InteractionManager } from "three/addons/interaction/InteractionManager.js";
import { CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { useView } from "../store";
import type { ExperimentalCanvas } from "../native";
import { bindNativePage } from "../nativeRendering";
import {
  observeNativePagePointer,
  selectNativeGeometry,
} from "../nativeInteraction";
export function Page3D({
  children,
  position = [0, 0, 0],
  width = 4.6,
  height = 6.4,
}: {
  children: ReactNode;
  position?: [number, number, number];
  width?: number;
  height?: number;
}) {
  const mode = useView((s) => s.mode),
    { gl, camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  const element = useMemo(() => {
    const el = document.createElement("div");
    el.className = "page-mount";
    el.style.width = `${width * 100}px`;
    el.style.height = `${height * 100}px`;
    el.style.pointerEvents = "auto";
    el.style.userSelect = "text";
    el.setAttribute("drawable", "");
    return el;
  }, [width, height, mode]);
  const htmlRoot = useRef<Root | null>(null);
  useEffect(() => {
    const root = createRoot(element);
    htmlRoot.current = root;
    return () => {
      htmlRoot.current = null;
      queueMicrotask(() => root.unmount());
    };
  }, [element]);
  useEffect(() => {
    htmlRoot.current?.render(children);
  }, [children, element]);
  const cssObject = useMemo(() => {
    if (mode === "native") return null;
    const obj = new CSS3DObject(element);
    obj.scale.setScalar(0.01);
    return obj;
  }, [element, mode]);
  const native = useRef<{
    texture: THREE.Texture;
    manager: any;
    ready: () => boolean;
    geometry?: "legacy" | "modern";
  } | null>(null);
  const frames = useRef(0);

  useEffect(() => {
    if (mode !== "native") return;
    const canvas = gl.domElement as ExperimentalCanvas;
    const texture = new (THREE as any).HTMLTexture(element) as THREE.Texture;
    texture.colorSpace = THREE.SRGBColorSpace;
    const manager = new InteractionManager();
    manager.connect(gl, camera);
    manager.add(mesh.current);
    const binding = bindNativePage(
      canvas,
      element,
      mesh.current!.material as THREE.MeshBasicMaterial,
      texture,
    );
    const stopPointerObserver = observeNativePagePointer(
      canvas,
      element,
      mesh.current!,
      camera,
      () => useView.getState().editing,
      () =>
        useView
          .getState()
          .fallback(
            "Chrome drew the page but did not route the click to its HTML. Switched to CSS 3D editing; click your entry again.",
          ),
    );
    native.current = { texture, manager, ready: binding.ready };
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) canvas.requestPaint?.();
    });
    const timeout = setTimeout(() => {
      if (!binding.ready())
        useView
          .getState()
          .fallback(
            "Native HTML did not receive its first paint within 10 seconds.",
          );
    }, 10000);
    return () => {
      active = false;
      clearTimeout(timeout);
      stopPointerObserver();
      binding.dispose();
      manager.disconnect();
      texture.dispose();
      element.remove();
      native.current = null;
    };
  }, [mode, gl, camera, element]);
  useFrame(() => {
    if (!native.current || !mesh.current || !native.current.ready()) return;
    try {
      camera.updateMatrixWorld();
      mesh.current.updateWorldMatrix(true, false);
      const canvas = gl.domElement as ExperimentalCanvas;
      if (!native.current.geometry) {
        native.current.geometry = selectNativeGeometry(
          canvas,
          element,
          new DOMMatrix(),
          new DOMMatrix().translate(17, 23),
        );
        if (native.current.geometry === "legacy")
          canvas.updateElementGeometry?.(element, {
            canvasTransform: new DOMMatrix(),
          });
      }
      if (
        native.current.geometry === "modern" &&
        canvas.updateElementGeometry
      ) {
        const normal = new THREE.Matrix4().set(
          width / (width * 100),
          0,
          0,
          -width / 2,
          0,
          -height / (height * 100),
          0,
          height / 2,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
        );
        const mvp = new THREE.Matrix4()
          .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
          .multiply(mesh.current.matrixWorld)
          .multiply(normal);
        const viewport = new THREE.Matrix4().set(
          canvas.clientWidth / 2,
          0,
          0,
          canvas.clientWidth / 2,
          0,
          -canvas.clientHeight / 2,
          0,
          canvas.clientHeight / 2,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
        );
        mvp.premultiply(viewport);
        canvas.updateElementGeometry(element, {
          canvasTransform: new DOMMatrix(mvp.elements),
        });
      } else native.current.manager.update();
      // Explicit shared paint listener avoids HTMLTexture's single-parent onpaint overwrite.
      if (++frames.current % 30 === 0) canvas.requestPaint?.();
    } catch (error) {
      useView.getState().fallback(`Native geometry failed: ${String(error)}`);
    }
  }, 2);
  return (
    <group position={position}>
      {mode === "native" ? (
        <mesh ref={mesh}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial toneMapped={false} />
        </mesh>
      ) : (
        cssObject && <primitive object={cssObject} />
      )}
    </group>
  );
}
