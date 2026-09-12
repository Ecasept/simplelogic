# Simple Logic Codebase and Architecture Review

## Scope and review method

This review first maps the current architecture, then identifies structural debt relevant to planned multi-project support and AOT compilation. It also contains a deeper review of the editor interaction subsystem, particularly:

- `canvasViewModel.ts`
- `editorViewModel.svelte.ts`
- `+page.svelte`
- `Canvas.svelte`
- `actions.svelte.ts`
- `move.svelte.ts`

The review follows the repository's design-review rubric: it prioritizes ownership, locality, dependency direction, testable seams, and meaningful reductions in change cost over cosmetic cleanup or abstraction for its own sake.

Tests and type-checks could not be executed because `npm` is unavailable in the current environment. The conclusions are based on static inspection. No source files were changed as part of the review.

## Codebase overview

Simple Logic is a compact SvelteKit application with roughly 12.7k lines under `src/`. Its architecture is currently organized around a single browser-resident circuit:

```text
Svelte components
      ↓
static action classes
      ↓
global editor/canvas/graph/simulation singletons
      ↓
GraphData JSON
      ↓
API routes → Prisma → Cloudflare D1
```

The major areas are:

- Circuit model and serialization: `src/lib/util/types.ts`
- Editing and undo commands: `src/lib/util/commands.ts`
- Mutable graph/history owner: `src/lib/util/graph.svelte.ts`
- Application orchestration and global instances: `src/lib/util/actions.svelte.ts`
- Event-driven simulator and UI scheduler: `src/lib/util/simulation.svelte.ts`
- Component catalogue and gate semantics: `src/lib/util/global.svelte.ts`
- UI state machine: `src/lib/util/viewModels/editorViewModel.svelte.ts`
- Persistence UI/client: `src/lib/util/viewModels/circuitModalViewModel.ts`, `src/lib/util/api.ts`
- Persistence backend: `prisma/schema.prisma`, `src/routes/api/circuits/+server.ts`

Useful foundations already exist:

- Strict TypeScript and boundary validation with Zod.
- Command-based undo with extensive unit tests.
- A genuinely useful discriminated editor-state model.
- Authenticated database queries are scoped by `userId`.
- Substantial browser coverage for editing and current simulation behavior.

The main architectural problem is not general code quality. It is that the system assumes exactly one circuit, one editor, one simulator, and one globally active lifecycle. That assumption intersects directly with both planned features.

## Codebase-wide findings

### 1. There is no versioned project/document boundary

- **Scope:** Architectural
- **Where:** `src/lib/util/types.ts`, `prisma/schema.prisma`, `src/lib/util/api.ts`
- **Problem:** `GraphData` simultaneously serves as the mutable editor model, clipboard format, preset format, API contract, and database payload. It has no schema version, document identity, metadata, or migration mechanism.
- **Evidence:** The root format contains only `wires`, `components`, and `nextId`. Database rows store it as opaque JSON. Clipboard paste, presets, session restoration, and database loading all consume approximately the same raw shape through different paths.
- **Why it matters:** Multi-project support needs a clear aggregate—project, circuit/document, metadata, active document, and perhaps project-level settings. AOT needs a stable source format that can evolve without invalidating compiled artifacts or old projects.
- **Proposed improvement:** Introduce an explicit versioned envelope, for example:

  ```ts
  type ProjectDocumentV1 = {
    formatVersion: 1;
    projectId: string;
    name: string;
    circuits: Record<string, CircuitDocumentV1>;
  };
  ```

  Keep this separate from mutable editor state. Create one `decode → migrate → semantically validate` entry point used by API, clipboard, presets, and session recovery.
- **Expected result:** Project structure and file-format evolution become explicit; compatibility logic stops leaking into modals and API endpoints.
- **Confidence:** High
- **Cost / payoff:** Medium cost, very high payoff. This should precede both major features.

### 2. Global singletons and circular imports prevent multiple editor sessions

