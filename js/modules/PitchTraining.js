import { frequencyToNote } from './PitchUtils.js';
import { createAudioContext, stopMediaStream, closeAudioContext, cancelAnimationFrameSafe } from './AudioResourceManager.js';
import { createPitchArcade } from './gamified/index.js';

export class PitchTraining {
    constructor() {
        this.startButton = document.getElementById("start-pitch-training");
        this.stopButton = document.getElementById("stop-pitch-training");
        this.targetNoteDisplay = document.getElementById("target-note");
        this.userNoteDisplay = document.getElementById("user-note");
        this.pitchMeter = document.getElementById("pitch-meter");
        this.pitchIndicator = document.getElementById("pitch-indicator");
        this.feedbackMessage = document.getElementById("pitch-feedback");
        this.scoreDisplay = document.getElementById("pitch-score");
        this.streakDisplay = document.getElementById("pitch-streak");
        this.timerDisplay = document.getElementById("pitch-timer");
        this.accuracyDisplay = document.getElementById("pitch-accuracy");
        this.bestStreakDisplay = document.getElementById("pitch-best-streak");
        this.notesTrainedDisplay = document.getElementById("pitch-notes-trained");
        this.volumeFill = document.getElementById("pitch-volume-fill");
        this.guidanceDisplay = document.getElementById("pitch-guidance");
        this.difficultySelect = document.getElementById("pitch-difficulty");
        this.instrumentSelect = document.getElementById("instrument-select");
        this.playTargetNoteButton = document.getElementById("play-target-note");
        this.pitchGameSelect = document.getElementById('pitch-game-mode');
        this.pitchGameCanvas = document.getElementById('pitch-game-canvas');

        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.mediaStream = null;
        this.isTraining = false;
        this.targetNote = null;
        this.targetFrequency = 0;
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.totalNotesTrained = 0;
        this.matchesHit = 0;
        this.gameTimer = null;
        this.timeLeft = 60;
        this.noteMatchedTime = 0;
        this.instrumentType = 'sine';
        this.detectFrameId = null;
        this.nextNoteTimeout = null;
        this.boundVisibilityHandler = null;
        this.boundUnloadHandler = null;
        this.pitchEngine = null;
        this.pitchGameMode = 'off';
        this.pitchArcadeStorageKey = 'pitchArcadeMode';

        this.noteFrequencies = {
            "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23,
            "G4": 392.00, "A4": 440.00, "B4": 493.88, "C5": 523.25
        };

        this.difficultyRanges = {
            easy: ["C4", "E4", "G4", "C5"],
            medium: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
            hard: Object.keys(this.noteFrequencies)
        };

        this.init();
        this.setupPitchArcade();
        this.attachLifecycleHooks();
    }

    init() {
        if (this.startButton) this.startButton.addEventListener("click", () => this.start());
        if (this.stopButton) this.stopButton.addEventListener("click", () => this.stop());
        if (this.playTargetNoteButton) this.playTargetNoteButton.addEventListener("click", () => this.playTargetNote());
        if (this.instrumentSelect) {
            this.instrumentType = this.instrumentSelect.value;
            this.instrumentSelect.addEventListener("change", () => {
                this.instrumentType = this.instrumentSelect.value;
            });
        }
    }

