"use client";
import { useEffect, useRef, useState } from "react";
import { capabilities } from "../native";
import { createPaperScene } from "./paperScene";
import "./paper-lab.css";

const STORAGE = "paper-hours-paper-lab-v1";
function initialDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (saved && typeof saved.task === "string" && typeof saved.done === "boolean") return { task: saved.task.slice(0, 160), done: saved.done };
  } catch { /* The experiment also works when storage is unavailable. */ }
  return { task: "Make a little progress today", done: false };
}

export default function PaperLab() {
  const [native, setNative] = useState(() => capabilities.supported && !new URLSearchParams(location.search).has("fallback"));
  const [draft, setDraft] = useState(initialDraft);
  const [reason, setReason] = useState(capabilities.supported ? "Native mode can be retried by reloading without ?fallback=1." : "This browser does not expose the required HTML-in-Canvas APIs.");
  const [painted, setPainted] = useState(false);
  const [typed, setTyped] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saved, setSaved] = useState(true);
  const [bend, setBend] = useState(0);
  const [hold, setHold] = useState(false);
  const [front, setFront] = useState(false);
  const [graphicsError, setGraphicsError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const source = useRef<HTMLElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const settings = useRef({ bend: 0, front: false });
  const drag = useRef<{ x: number; y: number; bend: number } | null>(null);
  settings.current.bend = bend;
  settings.current.front = front;
  useEffect(() => {
    try { localStorage.setItem(STORAGE, JSON.stringify(draft)); setSaved(true); }
    catch { setSaved(false); }
  }, [draft]);
  useEffect(() => {
    setPainted(false);
    try {
      return createPaperScene({ host: host.current!, canvas: canvas.current!, source: native ? source.current : null, handle: handle.current!, settings: settings.current,
        onPaint: () => setPainted(true),
        onFailure: (message) => { setReason(message); if (native) setNative(false); else setGraphicsError(message); },
      });
    } catch (error) {
      setReason(String(error));
      if (native) setNative(false); else setGraphicsError("3D rendering is unavailable. You can still use the HTML editor.");
    }
  }, [native]);

  const form = <article className="lab-paper" ref={source} {...(native ? { drawable: "" } : {})}>
    <header><span>PAPER HOURS / MATERIAL STUDY 01</span><span className="lab-paper-num">01</span></header>
    <p className="lab-paper-kicker">A LITTLE SPACE FOR TODAY</p>
    <h2>One small step.</h2>
    <p className="lab-paper-intro">Something worth making time for.</p>
    <label className="lab-task-label" htmlFor="lab-task">MY NEXT TASK</label>
    <input data-paper-hit id="lab-task" type="text" maxLength={160} value={draft.task} autoComplete="off" spellCheck={false}
      onChange={event => { setDraft(d => ({ ...d, task: event.target.value })); setTyped(true); }} />
    <label data-paper-hit className="lab-check" htmlFor="lab-done"><input id="lab-done" type="checkbox" checked={draft.done}
      onChange={event => { setDraft(d => ({ ...d, done: event.target.checked })); setChecked(true); }} /><span>I showed up for myself today.</span></label>
    <div className="lab-paper-lines" aria-hidden="true"><span>Little by little.</span></div>
    <footer><span>PROGRESS, NOT PERFECTION.</span><span className="lab-star">✳</span></footer>
  </article>;
  return <main className="paper-lab">
    <header className="lab-header"><a href="/">← Paper Hours</a><span>THE PAPER LAB <i>/</i> EXPERIMENT 01</span><a href="https://github.com/fimbox/html-in-canvas/blob/main/plugins/html-cloth.mjs" target="_blank" rel="noreferrer">The inspiration ↗</a></header>
    <section className="lab-heading"><div><p className="lab-eyebrow">A STUDY IN SOFTNESS</p><h1>A page with a little give.</h1><p>Lift the corner. Leave a thought. Make your mark.</p></div>
      <span className={`lab-mode ${native ? "is-native" : ""}`} role="status">● {native ? painted ? "Native HTML-in-Canvas · pointer bridge" : "Native HTML · waiting for paint" : "Fallback · 3D preview + HTML editor"}</span>
    </section>
    <div className={`lab-workspace ${native ? "lab-native" : "lab-fallback"}`}>
      <section className="lab-scene-panel" aria-label="Bending paper experiment">
        <div className="lab-scene-label"><span>{native ? "LIVE HTML ON PAPER" : "PAPER MOTION PREVIEW"}</span><span>SPINE FIXED / EDGE FREE</span></div>
        <div className="lab-stage" ref={host}>
          <canvas key={String(native)} ref={canvas} aria-label={native ? "Interactive curved paper. Task and checkbox are also keyboard accessible." : "Plain paper geometry preview; editable content is in the adjacent HTML editor."}>{native ? form : null}</canvas>
          {graphicsError && <p className="lab-graphics-error">{graphicsError}</p>}
          <button className="lab-corner" ref={handle} aria-label="Drag to bend paper; arrow keys adjust bend" title="Drag upward or left to lift the paper"
            onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, bend }; }}
            onPointerMove={event => { if (!drag.current) return; const d = drag.current; setBend(Math.max(0, Math.min(2.55, d.bend + (d.y - event.clientY + (d.x - event.clientX) * 0.65) / 110))); }}
            onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); if (!hold) setBend(0); }}
            onPointerCancel={() => { drag.current = null; if (!hold) setBend(0); }}
            onKeyDown={event => { if (["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "Home"].includes(event.key)) { event.preventDefault(); setHold(true); setBend(b => event.key === "Home" ? 0 : Math.max(0, Math.min(2.55, b + (["ArrowUp", "ArrowLeft"].includes(event.key) ? 0.2 : -0.2)))); } }}>↖<span>LIFT HERE</span></button>
        </div>
        <p className="lab-scene-hint">Drag the pink corner to bend · drag empty space to rotate · scroll to zoom</p>
      </section>
      {!native && <section className="lab-editor-panel"><div className="lab-scene-label"><span>REAL HTML EDITOR</span><span>FLAT FALLBACK</span></div>{form}<p className="lab-fallback-note">{reason} The form here is real HTML. It is not painted onto the bending preview.</p></section>}
    </div>
    <section className="lab-controls" aria-label="Paper controls">
      <label className="lab-bend-control">Paper curl <input aria-label="Paper curl" type="range" min="0" max="2.55" step="0.01" value={bend} onChange={event => { setBend(Number(event.target.value)); setHold(true); }} /><output>{Math.round(bend / 2.55 * 100)}%</output></label>
      <button aria-pressed={hold} onClick={() => setHold(h => !h)}>{hold ? "✓ Hold the curl" : "Hold the curl"}</button>
      <button onClick={() => { setBend(0); setHold(false); }}>Lay flat</button>
      <button aria-pressed={front} onClick={() => setFront(f => !f)}>{front ? "Angled view" : "Front view"}</button>
    </section>
    <footer className="lab-bottom"><p><span className={typed ? "lab-pass" : ""}>{typed ? "✓" : "○"} Input changed</span><span className={checked ? "lab-pass" : ""}>{checked ? "✓" : "○"} Checkbox changed</span><span>{saved ? "Saved on this device" : "Storage unavailable · changes last this session"}</span></p>
      <details><summary>About this experiment</summary><p>A spine-attached, length-preserving paper mesh. The native path uses Three.js HTMLTexture. Raycasting maps the curved surface to actual DOM controls; pointer activation is assisted, while typing and composition use the real input. This is a controlled paper curl, not a full cloth solver.</p><p>Native mode requires a compatible Chrome build with <code>chrome://flags/#canvas-draw-element</code> enabled and the browser relaunched. API detection alone does not verify typing. Try a sentence, a checkbox click, selection, and Korean input before integrating this into the notebook.</p><p>{native ? <button onClick={() => { setReason("Fallback selected manually."); setNative(false); }}>Use fallback editor</button> : <a href="/paper-lab/">Reload and retry native mode</a>} · Prototype data is separate from your planner.</p></details>
    </footer>
  </main>;
}