- **Scope:** Architectural
- **Where:** `src/lib/util/actions.svelte.ts`, `src/lib/util/global.svelte.ts`, `src/lib/util/graph.svelte.ts`, `src/lib/util/simulation.svelte.ts`, `src/lib/util/move.svelte.ts`
- **Problem:** `actions.svelte.ts` constructs global instances, while the constructed modules import those instances back through `actions.svelte.ts`.
- **Evidence:** `actions` imports `GraphManager`, `mover`, `simController`, and global helpers; each of `graph`, `move`, `simulation`, and `global` imports an exported singleton from `actions`.
- **Why it matters:** There can only be one active graph/history/simulator. Project switching will require coordinated mutation of ambient global state. Pure simulation or compilation outside a mounted browser editor is also unnecessarily difficult.
- **Proposed improvement:** Add a per-document composition root such as `EditorSession`, constructed with a graph repository, component registry, simulator, and settings. Pass dependencies into `GraphManager`, `Mover`, and simulation rather than importing them globally. Expose the active session to Svelte through context.
- **Expected result:** Multiple project tabs or cached sessions become feasible; tests can instantiate isolated sessions; circular imports disappear.
- **Confidence:** High
- **Cost / payoff:** Medium-to-high cost, very high payoff.

### 3. Simulation semantics have no reusable compiler seam

- **Scope:** Architectural
- **Where:** `src/lib/util/global.svelte.ts`, `src/lib/util/simulation.svelte.ts`, `src/lib/components/editor/ComponentInner.svelte`
- **Problem:** Component layout, descriptions, default data, interpreter functions, simulator initialization hints, and some rendering behavior jointly define what a component means.
- **Evidence:** `COMPONENT_DATA` combines dimensions and handles with JavaScript `execute` closures. `IN`, `LED`, and `TEXT` receive special treatment elsewhere. `customData` is arbitrary `Record<string, any>`.
- **Why it matters:** An AOT compiler needs one authoritative semantic definition of component kinds, ports, parameters, and state behavior. JavaScript closures mixed with UI metadata are not an appropriate IR and make interpreter/compiler equivalence difficult to prove.
- **Proposed improvement:** Split the catalogue into:

  - Typed semantic definitions: opcode/kind, typed ports, parameter schema, state behavior.
  - Presentation definitions: display name, dimensions, icon/rendering.
  - A lowering pass: validated circuit → canonical netlist IR.
  - Backends consuming that IR: interpreter and AOT compiler.

- **Expected result:** The interpreter and compiler share semantics and validation while remaining independently implementable and benchmarkable.
- **Confidence:** High
- **Cost / payoff:** Medium cost, foundational payoff for the thesis.

### 4. Graph validity is structural, not semantic

- **Scope:** Feature/module
- **Where:** `src/lib/util/types.ts`, `src/lib/util/commands.ts`, `src/lib/util/graph.svelte.ts`, `src/lib/util/viewModels/circuitModalViewModel.ts`
- **Problem:** Connectivity is duplicated on both endpoints and maintained through coordinated mutations, but Zod only validates individual object shapes.
- **Evidence:** `ConnectCommand` writes both sides and manually rolls back if the second write fails. Validation does not verify that targets exist, references are reciprocal, IDs match record keys, port names belong to the component kind, or `nextId` is safe. A "fix wire endpoint positions" workflow is already needed after loading.
- **Why it matters:** Every editor operation, project migration, and compiler pass must distrust the graph. Invalid connections could crash simulation or produce incorrect compiled output.
- **Proposed improvement:** Define semantic validation separately from decoding. Longer term, use canonical connectivity—nets/edges stored once—with endpoint geometry derived from components. If the current representation must remain, put all topology changes behind a transactional graph API and validate invariants after document loading.
- **Expected result:** One owner enforces connectivity rules, repair code shrinks, and the compiler receives a trustworthy graph.
- **Confidence:** High
- **Cost / payoff:** Medium cost, high payoff.

### 5. The simulator is nondeterministic infrastructure wrapped around a fragile queue

- **Scope:** Feature/module
- **Where:** `src/lib/util/simulation.svelte.ts`
- **Problem:** Evaluation, graph access, scheduling, Svelte reactivity, timing, and browser yielding are implemented in one module.
- **Evidence:**

  - The simulator reads the global mutable `graphManager`.
  - The queue is an array using `shift()`, which is linear-time.
  - The same element can be queued repeatedly.
  - There is no oscillation detection or evaluation budget.
  - Cyclic circuits are supported, but a non-settling circuit can run indefinitely.
  - Component evaluation passes `handle.type` (`"output"`) instead of `handleId` to the gate function. This is latent while all existing components have one output or ignore the argument.
  - `requestAnimationFrame`, timers, performance measurement, and `$state` are embedded in the engine.

