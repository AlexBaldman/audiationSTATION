import { AppInitializer } from '../modules/AppInitializer.js';
import { Navigation } from '../modules/Navigation.js';
import { PitchTraining } from '../modules/PitchTraining.js';

document.addEventListener('DOMContentLoaded', () => {
    const appInitializer = new AppInitializer();
    appInitializer.init();

    new Navigation();
    new PitchTraining();
});
