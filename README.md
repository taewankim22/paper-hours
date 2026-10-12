# Paper Hours

An interactive 3D study planner built with Next.js 16 App Router, React, TypeScript, Three.js, React Three Fiber, Drei, and Zustand. Rotate a spiral notebook, edit real HTML controls, organize tasks and study periods, and save your plans in your browser.

**[Open the live team demo](https://paper-hours-study-planner.halegoby4.chatgpt.site/?fallback=1)** — no sign-in required. This link selects the tested CSS 3D mode.

## Run locally

Use Node.js 20.9+ (tested with Node 24.14.1).

```sh
git clone https://github.com/taewankim22/paper-hours.git
cd paper-hours
npm ci
npm run dev
```

Open the local URL printed by Next.js. Use `http://127.0.0.1:5173/?fallback=1` for the tested rendering path. Port 5173 is preserved so existing plans on that exact local origin remain available.

```sh
npm test         # 23 planner, native-adapter and paper-geometry tests
npm run typecheck # Standalone TypeScript check
npm run build   # Next.js production build and static export in out/
npm start       # Serve the exported site on http://127.0.0.1:5173
npm run preview # Alias for npm start
```

## Single-page paper prototype

Open `/paper-lab/` locally or [the hosted paper lab](https://paper-hours-study-planner.halegoby4.chatgpt.site/paper-lab/).

- Drag the pink corner upward/left to curl the page; release to settle. **Hold the curl** keeps it bent for editing. The slider and arrow keys on the corner are accessible alternatives.
- Enter text and toggle the checkbox. Each has a session indicator below the controls; values persist under `paper-hours-paper-lab-v1`, separately from planner data.
- Native mode uses `THREE.HTMLTexture` and the existing Chrome upload adapter on a subdivided mesh. CPU cylinder deformation preserves horizontal arc length, pins the spine, and keeps rendered geometry identical to raycast geometry. It is a controlled curl, not a cloth simulation or full page-turn system.
- Pointer interaction is an explicit **raycast-to-DOM bridge**, not automatic native curved hit-testing: pointer-down focuses the real input and positions its caret, selection drag updates its selection, and checkbox release activates the real checkbox. Keyboard, composition and React input events stay attached to real DOM controls. Hidden front controls cannot be clicked through the reverse side.
- A compatible Chrome implementation and `chrome://flags/#canvas-draw-element` are required. The API remains experimental. A first-paint timeout, render error, or context loss switches to a labeled fallback. Use `/paper-lab/?fallback=1` to select it directly.
- Fallback shows an untextured 3D paper-motion preview beside a real flat HTML editor. It deliberately does not claim that the fallback form is rendered on the curved mesh, and uses no screenshot rasterization library.

Validation on October 12, 2026: TypeScript and 23 tests pass. In the available in-app browser, native APIs were unavailable. Fallback typing, checkbox activation, reload persistence, corner dragging, keyboard curl controls and settling were checked in-browser. Native texture rendering, pointer mapping, selection and Korean IME composition still require an API-enabled Chrome test; code and capability detection are not runtime verification. Test those before merging this experiment into the notebook.

Implementation: `src/paper-lab/` and `src/app/paper-lab/`. Concept references: [fimbox cloth](https://github.com/fimbox/html-in-canvas/blob/main/plugins/html-cloth.mjs), [Jake Archibald curved markup](https://github.com/jakearchibald/random-stuff/tree/main/apps/curved-markup), and [Chrome API changes](https://developer.chrome.com/blog/html-in-canvas-ot-changes). The paper geometry and bridge here are independently implemented for the existing Three.js app.

## Next.js architecture and deployment

The App Router owns the root route, document metadata, global styles, loading UI, error boundary, and 404 page. The notebook is loaded through `next/dynamic` with `ssr: false` inside a client component: its experimental API detection, WebGL scene, and localStorage initialization must run only in the browser. Existing reusable planner components and rendering adapters are retained.

`next.config.ts` uses `output: "export"`. Deploy the contents of `out/` to a static host; the existing Sites deployment uses that directory. `npm start` serves this export, not `next start`, which does not support export mode. No server runtime, API routes, authentication, or cloud storage have been added. If those are introduced later, remove export mode and choose a host that runs Next.js server features.

React Strict Mode is temporarily disabled to preserve the existing imperative Three.js / independent React-root lifecycle. Enable it after those resources support development effect replay. This does not disable TypeScript or production validation.

The `paper-hours-v1` storage key and saved-data structure are unchanged. An existing plan remains available on the same origin, including the current demo domain; moving to a different domain or port creates a separate browser storage area.

Vite's application entry, HTML shell, configuration, and direct dependencies have been removed. Vitest may still install Vite transitively as its test engine.

References: [official Vite migration guide](https://nextjs.org/docs/app/guides/migrating/from-vite) and [static export documentation](https://nextjs.org/docs/app/guides/static-exports).

## Use the planner

- Choose **Edit pages** before typing or changing checkboxes. Camera gestures are disabled while editing.
- Add/delete tasks, assign subjects, and write your intention and notes.
- Click an empty timetable cell to add a half-hour block. Drag a pink block to move it; click it to edit its time, duration, or subject.
- Choose **Explore** to rotate with left-drag, zoom with the wheel, and pan with right-drag. Use page-focus buttons or Reset view as needed.
- Navigate dates with the arrows or date picker. Changes save automatically.

**Each person's entries stay in their own browser's localStorage.** This is a shared application, not a shared planner database. There is no backend, authentication, or team synchronization. Localhost and the deployed domain have separate data. Clearing browser storage removes that browser's saved plans.

## Rendering and compatibility

The UI always labels the active mode. WebGL2 and JavaScript are required.

### Tested CSS 3D fallback

Three's `CSS3DRenderer` positions live React DOM pages using the same scene and camera as the WebGL covers, paper stacks, and metallic spiral. Inputs, textareas, checkboxes, and buttons remain actual HTML controls. No HTML screenshots or rasterization libraries are used.

### Experimental native HTML-in-Canvas

`THREE.HTMLTexture` uploads canvas-descendant HTML to the notebook meshes. The adapter handles legacy `texElementImage2D` and newer `texElementSubImage2D` APIs, waits for populated HTML paint, allocates sRGB textures, and synchronizes native interaction geometry. A behavior check distinguishes legacy transform conversion from the newer geometry getter. A missed native page click during editing switches to the clearly labeled fallback.

**Native typing is not yet confirmed across compatible Chrome builds.** A native rendering badge is not proof that interaction works. API names, browser flags, and behavior are experimental and can change. For the native input/checkbox/button experiment, open `/?experiment=1` in a compatible Chrome Canary with `chrome://flags/#canvas-draw-element` enabled and relaunch. Use the rendering badge to inspect capabilities. The application does not include an origin-trial token.

Official references:

- [Chrome interactive book demo](https://chrome.dev/html-in-canvas/demos/webgl-interactive-book.html)
- [Chrome HTML-in-Canvas API changes](https://developer.chrome.com/blog/html-in-canvas-ot-changes)
- [HTML-in-Canvas proposal](https://wicg.github.io/html-in-canvas/)

## Source map

| File | Responsibility |
| --- | --- |
| `src/app/layout.tsx` | Next.js document, metadata, fonts, and styles |
| `src/app/page.tsx` | App Router home route |
| `src/app/planner-client.tsx` | Browser-only notebook boundary and loading state |
| `src/app/error.tsx`, `src/app/not-found.tsx` | Error recovery and missing-page UI |
| `next.config.ts` | Static export and framework configuration |
| `src/store.ts` | Structured planner data, persistence, and view state |
| `src/native.ts` | Experimental API detection |
| `src/nativeRendering.ts` | Texture uploads and paint/context lifecycle |
| `src/nativeInteraction.ts` | Geometry compatibility and pointer-miss recovery |
| `src/components/Notebook3D.tsx` | Notebook scene and rendering loops |
| `src/components/Page3D.tsx` | Native and CSS live-HTML page integration |
| `src/components/PageFlip.tsx` | Flat-page turning animation |
| `src/components/CameraController.tsx` | Orbit controls and camera transitions |
| `src/components/PlannerPage.tsx` | Notebook page layout |
| `src/components/PlannerEditor.tsx` | Countdown settings |
| `src/components/TaskList.tsx` | Task editing and completion |
| `src/components/StudyTimetable.tsx` | Study periods and dragging |
| `src/components/Toolbar.tsx` | View controls and date navigation |

An optional feature-detected WebMCP tool reads planner data from the same browser state; it cannot modify entries.

## Validation and known limitations

Next.js migration validation (October 12, 2026): the production static export, standalone TypeScript check, and 19 automated tests passed. The exported app was checked in Chromium for existing saved-data restoration, adding a task, keyboard typing, checkbox completion, subject selection, date arrows, and persistence after reload. The development server also rendered without captured console errors. The dependency audit reported zero vulnerabilities; the local preview server's compression dependency is pinned to its patched release.

Earlier Vite-version checks covered notes, time-block editing and dragging, camera rotation/zoom, reset, and mobile/desktop layout inspection. Those broader checks are historical, not a claim that all were repeated for this migration.

- Native rendering has appeared in the user's experimental Chrome, but native typing remains unconfirmed. Automated adapter tests use mocks and do not replace native browser testing.
- Pages turn as flat surfaces. CSS pages and WebGL objects do not share a depth buffer, so extreme angles can show compositing differences.
- Overlapping study periods are allowed; totals count overlapping time only once.
- Right-button panning, touch gestures, IME composition, screen readers, and non-Chromium browsers need further dedicated checks.

## Working with teammates

Share the demo link for testing and this repository for source access. Create a feature branch for changes, run `npm test` and `npm run build`, and open a pull request. When reporting an interaction problem, include the browser version, rendering badge, edit/explore mode, and steps to reproduce; avoid including private planner entries.

The current deployment is hosted separately through Sites. Pushing to this GitHub repository does **not** automatically redeploy it. The repository excludes machine-specific hosting metadata, dependencies, generated bundles, and personal planner data.