- **Why it matters:** AOT speed comparisons require deterministic semantics and measurement boundaries. Current timings include UI scheduling, and future multi-output or sequential components can expose the output-ID defect.
- **Proposed improvement:** Make the simulation kernel a pure class over canonical netlist IR with an explicit `step`, `runUntilStable`, and diagnostics result. Use a deque plus queued-set, define oscillation/step limits, and place animation/timing in a separate browser controller.
- **Expected result:** Fast unit tests, repeatable benchmarks, clear failure behavior, and interpreter/AOT differential testing.
- **Confidence:** High
- **Cost / payoff:** Medium cost, very high payoff.

### 6. Replacing a circuit is not an atomic lifecycle operation

- **Scope:** Feature/module
- **Where:** `src/lib/util/actions.svelte.ts`, `src/routes/+page.svelte`, `src/lib/util/graph.svelte.ts`
- **Problem:** Loading is spread across modal callbacks, editor reset, asynchronous simulation reset, graph clearing, direct graph assignment, and session-storage restoration.
- **Evidence:** `setNewGraph` starts `simController.reset()` without awaiting it, then clears and replaces the graph. Session restoration bypasses that workflow and calls `setGraphData` directly. `setGraphData` neither validates nor clones its argument.
- **Why it matters:** Project switching needs one operation that stops old work, validates the new document, replaces state, resets history/selection/simulation, and reports success or failure. Multiple current paths can leave different residual state.
- **Proposed improvement:** Add an atomic `session.openDocument(document)` operation with explicit ordering:

  1. Stop/cancel simulation.
  2. Decode and validate.
  3. Replace the graph.
  4. Reset history and ephemeral UI state.
  5. Initialize simulation for the new graph.
  6. Publish one state update.

- **Expected result:** Project switching becomes a reliable boundary instead of an orchestration sequence every caller must reproduce.
- **Confidence:** High
- **Cost / payoff:** Low-to-medium cost, high payoff.

### 7. Persistence models saved circuits, not projects or document lifecycle

- **Scope:** Architectural
- **Where:** `prisma/schema.prisma`, `src/routes/api/circuits/+server.ts`, `src/routes/api/circuits/[id]/+server.ts`
- **Problem:** The backend supports create/list/read/delete of immutable named circuit blobs. There is no project aggregate, update operation, revision/concurrency field, format version, or stable ordering.
- **Evidence:** Names are unique per user; saving an existing name is rejected; listing has no `orderBy`; database reads call `JSON.parse` without server-side graph validation. Pagination accepts unvalidated negative/NaN values. Migration `0004` copies old rows into newly non-null count columns without supplying values, making that migration unsafe for a populated database.
- **Why it matters:** Bolting `projectId` onto this API would preserve unclear ownership and complicate autosave, rename, project deletion, migrations, and compiled-artifact invalidation.
- **Proposed improvement:** Decide the aggregate explicitly—probably `Project` owning one or more `CircuitDocument` records. Add timestamps, document version/revision, format version, deterministic ordering, and proper update semantics. Put Prisma operations behind a small project repository/service so route handlers own HTTP concerns only.
- **Expected result:** Multi-project behavior and future compiled artifacts have clear ownership and lifecycle rules.
- **Confidence:** High
- **Cost / payoff:** Medium cost, high payoff.

### 8. Tests protect UI behavior better than engine contracts

- **Scope:** Local structural
- **Where:** `playwright/simulation.spec.ts`, `playwright/fixtures/simulation.ts`, `src/lib/util/commands.test.ts`
- **Problem:** Command mechanics are well unit-tested, but simulation correctness exists primarily as browser tests against global state.
- **Evidence:** There is no direct simulation unit-test file. `waitForSimulationFinished` may wait a fixed second before checking the UI. There are no schema-migration, malformed-topology, oscillation, multi-output, or interpreter/compiler equivalence tests.
- **Why it matters:** The planned refactor will change internal boundaries extensively. Slow UI-level tests will identify failures late and will not adequately specify AOT semantics.
- **Proposed improvement:** Before rewriting, extract characterization fixtures from the existing preset circuits and test the pure engine directly. Add invariant/property tests for graph edits and golden/differential tests that run identical vectors through interpreted and compiled backends.
- **Expected result:** The architecture can change without losing behavior, and thesis performance claims rest on correctness equivalence.
- **Confidence:** High
- **Cost / payoff:** Low-to-medium cost, very high payoff.

