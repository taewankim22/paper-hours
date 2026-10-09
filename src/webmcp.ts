import { blankDay, usePlanner } from "./store";
export function registerPlannerTool() {
  const context = (
    document as Document & {
      modelContext?: {
        registerTool: (tool: object, options: object) => unknown;
      };
    }
  ).modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  try {
    Promise.resolve(
      context.registerTool(
        {
          name: "read_planner_day",
          description:
            "Read the tasks, notes and study blocks saved on this device for one calendar date. Does not change the planner.",
          inputSchema: {
            type: "object",
            properties: {
              date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            },
            required: ["date"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute: (input: unknown) => {
            const date = (input as { date?: unknown })?.date;
            if (
              typeof date !== "string" ||
              !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
              isNaN(Date.parse(date))
            )
              throw new Error("A valid YYYY-MM-DD date is required.");
            return {
              date,
              day: usePlanner.getState().days[date] ?? blankDay(),
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {
    /* Optional experimental registry; ordinary UI remains available. */
  }
  return () => lifecycle.abort();
}
