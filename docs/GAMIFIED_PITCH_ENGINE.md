# Gamified Pitch Engine Architecture

## Design Goals
1. **Zero Regression**: The existing Pitch Training game continues to run even if the arcade is disabled or fails. The engine attaches as an *optional* sidecar.
2. **Single Runtime Loop**: One requestAnimationFrame loop that normalizes all pitch data and fan-outs to scenes. No scene should create its own global loop.
3. **True Modularity**: Every visualization lives in its own module implementing a shared `PitchScene` contract. Scenes can be swapped at runtime without tearing down audio capture.
4. **Deterministic Feel**: Provide timing, easing, RNG, color palettes, and audio-derived signals from the engine so scenes render consistent experiences regardless of hardware.
5. **Extensible Telemetry**: Scenes can emit structured events ("gatePassed", "comboBroken", etc.) so downstream UI/analytics layers can react without knowing scene internals.

## Core Concepts
- **GamifiedPitchEngine**: Orchestrates pitch updates, smoothing, scoring signals, and a single RAF render loop. Owns canvas + 2D context.
- **PitchScene** interface: Minimal lifecycle contract so any visualization (Gatekeeper, Skater, Skyline) can plug in.
- **SceneContext**: Bag of shared utilities (palette, easing helpers, seeded RNG, asset cache, cross-scene store, event dispatcher).
- **FrameState**: Snapshot of normalized inputs for the current frame (pitch error, confidence, streaks, timers, bpm clock).
- **SceneRegistry**: Plain map of `{ id: () => new SceneClass() }` so UI dropdowns can populate from the registry.

## Module Layout
```
js/modules/gamified/
  GamifiedPitchEngine.js       // entry point consumed by PitchTraining
  scenes/
    GatekeeperScene.js        // first implementation
    /* future scenes */
  helpers/
    rng.js, easing.js, palettes.js (optional extraction)
```

## Engine Responsibilities
1. **Initialization**
   - Accept `canvas`, `eventTarget`, and optional config (palette, smoothing constants).
   - Build `SceneContext` once and reuse between scene switches.

2. **Pitch Intake**
   - `updatePitch({ frequency, cents, onTarget, rms, timestamp })` called by `PitchTraining` immediately after each FFT analysis.
   - Engine stores latest metrics and computes:
     - `normalizedError` ∈ [-1, 1] (sign indicates sharp/flat relative to target).
     - `accuracyWindow` boolean for ±10¢ lock.
     - `streakTime` (ms holding accuracy window).
     - Smoothed `gateHeight` ∈ [0, 1] derived from cents offset and easing curve.

3. **Animation Loop**
   - A single RAF tick builds `FrameState`:
     ```ts
     {
       time: performance.now(),
       delta: now - prev,
       normalizedError,
       gateHeight,
       streakLevel,
       confidence: clamp(rms * gain),
       onTarget: accuracyWindow,
       bpmPhase: (now * tempoScalar) % 1,
     }
     ```
   - Calls `activeScene.update(frameState, sceneContext)` then `activeScene.render(ctx, frameState, sceneContext)`.

4. **Scene Lifecycle**
   - `loadScene(sceneId)` destroys current scene (`dispose`) and instantiates the new one with the shared context.
   - Scenes may request assets (images/audio buffers) through `context.getAsset(key, loaderFn)` for lazy-loading.
   - Scene-specific storage via `context.createStore(sceneId)` returning a persistent Map keyed by scene id.

5. **Event Bus**
   - Engine exposes `addEventListener('scene-event', handler)` so PitchTraining UI can respond without tight coupling.
   - Scenes fire `context.emit('gatePassed', payload)` etc. Engine re-emits via DOM-style `CustomEvent`.

## PitchScene Interface
```ts
export class GatekeeperScene {
  id = 'gatekeeper';
  name = 'Gatekeeper';

  init(context) {}
  update(frame, context) {}
  render(ctx, frame, context) {}
  dispose() {}
}
```
Required lifecycle semantics:
- `init(context)` runs once per activation. Acquire references, reset stores.
- `update(frame, context)` is pure logic: move entities, compute collisions, schedule events via `context.emit`.
- `render(ctx, frame)` performs drawing only. Canvas cleared by the engine beforehand.
- `dispose()` releases timers, listeners, or cached assets unique to the scene.

## SceneContext Contract
```ts
{
  canvas, ctx,
  palette: {
    background: '#05030a',
    primary: '#5cf2ff',
    accent: '#f6c177',
  },
  rng(seed?),
  ease: {
    smoothstep,
    elasticOut,
  },
  store: Map,           // shared per scene
  getAsset(key, loaderFn),
  emit(eventName, detail),
}
```
- `rng(seed)` returns deterministic pseudo-random generator so visuals stay stable per session.
- `getAsset` caches loader promises, ensuring sprites/audio instantiate once.
- `emit` funnels to engine’s event dispatcher.