## Editor interaction subsystem: deeper review

The deeper debt in the highlighted files is the fragmented ownership of one logical editor state machine. File size is only a symptom.

### Current component-drag flow

An existing-component drag crosses these owners:

```text
Component.svelte
  pointerdown
      ↓
EditorViewModel
  records elementDown, pointer ID, click origin
      ↓
+page.svelte window pointermove
      ↓
MoveAction
  interprets EditorViewModel state
      ↓
Mover
  tracks original positions and generates replacement commands
      ↓
GraphManager
  stores provisional commands and publishes graph snapshots
      ↓
MoveAction
  transitions EditorViewModel to draggingElements
      ↓
+page.svelte window pointerup
  selects element and commits changes
      ↓
ChangesAction
  resets EditorViewModel, commits GraphManager transaction,
  resets Mover indirectly
```

Panning and area selection take a separate path through `Canvas.svelte`, `CanvasViewModel`, `EditorAction`, and a duplicated `isPanning` flag. Adding an interaction feature therefore requires edits across several apparently unrelated files.

### 9. The editor state machine is defined in one file but implemented in many

- **Scope:** Architectural within the editor subsystem
- **Where:** `editorViewModel.svelte.ts`, `actions.svelte.ts`, `+page.svelte`, `Component.svelte`, `Wire.svelte`
- **Problem:** `EditorUiState` describes a state machine, but `EditorViewModel` does not own its transition logic.
- **Evidence:**

  - Components decide how pointer-down affects the state.
  - `MoveAction.onMove` is effectively the move-event transition table.
  - `+page.svelte.onPointerUp` is the release-event transition table.
  - `keyboard.ts` independently decides valid keyboard transitions.
  - `ChangesAction` decides how cancellation and completion reset state.
  - `EditorViewModel` supplies lower-level setters such as `startDrag`, `startAddWire`, and `abortEditing`.

- **Why it matters:** To add a new interaction phase—box dragging, project-navigation interruption, wire routing, group editing, or snapping guides—you must update the state union, start transition, move behavior, release behavior, cancellation shortcuts, and often component conditions in separate files.
- **Proposed improvement:** Give one `EditorInteractionController` ownership of semantic events:

  ```ts
  pointerDownOnElement(...)
  pointerDownOnHandle(...)
  pointerDownOnCanvas(...)
  pointerMove(...)
  pointerUp(...)
  pointerCancel(...)
  cancel()
  ```

  The controller should contain the only switch over interaction states. Components identify what was hit but do not perform transitions themselves.
- **Expected result:** A new interaction can usually be implemented and tested in one controller plus its rendering changes.
- **Confidence:** High
- **Cost / payoff:** Medium cost, very high payoff.

The existing discriminated union is worth keeping. The mistake is treating it mainly as a bag of state while orchestration lives elsewhere.

### 10. `CanvasViewModel` and `EditorViewModel` split state along the wrong boundary

- **Scope:** Feature/module design
- **Where:** `canvasViewModel.ts`, `editorViewModel.svelte.ts`, `actions.svelte.ts`
- **Problem:** Panning exists in both view models, while area selection is half canvas operation and half editor operation.
- **Evidence:**

  - `EditorUiState` contains `isPanning`.
  - `CanvasUiState` independently contains `isPanning`, `originalViewBox`, and `moveAmount`.
  - `CanvasUiState` also contains `isAreaSelecting`.
  - `EditorViewModel.startAreaSelection()` merely calls its own `startPanning()`.
  - Every start/stop/abort operation must update both models through `EditorAction`.
  - `Canvas.svelte` checks both `uiState.isAreaSelecting` and `editorViewModel.uiState.isPanning`.

