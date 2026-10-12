export const PAPER_WIDTH = 4.6;
export const PAPER_HEIGHT = 6.2;

/** An inextensible cylindrical sheet. x is distance from the pinned spine.
 * The arc length stays x; unlike a waving plane, the paper never stretches.
 * Written on the CPU so rendering and pointer raycasting see identical vertices.
 */
export function bendPoint(x: number, y: number, angle: number) {
  if (Math.abs(angle) < 0.00001) return [x, y, 0] as const;
  const radius = PAPER_WIDTH / angle;
  const theta = x / radius;
  return [radius * Math.sin(theta), y, radius * (1 - Math.cos(theta))] as const;
}

export function uvToPage(u: number, v: number, width = 460, height = 620) {
  return { x: Math.max(0, Math.min(1, u)) * width, y: (1 - Math.max(0, Math.min(1, v))) * height };
}

/** Stable critically damped motion, including after a suspended browser tab. */
export function advanceBend(value: number, velocity: number, target: number, dt: number) {
  const elapsed = Math.max(0, Math.min(dt, 0.05));
  const omega = 13;
  const offset = value - target;
  const c = velocity + omega * offset;
  const decay = Math.exp(-omega * elapsed);
  return { value: target + (offset + c * elapsed) * decay, velocity: (velocity - omega * c * elapsed) * decay };
}