    playInstrumentTone(frequency) {
        if (!this.audioContext) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.type = this.instrumentType;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 1);
    }

    generateTargetNote() {
        const difficulty = this.difficultySelect ? this.difficultySelect.value : 'easy';
        const currentRange = this.difficultyRanges[difficulty];
        const randomIndex = Math.floor(Math.random() * currentRange.length);
        this.targetNote = currentRange[randomIndex];
        this.targetFrequency = this.noteFrequencies[this.targetNote];
        if (this.targetNoteDisplay) this.targetNoteDisplay.textContent = `Target: ${this.targetNote}`;
        this.noteMatchedTime = 0;
        this.totalNotesTrained++;
        if (this.notesTrainedDisplay) this.notesTrainedDisplay.textContent = this.totalNotesTrained;
        this.playTargetNote();
    }

    playTargetNote() {
        if (this.targetFrequency) {
            this.playInstrumentTone(this.targetFrequency);
        }
    }

    updatePitchMeter(userFrequency, centsOverride) {
        if (!this.targetFrequency || !this.pitchIndicator) return;
        const cents = typeof centsOverride === 'number'
            ? centsOverride
            : 1200 * Math.log2(userFrequency / this.targetFrequency);
        const position = Math.max(-50, Math.min(50, cents));
        this.pitchIndicator.style.left = `calc(50% + ${position}%)`;
        if (Math.abs(cents) < 10) {
            this.pitchIndicator.style.backgroundColor = '#00ff00';
        } else if (Math.abs(cents) < 30) {
            this.pitchIndicator.style.backgroundColor = '#ffff00';
        } else {
            this.pitchIndicator.style.backgroundColor = '#ff0000';
        }
        if (this.guidanceDisplay) {
            const direction = cents > 3 ? 'Lower pitch slightly' : cents < -3 ? 'Raise pitch slightly' : 'Right on pitch';
            this.guidanceDisplay.textContent = `${direction} (Δ ${cents.toFixed(1)}¢)`;
        }
    }

    detectPitchLoop() {
        if (!this.isTraining || !this.analyser) return;
        const bufferLength = this.analyser.fftSize;
        const buffer = new Float32Array(bufferLength);
        this.analyser.getFloatTimeDomainData(buffer);
        const rms = Math.sqrt(buffer.reduce((sum, value) => sum + value * value, 0) / bufferLength);
        if (this.volumeFill) {
            this.volumeFill.style.width = `${Math.min(100, Math.max(5, rms * 350))}%`;
        }
        let bestCorrelation = 0;
        let bestLag = -1;
        const sampleRate = this.audioContext.sampleRate;
        for (let lag = 40; lag < bufferLength; lag++) {
            let correlation = 0;
            for (let i = 0; i < bufferLength - lag; i++) {
                correlation += buffer[i] * buffer[i + lag];
            }
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestLag = lag;
            }
        }
        const userFrequency = bestLag > 0 ? sampleRate / bestLag : 0;
        if (userFrequency > 100) {
            const noteInfo = frequencyToNote(userFrequency, { minFrequency: 80, maxFrequency: 1500, maxCentError: 80 });
            const userNote = noteInfo?.note || '---';
            if (this.userNoteDisplay) this.userNoteDisplay.textContent = `You: ${userNote} (${userFrequency.toFixed(2)} Hz)`;
            const cents = 1200 * Math.log2(userFrequency / this.targetFrequency);
            this.updatePitchMeter(userFrequency, cents);
            const onTarget = userNote === this.targetNote && Math.abs(cents) < 15;
            this.updatePitchEngineSample({ cents, onTarget, rms });
            if (onTarget) {
                if (this.noteMatchedTime === 0) {
                    this.noteMatchedTime = Date.now();
                }
                if (Date.now() - this.noteMatchedTime > 500) {
                    if (this.feedbackMessage) this.feedbackMessage.textContent = "✅ Perfect Match!";
                    this.score += 10;
                    this.streak++;
                    this.matchesHit++;
                    this.bestStreak = Math.max(this.bestStreak, this.streak);
                    if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;
                    if (this.streakDisplay) this.streakDisplay.textContent = this.streak;
                    if (this.bestStreakDisplay) this.bestStreakDisplay.textContent = this.bestStreak;
                    if (this.accuracyDisplay) {
                        const accuracy = this.totalNotesTrained > 0 ? Math.round((this.matchesHit / this.totalNotesTrained) * 100) : 0;
                        this.accuracyDisplay.textContent = `${accuracy}%`;
                    }
                    if (this.nextNoteTimeout) clearTimeout(this.nextNoteTimeout);
                    this.nextNoteTimeout = setTimeout(() => this.generateTargetNote(), 1000);
                }
            } else {
                this.noteMatchedTime = 0;
                this.streak = 0;
                if (this.streakDisplay) this.streakDisplay.textContent = this.streak;
                if (this.feedbackMessage) this.feedbackMessage.textContent = "🎤 Keep trying!";
            }
        } else {
            if (this.userNoteDisplay) this.userNoteDisplay.textContent = "You: ---";
            if (this.guidanceDisplay) this.guidanceDisplay.textContent = 'Increase input volume or sing a clear note';
            this.updatePitchEngineSample({ cents: 0, onTarget: false, rms });
        }
        const raf = typeof window !== 'undefined' ? window.requestAnimationFrame : null;
        if (this.isTraining && raf) {
            this.detectFrameId = raf(() => this.detectPitchLoop());
        }
    }

    async start() {
        if (this.isTraining) return;
        try {
            this.audioContext = createAudioContext();
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.microphone.connect(this.analyser);
            this.isTraining = true;
            this.score = 0;
            this.streak = 0;
            this.timeLeft = 60;
            if (this.startButton) this.startButton.disabled = true;
            if (this.stopButton) this.stopButton.disabled = false;
            if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;
            if (this.streakDisplay) this.streakDisplay.textContent = this.streak;
            this.generateTargetNote();
            this.gameTimer = setInterval(() => {
                this.timeLeft--;
                if (this.timerDisplay) this.timerDisplay.textContent = `Time: ${this.timeLeft}s`;
                if (this.timeLeft <= 0) {
                    this.stop();
                }
            }, 1000);
            this.detectPitchLoop();
            this.handleArcadeStart();
        } catch (error) {
            if (this.feedbackMessage) this.feedbackMessage.textContent = "❌ Error: " + error.message;
            this.stop();
        }
    }

    stop() {
        if (this.nextNoteTimeout) {
            clearTimeout(this.nextNoteTimeout);
            this.nextNoteTimeout = null;
        }
        this.isTraining = false;
        clearInterval(this.gameTimer);
        this.gameTimer = null;
        stopMediaStream(this.mediaStream);
        this.mediaStream = null;
        cancelAnimationFrameSafe(this.detectFrameId);
        this.detectFrameId = null;
        closeAudioContext(this.audioContext);
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        if (this.startButton) this.startButton.disabled = false;
        if (this.stopButton) this.stopButton.disabled = true;
        if (this.feedbackMessage) this.feedbackMessage.textContent = `Game Over! Final Score: ${this.score}`;
        if (this.targetNoteDisplay) this.targetNoteDisplay.textContent = "Target: ---";
        if (this.userNoteDisplay) this.userNoteDisplay.textContent = "You: ---";
        this.handleArcadeStop();
    }

    attachLifecycleHooks() {
        if (typeof document === 'undefined' || this.boundVisibilityHandler) return;
        this.boundVisibilityHandler = () => {
            if (!this.audioContext) return;
            if (document.hidden) {
                this.audioContext.suspend?.();
            } else if (this.isTraining) {
                this.audioContext.resume?.();
            }
        };
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);
        this.boundUnloadHandler = () => this.dispose();
        window.addEventListener('beforeunload', this.boundUnloadHandler);
    }

    detachLifecycleHooks() {
        if (this.boundVisibilityHandler && typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
            this.boundVisibilityHandler = null;
        }
        if (this.boundUnloadHandler) {
            window.removeEventListener('beforeunload', this.boundUnloadHandler);
            this.boundUnloadHandler = null;
        }
    }

    dispose() {
        this.stop();
        this.detachLifecycleHooks();
        this.pitchEngine?.dispose?.();
        this.pitchEngine = null;
    }

    setupPitchArcade() {
        if (!this.pitchGameCanvas) return;
        try {
            this.pitchEngine = createPitchArcade(this.pitchGameCanvas);
            this.pitchEngine.addEventListener('scene-event', (event) => this.handleSceneEvent(event));
        } catch (error) {
            console.warn('Pitch arcade unavailable:', error);
            this.pitchEngine = null;
            return;
        }
        const savedMode = this.getStoredArcadeMode();
        const initialMode = savedMode || (this.pitchGameSelect?.value ?? 'off');
        if (this.pitchGameSelect) {
            this.pitchGameSelect.value = initialMode;
            this.pitchGameSelect.addEventListener('change', (event) => {
                this.setPitchGameMode(event.target.value);
            });
        }
        this.setPitchGameMode(initialMode);
    }

    setPitchGameMode(mode = 'off') {
        this.pitchGameMode = mode;
        this.storeArcadeMode(mode);
        if (!this.pitchEngine) return;
        if (mode === 'off') {
            this.pitchEngine.setMode('off');
            this.pitchEngine.pause();
            this.togglePitchGameVisibility(false);
            return;
        }
        this.togglePitchGameVisibility(true);
        this.pitchEngine.setMode(mode);
        if (this.isTraining) {
            this.pitchEngine.start();
        } else {
            this.pitchEngine.pause();
        }
    }

    togglePitchGameVisibility(enable) {
        const container = this.pitchGameCanvas?.closest('.pitch-game');
        if (this.pitchGameCanvas) {
            this.pitchGameCanvas.style.display = enable ? 'block' : 'none';
        }
        if (container) {
            container.style.opacity = enable ? '1' : '0.4';
        }
    }

    updatePitchEngineSample(sample) {
        if (!this.pitchEngine || this.pitchGameMode === 'off') return;
        this.pitchEngine.updatePitch(sample);
    }

    handleArcadeStart() {
        if (!this.pitchEngine || this.pitchGameMode === 'off') return;
        this.pitchEngine.start();
    }

    handleArcadeStop() {
        if (!this.pitchEngine) return;
        this.pitchEngine.pause();
    }

    handleSceneEvent(event) {
        this.lastSceneEvent = event;
    }

    storeArcadeMode(mode) {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            window.localStorage.setItem(this.pitchArcadeStorageKey, mode);
        } catch (error) {
            console.warn('Unable to persist arcade mode', error);
        }
    }

    getStoredArcadeMode() {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        try {
            return window.localStorage.getItem(this.pitchArcadeStorageKey);
        } catch (error) {
            console.warn('Unable to read arcade mode', error);
            return null;
        }
    }
}
