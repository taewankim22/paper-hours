import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { configureNative } from "../nativeRendering";
import type { ExperimentalCanvas } from "../native";
import { advanceBend, bendPoint, PAPER_HEIGHT, PAPER_WIDTH, uvToPage } from "./paperMath";

export interface PaperSceneOptions {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  source: HTMLElement | null;
  handle: HTMLElement;
  settings: { bend: number; front: boolean };
  onPaint: () => void;
  onFailure: (reason: string) => void;
}

export function createPaperScene({ host, canvas, source, handle, settings, onPaint, onFailure }: PaperSceneOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(0.8, 1.8, 12.8);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 18;
  controls.minPolarAngle = 0.65;
  controls.maxPolarAngle = 2.1;
  controls.minAzimuthAngle = -0.8;
  controls.maxAzimuthAngle = 0.8;
  scene.add(new THREE.AmbientLight(0xffffff, 2.2));
  const light = new THREE.DirectionalLight(0xfff5e8, 1.1);
  light.position.set(-3, 5, 8);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  light.shadow.bias = -0.001;
  scene.add(light);

  const group = new THREE.Group();
  group.position.set(-PAPER_WIDTH / 2, 0, 0);
  scene.add(group);
  const geometry = new THREE.PlaneGeometry(PAPER_WIDTH, PAPER_HEIGHT, 64, 32);
  const base = Float32Array.from(geometry.attributes.position.array);
  const material = new THREE.MeshStandardMaterial({ color: 0xfffdf7, roughness: 0.95, side: THREE.FrontSide });
  const paper = new THREE.Mesh(geometry, material);
  paper.castShadow = true;
  group.add(paper);
  const backMaterial = new THREE.MeshStandardMaterial({ color: 0xf6efe4, roughness: 1, side: THREE.BackSide });
  const back = new THREE.Mesh(geometry, backMaterial);
  back.castShadow = true;
  group.add(back);
  const borderPoints: [number, number][] = [];
  for (let i = 0; i <= 64; i++) borderPoints.push([PAPER_WIDTH * i / 64, PAPER_HEIGHT / 2]);
  for (let i = 64; i >= 0; i--) borderPoints.push([PAPER_WIDTH * i / 64, -PAPER_HEIGHT / 2]);
  const borderGeometry = new THREE.BufferGeometry();
  const borderPosition = new THREE.Float32BufferAttribute(new Float32Array(borderPoints.length * 3), 3);
  borderGeometry.setAttribute("position", borderPosition);
  const borderMaterial = new THREE.LineBasicMaterial({ color: 0xc4b9a7, transparent: true, opacity: 0.65 });
  const border = new THREE.LineLoop(borderGeometry, borderMaterial);
  group.add(border);
  const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.16 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), shadowMaterial);
  floor.position.z = -0.12;
  floor.receiveShadow = true;
  scene.add(floor);
  const rings: THREE.Mesh[] = [];
  const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xb3ada4, metalness: 0.85, roughness: 0.27 });
  const ringGeometry = new THREE.TorusGeometry(0.13, 0.025, 8, 24);
  for (let i = 0; i < 12; i++) {
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(0, -2.75 + i * 0.5, 0.045);
    ring.rotation.y = Math.PI / 2.7;
    group.add(ring);
    rings.push(ring);
  }

  let texture: THREE.Texture | undefined;
  let painted = false;
  let disposed = false;
  let raf = 0;
  let paintTimeout: ReturnType<typeof setTimeout> | undefined;
  let failed = false;
  const fail = (message: string) => { if (!disposed && !failed) { failed = true; onFailure(message); } };
  const experimental = canvas as ExperimentalCanvas;
  const paint = () => {
    if (!source || !texture) return;
    if (!painted) {
      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
      painted = true;
      clearTimeout(paintTimeout);
    }
    texture.needsUpdate = true;
  };
  const requestPaint = () => { if (source && !disposed) experimental.requestPaint?.(); };
  if (source) {
    configureNative(renderer);
    const HTMLTexture = (THREE as unknown as { HTMLTexture: new (element: HTMLElement) => THREE.Texture }).HTMLTexture;
    texture = new HTMLTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    canvas.addEventListener("paint", paint);
    paintTimeout = setTimeout(() => fail("Native HTML did not paint. The editor is available beside the paper."), 8000);
    requestPaint();
    void document.fonts.ready.then(requestPaint);
  }
  const lost = (event: Event) => { event.preventDefault(); fail("The graphics context was lost. Reload to retry native rendering."); };
  canvas.addEventListener("webglcontextlost", lost);
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  // Explicit pointer bridge: raycast the ACTUAL deformed triangles, then focus
  // or activate the underlying DOM control. Keyboard/IME events remain native.
  // We do not claim this is automatic browser hit-testing on a curved mesh.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hitAt = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld();
    paper.updateWorldMatrix(true, false);
    raycaster.setFromCamera(pointer, camera);
    back.updateWorldMatrix(true, false);
    const hit = raycaster.intersectObjects([paper, back], false)[0];
    // Do not let the folded-over reverse side activate a hidden front control.
    return hit?.object === paper && hit.uv ? uvToPage(hit.uv.x, hit.uv.y) : null;
  };
  const controlAt = (point: { x: number; y: number }) => {
    if (!source) return null;
    const sourceRect = source.getBoundingClientRect();
    for (const el of source.querySelectorAll<HTMLElement>("[data-paper-hit]")) {
      const r = el.getBoundingClientRect();
      const x = r.left - sourceRect.left, y = r.top - sourceRect.top;
      if (point.x >= x && point.x <= x + r.width && point.y >= y && point.y <= y + r.height) return el;
    }
    return null;
  };
  let selectionAnchor: number | null = null;
  let selectedInput: HTMLInputElement | null = null;
  let pressedCheckbox: HTMLInputElement | null = null;
  const measure = document.createElement("canvas").getContext("2d")!;
  const caretAt = (input: HTMLInputElement, pageX: number) => {
    const style = getComputedStyle(input);
    measure.font = style.font;
    const x = pageX - (input.getBoundingClientRect().left - source!.getBoundingClientRect().left) - parseFloat(style.paddingLeft) + input.scrollLeft;
    let previousWidth = 0, offset = 0;
    for (const character of input.value) {
      const width = measure.measureText(input.value.slice(0, offset + character.length)).width;
      if (x < (previousWidth + width) / 2) break;
      offset += character.length;
      previousWidth = width;
    }
    return offset;
  };
  const down = (event: PointerEvent) => {
    if (!source || event.button !== 0 || !painted) return;
    const point = hitAt(event);
    const target = point && controlAt(point);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    controls.enabled = false;
    canvas.setPointerCapture(event.pointerId);
    const input = target instanceof HTMLInputElement ? target : target.querySelector("input");
    if (!input) return;
    input.focus({ preventScroll: true });
    if (input.type === "checkbox") pressedCheckbox = input;
    else {
      selectedInput = input;
      selectionAnchor = caretAt(input, point!.x);
      input.setSelectionRange(selectionAnchor, selectionAnchor);
    }
    requestPaint();
  };
  const move = (event: PointerEvent) => {
    if (!source) return;
    const point = hitAt(event);
    const target = point && controlAt(point);
    canvas.style.cursor = target ? "text" : "grab";
    if (selectedInput && selectionAnchor !== null && point) {
      const end = caretAt(selectedInput, point.x);
      selectedInput.setSelectionRange(Math.min(end, selectionAnchor), Math.max(end, selectionAnchor), end < selectionAnchor ? "backward" : "forward");
      requestPaint();
    }
  };
  const up = (event: PointerEvent) => {
    if (pressedCheckbox && event.type === "pointerup") {
      const point = hitAt(event);
      const target = point && controlAt(point);
      if (target === pressedCheckbox || target?.contains(pressedCheckbox)) pressedCheckbox.click();
    }
    pressedCheckbox = null;
    selectedInput = null;
    selectionAnchor = null;
    controls.enabled = true;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    requestPaint();
  };
  canvas.addEventListener("pointerdown", down, true);
  canvas.addEventListener("pointermove", move, true);
  canvas.addEventListener("pointerup", up, true);
  canvas.addEventListener("pointercancel", up, true);
  source?.addEventListener("input", requestPaint);
  source?.addEventListener("change", requestPaint);
  source?.addEventListener("focusin", requestPaint);
  source?.addEventListener("focusout", requestPaint);

  let bend = { value: 0, velocity: 0 };
  let last = performance.now();
  let lastFront = settings.front;
  let frameCount = 0;
  let reportedPaint = false;
  const position = geometry.attributes.position;
  const corner = new THREE.Vector3();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const render = (now: number) => {
    if (disposed || failed) return;
    try {
      const dt = (now - last) / 1000;
      last = now;
      bend = reduced.matches ? { value: settings.bend, velocity: 0 } : advanceBend(bend.value, bend.velocity, settings.bend, dt);
      for (let i = 0; i < position.count; i++) {
        const p = bendPoint(base[i * 3] + PAPER_WIDTH / 2, base[i * 3 + 1], bend.value);
        position.setXYZ(i, ...p);
      }
      position.needsUpdate = true;
      borderPoints.forEach(([x, y], i) => {
        const p = bendPoint(x, y, bend.value);
        borderPosition.setXYZ(i, p[0], p[1], p[2] + 0.002);
      });
      borderPosition.needsUpdate = true;
      borderGeometry.computeBoundingSphere();
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      if (lastFront !== settings.front) {
        camera.position.set(settings.front ? 0 : 0.8, settings.front ? 0 : 1.8, 12.8);
        controls.target.set(0, 0, 0);
        lastFront = settings.front;
      }
      controls.update();
      renderer.render(scene, camera);
      if (painted && !reportedPaint) { reportedPaint = true; onPaint(); }
      const p = bendPoint(PAPER_WIDTH, -PAPER_HEIGHT / 2, bend.value);
      corner.set(...p).add(group.position).project(camera);
      handle.style.left = `${(corner.x + 1) * host.clientWidth / 2}px`;
      handle.style.top = `${(1 - corner.y) * host.clientHeight / 2}px`;
      // Caret blinks and CSS focus need repeated paint in older implementations.
      if (++frameCount % 12 === 0) requestPaint();
      raf = requestAnimationFrame(render);
    } catch (error) { fail(`Native rendering failed: ${String(error)}`); }
  };
  raf = requestAnimationFrame(render);
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    clearTimeout(paintTimeout);
    observer.disconnect();
    controls.dispose();
    canvas.removeEventListener("paint", paint);
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("pointerdown", down, true);
    canvas.removeEventListener("pointermove", move, true);
    canvas.removeEventListener("pointerup", up, true);
    canvas.removeEventListener("pointercancel", up, true);
    for (const event of ["input", "change", "focusin", "focusout"]) source?.removeEventListener(event, requestPaint);
    texture?.dispose();
    geometry.dispose(); material.dispose(); backMaterial.dispose();
    borderGeometry.dispose(); borderMaterial.dispose();
    floor.geometry.dispose(); shadowMaterial.dispose(); ringGeometry.dispose(); ringMaterial.dispose();
    renderer.dispose();
    // React hot reload may reuse this canvas immediately. Explicit context loss
    // would leave that next renderer with an asynchronously lost GL context.
  };
}
