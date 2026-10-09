import {
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minus,
  Plus,
  RotateCcw,
  Pencil,
  MousePointer2,
  Move,
  ScanLine,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { shiftDate, usePlanner, useView } from "../store";
export function Toolbar() {
  const { editing, setEditing, resetView, zoomBy, setFocus } = useView();
  return (
    <div className="bottom-area">
      <div className="toolbar" aria-label="Notebook controls">
        <button
          className={!editing ? "tool-active" : ""}
          onClick={() => setEditing(false)}
        >
          <MousePointer2 size={16} /> Explore
        </button>
        <button
          className={editing ? "tool-active" : ""}
          onClick={() => setEditing(true)}
        >
          {editing ? <Check size={16} /> : <Pencil size={16} />}{" "}
          {editing ? "Editing" : "Edit pages"}
        </button>
        <i />
        <button
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => zoomBy(-0.6)}
        >
          <Minus size={17} />
        </button>
        <button
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => zoomBy(0.6)}
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="Focus left page"
          title="Focus left page"
          onClick={() => setFocus(-1)}
        >
          <ScanLine size={17} />
        </button>
        <button
          aria-label="Focus right page"
          title="Focus right page"
          onClick={() => setFocus(1)}
        >
          <Maximize size={17} />
        </button>
        <i />
        <button onClick={resetView}>
          <RotateCcw size={16} />
          <span>Reset view</span>
        </button>
      </div>
      <p className="gesture-hint">
        {editing ? (
          "Your pages are ready. Click any entry to make it yours."
        ) : (
          <>
            <Move size={12} /> Drag to rotate <b>·</b> Scroll to zoom <b>·</b>{" "}
            Right-drag to pan <b>·</b> Click a page to focus
          </>
        )}
      </p>
    </div>
  );
}
export function DateNavigation() {
  const { date, setDate } = usePlanner();
  const lock = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const turn = (n: number) => {
    if (lock.current) return;
    lock.current = true;
    useView.getState().turn(n);
    setDate(shiftDate(date, n));
    timer.current = setTimeout(() => {
      lock.current = false;
    }, 600);
  };
  return (
    <div className="date-navigation">
      <button aria-label="Previous day" onClick={() => turn(-1)}>
        <ChevronLeft size={18} />
      </button>
      <label>
        <span>
          {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <input
          type="date"
          aria-label="Choose planner date"
          value={date}
          onChange={(e) => {
            if (e.target.value) {
              useView.getState().turn(1);
              setDate(e.target.value);
            }
          }}
        />
      </label>
      <button aria-label="Next day" onClick={() => turn(1)}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
