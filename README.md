# Paper Hours

An interactive 3D study planner built with React, TypeScript, Vite, Three.js, React Three Fiber, Drei, and Zustand. Rotate a spiral notebook, edit real HTML controls, organize tasks and study periods, and save your plans in your browser.

**[Open the live team demo](https://paper-hours-study-planner.halegoby4.chatgpt.site/?fallback=1)** — no sign-in required. This link selects the tested CSS 3D mode.

## Run locally

Use Node.js 22.12+ (tested with Node 24).

```sh
git clone https://github.com/taewankim22/paper-hours.git
cd paper-hours
npm ci
npm run dev
```

Open the local URL printed by Vite. Use `http://127.0.0.1:5173/?fallback=1` for the tested rendering path.

```sh
npm test         # 19 planner and native-adapter regression tests
npm run build   # TypeScript checks and production bundle in dist/
npm run preview # Serve the production bundle locally
```

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

The production build and 19 automated tests passed. CSS fallback browser checks covered typing, checkboxes, task CRUD, subjects, notes, time-block editing and dragging, date navigation, camera rotation/zoom, reset, and persistence after reload. Mobile and desktop layouts were inspected.

- Native rendering has appeared in the user's experimental Chrome, but native typing remains unconfirmed. Automated adapter tests use mocks and do not replace native browser testing.
- Pages turn as flat surfaces. CSS pages and WebGL objects do not share a depth buffer, so extreme angles can show compositing differences.
- Overlapping study periods are allowed; totals count overlapping time only once.
- Right-button panning, touch gestures, IME composition, screen readers, and non-Chromium browsers need further dedicated checks.

## Working with teammates

Share the demo link for testing and this repository for source access. Create a feature branch for changes, run `npm test` and `npm run build`, and open a pull request. When reporting an interaction problem, include the browser version, rendering badge, edit/explore mode, and steps to reproduce; avoid including private planner entries.

The current deployment is hosted separately through Sites. Pushing to this GitHub repository does **not** automatically redeploy it. The repository excludes machine-specific hosting metadata, dependencies, generated bundles, and personal planner data.
