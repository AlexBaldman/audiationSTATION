const DEFAULT_CONFIG = {
    smoothingFactor: 0.15,
    gateSmoothing: 0.25,
    maxCentWindow: 50,
    tempoBPM: 96,
    palette: {
        background: '#030112',
        primary: '#5cf2ff',
        accent: '#f6c177',
        danger: '#ff4d6d',
    },
    seed: 123456789,
};

const RAF = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : (callback) => setTimeout(() => callback(Date.now()), 16);

const CAF = typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'
    ? window.cancelAnimationFrame.bind(window)
    : (id) => clearTimeout(id);

/**
 * @typedef {Object} PitchSample
 * @property {number} cents - Current cents offset relative to the target note.
 * @property {boolean} onTarget - Whether the note is within the accuracy window.
 * @property {number} rms - Root mean square amplitude for confidence estimation.
 * @property {number} timestamp - Epoch timestamp of the sample.
 */

/**
 * @typedef {Object} FrameState
 * @property {number} time
 * @property {number} delta
 * @property {number} normalizedError - Range [-1, 1]
 * @property {number} gateHeight - Range [0, 1]
 * @property {number} confidence - Range [0, 1]
 * @property {number} streakLevel
 * @property {boolean} onTarget
 * @property {number} bpmPhase - Range [0, 1)
 * @property {number} notesHit
 */

/**
 * @typedef {Object} SceneContext
 * @property {HTMLCanvasElement} canvas
 * @property {CanvasRenderingContext2D|null} ctx
 * @property {Object} palette
 * @property {Function} rng
 * @property {{ smoothstep: (t:number) => number }} ease
 * @property {Map<string, any>} store
 * @property {(key:string, loader:() => Promise<any>) => Promise<any>} getAsset
 * @property {(eventName:string, detail?:any) => void} emit
 */

function createPitchSample() {
    return {
        cents: 0,
        onTarget: false,
        rms: 0,
        timestamp: typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(),
    };
}

function createInitialFrameState() {
    return {
        time: 0,
        delta: 16,
        normalizedError: 0,
        gateHeight: 0.5,
        confidence: 0,
        streakLevel: 0,
        onTarget: false,
        bpmPhase: 0,
        notesHit: 0,
    };
}

function createEventBus() {
    const listeners = new Map();
    return {
        on(type, handler) {
            if (!listeners.has(type)) {
                listeners.set(type, new Set());
            }
            listeners.get(type).add(handler);
        },
        off(type, handler) {
            const bucket = listeners.get(type);
            if (bucket) {
                bucket.delete(handler);
                if (bucket.size === 0) {
                    listeners.delete(type);
                }
            }
        },
        emit(type, payload) {
            const bucket = listeners.get(type);
            if (bucket) {
                for (const handler of bucket) {
                    handler(payload);
                }
            }
        },
        clear() {
            listeners.clear();
        }
    };
}