- **Why it matters:** The code has two sources of truth that are only synchronized by convention. Intermediate or exceptional paths—Escape, pointer leaving, modal opening, pointer cancellation, or project switching—can desynchronize them.
- **Proposed improvement:** Do not simply merge both classes. Split by actual ownership:

  - `Viewport`: `viewBox`, zoom, and pan mathematics.
  - `InteractionState`: idle, element press, element drag, panning, pinch zoom, area selection, wire drag, and component placement.
  - Canvas DOM adapter: client-to-world transformation using the actual SVG element.

  Panning and area selection belong to interaction state. The resulting viewport belongs to `Viewport`.
- **Expected result:** One state answers "what gesture is active?" and one object answers "what portion of the world is visible?"
- **Confidence:** High
- **Cost / payoff:** Medium cost, high payoff.

The current state types also permit theoretically invalid combinations because panning and area selection are independent intersections. A single interaction union can make those combinations unrepresentable.

### 11. There are two gesture controllers processing the same pointer stream

- **Scope:** Architectural within the UI
- **Where:** `+page.svelte`, `Canvas.svelte`
- **Problem:** Element movement is handled through global window events, while canvas pan/pinch/area selection uses SVG-local events.
- **Evidence:**

  - `+page.svelte` installs `pointermove` and `pointerup` on `window`.
  - `Canvas.svelte` installs its own `pointerdown`, `pointermove`, `pointerup`, and `pointerleave`.
  - Both handlers observe bubbling canvas events.
  - `Canvas.svelte` uses `stopPropagation()` to keep a release away from the page handler.
  - The page contains a warning that panning "should be handled by the canvas component," confirming that ownership is enforced defensively.
  - `Canvas.svelte` separately maintains two pointer slots and `areaSelectPointerId`, while `EditorViewModel` maintains another `activePointerId`.
  - There is no `pointercancel` or `lostpointercapture` path.

- **Why it matters:** Correctness depends on DOM bubbling order, propagation calls, and both controllers agreeing about pointer ownership. Touch support, project switching mid-gesture, pen input, or another overlay can expose stuck or accidentally committed interactions.
- **Proposed improvement:** Route the complete pointer lifecycle through one interaction controller. Prefer pointer capture on the SVG/editor surface so move, up, and cancel use the same path even when the pointer leaves the canvas. Child components should submit semantic hit information rather than run separate gesture protocols.
- **Expected result:** Pointer ownership becomes explicit, propagation tricks disappear, and mouse/touch/pen behavior shares one implementation.
- **Confidence:** High
- **Cost / payoff:** Medium-to-high cost, high payoff.

### 12. One drag transaction is distributed across three stateful objects

- **Scope:** Feature/module design
- **Where:** `move.svelte.ts`, `graph.svelte.ts`, `editorViewModel.svelte.ts`
- **Problem:** No module owns the complete lifecycle of a provisional edit.
- **Evidence:**

  - `EditorViewModel` owns the click origin, target elements, and interaction phase.
  - `Mover` owns `oldPositions`, `isFirstMove`, generated commands, and whether movement occurred.
  - `GraphManager` owns the provisional `changes` array.
  - Each move undoes the previous provisional command group and executes a replacement.
  - Committing calls `EditorViewModel.abortEditing()`, then `GraphManager.applyChanges()`, which finally resets `Mover`.
  - Cancelling follows a similar cross-module protocol.
  - `GraphManager` imports and resets `mover`, while `mover` imports `graphManager`, creating a direct cycle.

- **Why it matters:** The order of reset, undo, replacement, publication, and state transition is implicit. A feature such as constrained dragging, live alignment, cross-project drag/drop, or a different preview type must participate in this private protocol.
- **Proposed improvement:** Give `GraphManager` a real edit transaction:

  ```ts
  const edit = graph.beginEdit();
  edit.preview(command);
  edit.replacePreview(command);
  edit.commit();
  edit.cancel();
  ```

  Then make movement planning stateless:

  ```ts
  planMove(graph, targets, startPosition, currentPosition, snapPolicy)
  ```

  The active interaction stores its drag origin and transaction. `Mover` as a long-lived singleton can disappear.
- **Expected result:** Preview/commit/cancel semantics become reusable for movement, rotation, wire creation, duplication, and future editor operations.
- **Confidence:** High
- **Cost / payoff:** Medium cost, very high payoff.

