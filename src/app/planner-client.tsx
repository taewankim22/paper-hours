"use client";

import dynamic from "next/dynamic";

// Native feature detection, localStorage and the Three scene require a browser.
// A client boundary alone still permits prerendering; explicitly disable SSR.
const Planner = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => (
    <main className="planner-loading" role="status" aria-live="polite">
      <h1>Paper Hours</h1>
      <p>Opening your notebook…</p>
    </main>
  ),
});

export default function PlannerClient() {
  return <Planner />;
}
