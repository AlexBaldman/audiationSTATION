import { clamp } from '../GamifiedPitchEngine.js';

export function gateCollision(orbY, gateCenter, openingSize, tolerance) {
    const halfGap = (openingSize / 2) + tolerance;
    return Math.abs(orbY - gateCenter) <= halfGap;
}

export class GatekeeperScene {
    constructor() {
        this.id = 'gatekeeper';
        this.name = 'Gatekeeper';
        this.description = 'Guide the orb through energy gates by matching pitch height.';

        this.orbY = 0.5;
        this.passX = 0.32;
        this.passTolerance = 0.08;
        this.baseOpening = 0.32;
        this.minOpening = 0.18;
        this.tunnelSpeed = 0.00045; // normalized units per ms
        this.spawnInterval = 1500;
        this.elapsedSinceSpawn = 0;
        this.gates = [];
        this.store = null;
        this.context = null;
        this.gateCounter = 0;
        this.orbFollowRate = 0.18;
    }

    init(context) {
        this.context = context;
        this.store = context.store.get?.(this.id) ?? new Map();
        context.store.set?.(this.id, this.store);
        this.reset();
    }

    reset() {
        this.orbY = 0.5;
        this.elapsedSinceSpawn = 0;
        this.gates = [];
    }

    update(frame, context) {
        const delta = frame?.delta || 16;
        this.elapsedSinceSpawn += delta;
        if (this.elapsedSinceSpawn >= this.spawnInterval) {
            this.spawnGate(frame);
            this.elapsedSinceSpawn = 0;
        }

        const followRate = clamp(this.orbFollowRate + (frame.confidence || 0) * 0.2, 0.08, 0.4);
        const targetY = clamp(frame.gateHeight ?? 0.5, 0.05, 0.95);
        this.orbY += (targetY - this.orbY) * followRate;

        const speed = this.tunnelSpeed * delta;
        for (const gate of this.gates) {
            gate.x -= speed;
            if (!gate.resolved && gate.x <= this.passX) {
                this.resolveGate(gate, frame, context);
            }
        }

        this.gates = this.gates.filter((gate) => gate.x > -0.2);
    }

    spawnGate(frame = {}) {
        const jitter = ((this.context?.rng?.() ?? Math.random()) - 0.5) * 0.2;
        const center = clamp((frame.gateHeight ?? 0.5) + jitter, 0.15, 0.85);
        const shrink = clamp((frame.streakLevel || 0) * 0.01, 0, 0.12);
        const opening = clamp(this.baseOpening - shrink, this.minOpening, this.baseOpening);
        this.gates.push({
            id: `gate-${this.gateCounter++}`,
            x: 1.1,
            center,
            opening,
            resolved: false,
            status: 'pending',
        });
    }

    resolveGate(gate, frame, context) {
        const passed = gateCollision(this.orbY, gate.center, gate.opening, this.passTolerance);
        gate.resolved = true;
        gate.status = passed ? 'passed' : 'missed';
        const payload = {
            gateId: gate.id,
            center: gate.center,
            opening: gate.opening,
            streakLevel: frame.streakLevel,
        };
        if (passed) {
            context.emit?.('gatePassed', payload);
        } else {
            context.emit?.('gateMissed', payload);
        }
    }

    render(ctx, frame, context) {
        if (!ctx || !context?.canvas) return;
        const { width, height } = context.canvas;
        ctx.clearRect(0, 0, width, height);
        this.drawBackground(ctx, width, height, context.palette);
        this.drawTunnelLines(ctx, width, height);
        this.drawGates(ctx, width, height, context.palette, frame);
        this.drawOrb(ctx, width, height, context.palette, frame);
    }

    drawBackground(ctx, width, height, palette = {}) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, palette.background ?? '#05030f');
        gradient.addColorStop(1, '#09051c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    drawTunnelLines(ctx, width, height) {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 6; i++) {
            const x = (i / 6) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + width * 0.05, height);
            ctx.stroke();
        }
    }

    drawGates(ctx, width, height, palette = {}) {
        const gateWidth = width * 0.06;
        for (const gate of this.gates) {
            const x = gate.x * width;
            if (x + gateWidth < 0 || x > width) continue;
            const centerY = gate.center * height;
            const gapHeight = gate.opening * height;
            const topEnd = centerY - gapHeight / 2;
            const bottomStart = centerY + gapHeight / 2;
            ctx.fillStyle = gate.status === 'missed' ? (palette.danger ?? '#ff4d6d') : (palette.primary ?? '#5cf2ff');
            ctx.globalAlpha = gate.status === 'pending' ? 0.6 : 0.35;

            ctx.fillRect(x, 0, gateWidth, Math.max(0, topEnd));
            ctx.fillRect(x, bottomStart, gateWidth, Math.max(0, height - bottomStart));
            ctx.globalAlpha = 1;

            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.strokeRect(x, 0, gateWidth, height);
        }
    }

    drawOrb(ctx, width, height, palette = {}, frame = {}) {
        const orbX = this.passX * width + width * 0.05;
        const orbY = clamp(this.orbY, 0.05, 0.95) * height;
        const baseRadius = 16;
        const streakBonus = clamp((frame.streakLevel || 0) * 0.5, 0, 6);
        const radius = baseRadius - streakBonus;
        const glowColor = frame.onTarget ? (palette.primary ?? '#5cf2ff') : (palette.accent ?? '#f6c177');

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = frame.onTarget ? 25 : 10;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(orbX, orbY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.stroke();
    }

    dispose() {
        this.gates = [];
    }
}

export function createGatekeeperSceneDefinition() {
    return {
        id: 'gatekeeper',
        name: 'Gatekeeper',
        description: 'Guide the orb through gates by matching pitch height.',
        difficulty: 'medium',
        create: () => new GatekeeperScene(),
    };
}
