# Sonic Geometry Integration Guide

## 1. Context & Inspiration
- Draw from the *Sonic Geometry* documentaries (I & II) where frequency, geometry, and color map onto sacred ratios (432Hz, Platonic solids, Flower of Life).
- Core principle: pitch classes relate to polygonal symmetry; color harmonies follow complementary ratios; rhythm/pattern loops can mirror geometric tiling.

## 2. Design Pillars
1. **Frequency → Polygon Mapping**
   - Map note intervals to polygons (e.g., perfect fifth ➜ pentagon, major third ➜ triangle) for visualizers.
   - Display chord qualities as layered shapes whose angles change with inversion quality.
2. **Color Harmonies**
   - Use golden ratio (1.618) or triadic palettes for chord highlights.
   - Diverging color gradients for sharp/flat deviations (e.g., green center, magenta for +50¢, indigo for -50¢).
3. **Sacred Ratios Timeline**
   - Sequence builders (Beatbox) align grid divisions to 3:2, 4:3, 5:4 subdivisions to encourage polyrhythms.
4. **Chromatic Geometry HUD**
   - Add overlay panel showing current note as radial spoke in 12-gon; highlight major/minor triads as triangles.

## 3. Feature Concepts
### Note Detection Lab
- Replace current LED indicators with a “Geometry Scope”: each detected note draws a triangle from center; intervals stack to create evolving mandalas.
- Chord detection animates Platonic solid nets; e.g., major triad ➜ tetrahedron overlay.
- **Status:** Geometry Scope v1 now ships in note-detection UI (canvas + module). It draws radial grids, note vectors, and chord polygons. Next iteration: alpha trails for velocity + WASM-based smoothing.

### Pitch Training
- Display player's pitch as a moving point along a torus ring; distance from target note is height offset, color-coded.
- Gamify accuracy with shape-matching mini challenges (match the “triangle” by holding perfect third for a duration).
- **Status:** UX shows cent deviation guidance, volume meter, streak/accuracy stats, and coaching copy. Consider layering torus/mandala overlay once Three.js perf budget confirmed.

### Beatbox Sequencer
- Introduce “Sacred Grid” mode: step lengths follow Fibonacci (1/1/2/3/5/8) or 3-4-5 polyrhythm templates.
- Visualize active steps as rotating polygons; using color saturation for velocity.
- **Status:** Sacred Grid sequencer is live with Default/Fibonacci/Trinity/Golden patterns, keyboard-to-grid capture, playhead glow, and state persistence. Next frontier: on-canvas geometry overlay + ability to morph ratios in real time.

## 4. Implementation roadmap
1. ✅ **Geometry Palette** – integrated directly into `main.css`; consider extracting into dedicated file when additional scenes are added.
2. ✅ **Canvas/Radar Component** – `GeometryScope.js` renders 12-gon, note vectors, chord polygons, and queues RAF for animation.
3. ✅ **Rhythm Engine Enhancements** – Beatbox Sacred Grid features ratio-based templates + persisted state.
4. ⏳ **Doc & UX Updates** – add inline tooltips + landing-page highlights for Geometry Scope + Sacred Grid (in progress).
5. 🔜 **Holographic Visuals** – tie Pitch Training guidance into torus/mandala view + Beatbox canvas overlay.

## 5. Resources
- Sonic Geometry I & II documentaries (YouTube/Vimeo)
- Cymatics references: Dr. Hans Jenny, Chladni figures
- Sacred geometry texts (Flower of Life, Platonic solids) for shape definitions
- Color theory: Johannes Itten’s color contrasts, mapping to intervals

Use this guide as a brainstorming seed. Implement gradually, measuring performance to keep latency low while adding rich audiovisual feedback.
