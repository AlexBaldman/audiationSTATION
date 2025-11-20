import { AppInitializer } from '../modules/AppInitializer.js';
import { Navigation } from '../modules/Navigation.js';

document.addEventListener('DOMContentLoaded', () => {
    const appInitializer = new AppInitializer();
    appInitializer.init();

    new Navigation();
});
