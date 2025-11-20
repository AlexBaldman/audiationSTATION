import { AppInitializer } from '../modules/AppInitializer.js';
import { Navigation } from '../modules/Navigation.js';
import { BeatboxMode } from '../modules/BeatboxMode.js';

document.addEventListener('DOMContentLoaded', () => {
    const appInitializer = new AppInitializer();
    appInitializer.init();

    new Navigation();
    new BeatboxMode();
});