This is probably the single strongest explanation for why previous feature work felt unpleasant.

### 13. `actions.svelte.ts` is a service locator, workflow layer, and utility collection at once

- **Scope:** Feature/module design
- **Where:** `src/lib/util/actions.svelte.ts`
- **Problem:** The file has no single abstraction boundary.
- **Evidence:**

  - It constructs every major singleton.
  - `ChangesAction` wraps the provisional-edit protocol.
  - `CloneAction` contains pure geometry, graph copying, clipboard state, command construction, selection changes, and drag startup.
  - `MoveAction` is part of the interaction state machine.
  - `EditorAction` handles area selection, panning, graph properties, connection creation, undo, and rotation.
  - `ModeAction` coordinates simulation lifecycle.
  - `PersistenceAction` coordinates modals, graph replacement, editor reset, and simulation reset.
  - Many operations repeat `executeCommand → applyChanges → notifyAll`.

- **Why it matters:** Almost any feature imports this hub, and the hub imports almost every subsystem. Names such as `EditorAction` do not tell you whether behavior belongs to graph editing, UI transitions, or viewport control.
- **Proposed improvement:** Do not solve this by placing each static class in a different file. Replace the hub with deeper owners:

  - `EditorController`: interaction and editor-mode workflows.
  - `GraphEditor`: graph mutation, transactions, and undo.
  - `Viewport`: coordinate and view-box operations.
  - `ClipboardService`: clipboard state plus pure clone/remap operations.
  - `DocumentController`: load/replace/save lifecycle.
  - A small composition root that constructs them.

- **Expected result:** Dependencies reflect behavior ownership rather than all paths passing through an action registry.
- **Confidence:** High
- **Cost / payoff:** Medium cost, high payoff.

`ChangesAction` is especially revealing: it is a shallow wrapper, but removing it today would expose an important multi-object protocol. The proper fix is to concentrate that protocol behind a real transaction abstraction.

### 14. `+page.svelte` is acting as an editor controller

- **Scope:** Feature/module design
- **Where:** `src/routes/+page.svelte`
- **Problem:** A route component owns application restoration and the most complicated interaction completion logic.
- **Evidence:**

  - It restores session data.
  - It restores settings.
  - It resumes authentication-triggered workflows.
  - It decides onboarding.
  - It tracks global pointer position.
  - Its `onPointerUp` contains separate completion rules for duplicate placement, component placement, wire creation, element clicks, wire-handle clicks, and element dragging.
  - Selection toggling is duplicated for `elementDown` and `wireHandleDown`.

- **Why it matters:** Adding an editor state means modifying the route component. The behavior is difficult to unit-test without mounting the application and synthesizing pointer events.
- **Proposed improvement:** Move restoration into a document/session bootstrap service and pointer completion into `EditorInteractionController.pointerUp`. `+page.svelte` should largely construct/provide an editor session and render the UI.
- **Expected result:** The route becomes composition rather than business logic, and interaction behavior can be tested without Svelte or Playwright.
- **Confidence:** High
- **Cost / payoff:** Medium cost, high payoff.

### 15. The two view models use incompatible state/publication models

- **Scope:** Local structural
- **Where:** `viewModels/viewModel.ts`, `viewModels/canvasViewModel.ts`, `viewModels/editorViewModel.svelte.ts`
- **Problem:** Classes with the same "ViewModel" role expose state in fundamentally different ways.
- **Evidence:**

  - `CanvasViewModel` extends a custom Svelte-store-compatible base and publishes its mutable `_uiState`.
  - `EditorViewModel` does not extend it; it maintains private state plus a cloned `$state` snapshot.
  - Consumers use `$canvasViewModel` but `editorViewModel.uiState`.
  - `EditorUiState` contains a `matches` function, requiring special deep-clone logic on every publication.
  - Settings persistence through `localStorage` is embedded directly in `EditorViewModel`.

- **Why it matters:** Developers must remember which state is authoritative, which is reactive, and whether a mutation requires `notifyAll()`.
- **Proposed improvement:** Use one reactive-store strategy. Keep state as plain data; do not store the `matches` function inside it. Put settings persistence behind a settings repository/subscriber.
- **Expected result:** State updates become predictable and test setup no longer depends on browser storage or cloning conventions.
- **Confidence:** High
- **Cost / payoff:** Low-to-medium cost, medium-to-high payoff.

