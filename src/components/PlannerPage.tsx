import { useRef } from "react";
import { blankDay, daysUntil, usePlanner, useView } from "../store";
import { TaskList } from "./TaskList";
import { StudyTimetable } from "./StudyTimetable";
export function PlannerPage({ date, side }: { date: string; side: number }) {
  const day = usePlanner((s) => s.days[date]) ?? blankDay();
  const { exam, examName, updateDay } = usePlanner();
  const editing = useView((s) => s.editing);
  const start = useRef([0, 0]);
  const d = new Date(`${date}T12:00:00`),
    remaining = daysUntil(date, exam);
  return (
    <article
      className={`planner-page ${side < 0 ? "left-page" : "right-page"} ${editing ? "is-editing" : ""}`}
      aria-label={`Planner for ${date}`}
      onPointerDown={(e) => {
        start.current = [e.clientX, e.clientY];
        if (editing) e.stopPropagation();
      }}
      onClick={(e) => {
        if (
          !editing &&
          Math.hypot(
            e.clientX - start.current[0],
            e.clientY - start.current[1],
          ) < 5
        )
          useView.getState().setFocus(side);
      }}
    >
      <div className="paper-top">
        <span>DAILY STUDY PLANNER</span>
        <span>make today count.</span>
      </div>
      <div className="page-date">
        <div>
          <small>DATE</small>
          <strong>
            {date.replaceAll("-", ".")}
            <em>
              {d
                .toLocaleDateString("en-US", { weekday: "short" })
                .toUpperCase()}
            </em>
          </strong>
        </div>
        <div className="countdown">
          <strong>
            {remaining >= 0 ? `D − ${remaining}` : `D + ${Math.abs(remaining)}`}
          </strong>
          <small>{examName}</small>
        </div>
      </div>
      <div className="intention">
        <div className="daily-word">
          <span>TODAY, I WILL…</span>
          <input
            aria-label={`Intention on ${date}`}
            readOnly={!editing}
            value={day.intention}
            maxLength={100}
            onChange={(e) => updateDay(date, { intention: e.target.value })}
          />
        </div>
        <div className="little-star" aria-hidden="true">
          ✳<span>you've got this</span>
        </div>
      </div>
      <div className="planner-columns">
        <div className="tasks-and-notes">
          <TaskList date={date} day={day} />
          <div className="note-label">A NOTE TO MYSELF</div>
          <textarea
            aria-label={`Notes on ${date}`}
            readOnly={!editing}
            value={day.notes}
            maxLength={700}
            placeholder="Leave a little encouragement…"
            onChange={(e) => updateDay(date, { notes: e.target.value })}
          />
        </div>
        <StudyTimetable date={date} day={day} />
      </div>
      <footer className="paper-footer">
        <span>PROGRESS, NOT PERFECTION.</span>
        <span>
          {day.tasks.filter((t) => t.done).length} / {day.tasks.length} little
          wins
        </span>
      </footer>
    </article>
  );
}
