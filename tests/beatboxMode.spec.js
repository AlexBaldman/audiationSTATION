import { describe, it, beforeEach, vi, expect } from 'vitest';
import { BeatboxMode } from '../js/modules/BeatboxMode.js';

describe('BeatboxMode', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="beatbox-layout">
                <div class="beatbox-container">
                    <div class="beatbox-pad" data-sound="kick"></div>
                    <div class="beatbox-pad" data-sound="snare"></div>
                    <div class="beatbox-pad" data-sound="hihat"></div>
                    <div class="beatbox-pad" data-sound="cymbal"></div>
                </div>
                <button id="beatbox-start"></button>
                <button id="beatbox-stop"></button>
                <input id="beatbox-tempo" value="108" />
                <span id="beatbox-tempo-value"></span>
                <select id="beatbox-pattern"></select>
                <div id="beatbox-grid-steps"></div>
                <p id="beatbox-grid-info"></p>
            </div>`;

        window.AudioContext = class {
            createGain() { return { connect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }; }
            createOscillator() { return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { setValueAtTime: vi.fn() } }; }
            createBiquadFilter() { return { connect: vi.fn() }; }
            createBuffer() { return { getChannelData: vi.fn(() => new Float32Array(10)) }; }
            createBufferSource() { return { connect: vi.fn(), start: vi.fn(), buffer: null }; }
            destination = {};
        };

        global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    });

    it('builds grid and toggles steps', () => {
        const mode = new BeatboxMode();
        const stepButton = mode.gridContainer.querySelector('.grid-step[data-row="kick"][data-step="1"]');
        stepButton.click();
        expect(stepButton.classList.contains('active')).toBe(true);
    });

    it('persists state to localStorage', () => {
        const setItem = vi.spyOn(window.localStorage.__proto__, 'setItem');
        const mode = new BeatboxMode();
        mode.toggleGridStep('kick', 0, true);
        expect(setItem).toHaveBeenCalled();
        setItem.mockRestore();
    });
});
