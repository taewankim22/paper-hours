import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { useView } from "../store";
/** Flat page pivots at the binding; no paper-bending approximation. */
export function PageFlip({
  children,
  side,
}: {
  children: ReactNode;
  side: number;
}) {
  const group = useRef<Group>(null),
    last = useRef(useView.getState().flip),
    progress = useRef(1);
  const flip = useView((s) => s.flip),
    dir = useView((s) => s.flipDirection);
  useFrame((_, dt) => {
    if (!group.current) return;
    if (last.current !== flip) {
      last.current = flip;
      progress.current = 0;
    }
    progress.current = Math.min(1, progress.current + dt * 1.8);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    group.current.rotation.y =
      !reduced && dir === side
        ? -side * Math.sin(progress.current * Math.PI) * 1.35
        : 0;
  });
  return <group ref={group}>{children}</group>;
}
