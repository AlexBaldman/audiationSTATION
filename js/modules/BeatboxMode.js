import { createAudioContext, closeAudioContext } from './AudioResourceManager.js';

/**
 * Beatbox Mode - Interactive beat creation
 */
export class BeatboxMode {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.pads = document.querySelectorAll('.beatbox-pad');
        this.padQueue = [];
        this.padAnimationTimeouts = new Map();
        this.boundKeyHandler = (event) => this.handleKeyTrigger(event);
        this.keyMap = {
            KeyA: 'kick',
            KeyS: 'snare',
            KeyD: 'hihat',
            KeyF: 'cymbal',
        };

        this.startBtn = document.getElementById('beatbox-start');
        this.stopBtn = document.getElementById('beatbox-stop');
        this.tempoSlider = document.getElementById('beatbox-tempo');
        this.tempoValue = document.getElementById('beatbox-tempo-value');
        this.patternSelect = document.getElementById('beatbox-pattern');
        this.gridContainer = document.getElementById('beatbox-grid-steps');
        this.gridInfo = document.getElementById('beatbox-grid-info');

        this.currentStep = 0;
        this.isPlaying = false;
        this.stepInterval = null;
        this.stepsPerBar = 16;
        this.rows = ['kick', 'snare', 'hihat', 'cymbal'];
        this.gridState = new Map();
        this.patterns = this.getPatternDefinitions();

