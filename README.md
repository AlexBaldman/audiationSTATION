# AUDIATIONstation 🚀

This is a focused exploration into the practical limits of browser audio APIs. It's a testbed for low-latency audio processing, not a consumer product. The goal is to validate what is possible on the modern web platform with minimal framework overhead.

---

### Core Tenets

1.  **Minimize Latency.** The speed of light is a hard limit. The browser's event loop is a soft one. We will fight the soft one. Every millisecond matters.
2.  **Code is Liability.** Write less of it. The architecture is intentionally simple: static HTML files, vanilla JavaScript modules, and a single CSS file. No frameworks. The problem domain is audio processing, not DOM manipulation.
3.  **Ship It.** A functional experiment is better than a perfect plan. The features here are probes into different aspects of the Web Audio API.

---

### Implemented Features 🧪

The `html` directory contains the current set of experiments. They are largely independent.

*   **`note-detection.html`**: Real-time pitch detection using `AnalyserNode`. The core challenge is balancing FFT window size for frequency resolution vs. temporal accuracy.
*   **`pitch-training.html`**: A gamified interface for pitch matching. A simple feedback loop for the note detection logic.
*   **`ear-training.html`**: Basic note identification game.
*   **`beatbox.html`**: A rudimentary sequencer. Explores timing and scheduling with `AudioContext.currentTime`.
*   **`recorder.html`**: Audio capture via `MediaRecorder`. Simple, but it works.

---

### Setup

Prerequisites: `node` and `npm`.

1.  **Clone the repository.**
    ```bash
    git clone https://github.com/yourusername/AUDIATIONstation.git
    cd AUDIATIONstation
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
