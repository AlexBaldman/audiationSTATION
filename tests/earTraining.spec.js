import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EarTraining } from '../js/modules/EarTraining.js';

class FakeAudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createOscillator() {
        return { connect: vi.fn(), disconnect: vi.fn(), frequency: { value: 0 }, start: vi.fn(), stop: vi.fn() };
    }
    createGain() {
        return { connect: vi.fn(), disconnect: vi.fn(), gain: {
            setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn()
        } };
    }
    close() { return Promise.resolve(); }
}

beforeEach(() => {
    localStorage.clear();
    window.AudioContext = FakeAudioContext;
});

describe('Ear Rational real exercise engine', () => {
    for (const type of ['interval', 'chord', 'rhythm', 'melody']) {
        for (const difficulty of ['easy', 'medium', 'hard']) {
            it(`generates and plays ${difficulty} ${type} with finite audio scheduling`, async () => {
                const trainer = new EarTraining();
                expect(trainer.audioContext).toBeNull();
                const exercise = trainer.generateExercise(type, difficulty);
                expect(exercise.answer).toBeTruthy();
                const played = vi.spyOn(trainer, 'playNote');
                await trainer.playExercise();
                expect(trainer.audioContext.state).toBe('running');
                expect(played.mock.calls.length).toBeGreaterThan(0);
                for (const call of played.mock.calls) {
                    expect(call.every(Number.isFinite)).toBe(true);
                    expect(call[0]).toBeGreaterThan(0);
                    expect(call[2]).toBeGreaterThan(0);
                }
                expect(trainer.getExerciseDuration()).toBeGreaterThan(0);
                trainer.dispose();
            });
        }
    }

    it('scores one answer per exercise and restores saved progress', () => {
        const trainer = new EarTraining();
        const exercise = trainer.generateExercise();
        expect(trainer.validateAnswer(exercise.answer).correct).toBe(true);
        expect(() => trainer.validateAnswer(exercise.answer)).toThrow('New Exercise');
        trainer.generateExercise('chord');
        expect(trainer.validateAnswer('wrong').correct).toBe(false);
        expect(new EarTraining().getProgress()).toMatchObject({ score: 1, totalAttempts: 2, accuracy: '50.0' });
    });

    it('uses audible scale degrees rather than rest answers for melodies', () => {
        const trainer = new EarTraining();
        const exercise = trainer.generateExercise('melody');
        expect(exercise.answer).toMatch(/^[1-8]( [1-8]){3}$/);
        expect(exercise.tempo).toBe(120);
        expect(exercise.melody.every(note => note.frequency > 0)).toBe(true);
    });

    it('keeps rhythm slots within the announced meter including subdivisions', () => {
        const trainer = new EarTraining();
        for (const meter of ['4/4', '6/8', '7/8']) {
            for (const difficulty of ['easy', 'hard']) {
                const pattern = trainer.generateRhythmPattern(meter, difficulty);
                const [beats, unit] = meter.split('/').map(Number);
                const step = 4 / unit / (difficulty === 'easy' ? 1 : 2);
                expect(pattern.length * step).toBe(beats * 4 / unit);
                expect(pattern.every(value => value === 0 || value === 1)).toBe(true);
            }
        }
    });

    it('stops scheduled audio when switching exercises', async () => {
        const trainer = new EarTraining();
        trainer.generateExercise('melody');
        await trainer.playExercise();
        const voices = [...trainer.activeOscillators];
        trainer.generateExercise('interval');
        expect(voices.length).toBeGreaterThan(0);
        expect(voices.every(voice => voice.stop.mock.calls.length === 2)).toBe(true);
        expect(trainer.activeOscillators.size).toBe(0);
    });
});
