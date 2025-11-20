import { describe, it, expect } from 'vitest';
import {
    clamp,
    smoothValue,
    normalizeCents,
    computeGateHeight,
    smoothstep,
} from '../js/modules/gamified/GamifiedPitchEngine.js';

describe('GamifiedPitchEngine helpers', () => {
    it('clamp keeps value within range', () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(-5, 0, 10)).toBe(0);
        expect(clamp(15, 0, 10)).toBe(10);
    });

    it('normalizeCents maps cents to -1..1', () => {
        expect(normalizeCents(25, 50)).toBeCloseTo(0.5);
        expect(normalizeCents(-75, 50)).toBe(-1);
        expect(normalizeCents(0, 50)).toBe(0);
    });

    it('computeGateHeight inverts normalized error', () => {
        expect(computeGateHeight(-1)).toBe(1);
        expect(computeGateHeight(0)).toBe(0.5);
        expect(computeGateHeight(1)).toBe(0);
    });

    it('smoothValue eases toward target', () => {
        const from = 0;
        const target = 1;
        const smoothed = smoothValue(from, target, 0.5);
        expect(smoothed).toBeGreaterThan(0);
        expect(smoothed).toBeLessThan(1);
    });

    it('smoothstep eases input curve', () => {
        expect(smoothstep(-1)).toBe(0);
        expect(smoothstep(0.5)).toBeCloseTo(0.5);
        expect(smoothstep(2)).toBe(1);
    });
});
