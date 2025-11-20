import { describe, it, beforeAll, beforeEach, afterEach, expect } from 'vitest';
import { GeometryScope } from '../js/modules/GeometryScope.js';

beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = () => ({
        clearRect() {},
        save() {},
        restore() {},
        translate() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        closePath() {},
        stroke() {},
        arc() {},
        fill() {},
        rotate() {},
        createLinearGradient() {
            return { addColorStop() {} };
        },
        fillRect() {},
        strokeStyle: '',
        lineWidth: 1,
    });
});

describe('GeometryScope', () => {
    let scope;

    beforeEach(() => {
        document.body.innerHTML = '<canvas id="geometry-scope-canvas"></canvas>';
        scope = new GeometryScope();
    });

    afterEach(() => {
        scope.dispose();
    });

    it('stores latest note payload when updated', () => {
        scope.updateFromNote({ note: 'A4', frequency: 440, cents: 0, chord: 'A Major' });
        expect(scope.notePayload.note).toBe('A4');
        expect(scope.chordPayload.chord).toBe('A Major');
    });

    it('expands chord labels into component notes', () => {
        const notes = scope.extractChordNotes('C Minor7');
        expect(notes).toEqual(['C', 'D#', 'G', 'A#']);
    });
});
