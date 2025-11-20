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

### Pitch Training
- Display player's pitch as a moving point along a torus ring; distance from target note is height offset, color-coded.
- Gamify accuracy with shape-matching mini challenges (match the “triangle” by holding perfect third for a duration).

### Beatbox Sequencer
- Introduce “Sacred Grid” mode: step lengths follow Fibonacci (1/1/2/3/5/8) or 3-4-5 polyrhythm templates.
- Visualize active steps as rotating polygons; using color saturation for velocity.

## 4. Implementation roadmap
1. **Shared Geometry Palette** – Create `/css/geometry.css` with CSS custom properties for sacred hues, gradients.
2. **Canvas/Radar Component** – Build reusable `GeometryScope.js` module that accepts note/chord events and maps them to shapes.
3. **Rhythm Engine Enhancements** – Extend `BeatboxMode` with pattern templates referencing ratio arrays.
4. **Doc & UX Updates** – Add user-facing guide in README + in-app “Sonic Geometry” info tooltip explaining representations.

## 5. Resources
- Sonic Geometry I & II documentaries (YouTube/Vimeo)
- Cymatics references: Dr. Hans Jenny, Chladni figures
- Sacred geometry texts (Flower of Life, Platonic solids) for shape definitions
- Color theory: Johannes Itten’s color contrasts, mapping to intervals

Use this guide as a brainstorming seed. Implement gradually, measuring performance to keep latency low while adding rich audiovisual feedback.
