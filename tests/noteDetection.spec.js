import { describe, it, expect } from 'vitest';
import { frequencyToNote, midiToFrequency, midiToNoteName } from '../js/modules/PitchUtils.js';

describe('PitchUtils', () => {
    it('converts MIDI to precise frequency', () => {
        expect(midiToFrequency(69)).toBeCloseTo(440, 5);
        expect(midiToFrequency(60)).toBeCloseTo(261.626, 3);
    });

    it('maps MIDI number to note name', () => {
        expect(midiToNoteName(69)).toBe('A4');
        expect(midiToNoteName(60)).toBe('C4');
    });

    it('snaps frequency to nearest note within threshold', () => {
        const result = frequencyToNote(445);
        expect(result?.note).toBe('A4');
        expect(result?.cents).toBeGreaterThan(0);
    });

    it('rejects out-of-range frequency', () => {
        expect(frequencyToNote(10)).toBeNull();
    });
});
