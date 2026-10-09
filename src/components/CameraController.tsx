import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as Controls } from "three-stdlib";
import { Vector3, MathUtils } from "three";
import { useView } from "../store";
export function CameraController({
  surface,
  experiment = false,
}: {
  surface: HTMLElement;
  experiment?: boolean;
}) {
  const controls = useRef<Controls>(null),
    { camera, size } = useThree();
  const { editing, focus, reset, zoom } = useView();
  const moving = useRef(true),
    target = useRef(new Vector3()),
    position = useRef(new Vector3());
  useEffect(() => {
    const mobile = size.width < 650;
    const distance = focus
      ? mobile
        ? 11.2
        : 10.4
      : Math.max(11.6, 14.6 / (size.width / size.height));
    target.current.set(experiment ? 0 : focus * 2.46, 0, 0);
    position.current
      .copy(target.current)
      .add(
        new Vector3(
          0,
          editing || focus ? 0 : 1.7,
          (experiment ? 9.5 : distance) - zoom,
        ),
      );
    moving.current = true;
  }, [focus, reset, zoom, editing, size.width, size.height, experiment]);
  useFrame((_, delta) => {
    if (!controls.current) return;
    if (moving.current) {
      const t = 1 - Math.exp(-delta * 7);
      camera.position.lerp(position.current, t);
      controls.current.target.lerp(target.current, t);
      controls.current.update();
      if (camera.position.distanceTo(position.current) < 0.005)
        moving.current = false;
    }
    // Limit pan so the notebook cannot be lost off-screen.
    controls.current.target.x = MathUtils.clamp(
      controls.current.target.x,
      -4,
      4,
    );
    controls.current.target.y = MathUtils.clamp(
      controls.current.target.y,
      -2,
      2,
    );
  });
  return (
    <OrbitControls
      ref={controls}
      domElement={surface}
      enabled={!editing}
      enableDamping
      dampingFactor={0.09}
      minDistance={6.5}
      maxDistance={23}
      minPolarAngle={Math.PI * 0.25}
      maxPolarAngle={Math.PI * 0.7}
      minAzimuthAngle={-0.62}
      maxAzimuthAngle={0.62}
      onStart={() => {
        moving.current = false;
      }}
    />
  );
}