function createRng(seed = Date.now()) {
    let value = seed >>> 0;
    return () => {
        value += 0x6D2B79F5;
        let t = value;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function clamp(value, min, max) {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
}

export function smoothValue(previous, target, smoothing = 0.15) {
    const alpha = clamp(1 - smoothing, 0, 1);
    return previous * alpha + target * (1 - alpha);
}

export function normalizeCents(cents, maxWindow = 50) {
    if (!Number.isFinite(cents) || !Number.isFinite(maxWindow) || maxWindow <= 0) {
        return 0;
    }
    return clamp(cents / maxWindow, -1, 1);
}

export function computeGateHeight(normalizedError) {
    const inverted = 0.5 - normalizedError * 0.5;
    return clamp(inverted, 0, 1);
}

export function smoothstep(t) {
    const clamped = clamp(t, 0, 1);
    return clamped * clamped * (3 - 2 * clamped);
}

export class GamifiedPitchEngine {
    constructor(canvas, options = {}) {
        if (!canvas) {
            throw new Error('GamifiedPitchEngine requires a canvas element.');
        }
        this.canvas = canvas;
        this.ctx = canvas.getContext?.('2d') ?? null;
        this.config = {
            ...DEFAULT_CONFIG,
            ...options,
            palette: {
                ...DEFAULT_CONFIG.palette,
                ...(options.palette || {}),
            },
        };

        this.eventBus = createEventBus();
        this.sceneRegistry = new Map();
        this.sceneStores = new Map();
        this.assetCache = new Map();
        this.sceneContext = this.buildSceneContext();
        this.lastPitchSample = createPitchSample();
        this.frameState = createInitialFrameState();
        this.lastFrameTime = 0;
        this.rafId = null;
        this.isRunning = false;
        this.activeScene = null;
        this.activeSceneId = null;
    }

    buildSceneContext() {
        const rng = createRng(this.config.seed);
        return {
            canvas: this.canvas,
            ctx: this.ctx,
            palette: this.config.palette,
            rng,
            ease: { smoothstep },
            store: this.sceneStores,
            getAsset: (key, loader) => this.getAsset(key, loader),
            emit: (eventName, detail) => this.emitSceneEvent(eventName, detail),
        };
    }

    registerScene(sceneDefinition) {
        if (!sceneDefinition || !sceneDefinition.id || typeof sceneDefinition.create !== 'function') {
            throw new Error('Scene definitions require `id` and `create(context)` factory.');
        }
        this.sceneRegistry.set(sceneDefinition.id, sceneDefinition);
    }

    hasScene(sceneId) {
        return this.sceneRegistry.has(sceneId);
    }

    loadScene(sceneId) {
        if (!sceneId) return;
        if (!this.sceneRegistry.has(sceneId)) {
            throw new Error(`Scene "${sceneId}" is not registered.`);
        }
        this.disposeActiveScene();
        const definition = this.sceneRegistry.get(sceneId);
        const scene = definition.create(this.sceneContext);
        scene?.init?.(this.sceneContext);
        this.activeScene = scene;
        this.activeSceneId = sceneId;
        this.emitSceneEvent('scene-change', { sceneId });
    }

    setMode(sceneId) {
        if (sceneId === 'off') {
            this.disable();
            return;
        }
        this.loadScene(sceneId);
    }

    disable() {
        this.disposeActiveScene();
        this.activeScene = null;
        this.activeSceneId = null;
        this.emitSceneEvent('scene-disabled');
    }

    disposeActiveScene() {
        if (this.activeScene?.dispose) {
            this.activeScene.dispose();
        }
    }

    start() {
        if (this.isRunning || !this.ctx) return;
        this.isRunning = true;
        this.lastFrameTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        this.rafId = RAF((timestamp) => this.loop(timestamp));
    }

    pause() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.rafId !== null) {
            CAF(this.rafId);
            this.rafId = null;
        }
    }

    resume() {
        if (this.isRunning || !this.ctx) return;
        this.isRunning = true;
        this.lastFrameTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        this.rafId = RAF((timestamp) => this.loop(timestamp));
    }

    stop() {
        this.pause();
        this.disable();
    }

    dispose() {
        this.stop();
        this.eventBus?.clear?.();
        this.assetCache.clear();
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        const now = typeof timestamp === 'number' ? timestamp : (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
        const delta = this.lastFrameTime ? now - this.lastFrameTime : 16;
        this.lastFrameTime = now;
        const frame = this.buildFrameState(now, delta);
        if (this.activeScene?.update) {
            this.activeScene.update(frame, this.sceneContext);
        }
        if (this.activeScene?.render && this.ctx) {
            this.ctx.save?.();
            this.ctx.clearRect?.(0, 0, this.canvas.width, this.canvas.height);
            this.activeScene.render(this.ctx, frame, this.sceneContext);
            this.ctx.restore?.();
        }
        this.rafId = RAF((nextTimestamp) => this.loop(nextTimestamp));
    }

    buildFrameState(now, delta) {
        const normalizedError = smoothValue(
            this.frameState.normalizedError,
            normalizeCents(this.lastPitchSample.cents, this.config.maxCentWindow),
            this.config.smoothingFactor,
        );
        const gateHeight = smoothValue(
            this.frameState.gateHeight,
            computeGateHeight(normalizedError),
            this.config.gateSmoothing,
        );
        const confidence = smoothValue(
            this.frameState.confidence,
            clamp(this.lastPitchSample.rms * 4, 0, 1),
            this.config.smoothingFactor,
        );
        const streakLevel = this.lastPitchSample.onTarget ? this.frameState.streakLevel + 1 : 0;
        const bpmPhase = (this.frameState.bpmPhase + (this.config.tempoBPM / 60000) * delta) % 1;
        const notesHit = this.lastPitchSample.onTarget ? this.frameState.notesHit : this.frameState.notesHit;
        this.frameState = {
            time: now,
            delta,
            normalizedError,
            gateHeight,
            confidence,
            streakLevel,
            onTarget: this.lastPitchSample.onTarget,
            bpmPhase,
            notesHit,
        };
        return this.frameState;
    }

    updatePitch(sample = {}) {
        this.lastPitchSample = {
            ...this.lastPitchSample,
            ...sample,
            timestamp: sample.timestamp || (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()),
        };
        if (sample.onTarget && this.frameState) {
            this.frameState.notesHit += 1;
        }
    }

    emitSceneEvent(eventName, detail = {}) {
        this.eventBus.emit('scene-event', {
            name: eventName,
            detail,
            sceneId: this.activeSceneId,
            timestamp: typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(),
        });
    }

    addEventListener(type, handler) {
        this.eventBus.on(type, handler);
        return () => this.removeEventListener(type, handler);
    }

    removeEventListener(type, handler) {
        this.eventBus.off(type, handler);
    }

    getAsset(key, loader) {
        if (this.assetCache.has(key)) {
            return this.assetCache.get(key);
        }
        if (typeof loader !== 'function') {
            throw new Error(`Loader for asset "${key}" must be a function.`);
        }
        const promise = Promise.resolve().then(loader).then((asset) => {
            this.assetCache.set(key, Promise.resolve(asset));
            return asset;
        });
        this.assetCache.set(key, promise);
        return promise;
    }
}