## Likely correctness problems exposed by the interaction design

These are static findings and should be verified once the JavaScript toolchain is available.

### Stale state during pointer-up

`+page.svelte` captures `uiState` before calling `updatePosition(e)` on pointer-up. `updatePosition` can transition `elementDown` into `draggingElements`, but completion then branches on the stale pre-transition state. A final movement delivered only at pointer-up can consequently be treated as a click and rolled back.

### Unpublished active pointer ID

`EditorViewModel.setActivePointerId` mutates private `_uiState` without publishing. Keyboard-created components and duplicate-drag operations begin with a null pointer ID; `MoveAction` sets the private value, but `+page.svelte` reads the public cloned state. That can prevent pointer-up from matching and committing.

### Test/code drift

Committed unit tests reference `graphManager.setProjectData/getProjectData`, while `GraphManager` currently exposes `setGraphData/getGraphData`. The worktree was clean apart from `skill.md`, so this appears to be genuine test/code drift rather than an uncommitted refactor.

These are examples of the underlying architectural issue: a transition is not atomic, and different participants can observe different snapshots of it.

## Recommended target architecture

```text
+page.svelte
  └─ creates/provides EditorSession

Canvas.svelte
  ├─ renders graph and viewport
  └─ forwards normalized pointer intents

EditorSession
  ├─ InteractionController
  │    └─ owns all active pointer/keyboard interaction state
  ├─ Viewport
  │    └─ owns viewBox and coordinate math
  ├─ GraphEditor
  │    └─ owns mutations, previews, commit/cancel, and undo
  └─ DocumentController
       └─ owns load/save/project replacement
```

A representative interaction state could be:

```ts
type Interaction =
  | { kind: "idle" }
  | {
      kind: "elementPressed";
      pointerId: number;
      target: ElementRef;
      origin: Point;
    }
  | {
      kind: "draggingElements";
      pointerId: number;
      targets: ElementRef[];
      origin: Point;
    }
  | {
      kind: "draggingWire";
      pointerId: number;
      handle: HandleRef;
      origin: Point;
    }
  | {
      kind: "placingElements";
      pointerId: number | null;
      targets: ElementRef[];
    }
  | {
      kind: "panning";
      pointers: PointerSnapshot[];
      originalViewBox: ViewBox;
    }
  | {
      kind: "areaSelecting";
      pointerId: number;
      start: Point;
      current: Point;
    };
```

Editor tool/mode—edit, delete, simulate—can remain separate if it is genuinely orthogonal. `isPanning` should not remain an additional boolean cross-product.

## Recommended refactor sequence

### Editor subsystem extraction

1. Add characterization tests around press/move/up/cancel flows, especially keyboard placement and duplicate-drag.
2. Extract a graph edit transaction and remove provisional-change ownership from `Mover`.
3. Make movement calculation stateless.
4. Centralize pointer-up and cancellation in an interaction controller.
5. Move panning and area selection into that controller while retaining a separate viewport object.
6. Reduce `Canvas.svelte` to rendering plus normalized event forwarding.
7. Reduce `+page.svelte` to bootstrap/composition.
8. Break up `actions.svelte.ts` according to the resulting owners.

This work is justified even before multi-project support: it reduces the number of files and hidden protocols involved in ordinary editor changes. Multi-project support then benefits because an editor session becomes an actual object with a well-defined lifecycle, rather than another condition added to the current global interaction web.

### Broader feature preparation

1. Define the versioned project/circuit format and semantic validator.
2. Establish a canonical netlist IR and typed component semantic registry.
3. Extract the current simulator into a pure interpreter over that IR; preserve behavior with characterization tests.
4. Replace global back-imports with an instantiable `EditorSession`.
5. Centralize atomic document/project opening and switching.
6. Introduce the project persistence model and API.
7. Add the AOT backend behind the same IR and compare it against the interpreter.
8. Simplify remaining UI action/view-model boundaries where project navigation creates concrete pressure.

Avoid beginning with a folder-only reorganization. The highest-value changes establish ownership of interactions, provisional graph edits, documents, topology, sessions, and execution. Those boundaries directly enable both planned features and make subsequent cleanup much safer.
