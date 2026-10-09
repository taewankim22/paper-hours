import { useRef, useState } from "react";
import {
  moveBlock,
  subjects,
  timeLabel,
  totalHours,
  type Day,
  type Block,
  type Subject,
  usePlanner,
  useView,
} from "../store";
export function StudyTimetable({ date, day }: { date: string; day: Day }) {
  const editing = useView((s) => s.editing),
    update = usePlanner((s) => s.updateDay);
  const [selected, setSelected] = useState<string | null>(null),
    drag = useRef<{ id: string; row: number; start: number } | null>(null);
  const moved = useRef(false);
  const active = day.blocks.find((b) => b.id === selected);
  function add(start: number) {
    const b: Block = {
      id: crypto.randomUUID(),
      start,
      duration: 0.5,
      subject: "Other",
    };
    update(date, { blocks: [...day.blocks, b] });
    setSelected(b.id);
  }
  function patch(value: Partial<Block>) {
    if (active)
      update(date, {
        blocks: day.blocks.map((b) =>
          b.id === active.id
            ? moveBlock({ ...b, ...value }, value.start ?? b.start)
            : b,
        ),
      });
  }
  const total = totalHours(day.blocks);
  return (
    <div className="timetable">
      <div className="timetable-heading">
        TIME TABLE <span>30 MIN</span>
      </div>
      <div
        className="time-grid"
        onPointerMove={(e) => {
          if (!drag.current) return;
          const el = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest<HTMLElement>("[data-slot]");
          if (!el || el.dataset.date !== date) return;
          const row = Number(el.dataset.slot);
          if (row !== drag.current.row) {
            moved.current = true;
            const start = drag.current.start + (row - drag.current.row) * 0.5;
            update(date, {
              blocks: day.blocks.map((b) =>
                b.id === drag.current!.id ? moveBlock(b, start) : b,
              ),
            });
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {Array.from({ length: 36 }, (_, i) => {
          const hour = 6 + i * 0.5;
          const block = day.blocks.find(
            (b) => hour >= b.start && hour < b.start + b.duration,
          );
          return (
            <div className="time-row" key={i}>
              <span className="hour">
                {i % 2 === 0 ? String(hour).padStart(2, "0") : ""}
              </span>
              <button
                data-slot={i}
                data-date={date}
                aria-label={`${date} ${timeLabel(hour)}${block ? ` ${block.subject}` : " empty time block"}`}
                disabled={!editing}
                className={`${block ? "marked" : ""} ${block?.id === selected ? "selected" : ""}`}
                onPointerDown={(e) => {
                  if (block) {
                    setSelected(null);
                    moved.current = false;
                    drag.current = { id: block.id, row: i, start: block.start };
                    e.preventDefault();
                  }
                }}
                onClick={() => {
                  if (moved.current) {
                    moved.current = false;
                    return;
                  }
                  if (!block) add(hour);
                  else setSelected(block.id);
                }}
              >
                {block && hour === block.start && (
                  <span>{block.subject.slice(0, 4)}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="study-total">
        <small>TOTAL STUDY</small>
        <strong>
          {Math.floor(total)}
          <small>H</small> {total % 1 ? "30" : "00"}
          <small>M</small>
        </strong>
      </div>
      {editing && <p className="time-tip">Click to mark · drag to move</p>}
      {editing && active && (
        <div
          className="block-editor"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <b>Study block</b>
          <label>
            Subject
            <select
              aria-label={`Time block subject on ${date}`}
              value={active.subject}
              onChange={(e) => patch({ subject: e.target.value as Subject })}
            >
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Starts at
            <select
              aria-label={`Block start on ${date}`}
              value={active.start}
              onChange={(e) => patch({ start: Number(e.target.value) })}
            >
              {Array.from({ length: 36 }, (_, i) => (
                <option key={i} value={6 + i * 0.5}>
                  {timeLabel(6 + i * 0.5)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Duration
            <select
              aria-label={`Block duration on ${date}`}
              value={active.duration}
              onChange={(e) => patch({ duration: Number(e.target.value) })}
            >
              {[0.5, 1, 1.5, 2, 2.5, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} hours
                </option>
              ))}
            </select>
          </label>
          <div>
            <button
              onClick={() => {
                update(date, {
                  blocks: day.blocks.filter((b) => b.id !== active.id),
                });
                setSelected(null);
              }}
            >
              Remove
            </button>
            <button onClick={() => setSelected(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
