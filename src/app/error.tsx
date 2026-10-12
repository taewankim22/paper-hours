"use client";

export default function PlannerError({ reset }: { reset: () => void }) {
  return (
    <main className="planner-loading" role="alert">
      <h1>Your notebook could not open.</h1>
      <p>Try again to reload the page. Your saved plans stay on this device.</p>
      <button onClick={reset}>Try again</button>
      <a href="/?fallback=1">Open the CSS 3D version</a>
    </main>
  );
}
