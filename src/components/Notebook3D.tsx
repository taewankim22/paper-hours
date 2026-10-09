import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { CameraController } from "./CameraController";
import { Page3D } from "./Page3D";
import { PageFlip } from "./PageFlip";
import { PlannerPage } from "./PlannerPage";
import { shiftDate, usePlanner, useView } from "../store";
import { configureNative } from "../native";
import { observeContextLoss } from "../nativeRendering";
function ContextLossObserver() {
  const canvas = useThree((s) => s.gl.domElement);
  useEffect(
    () =>
      observeContextLoss(canvas, () => {
        useView
          .getState()
          .fallback(
            "WebGL context was lost while the notebook was active. Reload to retry.",
          );
      }),
    [canvas],
  );
  return null;
}
function CSSLayer({ surface }: { surface: HTMLElement }) {
  const { scene, camera, size } = useThree();
  const renderer = useMemo(() => new CSS3DRenderer(), []);
  useEffect(() => {
    const el = renderer.domElement;
    el.className = "css-layer";
    el.style.position = "absolute";
    el.style.inset = "0";
    el.style.pointerEvents = "none";
    surface.appendChild(el);
    return () => {
      el.remove();
    };
  }, [renderer, surface]);
  useEffect(() => renderer.setSize(size.width, size.height), [renderer, size]);
  useFrame(() => renderer.render(scene, camera), 1);
  // Positive priority takes over R3F's automatic render; keep both renderers synchronized.
  const gl = useThree((s) => s.gl);
  useFrame(() => gl.render(scene, camera), 0.9);
  return null;
}
function NativeRenderLoop() {
  const { gl, scene, camera } = useThree();
  useFrame(() => {
    try {
      gl.render(scene, camera);
      const error = gl.getContext().getError();
      if (error !== gl.getContext().NO_ERROR)
        useView
          .getState()
          .fallback(`Native WebGL upload failed (GL error ${error}).`);
    } catch (error) {
      useView.getState().fallback(`Native rendering failed: ${String(error)}`);
    }
  }, 1);
  return null;
}
function Spiral() {
  const geometry = useMemo(() => {
    const pts = Array.from({ length: 49 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(a) * 0.29,
        Math.sin(a) * 0.055,
        Math.sin(a) * 0.15 + 0.09,
      );
    });
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts),
      64,
      0.026,
      8,
      false,
    );
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      {Array.from({ length: 20 }, (_, i) => (
        <group key={i} position={[0, -3.03 + i * 0.319, 0]}>
          <mesh geometry={geometry} castShadow>
            <meshStandardMaterial
              color="#d8d9d3"
              metalness={0.86}
              roughness={0.22}
            />
          </mesh>
          {[-0.25, 0.25].map((x) => (
            <mesh key={x} position={[x, 0, 0.015]}>
              <circleGeometry args={[0.058, 20]} />
              <meshBasicMaterial color="#403e35" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
function Book() {
  const date = usePlanner((s) => s.date);
  return (
    <group rotation={[0, 0, -0.026]}>
      {[-2.46, 2.46].map((x) => (
        <group key={x} position={[x, 0, -0.07]}>
          <mesh position={[0, -0.015, -0.09]} castShadow receiveShadow>
            <boxGeometry args={[4.78, 6.59, 0.065]} />
            <meshStandardMaterial color="#675b51" roughness={0.85} />
          </mesh>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.66, 6.46, 0.13]} />
            <meshStandardMaterial color="#e9e5d8" roughness={1} />
          </mesh>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh key={i} position={[0, 0, 0.012 * i - 0.015]}>
              <boxGeometry args={[4.69, 6.47, 0.006]} />
              <meshStandardMaterial color={i % 2 ? "#f8f5e9" : "#cfc8b7"} />
            </mesh>
          ))}
        </group>
      ))}
      <PageFlip side={-1}>
        <Page3D position={[-2.46, 0, 0.012]}>
          <PlannerPage date={shiftDate(date, -1)} side={-1} />
        </Page3D>
      </PageFlip>
      <PageFlip side={1}>
        <Page3D position={[2.46, 0, 0.018]}>
          <PlannerPage date={date} side={1} />
        </Page3D>
      </PageFlip>
      <Spiral />
    </group>
  );
}
export function Notebook3D({ experiment = false }: { experiment?: boolean }) {
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const mode = useView((s) => s.mode);
  return (
    <div
      ref={setSurface}
      className="notebook-stage"
      data-testid="notebook-stage"
      onContextMenu={(e) => {
        if (!useView.getState().editing) e.preventDefault();
      }}
    >
      {surface && (
        <Canvas
          key={mode}
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 1.7, 11.4], fov: 38, near: 0.1, far: 80 }}
          onCreated={({ gl }) => {
            if (mode === "native") configureNative(gl);
            gl.setClearColor("#eeeae5", 0);
          }}
        >
          <ContextLossObserver />
          <ambientLight intensity={1.6} />
          <directionalLight
            position={[-5, 6, 9]}
            intensity={3}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-8}
            shadow-camera-right={8}
            shadow-camera-top={8}
            shadow-camera-bottom={-8}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[4, -3, 5]} intensity={1.1} />
          {experiment ? (
            <Page3D width={4.6} height={3.8}>
              <section
                className="experiment"
                onPointerDown={(e) => {
                  // The experiment controls are always editable, including Explore.
                  // Keep OrbitControls from capturing their pointer sequence.
                  e.stopPropagation();
                }}
              >
                <small>MILESTONE 01 / LIVE HTML</small>
                <h2>Your next small step.</h2>
                <label>
                  Experiment intention
                  <input
                    aria-label="Experiment intention"
                    defaultValue="Make a little progress today"
                  />
                </label>
                <label>
                  <input type="checkbox" /> Experiment checkbox
                </label>
                <button
                  onClick={(e) => {
                    e.currentTarget.textContent = "Button clicked ✓";
                  }}
                >
                  Test button
                </button>
              </section>
            </Page3D>
          ) : (
            <Book />
          )}
          <mesh position={[0, 0, -0.23]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <shadowMaterial transparent opacity={0.14} />
          </mesh>
          <CameraController surface={surface} experiment={experiment} />
          {mode === "fallback" ? (
            <CSSLayer surface={surface} />
          ) : (
            <NativeRenderLoop />
          )}
        </Canvas>
      )}
    </div>
  );
}
