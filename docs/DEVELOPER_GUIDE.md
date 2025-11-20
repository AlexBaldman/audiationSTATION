# AUDIATIONstation: Developer Guide

## 1. Introduction

Welcome to the AUDIATIONstation developer guide. This document provides a technical overview of the project's architecture, code structure, and development workflow.

The primary goal of this project is to create a suite of reliable, low-latency, browser-based audio tools. It is built with vanilla JavaScript (ES Modules) and uses Vite for development tooling and bundling. The architectural philosophy emphasizes simplicity, modularity, and performance over reliance on heavy frameworks.

## 2. Project Structure

The repository is organized to separate concerns clearly between markup, styling, and logic.

```
/
├── html/               # All HTML entry points for the application.
├── css/                # Global and component-specific stylesheets.
│   └── main.css        # The primary stylesheet.
├── js/                 # All JavaScript source code.
│   ├── modules/        # Reusable, core logic (e.g., audio processing).
│   └── pages/          # Page-specific entry points and UI logic.
├── assets/             # Static assets like images and project documents.
├── docs/               # Developer-facing documentation (you are here).
├── dist/               # (Generated) Production build output.
├── node_modules/       # (Generated) Project dependencies.
├── package.json        # Project metadata and scripts.
├── vite.config.js      # Vite build and development configuration.
└── README.md           # The main project README.
```

## 3. Core Modules Deep Dive

The most critical code resides in the `js/modules/` directory. These modules are designed to be reusable and self-contained.

### `AppInitializer.js`

-   **Purpose:** Handles the common initialization logic required for most pages, such as setting up navigation and requesting microphone permissions.
-   **Usage:** Imported and executed in most scripts within the `js/pages/` directory.

### `NoteDetection.js`

-   **Purpose:** Contains the core logic for real-time pitch detection. It encapsulates the Web Audio API's `AnalyserNode` and the FFT algorithm to determine the fundamental frequency from a microphone input stream.
-   **Key Functions:** `start()`, `stop()`, `getNote()`.
-   **Notes:** This is a performance-critical module. Any changes should be benchmarked to avoid introducing latency or garbage collection pauses.

### `PitchTraining.js`

-   **Purpose:** Implements the logic for the pitch training game. It utilizes `NoteDetection.js` to compare the user's input with a target note and calculates a score based on accuracy.
-   **Architecture:** Functions as a state machine, managing the game's state (e.g., waiting, listening, showing feedback).

### `AudioRecorder.js`

-   **Purpose:** A wrapper around the `MediaRecorder` API. It provides a simple interface to record, stop, and play back audio, as well as download the recording.
-   **Key Functions:** `startRecording()`, `stopRecording()`, `getPlaybackElement()`.

### `BeatboxMode.js`

-   **Purpose:** Manages the sequencer and audio scheduling for the beatbox feature. It uses the `AudioContext`'s internal clock (`currentTime`) for precise scheduling of drum samples.
-   **Notes:** This module demonstrates the correct way to handle timing for rhythmic applications in the browser.

## 4. Development Workflow

### Adding a New Page

1.  **Create the HTML File:** Add a new file to the `html/` directory (e.g., `html/new-tool.html`).
2.  **Create the JS Entry Point:** Add a corresponding JavaScript file in `js/pages/` (e.g., `js/pages/new-tool.js`).
3.  **Link the Script:** In your new HTML file, add a script tag to load the entry point:
    ```html
    <script type="module" src="../js/pages/new-tool.js"></script>
    ```
4.  **Develop:** Run `npm run dev`. The `vite.config.js` is configured to automatically detect and serve the new page. No manual configuration is needed.

### Modifying Core Logic

-   If the logic is reusable and not tied to a specific page's UI, it should be added to or modified within a module in `js/modules/`.
-   Ensure that any new module is well-documented and exports a clear, intentional API.

## 5. Build Process

The project uses **Vite** to handle the development server and the production build process.

-   **Development (`npm run dev`):** Starts a local dev server with Hot Module Replacement (HMR). The server root is the `html/` directory.
-   **Production (`npm run build`):** Bundles and minifies all assets for production. The output is placed in the `dist/` directory. The `vite.config.js` file automatically finds all HTML files and configures them as Rollup inputs, ensuring a complete build for the multi-page setup.

## 6. Coding Conventions

-   **Modularity:** Use ES Modules (`import`/`export`) for all JavaScript files.
-   **Naming:**
    -   JavaScript classes and modules with a primary class: `PascalCase.js` (e.g., `NoteDetection.js`).
    -   Functions and variables: `camelCase`.
    -   CSS classes: `kebab-case`.
-   **Asynchronicity:** Use `async/await` for handling promises, especially for microphone access and other browser APIs.
-   **DOM Manipulation:** Keep DOM manipulation logic within the `js/pages/` scripts. Core modules in `js/modules/` should ideally not have direct knowledge of the DOM.
## 7. Development Roadmap

This roadmap outlines the planned features and technical challenges for future development.

### Q1: The Dojo - Unified Training Ground

-   **Objective:** Create a central hub for adaptive, personalized music training.
-   **Tasks:**
    -   `[ ]` Design and implement the Dojo UI.
    -   `[ ]` Develop a dynamic exercise generation algorithm that analyzes user performance data (e.g., pitch accuracy, interval recognition speed) to create tailored practice sessions.
    -   `[ ]` Build the "Sparring" mode: a low-latency, call-and-response audio game.
    -   `[ ]` Implement the "Meditation" mode's real-time harmonic analysis engine. This will likely involve creating a new module for music theory calculations.

### Q2: The Forge - Advanced Beat-Making

-   **Objective:** Evolve the beatbox into a more powerful and creative rhythm tool.
-   **Tasks:**
    -   `[ ]` Implement a Polyrhythm Mode, allowing for the creation of beats with multiple simultaneous time signatures.
    -   `[ ]` Add a Euclidean sequencing option for generating complex and organic rhythms.
    -   `[ ]` Develop the "Sample Alchemy" feature:
        -   `[ ]` Implement audio recording and slicing for user-created samples.
        -   `[ ]` Build a simple sample mapping interface.
        -   `[ ]` Investigate the performance implications of using user-provided samples in the audio engine.

### Q3: The Oracle - Advanced Ear Training

-   **Objective:** Expand the ear training module to cover more advanced music theory concepts.
-   **Tasks:**
    -   `[ ]` Create a chord progression generation and recognition engine.
    -   `[ ]` Build the "Interval Sprints" game, focusing on rapid-fire recognition.
    -   `[ ]` Implement the "Timbre Training" module, which will require a library of diverse instrument sounds.

### Ongoing Technical Challenges

-   **Latency Reduction:** Continuously profile and optimize the audio processing pipeline to minimize latency.
-   **Cross-Browser Compatibility:** Ensure all features work reliably across the latest versions of major browsers.
-   **Performance on Mobile:** Optimize for performance on lower-powered mobile devices.
