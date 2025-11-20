import { AppInitializer } from '../modules/AppInitializer.js';
import { Navigation } from '../modules/Navigation.js';
import { NoteDetection } from '../modules/NoteDetection.js';

document.addEventListener('DOMContentLoaded', () => {
    const appInitializer = new AppInitializer();
    appInitializer.init();

    new Navigation();
    new NoteDetection();
});
