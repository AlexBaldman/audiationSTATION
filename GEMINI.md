# Gemini Development Guide for AUDIATIONstation

This guide provides instructions for the Gemini agent to effectively assist in the development of the AUDIATIONstation project.

## Project Overview

AUDIATIONstation is a web-based application for ear training, pitch detection, and other audio-related tasks. It is built as a multi-page application using vanilla JavaScript and Vite for tooling. The focus is on low-latency audio processing and a modular, clear architecture without heavy frameworks.

## Tech Stack

-   **Build Tool:** Vite
-   **JavaScript:** Vanilla ES Modules
-   **Styling:** Plain CSS
-   **Code Style:** The existing code follows a modular pattern. New code should adhere to this structure. No formal linter is present, but clarity and consistency are paramount.

## Key Commands

-   `npm install`: To install dependencies.
-   `npm run dev`: To start the Vite development server. The root is the `/html` directory.
-   `npm run build`: To create a production build in the `/dist` directory.
-   `npm run preview`: To preview the production build locally.

## Development Workflow

### Adding a New Page

1.  Create a new HTML file in the `/html` directory (e.g., `new-feature.html`).
2.  Create a corresponding JavaScript entry point in `/js/pages` (e.g., `new-feature.js`).
3.  Link the script in the HTML file: `<script type="module" src="../js/pages/new-feature.js"></script>`.
4.  Vite's configuration in `vite.config.js` will automatically detect and add the new page to the build.

### Adding Reusable Logic

-   Create new JavaScript modules in the `/js/modules` directory.
-   Export functions and classes from these modules.
-   Import them into page-specific scripts in `/js/pages` as needed.

## Agent Directives & Recommendations

-   **Maintain Modularity:** Always separate concerns. Page-specific logic goes in `/js/pages`, while reusable, core functionality belongs in `/js/modules`.
-   **Prioritize Performance:** Given the audio-centric nature of this project, be mindful of performance. Avoid unnecessary computations in audio processing callbacks.
-   **Recommend Tooling:** The project currently lacks automated testing and linting. Propose the addition of `vitest` for testing and `eslint` for code quality when appropriate.
-   **Commit Messages:** When asked to commit, follow a conventional commit style if no other style is apparent from the git history.
-   **Debugging `npm run dev`:** If the `npm run dev` command hangs, the most likely cause is a zombie Vite process. Use `lsof -i :5173` to find the PID and `kill <PID>` to terminate it before retrying.
