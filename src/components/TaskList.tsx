import { Plus, X } from "lucide-react";
import {
  subjects,
  type Day,
  type Subject,
  usePlanner,
  useView,
} from "../store";
export function TaskList({ date, day }: { date: string; day: Day }) {
  const editing = useView((s) => s.editing),
    update = usePlanner((s) => s.updateDay);
  const patch = (id: string, value: object) =>
    update(date, {
      tasks: day.tasks.map((t) => (t.id === id ? { ...t, ...value } : t)),
    });
  return (
    <div className="task-list">
      <div className="column-labels">
        <span>SUBJECT</span>
        <span>ONE THING AT A TIME</span>
        <span>✓</span>
      </div>
      <div className="task-rows">
        {day.tasks.map((task, i) => (
          <div
            className={`task-row ${task.done ? "complete" : ""}`}
            key={task.id}
          >
            <select
              aria-label={`Subject for task ${i + 1} on ${date}`}
              disabled={!editing}
              value={task.subject}
              onChange={(e) =>
                patch(task.id, { subject: e.target.value as Subject })
              }
            >
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input
              aria-label={`Task ${i + 1} on ${date}`}
              readOnly={!editing}
              value={task.text}
              placeholder="A small step…"
              maxLength={150}
              onChange={(e) => patch(task.id, { text: e.target.value })}
            />
            <input
              type="checkbox"
              aria-label={`Complete task ${i + 1} on ${date}`}
              disabled={!editing}
              checked={task.done}
              onChange={(e) => patch(task.id, { done: e.target.checked })}
            />
            {editing && (
              <button
                className="delete-task"
                aria-label={`Delete task ${i + 1} on ${date}`}
                onClick={() =>
                  update(date, {
                    tasks: day.tasks.filter((t) => t.id !== task.id),
                  })
                }
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        {Array.from({ length: Math.max(0, 9 - day.tasks.length) }, (_, i) => (
          <div className="task-row empty" key={`empty-${i}`} aria-hidden="true">
            <span />
            <span />
            <span>○</span>
          </div>
        ))}
      </div>
      {editing && (
        <button
          className="add-task"
          onClick={() =>
            update(date, {
              tasks: [
                ...day.tasks,
                {
                  id: crypto.randomUUID(),
                  subject: "Other",
                  text: "",
                  done: false,
                },
              ],
            })
          }
        >
          <Plus size={14} /> Add a small step
        </button>
      )}
    </div>
  );
}
