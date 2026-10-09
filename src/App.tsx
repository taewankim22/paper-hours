import { Component, useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  Check,
  SlidersHorizontal,
  X,
  Info,
  ArrowLeft,
} from "lucide-react";
import { Notebook3D } from "./components/Notebook3D";
import { Toolbar, DateNavigation } from "./components/Toolbar";
import { PlannerEditor } from "./components/PlannerEditor";
import { capabilities } from "./native";
import {
  blankDay,
  storageError,
  usePlanner,
  useView,
  totalHours,
} from "./store";
import { registerPlannerTool } from "./webmcp";
const params = new URLSearchParams(location.search),
  experiment = params.has("experiment");
useView.setState({
  mode:
    capabilities.supported && !params.has("fallback") ? "native" : "fallback",
});
class RenderBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  componentDidCatch(e: Error) {
    if (useView.getState().mode === "native") {
      useView.getState().fallback(e.message);
      this.setState({ error: "" });
    }
  }
  render() {
    return this.state.error ? (
      <div className="render-error">
        <h2>The 3D scene could not start.</h2>
        <p>{this.state.error}</p>
        <button onClick={() => location.reload()}>Reload notebook</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  useEffect(registerPlannerTool, []);
  const [settings, setSettings] = useState(false),
    [diagnostics, setDiagnostics] = useState(false);
  const mode = useView((s) => s.mode),
    nativeError = useView((s) => s.nativeError),
    editing = useView((s) => s.editing);
  const { date, days } = usePlanner(),
    day = days[date] ?? blankDay(),
    done = day.tasks.filter((t) => t.done).length;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSettings(false);
        setDiagnostics(false);
        useView.getState().setEditing(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/">
          <span>
            <BookOpen size={23} />
          </span>
          <b>
            Paper Hours<small>A LITTLE EVERY DAY</small>
          </b>
        </a>
        <div className="header-right">
          <span className={`save-status ${storageError ? "save-error" : ""}`}>
            <Check size={14} />
            {storageError ? "Session only" : "Saved on this device"}
          </span>
          <button
            className="icon-button"
            aria-label="Countdown settings"
            title="Countdown settings"
            onClick={() => setSettings(true)}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </header>
      <main className="workspace">
        <div className="workspace-heading">
          <div>
            <div className="eyebrow">
              {experiment ? "THE EXPERIMENT" : "YOUR DAILY PRACTICE"}
            </div>
            <h1>
              {experiment
                ? "HTML, with a new perspective."
                : "A page for your possibilities."}
            </h1>
          </div>
          {!experiment && <DateNavigation />}
        </div>
        <div className="scene-topline">
          <span className="notebook-label">
            {experiment ? (
              <a href="/">
                <ArrowLeft size={13} /> Back to notebook
              </a>
            ) : (
              <>
                MY STUDY NOTEBOOK <span>/</span>{" "}
                {editing ? "EDITING" : "DESK VIEW"}
              </>
            )}
          </span>
          <button className="render-badge" onClick={() => setDiagnostics(true)}>
            <span className={mode} />
            {mode === "native"
              ? "Native HTML-in-Canvas · experimental"
              : "CSS 3D fallback · real HTML"}
            <Info size={13} />
          </button>
        </div>
        <RenderBoundary>
          <Notebook3D experiment={experiment} />
        </RenderBoundary>
        {!experiment && (
          <div className="scene-caption">
            <span>
              {done}
              <small> / {day.tasks.length} tasks completed</small>
            </span>
            <span className="caption-divider" />
            <span>
              {totalHours(day.blocks)}
              <small> hours planned</small>
            </span>
            <span className="caption-script">
              little by little, a lot becomes a little.
            </span>
          </div>
        )}
        <Toolbar />
        {nativeError && mode === "fallback" && (
          <p role="status" className="storage-warning">
            {nativeError}
          </p>
        )}
        {storageError && (
          <p role="alert" className="storage-warning">
            {storageError}
          </p>
        )}
      </main>
      <footer className="app-footer">
        <span>A quiet place to keep going.</span>
        <span>
          PAPER HOURS <b>✳</b> MADE FOR YOUR EVERYDAY
        </span>
      </footer>
      {settings && <PlannerEditor close={() => setSettings(false)} />}
      {diagnostics && (
        <div className="dialog-shade" onClick={() => setDiagnostics(false)}>
          <section
            className="diagnostics settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Rendering details"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="dialog-close"
              aria-label="Close rendering details"
              onClick={() => setDiagnostics(false)}
            >
              <X size={18} />
            </button>
            <small>RENDERING DETAILS</small>
            <h2>
              {mode === "native"
                ? "Live HTML in WebGL."
                : "Real HTML. A different route."}
            </h2>
            <p>
              {mode === "native"
                ? "Experimental native upload and geometry APIs are detected. Use the experiment to verify typing, selection and checkboxes on your browser."
                : nativeError
                  ? "The native rendering attempt failed. The first failure is shown below. The notebook is using interactive CSS 3D pages."
                  : capabilities.supported
                    ? "Your browser exposes the required native APIs. CSS 3D fallback was explicitly selected. Open the experiment below to try native rendering."
                    : "This browser does not expose the required native APIs. Pages are interactive DOM elements positioned in 3D with CSS, synchronized with the WebGL notebook."}
            </p>
            <p>No page screenshots or HTML rasterization libraries are used.</p>
            {nativeError && <p role="alert">{nativeError}</p>}
            <dl>
              {Object.entries(capabilities)
                .filter(([k]) => k !== "userAgent")
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
            </dl>
            <p className="user-agent">{capabilities.userAgent}</p>
            <p>
              For native testing, enable{" "}
              <code>chrome://flags/#canvas-draw-element</code> in a compatible
              Chrome Canary build and relaunch. API detection alone does not
              verify interaction.
            </p>
            <div className="dialog-actions">
              <a className="primary" href="/?experiment=1">
                Open live HTML experiment
              </a>
              <a href="/?fallback=1">Use CSS 3D fallback</a>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
