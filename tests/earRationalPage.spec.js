import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

vi.mock('../js/modules/Navigation.js', () => ({ Navigation: class {} }));
const html = readFileSync('html/ear-training.html', 'utf8');

beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    localStorage.clear();
    document.documentElement.innerHTML = html;
    window.AudioContext = class {
        constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
        createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start() {}, stop() {} }; }
        createGain() { return { connect() {}, disconnect() {}, gain: {
            setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}
        } }; }
    };
});
afterEach(() => { vi.useRealTimers(); });

async function listen() {
    document.getElementById('play-exercise').click();
    await vi.advanceTimersByTimeAsync(6000);
}

describe('Ear Rational practice page', () => {
    it('requires listening, accepts one response and keeps feedback until Next', async () => {
        await import('../js/pages/ear-training.js');
        const first = document.querySelector('#answer-choices button');
        expect(first.disabled).toBe(true);
        await listen();
        expect(first.disabled).toBe(false);
        first.click();
        expect(document.getElementById('score-display').textContent).toMatch(/^[01]\/1$/);
        expect(first.disabled).toBe(true);
        await listen();
        expect(first.disabled).toBe(true);
        document.getElementById('new-exercise').click();
        expect(document.querySelector('#answer-choices button').disabled).toBe(true);
        expect(document.getElementById('score-display').textContent).toMatch(/^[01]\/1$/);
    });

    it('hides chord answers and enables melody dictation after playback', async () => {
        await import('../js/pages/ear-training.js');
        document.querySelector('[data-type="chord"]').click();
        expect(document.getElementById('exercise-info').textContent).toBe('Listen to the chord. Which quality do you hear?');
        expect(document.querySelectorAll('#answer-choices button').length).toBe(2);
        document.querySelector('[data-type="melody"]').click();
        await listen();
        expect(document.getElementById('answer-input').disabled).toBe(false);
        expect(document.getElementById('answer-input').parentElement.hidden).toBe(false);
        expect(document.getElementById('exercise-info').textContent).toContain('scale degrees');
    });

    it('does not enable answers from a stale playback after changing mode', async () => {
        await import('../js/pages/ear-training.js');
        document.getElementById('play-exercise').click();
        document.querySelector('[data-type="chord"]').click();
        await vi.advanceTimersByTimeAsync(6000);
        expect(document.querySelector('#answer-choices button').disabled).toBe(true);
    });
});
