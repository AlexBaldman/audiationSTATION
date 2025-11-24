# AUDIATIONstation 🚀

A comprehensive web-based music production and ear training application with a focus on low-latency audio processing and modern UI/UX design. This project explores the practical limits of browser audio APIs while providing an intuitive, mobile-first interface for musicians and audio enthusiasts.

---

### Core Tenets

1.  **Minimize Latency.** The speed of light is a hard limit. The browser's event loop is a soft one. We will fight the soft one. Every millisecond matters.
2.  **Code is Liability.** Write less of it. The architecture is intentionally simple: static HTML files, vanilla JavaScript modules, and a single CSS file. No frameworks. The problem domain is audio processing, not DOM manipulation.
3.  **Modern UI/UX.** Beautiful, responsive design with mobile-first approach, light/dark themes, and intuitive navigation.
4.  **Ship It.** A functional experiment is better than a perfect plan. The features here are probes into different aspects of the Web Audio API.

---

### Implemented Features 🧪

The `html` directory contains the current set of experiments with a redesigned, mobile-first interface:

*   **`index.html`**: Beautiful home page with hero section, feature highlights, and comprehensive overview
*   **`note-detection.html`**: Real-time pitch detection using `AnalyserNode` with geometry scope visuals
*   **`pitch-training.html`**: Home of the **Pitch Arcade** with gamified learning modes and visual feedback
*   **`ear-training.html`**: Comprehensive ear training exercises with detailed descriptions
*   **`beatbox.html`**: Sacred Grid sequencer with enhanced drum machine and vocal recording
*   **`recorder.html`**: Audio capture via `MediaRecorder` with modern interface
*   **`features.html`**: Detailed feature showcase with specifications and capabilities
*   **`about.html`**: Project mission, technology stack, and vision

#### UI/UX Enhancements ✨

- **Mobile-First Design**: Responsive layout optimized for all screen sizes
- **Light/Dark Theme Toggle**: Smooth transitions with localStorage persistence
- **Hamburger Navigation**: Slide-down menu for mobile devices
- **Retro-Bright Aesthetic**: Vibrant color scheme with thoughtful contrasts
- **Micro-interactions**: Hover effects, animations, and visual feedback throughout
- **Accessibility**: Semantic HTML, ARIA labels, and keyboard navigation support

---

### Setup

Prerequisites: `node` and `npm`.

1.  **Clone the repository.**
    ```bash
    git clone https://github.com/AlexBaldman/audiationSTATION.git
    cd audiationSTATION
    ```
2.  **Install dependencies.**
    ```bash
    npm install
    ```
3.  **Run the dev server.**
    ```bash
    npm run dev
    ```
   The server will be available at `http://localhost:5173`. The console will provide the exact URL.

4.  **Test + Deploy**
    ```bash
    npm run test   # Vitest coverage (PitchTraining, Beatbox, Gamified engine, etc.)
    npm run deploy # Runs tests, builds with Vite, publishes to gh-pages
    ```
   The project deploys to GitHub Pages at `https://alexbaldman.github.io/audiationSTATION/`. Vite's `base` is configured accordingly.

---

### Project Structure

```
html/             # Multi-page entry points (loaded by Vite)
js/pages/         # Page bootstrap scripts (DOM wiring only)
js/modules/       # Shared logic (GamifiedPitchEngine, PitchTraining, NoteDetection, etc.)
css/main.css      # Global styling with mobile-first responsive design
docs/             # Developer & concept docs (GAMIFIED_PITCH_ENGINE, SONIC_GEOMETRY)
tests/            # Vitest suites for core modules
```

---

### A Note on Architecture

The system is built on [Vite](https://vitejs.dev/). It serves the static files in the `html` directory. The JavaScript is organized into two folders:

*   `js/pages`: Entry points for each HTML file. Page-specific logic lives here.
*   `js/modules`: Reusable code. The core audio logic (`NoteDetection.js`, `PitchTraining.js`, etc.) is here. This is where the interesting work happens.

This separation avoids monolithic scripts and the complexity of a full-blown SPA framework. It is sufficient for the task.

---

### The Unavoidable Problem of Latency

Web audio is a constant battle against latency. The primary sources are:

1.  **Hardware Buffer Size:** System-dependent. We can't control it, but we must be aware of it.
2.  **JavaScript Event Loop:** `setTimeout` and `setInterval` are not precise. For audio scheduling, always defer to `AudioContext.currentTime`.
3.  **Garbage Collection:** A GC pause during an audio callback is a dropped frame. Keep memory allocation in the audio processing loop to an absolute minimum.

The code in `js/modules` attempts to mitigate these issues where possible. It is an ongoing effort.

---

### Future Work

The backlog is a set of questions and provocations, not a list of features.

-   **The Dojo: A Unified Training Ground**
    -   `[ ]` **Dynamic Exercise Generation:** Can we build an algorithm that generates daily exercises based on a user's performance data?
    -   `[ ]` **"Sparring" Mode:** A real-time call-and-response game. How low can we get the latency?
    -   `[ ]` **"Meditation" Mode:** A free-play mode with real-time harmonic analysis. Can we provide meaningful feedback without being prescriptive?

-   **The Forge: A Beat-Making Playground**
    -   `[ ]` **Polyrhythm & Euclidean Sequencers:** Move beyond the 4/4 grid.
    -   `[ ]` **"Sample Alchemy":** User-provided samples in the sequencer. What are the performance implications?

-   **The Oracle: Advanced Ear Training**
    -   `[ ]` **Chord Progression & Timbre Training:** Can we teach the *structure* and *texture* of sound, not just the pitch?

Contributions that attempt to answer these questions are welcome. Submit a pull request. Keep it clean. Clean code is a force multiplier. 🧼