## FrameState Fields
| Field | Range | Description |
| --- | --- | --- |
| `time` | ms | `performance.now()` snapshot. |
| `delta` | ms | Time since last frame. |
| `normalizedError` | -1 .. 1 | Sharp (+) or flat (-) normalized to ±50¢. |
| `gateHeight` | 0 .. 1 | Smoothed pitch position used by gate scenes. |
| `confidence` | 0 .. 1 | Derived from RMS + autocorrelation quality. |
| `streakLevel` | integer | Count of consecutive accurate hits. |
| `onTarget` | boolean | `true` inside ±10¢. |
| `bpmPhase` | 0 .. 1 | Useful for rhythmic cues / camera bob. |
| `notesHit` | integer | Total locked gates since session start. |

## Data Flow with PitchTraining
1. `PitchTraining.detectPitchLoop` already calculates `frequency`, `cents`, `onTarget`, `rms`.
2. After updating the UI meter, call `pitchEngine.updatePitch({...})`.
3. Engine handles animation regardless of PitchTraining start/stop buttons. When training stops, call `pitchEngine.pause()` to freeze visuals (and `resume()` when restarted). Canvas remains hidden if user chooses “Disable”.
4. Mode select dropdown simply calls `pitchEngine.loadScene(sceneId)` or `pitchEngine.disable()`.

## Gatekeeper Scene Outline
- World: Endless horizontal tunnel, gates slide L→R at constant speed.
- Player orb height follows `gateHeight` via additional smoothing to feel weighty.
- Gates: Each has `openStart` + `openEnd` (0..1). Derived from upcoming target note (for future multi-note support). For v1, align single target per gate.
- Collision: When gate center crosses `0.5` x-position, check if orb overlaps opening ±tolerance. Emit `gatePassed` or `gateMissed`.
- Visual polish: streak-based color shifts, particle sparks for misses, subtle camera shake tied to `normalizedError`.

## Extensibility Hooks
1. **Scene Metadata**: Registry exposes `{ id, name, description, difficulty }` for UI menus.
2. **Achievements**: Engine listens to `scene-event`s and can update badges (e.g., 5 perfect gates ⇒ `emit('achievement', {...})`).
3. **Persistence**: `sceneContext.store` can sync with `localStorage` to remember cosmetics or unlocked scenes.
4. **Testing**: Engine exports pure helpers (`normalizeCents`, `createFrameState`) to enable Vitest coverage without canvas mocks.

## Next Steps
1. Implement `GamifiedPitchEngine.js` with RAF loop, registry, event bus, and public API (`updatePitch`, `loadScene`, `start`, `stop`, `setMode`).
2. Build `GatekeeperScene.js` using only engine-provided data. Focus on deterministic geometry + simple collision to start.
3. Wire engine into `PitchTraining` start/stop cycle and hook up the mode dropdown + canvas visibility toggle.

## Implementation Roadmap

### Phase 1 – Engine Foundation (PR 1)
1. **Scaffolding**: Create `js/modules/gamified/` directory structure and stub exports so imports do not throw even before full implementation.
2. **Public API contract**: Define TypeScript-style JSDoc typedefs for `FrameState`, `SceneContext`, and `PitchScene` within the engine file to document expectations for future scenes.
3. **Event bus + registry**: Implement lightweight dispatcher (`EventTarget` wrapper) and scene registry, along with unit tests verifying add/remove + event propagation.
4. **Pitch normalization helpers**: Extract pure functions (`normalizeCents`, `computeGateHeight`, smoothing filters) with Vitest coverage to guarantee deterministic math before wiring into canvas.

### Phase 2 – Gatekeeper Scene (PR 2)
1. **Scene state machine**: Implement GatekeeperScene update loop using dependency injection from `SceneContext` only (no direct DOM access).
2. **Collision + scoring logic**: Unit-testable helper that determines pass/fail based on orb vs gate window to avoid flakiness in canvas renders.
3. **Visual polish pass**: Add palette-driven gradients, streak glow, and miss particles while keeping RAF within 16ms budget on mid-tier laptops.

### Phase 3 – Integration & UI Toggle (PR 3)
1. **PitchTraining bridge**: Call `pitchEngine.updatePitch` inside `detectPitchLoop`, ensuring graceful fallback when engine disabled.
2. **Mode select wiring**: Hook dropdown to `pitchEngine.setMode(sceneId)` and persist preference (localStorage) so advanced users keep arcade enabled.
3. **Lifecycle hooks**: Tie engine `start/pause/dispose` into PitchTraining start/stop buttons and global visibility events.

### Phase 4 – QA + Docs (PR 4)
1. **Canvas regression tests**: Snapshot-less behavioral tests verifying Gatekeeper emits the right scene events when fed scripted pitch sequences.
2. **Manual playbook**: Add checklist to `DEVELOPER_GUIDE.md` describing how to enable arcade, verify gate passes, and inspect scene events in DevTools.
3. **Telemetry stubs**: Document how future analytics modules can subscribe to `scene-event` for achievements without modifying scenes.

> **Milestone gating**: Each phase lands on `main` independently, keeping existing PitchTraining UX untouched until full feature is green-lit.
