import { GamifiedPitchEngine } from './GamifiedPitchEngine.js';
import { createGatekeeperSceneDefinition } from './scenes/GatekeeperScene.js';

export function createPitchArcade(canvas, options = {}) {
    const engine = new GamifiedPitchEngine(canvas, options);
    const scenes = [
        createGatekeeperSceneDefinition(),
    ];
    for (const scene of scenes) {
        engine.registerScene(scene);
    }
    return engine;
}