        this.init();
    }

    init() {
        this.setupAudioContext();
        this.setupPads();
        this.loadSounds();
        this.attachKeyboardShortcuts();
        this.buildGrid();
        this.attachTransport();
        this.applyPattern('default');
    }

    setupAudioContext() {
        this.audioContext = createAudioContext();
    }

    setupPads() {
        this.pads.forEach((pad, index) => {
            const soundType = this.getSoundType(index);
            pad.addEventListener('click', () => this.playSound(soundType));
            pad.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.playSound(soundType);
            });
            pad.dataset.sound = soundType;
        });
    }

    getSoundType(index) {
        const types = ['kick', 'snare', 'hihat', 'cymbal'];
        return types[index] || 'kick';
    }

    loadSounds() {
        // Create synthetic drum sounds using Web Audio API
        this.sounds = {
            kick: this.createKickSound(),
            snare: this.createSnareSound(),
            hihat: this.createHiHatSound(),
            cymbal: this.createCymbalSound()
        };
    }

    createKickSound() {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
        };
    }

    createSnareSound() {
        return () => {
            const bufferSize = this.audioContext.sampleRate * 0.2;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
            }

            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = buffer;
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            source.start();
        };
    }

    createHiHatSound() {
        return () => {
            const bufferSize = this.audioContext.sampleRate * 0.1;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
            }

            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            filter.type = 'highpass';
            filter.frequency.value = 8000;

            source.buffer = buffer;
            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            source.start();
        };
    }

    createCymbalSound() {
        return () => {
            const bufferSize = this.audioContext.sampleRate * 0.5;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
            }

            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            filter.type = 'bandpass';
            filter.frequency.value = 3000;
            filter.Q.value = 1;

            source.buffer = buffer;
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            source.start();
        };
    }

    playSound(type) {
        if (this.sounds[type]) {
            this.sounds[type]();
            this.enqueuePadAnimation(type);
        }
    }

    enqueuePadAnimation(type) {
        const pad = Array.from(this.pads).find(p => p.dataset.sound === type);
        if (!pad) return;
        if (this.padAnimationTimeouts.has(pad)) {
            clearTimeout(this.padAnimationTimeouts.get(pad));
        }
        pad.style.transform = 'scale(0.95)';
        pad.style.filter = 'brightness(1.5)';
        const timeout = setTimeout(() => {
            pad.style.transform = 'scale(1)';
            pad.style.filter = 'brightness(1)';
            this.padAnimationTimeouts.delete(pad);
        }, 120);
        this.padAnimationTimeouts.set(pad, timeout);
    }

    attachKeyboardShortcuts() {
        window.addEventListener('keydown', this.boundKeyHandler);
    }

    handleKeyTrigger(event) {
        const type = this.keyMap[event.code];
        if (type) {
            event.preventDefault();
            this.playSound(type);
            this.toggleGridStep(type, this.currentStep, true);
        }
    }

    buildGrid() {
        if (!this.gridContainer) return;
        this.gridContainer.innerHTML = '';
        this.rows.forEach((row) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'grid-row';
            const label = document.createElement('div');
            label.className = 'grid-row-label';
            label.textContent = row;
            const stepsWrapper = document.createElement('div');
            stepsWrapper.className = 'grid-row-steps';
            for (let i = 0; i < this.stepsPerBar; i++) {
                const step = document.createElement('button');
                step.type = 'button';
                step.className = 'grid-step';
                step.dataset.row = row;
                step.dataset.step = i;
                step.addEventListener('click', () => this.toggleGridStep(row, i));
                stepsWrapper.appendChild(step);
            }
            wrapper.appendChild(label);
            wrapper.appendChild(stepsWrapper);
            this.gridContainer.appendChild(wrapper);
        });
    }

    toggleGridStep(row, stepIndex, forceActive = null) {
        const key = `${row}-${stepIndex}`;
        const stepEl = this.gridContainer?.querySelector(`.grid-step[data-row="${row}"][data-step="${stepIndex}"]`);
        if (!stepEl) return;
        const shouldActivate = forceActive !== null ? forceActive : !this.gridState.get(key);
        this.gridState.set(key, shouldActivate);
        stepEl.classList.toggle('active', shouldActivate);
    }

    attachTransport() {
        this.startBtn?.addEventListener('click', () => this.startSequencer());
        this.stopBtn?.addEventListener('click', () => this.stopSequencer());
        this.tempoSlider?.addEventListener('input', (event) => {
            const tempo = Number(event.target.value);
            if (this.tempoValue) this.tempoValue.textContent = `${tempo} BPM`;
            if (this.isPlaying) {
                this.stopSequencer();
                this.startSequencer();
            }
        });
        this.patternSelect?.addEventListener('change', (event) => {
            this.applyPattern(event.target.value);
        });
    }

    startSequencer() {
        if (this.isPlaying) return;
        if (!this.audioContext) this.setupAudioContext();
        this.audioContext.resume();
        this.isPlaying = true;
        this.currentStep = 0;
        const tempo = Number(this.tempoSlider?.value || 108);
        const stepDuration = (60000 / tempo) / 4;
        this.stepInterval = setInterval(() => this.advanceStep(), stepDuration);
        if (this.startBtn) this.startBtn.disabled = true;
        if (this.stopBtn) this.stopBtn.disabled = false;
    }

    stopSequencer() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        clearInterval(this.stepInterval);
        this.stepInterval = null;
        this.clearPlayhead();
        if (this.startBtn) this.startBtn.disabled = false;
        if (this.stopBtn) this.stopBtn.disabled = true;
    }

    advanceStep() {
        this.clearPlayhead();
        this.rows.forEach((row) => {
            const key = `${row}-${this.currentStep}`;
            if (this.gridState.get(key)) {
                this.playSound(row);
            }
            const stepEl = this.gridContainer?.querySelector(`.grid-step[data-row="${row}"][data-step="${this.currentStep}"]`);
            stepEl?.classList.add('playhead');
        });
        this.currentStep = (this.currentStep + 1) % this.stepsPerBar;
    }

    clearPlayhead() {
        this.gridContainer?.querySelectorAll('.grid-step.playhead').forEach(step => step.classList.remove('playhead'));
    }

    applyPattern(patternKey) {
        const pattern = this.patterns[patternKey] || this.patterns.default;
        this.gridState.clear();
        this.gridContainer?.querySelectorAll('.grid-step').forEach(step => step.classList.remove('active'));
        this.rows.forEach((row, rowIndex) => {
            const steps = pattern.steps[rowIndex] || [];
            steps.forEach(stepIndex => this.toggleGridStep(row, stepIndex, true));
        });
        if (this.gridInfo) this.gridInfo.textContent = pattern.description;
    }

    getPatternDefinitions() {
        return {
            default: {
                steps: [
                    [0, 4, 8, 12],
                    [4, 12],
                    [2, 6, 10, 14],
                    [0, 8],
                ],
                description: 'Balanced 4/4 grid with kick on quarters and hats on the off-beats.',
            },
            fibonacci: {
                steps: [
                    [0, 1, 3, 5, 8, 13],
                    [5, 8, 13],
                    [2, 3, 5, 8, 13],
                    [1, 4, 7, 11, 14],
                ],
                description: 'Fibonacci spacing to create expanding syncopation (1-1-2-3-5-8).',
            },
            trinity: {
                steps: [
                    [0, 8],
                    [4, 12],
                    [2, 6, 10, 14],
                    [3, 9, 15],
                ],
                description: '3:2 polyrhythm where hi-hats trace triplets over duple kicks.',
            },
            golden: {
                steps: [
                    [0, 7, 11],
                    [3, 9, 14],
                    [2, 5, 8, 13],
                    [1, 4, 6, 10, 12, 15],
                ],
                description: 'Golden ratio accents: 0/0.618/1 overlays for evolving shimmer.',
            },
        };
    }

    dispose() {
        this.padAnimationTimeouts.forEach(timeout => clearTimeout(timeout));
        this.padAnimationTimeouts.clear();
        window.removeEventListener('keydown', this.boundKeyHandler);
        this.stopSequencer();
        closeAudioContext(this.audioContext);
        this.audioContext = null;
    }
}
