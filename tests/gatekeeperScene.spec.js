import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GatekeeperScene, gateCollision } from '../js/modules/gamified/scenes/GatekeeperScene.js';

function createMockContext(overrides = {}) {
    const gradient = { addColorStop: vi.fn() };
    const ctx = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        arc: vi.fn(),
        createLinearGradient: vi.fn(() => gradient),
        fillStyle: '#000',
        strokeStyle: '#fff',
        lineWidth: 1,
        shadowColor: '#000',
        shadowBlur: 0,
    };
    return {
        canvas: { width: 480, height: 220 },
        ctx,
        palette: {},
        rng: () => 0.5,
        store: new Map(),
        emit: vi.fn(),
        ...overrides,
    };
}

describe('gateCollision helper', () => {
    it('detects when orb is within opening with tolerance', () => {
        expect(gateCollision(0.5, 0.5, 0.3, 0.05)).toBe(true);
        expect(gateCollision(0.1, 0.5, 0.2, 0.05)).toBe(false);
    });
});

describe('GatekeeperScene', () => {
    let scene;
    let context;

    beforeEach(() => {
        scene = new GatekeeperScene();
        context = createMockContext();
        scene.init(context);
    });

    it('spawns gates with deterministic rng and stores metadata', () => {
        expect(scene.gates.length).toBe(0);
        scene.spawnGate({ gateHeight: 0.6, streakLevel: 5 });
        expect(scene.gates.length).toBe(1);
        const gate = scene.gates[0];
        expect(gate.center).toBeGreaterThan(0.5);
        expect(gate.opening).toBeLessThanOrEqual(scene.baseOpening);
    });

    it('emits gatePassed when orb aligns with opening', () => {
        const gate = {
            id: 'gate-test',
            center: 0.5,
            opening: 0.3,
            resolved: false,
            status: 'pending',
        };
        scene.orbY = 0.5;
        scene.resolveGate(gate, { streakLevel: 3 }, context);
        expect(gate.status).toBe('passed');
        expect(context.emit).toHaveBeenCalledWith('gatePassed', expect.objectContaining({ gateId: 'gate-test' }));
    });

    it('emits gateMissed when orb is outside window', () => {
        const gate = {
            id: 'gate-miss',
            center: 0.2,
            opening: 0.2,
            resolved: false,
            status: 'pending',
        };
        scene.orbY = 0.9;
        scene.resolveGate(gate, { streakLevel: 1 }, context);
        expect(gate.status).toBe('missed');
        expect(context.emit).toHaveBeenCalledWith('gateMissed', expect.objectContaining({ gateId: 'gate-miss' }));
    });
});
