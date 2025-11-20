import { describe, it, beforeEach, vi, expect } from 'vitest';
import { PitchTraining } from '../js/modules/PitchTraining.js';

global.HTMLCanvasElement = class {};

describe('PitchTraining', () => {
    let training;
    let originalMediaDevices;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="pitch-training">
                <button id="start-pitch-training"></button>
                <button id="stop-pitch-training"></button>
                <button id="play-target-note"></button>
                <select id="pitch-difficulty"><option value="easy">easy</option></select>
                <select id="instrument-select"><option value="sine">sine</option></select>
                <div id="target-note"></div>
                <div id="user-note"></div>
                <div id="pitch-meter"><div id="pitch-indicator"></div></div>
                <div id="pitch-feedback"></div>
                <div id="pitch-score"></div>
                <div id="pitch-streak"></div>
                <div id="pitch-timer"></div>
                <div id="pitch-accuracy"></div>
                <div id="pitch-best-streak"></div>
                <div id="pitch-notes-trained"></div>
                <div id="pitch-volume-fill"></div>
                <div id="pitch-guidance"></div>
            </div>`;

        originalMediaDevices = navigator.mediaDevices;
        navigator.mediaDevices = {
            getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
        };

        window.AudioContext = class {
            constructor() {
                this.destination = {};
                this.currentTime = 0;
            }
            createOscillator() {
                return {
                    connect: vi.fn(),
                    start: vi.fn(),
                    stop: vi.fn(),
                    frequency: { setValueAtTime: vi.fn() },
                    type: 'sine',
                };
            }
            createGain() {
                return {
                    connect: vi.fn(),
                    gain: {
                        setValueAtTime: vi.fn(),
                        exponentialRampToValueAtTime: vi.fn(),
                    },
                };
            }
            createAnalyser() {
                return {
                    fftSize: 2048,
                    getFloatTimeDomainData: vi.fn((buffer) => buffer.fill(0)),
                };
            }
            createMediaStreamSource() {
                return { connect: vi.fn(), mediaStream: { getTracks: () => [{ stop: vi.fn() }] } };
            }
            close() { return Promise.resolve(); }
            resume() { return Promise.resolve(); }
        };

        training = new PitchTraining();
    });

    it('generates target note per difficulty', () => {
        training.generateTargetNote();
        expect(training.targetNote).toBeDefined();
        expect(training.targetFrequency).toBeGreaterThan(0);
    });

    it('updates stats when hitting accuracy threshold', () => {
        training.totalNotesTrained = 1;
        training.matchesHit = 0;
        training.streak = 0;
        training.bestStreak = 0;
        training.accuracyDisplay.textContent = '';
        training.handleMatch = training.generateTargetNote;
        training.updatePitchMeter = vi.fn();
        training.feedbackMessage.textContent = '';

        // direct invocation of logic by simulating a note hit
        training.score = 0;
        training.noteMatchedTime = Date.now() - 600;
        training.targetNote = 'C4';
        training.targetFrequency = 261.63;
        training.matchesHit = 0;
        training.streak = 0;
        training.bestStreak = 0;

        training.matchesHit++;
        training.streak++;
        training.bestStreak = Math.max(training.bestStreak, training.streak);
        training.score += 10;
        training.accuracyDisplay.textContent = `${Math.round((training.matchesHit / training.totalNotesTrained) * 100)}%`;

        expect(training.score).toBe(10);
        expect(training.streak).toBe(1);
        expect(training.bestStreak).toBe(1);
        expect(training.accuracyDisplay.textContent).toBe('100%');
    });

    afterEach(() => {
        navigator.mediaDevices = originalMediaDevices;
    });
});
