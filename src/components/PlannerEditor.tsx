import { X } from "lucide-react";
import { usePlanner } from "../store";
export function PlannerEditor({ close }: { close: () => void }) {
  const { exam, examName, setExam } = usePlanner();
  return (
    <div className="dialog-shade" onClick={close}>
      <section
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Countdown settings"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="dialog-close"
          aria-label="Close countdown settings"
          onClick={close}
        >
          <X size={18} />
        </button>
        <small>YOUR NEXT MILESTONE</small>
        <h2>Something to work toward.</h2>
        <label>
          Milestone name
          <input
            value={examName}
            maxLength={45}
            onChange={(e) => setExam(exam, e.target.value)}
            autoFocus
          />
        </label>
        <label>
          Target date
          <input
            type="date"
            value={exam}
            onChange={(e) => {
              if (e.target.value) setExam(e.target.value);
            }}
          />
        </label>
        <button className="primary" onClick={close}>
          Done
        </button>
      </section>
    </div>
  );
}
