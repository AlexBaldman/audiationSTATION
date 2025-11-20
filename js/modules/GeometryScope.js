const NOTE_TO_INDEX = {
    C: 0,
    'C#': 1,
    Db: 1,
    D: 2,
    'D#': 3,
    Eb: 3,
    E: 4,
    F: 5,
    'F#': 6,
    Gb: 6,
    G: 7,
    'G#': 8,
    Ab: 8,
    A: 9,
    'A#': 10,
    Bb: 10,
    B: 11,
};

export class GeometryScope {
    constructor(canvasId = 'geometry-scope-canvas') {
        this.canvas = typeof document !== 'undefined' ? document.getElementById(canvasId) : null;
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.animationId = null;
        this.notePayload = null;
        this.chordPayload = null;
        this.lastTimestamp = 0;
        this.baseColors = ['#00fff2', '#ff00f7', '#ffe066'];
        this.gridColor = 'rgba(255, 255, 255, 0.12)';
        this.fadeAmount = 0.05;

        if (this.ctx) {
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const size = Math.min(this.canvas.clientWidth || 360, 420);
        this.canvas.width = size;
        this.canvas.height = size;
    }

    updateFromNote(payload) {
        this.notePayload = {
            ...payload,
            timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        };
        this.chordPayload = payload.chord ? payload : this.chordPayload;
        this.start();
    }

    clear() {
        this.notePayload = null;
        this.chordPayload = null;
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    start() {
        if (!this.ctx || this.animationId) return;
        const render = () => {
            this.drawFrame();
            this.animationId = requestAnimationFrame(render);
        };
        this.animationId = requestAnimationFrame(render);
    }

    stop() {
        if (!this.animationId) return;
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
    }

    dispose() {
        this.stop();
        this.clear();
        if (this.canvas) {
            this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawFrame() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const { width, height } = this.canvas;
        ctx.clearRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2, height / 2);
        const radius = Math.min(width, height) / 2 - 10;

        this.drawRadialGrid(ctx, radius);
        this.drawBaseDodecagon(ctx, radius * 0.9);

        if (this.chordPayload) {
            this.drawChord(ctx, radius * 0.7, this.chordPayload);
        }

        if (this.notePayload) {
            this.drawNoteVector(ctx, radius, this.notePayload);
        }

        ctx.restore();
    }

    drawRadialGrid(ctx, radius) {
        ctx.save();
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, (radius / 4) * i, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawBaseDodecagon(ctx, radius) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    drawNoteVector(ctx, radius, payload) {
        const { note, cents = 0 } = payload;
        const noteIndex = this.getNoteIndex(note);
        if (noteIndex === null) return;
        const angle = (Math.PI * 2 * noteIndex) / 12 - Math.PI / 2;
        const length = radius * (0.65 + Math.min(Math.abs(cents) / 120, 0.35));
        const hueShift = Math.max(Math.min(cents / 50, 1), -1);
        const color = hueShift >= 0 ? this.baseColors[0] : this.baseColors[1];

        ctx.save();
        ctx.rotate(angle);
        const gradient = ctx.createLinearGradient(0, 0, length, 0);
        gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
        gradient.addColorStop(1, color);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(length, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawChord(ctx, radius, payload) {
        if (!payload.chord) return;
        const notes = this.extractChordNotes(payload.chord);
        if (notes.length === 0) return;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        notes.forEach((note, index) => {
            const noteIndex = this.getNoteIndex(note);
            if (noteIndex === null) return;
            const angle = (Math.PI * 2 * noteIndex) / 12 - Math.PI / 2;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    extractChordNotes(chordLabel) {
        if (!chordLabel) return [];
        const [root, quality] = chordLabel.split(' ');
        const intervals = {
            Major: [0, 4, 7],
            Minor: [0, 3, 7],
            Diminished: [0, 3, 6],
            Augmented: [0, 4, 8],
            Sus2: [0, 2, 7],
            Sus4: [0, 5, 7],
            Major7: [0, 4, 7, 11],
            Minor7: [0, 3, 7, 10],
            Dominant7: [0, 4, 7, 10],
        };
        const baseIndex = this.getNoteIndex(root);
        const pattern = intervals[quality] || [];
        if (baseIndex === null) return [];
        return pattern.map(semitone => this.getNoteFromIndex(baseIndex + semitone));
    }

    getNoteIndex(note) {
        if (!note) return null;
        const normalized = note.replace(/\d+/g, '');
        return NOTE_TO_INDEX[normalized] ?? null;
    }

    getNoteFromIndex(index) {
        const normalizedIndex = ((index % 12) + 12) % 12;
        const entries = Object.entries(NOTE_TO_INDEX);
        for (const [name, idx] of entries) {
            if (idx === normalizedIndex && !name.includes('b')) {
                return name;
            }
        }
        return 'C';
    }
}
