import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
export const subjects = [
  "Mathematics",
  "English",
  "Literature",
  "Chemistry",
  "Biology",
  "Other",
] as const;
export type Subject = (typeof subjects)[number];
export type Task = {
  id: string;
  subject: Subject;
  text: string;
  done: boolean;
};
export type Block = {
  id: string;
  start: number;
  duration: number;
  subject: Subject;
};
export type Day = {
  intention: string;
  notes: string;
  tasks: Task[];
  blocks: Block[];
};
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const shiftDate = (date: string, amount: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + amount);
  return localDate(d);
};
export const daysUntil = (date: string, target: string) =>
  Math.round(
    (Date.parse(`${target}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) /
      86400000,
  );
export const blankDay = (): Day => ({
  intention: "One thing at a time.",
  notes: "",
  tasks: [],
  blocks: [],
});
const seedDay = (previous = false): Day => ({
  intention: previous
    ? "Small steps still move you forward."
    : "Make room for a little progress.",
  notes: previous
    ? "A good day. Pick up where you left off."
    : "Take a breath. You’re doing better than you think.",
  tasks: [
    ["Mathematics", "Review derivatives & formulas", true],
    ["Mathematics", "Practice problems · chapter 06", false],
    ["English", "Read & annotate two passages", true],
    ["English", "Vocabulary — a little every day", false],
    ["Literature", "Poetry notes + close reading", false],
    ["Chemistry", "Organic chemistry revision", false],
    ["Biology", "Cell division · mind map", false],
  ].map(([subject, text, done], i) => ({
    id: `seed-${i}`,
    subject: subject as Subject,
    text: text as string,
    done: previous ? i < 5 : (done as boolean),
  })),
  blocks: [
    { id: "b1", start: 8, duration: 1.5, subject: "Mathematics" },
    { id: "b2", start: 10, duration: 1, subject: "English" },
    { id: "b3", start: 13, duration: 1.5, subject: "Literature" },
    { id: "b4", start: 16, duration: 1, subject: "Chemistry" },
    { id: "b5", start: 19, duration: 1.5, subject: "Biology" },
  ],
});
export function moveBlock(block: Block, start: number): Block {
  return {
    ...block,
    start: Math.max(
      6,
      Math.min(24 - block.duration, Math.round(start * 2) / 2),
    ),
  };
}
export function totalHours(blocks: Block[]) {
  const occupied = new Set<number>();
  blocks.forEach((b) => {
    for (let s = b.start * 2; s < (b.start + b.duration) * 2; s++)
      occupied.add(s);
  });
  return occupied.size / 2;
}
export const timeLabel = (hour: number) =>
  `${String(Math.floor(hour)).padStart(2, "0")}:${hour % 1 ? "30" : "00"}`;
const today = localDate();
type State = {
  date: string;
  days: Record<string, Day>;
  exam: string;
  examName: string;
  setDate: (date: string) => void;
  updateDay: (date: string, update: Partial<Day>) => void;
  setExam: (exam: string, name?: string) => void;
};
// A failed write must never discard in-memory edits or claim they were saved.
export let storageError = "";
const storage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      storageError = "Storage is unavailable. Changes last only this session.";
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      storageError = "";
    } catch {
      storageError = "Could not save on this device. Keep this tab open.";
    }
  },
  removeItem: (key: string) => localStorage.removeItem(key),
};
export const usePlanner = create<State>()(
  persist(
    (set) => ({
      date: today,
      days: { [today]: seedDay(), [shiftDate(today, -1)]: seedDay(true) },
      exam: shiftDate(today, 55),
      examName: "The next big chapter",
      setDate: (date) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date)))
          set({ date });
      },
      updateDay: (date, update) =>
        set((s) => ({
          days: {
            ...s.days,
            [date]: { ...(s.days[date] ?? blankDay()), ...update },
          },
        })),
      setExam: (exam, name) =>
        set((s) => ({ exam, examName: name ?? s.examName })),
    }),
    {
      name: "paper-hours-v1",
      version: 1,
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (_s, error) => {
        if (error)
          storageError =
            "Saved data could not be read. This session uses example data.";
      },
    },
  ),
);
type View = {
  editing: boolean;
  focus: number;
  reset: number;
  zoom: number;
  flip: number;
  flipDirection: number;
  mode: "native" | "fallback";
  nativeError: string;
  setEditing: (v: boolean) => void;
  setFocus: (v: number) => void;
  resetView: () => void;
  zoomBy: (n: number) => void;
  turn: (direction: number) => void;
  fallback: (reason: string) => void;
};
export const useView = create<View>((set) => ({
  editing: false,
  focus: 0,
  reset: 0,
  zoom: 0,
  flip: 0,
  flipDirection: 1,
  mode: "fallback",
  nativeError: "",
  setEditing: (editing) =>
    set((s) => ({ editing, focus: editing ? 1 : 0, reset: s.reset + 1 })),
  setFocus: (focus) => set((s) => ({ focus, reset: s.reset + 1 })),
  resetView: () => set((s) => ({ focus: 0, zoom: 0, reset: s.reset + 1 })),
  zoomBy: (n) =>
    set((s) => ({
      zoom: Math.max(-2, Math.min(3, s.zoom + n)),
      reset: s.reset + 1,
    })),
  turn: (direction) =>
    set((s) => ({
      flip: s.flip + 1,
      flipDirection: direction,
      focus: 0,
      reset: s.reset + 1,
    })),
  // Preserve the first failure; disposal of the old Canvas may emit more events.
  fallback: (reason) =>
    set((state) =>
      state.mode === "fallback"
        ? state
        : { mode: "fallback", nativeError: reason },
    ),
}));
